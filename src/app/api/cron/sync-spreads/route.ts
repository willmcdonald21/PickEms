import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getActiveWeeks,
  refreshWeekFromEspn,
  weeksWithImminentKickoff,
} from "@/lib/syncEngine";

export const dynamic = "force-dynamic";

// How far ahead of a game's kickoff the "imminent" mode starts refreshing it.
// Wider than the requested 15 minutes to comfortably absorb GitHub Actions'
// 5-minute schedule granularity and its own occasional scheduling delay.
const IMMINENT_WINDOW_MINUTES = 20;

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization");
  return Boolean(expected) && provided === `Bearer ${expected}`;
}

/**
 * Automated spread refresh, called by GitHub Actions (see
 * .github/workflows/sync-spreads.yml) — Vercel's own Cron Jobs cap out at
 * once per day on the Hobby plan, too coarse for this.
 *
 * ?mode=periodic  — refresh every active (not yet graded) week. Runs every
 *                    3 hours as the steady background cadence.
 * ?mode=imminent  — refresh only weeks with a game kicking off within
 *                    IMMINENT_WINDOW_MINUTES. Runs every 5 minutes but is a
 *                    cheap no-op almost all the time; it only does real work
 *                    in the run-up to each game.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = req.nextUrl.searchParams.get("mode") === "imminent"
    ? "imminent"
    : "periodic";

  const active = await getActiveWeeks();
  const targets =
    mode === "imminent"
      ? weeksWithImminentKickoff(active, new Date(), IMMINENT_WINDOW_MINUTES)
      : active;

  const results = [];
  for (const week of targets) {
    try {
      const { gamesCount } = await refreshWeekFromEspn(
        week.season,
        week.number
      );
      results.push({ season: week.season, number: week.number, gamesCount });
    } catch (err) {
      results.push({
        season: week.season,
        number: week.number,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (results.length > 0) {
    revalidatePath("/");
    revalidatePath("/leaderboard");
    revalidatePath("/admin");
  }

  return NextResponse.json({ mode, synced: results });
}
