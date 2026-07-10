import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  AuthRequiredError,
  ForbiddenUserError,
  resolveCurrentUser
} from "@/lib/current-user";
import { getDraftDbClient } from "@/lib/draft-db";
import {
  ensureDraftEventSchema,
  formatSseEvent,
  loadDraftEventsAfter
} from "@/lib/draft-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SSE_STREAM_DURATION_MS = process.env.NODE_ENV === "test" ? 0 : 25000;
const SSE_POLL_INTERVAL_MS = process.env.NODE_ENV === "test" ? 0 : 2000;

export async function GET(request: Request) {
  try {
    const db = getDraftDbClient();
    const session = await auth.api.getSession({
      headers: await headers()
    });

    await resolveCurrentUser(db, session);
    await ensureDraftEventSchema(db);

    let afterId = getAfterId(request);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;
        const close = () => {
          if (!isClosed) {
            isClosed = true;
            controller.close();
          }
        };
        const closeTimer = setTimeout(close, SSE_STREAM_DURATION_MS);

        request.signal.addEventListener("abort", close, { once: true });

        try {
          while (!isClosed) {
            const events = await loadDraftEventsAfter(db, afterId);

            if (isClosed) {
              break;
            }

            for (const event of events) {
              afterId = event.id;
              controller.enqueue(encoder.encode(formatSseEvent(event)));
            }

            controller.enqueue(encoder.encode(": keepalive\n\n"));

            if (process.env.NODE_ENV === "test") {
              break;
            }

            await wait(SSE_POLL_INTERVAL_MS);
          }
        } finally {
          clearTimeout(closeTimer);
          close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return Response.json({ error: "Connexion requise." }, { status: 401 });
    }

    if (error instanceof ForbiddenUserError) {
      return Response.json({ error: "Acces GM requis." }, { status: 403 });
    }

    console.error("Draft events stream error", error);

    return Response.json(
      { error: "La base de donnees draft live est indisponible." },
      { status: 500 }
    );
  }
}

function getAfterId(request: Request) {
  const url = new URL(request.url);
  const afterId = Number(
    url.searchParams.get("after") ?? request.headers.get("Last-Event-ID") ?? 0
  );

  return Number.isFinite(afterId) && afterId > 0 ? Math.floor(afterId) : 0;
}

function wait(durationMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}
