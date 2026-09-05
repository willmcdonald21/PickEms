"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { fetchSlate } from "@/lib/espn";
import { gradePick, type Side } from "@/lib/ats";
import { PICKS_PER_WEEK, playerForPick } from "@/lib/draft";
import { requireUnlocked } from "@/lib/auth";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/leaderboard");
  revalidatePath("/admin");
}

function checkAdminPassword(adminPassword: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || adminPassword !== expected) {
    throw new Error("Incorrect admin password.");
  }
}

async function getPlayers() {
  const players = await prisma.player.findMany({ orderBy: { name: "asc" } });
  if (players.length !== 2) {
    throw new Error(
      `Expected exactly 2 players, found ${players.length}. Run \`npm run db:seed\`.`
    );
  }
  return players;
}

export async function syncSlate(
  season: number,
  weekNumber: number,
  adminPassword: string
): Promise<void> {
  checkAdminPassword(adminPassword);

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

    // Spreads are write-once: ESPN drops odds after a game goes final, so a
    // frozen line must never be overwritten by a later sync.
    const freezeSpread =
      existing?.spreadFrozenAt == null && game.homeSpread !== null;

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
        homeSpread: game.homeSpread,
        spreadFrozenAt: game.homeSpread !== null ? now : null,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        completed: game.completed,
      },
      update: {
        kickoff: game.kickoff,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        completed: game.completed,
        ...(freezeSpread
          ? { homeSpread: game.homeSpread, spreadFrozenAt: now }
          : {}),
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

  revalidateAll();
}

export async function recordCoinFlip(
  weekId: string,
  flipWinnerId: string | null,
  adminPassword: string
): Promise<void> {
  checkAdminPassword(adminPassword);

  const week = await prisma.week.findUniqueOrThrow({ where: { id: weekId } });
  if (week.flipWinnerId) {
    throw new Error("The coin flip for this week has already been recorded.");
  }
  if (week.status === "PENDING") {
    throw new Error("Load the slate for this week first.");
  }

  const players = await getPlayers();
  const winnerId =
    flipWinnerId ?? players[Math.floor(Math.random() * players.length)].id;

  if (!players.some((p) => p.id === winnerId)) {
    throw new Error("Unknown player.");
  }

  await prisma.week.update({
    where: { id: weekId },
    data: {
      flipWinnerId: winnerId,
      flippedAt: new Date(),
      status: "DRAFTING",
    },
  });

  revalidateAll();
}

export async function makePick(
  weekId: string,
  gameId: string,
  side: Side
): Promise<void> {
  await requireUnlocked();

  const week = await prisma.week.findUniqueOrThrow({ where: { id: weekId } });
  if (week.status !== "DRAFTING") {
    throw new Error(
      week.status === "COMPLETE" || week.status === "GRADED"
        ? "This week's draft is already complete."
        : "Record the coin flip before drafting."
    );
  }
  if (!week.flipWinnerId) {
    throw new Error("Record the coin flip before drafting.");
  }

  const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });
  if (game.weekId !== weekId) {
    throw new Error("That game is not on this week's slate.");
  }
  if (game.homeSpread === null) {
    throw new Error("That game has no spread yet, so it can't be drafted.");
  }
  if (game.kickoff <= new Date()) {
    throw new Error("That game has already kicked off.");
  }

  const players = await getPlayers();
  const other = players.find((p) => p.id !== week.flipWinnerId)!;

  const pickCount = await prisma.draftPick.count({ where: { weekId } });
  const pickNumber = pickCount + 1;
  if (pickNumber > PICKS_PER_WEEK) {
    throw new Error("All 5 picks are already in.");
  }

  const playerId = playerForPick(pickNumber, week.flipWinnerId, other.id);

  try {
    await prisma.draftPick.create({
      data: { weekId, playerId, gameId, pickNumber, side },
    });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      throw new Error("That side has already been drafted.");
    }
    throw err;
  }

  if (pickNumber === PICKS_PER_WEEK) {
    await prisma.week.update({
      where: { id: weekId },
      data: { status: "COMPLETE" },
    });
  }

  revalidateAll();
}

export async function undoLastPick(
  weekId: string,
  adminPassword: string
): Promise<void> {
  checkAdminPassword(adminPassword);

  // Only the most recent pick can be undone — removing a middle pick would
  // leak information about the picks made after it.
  const last = await prisma.draftPick.findFirst({
    where: { weekId },
    orderBy: { pickNumber: "desc" },
  });
  if (!last) throw new Error("There are no picks to undo.");

  await prisma.draftPick.delete({ where: { id: last.id } });
  await prisma.week.update({
    where: { id: weekId },
    data: { status: "DRAFTING" },
  });

  revalidateAll();
}

export async function syncScores(
  weekId: string,
  adminPassword: string
): Promise<void> {
  checkAdminPassword(adminPassword);

  const week = await prisma.week.findUniqueOrThrow({ where: { id: weekId } });
  const slate = await fetchSlate(week.season, week.number);

  for (const game of slate) {
    // Scores only — never touches homeSpread.
    await prisma.game.updateMany({
      where: { espnEventId: game.espnEventId },
      data: {
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        completed: game.completed,
      },
    });
  }

  await gradeWeek(weekId);
  revalidateAll();
}

async function gradeWeek(weekId: string): Promise<void> {
  const picks = await prisma.draftPick.findMany({
    where: { weekId },
    include: { game: true },
  });

  const graded = picks.map((pick) => ({
    pick,
    result: gradePick(pick.game, pick.side as Side),
  }));

  for (const { pick, result } of graded) {
    if (result !== pick.result) {
      await prisma.draftPick.update({
        where: { id: pick.id },
        data: { result },
      });
    }
  }

  const week = await prisma.week.findUniqueOrThrow({ where: { id: weekId } });
  const allGraded =
    graded.length === PICKS_PER_WEEK &&
    graded.every(({ result }) => result !== null);

  if (allGraded && week.status === "COMPLETE") {
    await prisma.week.update({
      where: { id: weekId },
      data: { status: "GRADED" },
    });
  }
}

export async function setManualSpread(
  gameId: string,
  homeSpread: number,
  adminPassword: string
): Promise<void> {
  checkAdminPassword(adminPassword);

  await prisma.game.update({
    where: { id: gameId },
    data: { homeSpread, spreadFrozenAt: new Date() },
  });

  revalidateAll();
}
