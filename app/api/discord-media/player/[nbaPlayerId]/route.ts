import { getNbaPlayerHeadshotSourceUrl } from "@/lib/nba-media";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ nbaPlayerId: string }> }
) {
  const { nbaPlayerId } = await params;
  const id = parsePositiveId(nbaPlayerId);

  if (id === null) {
    return new Response("Invalid NBA player id.", { status: 400 });
  }

  return proxyImage(getNbaPlayerHeadshotSourceUrl(id), "image/png");
}

async function proxyImage(sourceUrl: string, contentType: string) {
  try {
    const response = await fetch(sourceUrl);

    if (!response.ok) {
      return new Response("NBA player image unavailable.", { status: 502 });
    }

    return new Response(await response.arrayBuffer(), {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
        "Content-Type": contentType
      }
    });
  } catch {
    return new Response("NBA player image unavailable.", { status: 502 });
  }
}

function parsePositiveId(value: string) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}
