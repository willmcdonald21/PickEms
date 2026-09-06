import { prisma } from "@/lib/prisma";
import { fetchSlate } from "@/lib/espn";
import { resolveSpreadFreeze } from "@/lib/spreadFreeze";

/**
 * Pulls one week's slate from ESPN and upserts it, freezing each game's
 * spread at its own kickoff (see resolveSpreadFreeze). Shared by the manual
 * admin "Sync slate" action and the automated cron route so both paths stay
 * in lockstep.
 */
export async function refreshWeekFromEspn(
  season: number,
  weekNumber: number
): Promise<{ gamesCount: number }> {
  const slate = await fetchSlate(season, weekNumber);
  if (slate.length === 0) {
    throw new Error(`ESPN returned no games for ${season} week ${weekNumber}.`);
  }

  const week = await prisma.week.upsert({
    where: { season_number: { season, number: weekNumber } },
    update: {},
    create: { season, number: weekNumber, status: "SLATE_LOADED" },
  });

  const now = new Date();

  for (const game of slate) {
    const existing = await prisma.game.findUnique({
      where: { espnEventId: game.espnEventId },
    });

    const spread = resolveSpreadFreeze(
      existing,
      game.homeSpread,
      game.kickoff,
      now
    );

    await prisma.game.upsert({
      where: { espnEventId: game.espnEventId },
      create: {
        weekId: week.id,
        espnEventId: game.espnEventId,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        homeAbbr: game.homeAbbr,
        awayAbbr: game.awayAbbr,
        kickoff: game.kickoff,
        homeSpread: spread.homeSpread,
        spreadFrozenAt: spread.spreadFrozenAt,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        completed: game.completed,
      },
      update: {
        kickoff: game.kickoff,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        completed: game.completed,
        homeSpread: spread.homeSpread,
        spreadFrozenAt: spread.spreadFrozenAt,
      },
    });
  }

  await prisma.week.update({
    where: { id: week.id },
    data: {
      ...(week.status === "PENDING" ? { status: "SLATE_LOADED" } : {}),
      ...(week.spreadsFrozenAt === null ? { spreadsFrozenAt: now } : {}),
    },
  });

  return { gamesCount: slate.length };
}

/** Weeks worth refreshing automatically: anything not yet fully graded. */
export async function getActiveWeeks() {
  return prisma.week.findMany({
    where: { status: { not: "GRADED" } },
    include: { games: true },
  });
}

/**
 * Of the active weeks, which have a game whose spread isn't frozen yet and
 * kicks off within the next `windowMinutes` — the set that actually benefits
 * from an extra just-in-time refresh right before kickoff.
 */
export function weeksWithImminentKickoff<
  T extends { games: { spreadFrozenAt: Date | null; kickoff: Date }[] },
>(weeks: T[], now: Date, windowMinutes: number): T[] {
  const horizon = new Date(now.getTime() + windowMinutes * 60_000);
  return weeks.filter((week) =>
    week.games.some(
      (g) => g.spreadFrozenAt === null && g.kickoff > now && g.kickoff <= horizon
    )
  );
}
