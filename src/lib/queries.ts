import { prisma } from "@/lib/prisma";
import { PICKS_PER_WEEK, playerForPick } from "@/lib/draft";
import type { Side } from "@/lib/ats";

export async function getWeeks() {
  return prisma.week.findMany({
    orderBy: [{ season: "desc" }, { number: "desc" }],
    include: { _count: { select: { picks: true } } },
  });
}

export async function getWeekDetail(weekId: string) {
  const week = await prisma.week.findUnique({
    where: { id: weekId },
    include: {
      flipWinner: true,
      games: { orderBy: { kickoff: "asc" } },
      picks: {
        orderBy: { pickNumber: "asc" },
        include: { player: true, game: true },
      },
    },
  });
  if (!week) return null;

  const players = await prisma.player.findMany({ orderBy: { name: "asc" } });
  const other = week.flipWinnerId
    ? players.find((p) => p.id !== week.flipWinnerId) ?? null
    : null;

  const takenGameIds = new Set(week.picks.map((p) => p.gameId));
  const nextPickNumber =
    week.picks.length < PICKS_PER_WEEK ? week.picks.length + 1 : null;

  const onTheClock =
    nextPickNumber && week.flipWinnerId && other
      ? players.find(
          (p) =>
            p.id === playerForPick(nextPickNumber, week.flipWinnerId!, other.id)
        ) ?? null
      : null;

  return { week, players, other, takenGameIds, nextPickNumber, onTheClock };
}

export type WeekTally = {
  playerId: string;
  name: string;
  wins: number;
  losses: number;
  pushes: number;
};

/**
 * Every pick is a head-to-head stake on one game: if it covers, the picker
 * gets the win; if it fails, the win goes to the OTHER player instead, as if
 * they'd implicitly held the other side without drafting it. A push moves
 * nothing — it's tallied only as the picker's own push, informational.
 *
 * This makes a fully-graded week zero-sum: total wins across both players
 * always equals (picks - pushes), split between them.
 */
export function tallyPicks(
  picks: { playerId: string; result: string | null }[],
  players: { id: string; name: string }[]
): WeekTally[] {
  return players.map((player) => {
    const opponent = players.find((p) => p.id !== player.id);
    let wins = 0;
    let losses = 0;
    let pushes = 0;

    for (const pick of picks) {
      const isOwn = pick.playerId === player.id;
      const isOpponent = opponent && pick.playerId === opponent.id;
      if (!isOwn && !isOpponent) continue;

      if (pick.result === "PUSH") {
        if (isOwn) pushes += 1;
      } else if (pick.result === "WIN") {
        if (isOwn) wins += 1;
        else losses += 1;
      } else if (pick.result === "LOSS") {
        if (isOwn) losses += 1;
        else wins += 1;
      }
    }

    return { playerId: player.id, name: player.name, wins, losses, pushes };
  });
}

/** Most ATS wins takes the week; equal wins is a tie. */
export function weeklyWinner(tallies: WeekTally[]): WeekTally | "TIE" | null {
  if (tallies.length !== 2) return null;
  const [a, b] = tallies;
  if (a.wins === b.wins) return "TIE";
  return a.wins > b.wins ? a : b;
}

export async function getSeasonStandings(season: number) {
  const players = await prisma.player.findMany({ orderBy: { name: "asc" } });
  const weeks = await prisma.week.findMany({
    where: { season },
    include: { picks: { include: { player: true } } },
  });

  const standings = players.map((player) => ({
    playerId: player.id,
    name: player.name,
    wins: 0,
    losses: 0,
    pushes: 0,
    weeksWon: 0,
  }));

  for (const week of weeks) {
    const tallies = tallyPicks(week.picks, players);
    for (const tally of tallies) {
      const row = standings.find((s) => s.playerId === tally.playerId)!;
      row.wins += tally.wins;
      row.losses += tally.losses;
      row.pushes += tally.pushes;
    }

    const anyGraded = week.picks.some((p) => p.result !== null);
    const winner = anyGraded ? weeklyWinner(tallies) : null;
    if (winner && winner !== "TIE") {
      standings.find((s) => s.playerId === winner.playerId)!.weeksWon += 1;
    }
  }

  return standings.sort((a, b) => b.wins - a.wins || b.weeksWon - a.weeksWon);
}

export function sideLabel(
  game: { homeAbbr: string; awayAbbr: string; homeSpread: number | null },
  side: Side
): string {
  const team = side === "HOME" ? game.homeAbbr : game.awayAbbr;
  if (game.homeSpread === null) return team;
  const value = side === "HOME" ? game.homeSpread : -game.homeSpread;
  return `${team} ${value > 0 ? "+" : ""}${value}`;
}
