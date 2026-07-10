import { getNbaTeamLogoSourceUrl } from "@/lib/nba-media";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ nbaTeamId: string }> }
) {
  const { nbaTeamId } = await params;
  const id = parsePositiveId(nbaTeamId);

  if (id === null) {
    return new Response("Invalid NBA team id.", { status: 400 });
  }

  try {
    const response = await fetch(getNbaTeamLogoSourceUrl(id));

    if (!response.ok) {
      return new Response("NBA team logo unavailable.", { status: 502 });
    }

    return new Response(await response.arrayBuffer(), {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
        "Content-Type": "image/svg+xml"
      }
    });
  } catch {
    return new Response("NBA team logo unavailable.", { status: 502 });
  }
}

function parsePositiveId(value: string) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}
