"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type Team = "HOME" | "AWAY";

export type GameDTO = {
  id: string;
  week: number;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  homeScore: number | null;
  awayScore: number | null;
  winner: Team | null;
};

function toDTO(game: {
  id: string;
  week: number;
  homeTeam: string;
  awayTeam: string;
  kickoff: Date;
  homeScore: number | null;
  awayScore: number | null;
  winner: Team | null;
}): GameDTO {
  return {
    id: game.id,
    week: game.week,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    kickoff: game.kickoff.toISOString(),
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    winner: game.winner,
  };
}

export async function getCurrentWeek(): Promise<number> {
  const latest = await prisma.game.findFirst({ orderBy: { week: "desc" } });
  return latest?.week ?? 1;
}

export async function getAvailableWeeks(): Promise<number[]> {
  const games = await prisma.game.findMany({
    distinct: ["week"],
    select: { week: true },
    orderBy: { week: "asc" },
  });
  const weeks = games.map((g) => g.week);
  return weeks.length ? weeks : [1];
}

export async function getGamesForWeek(week: number): Promise<GameDTO[]> {
  const games = await prisma.game.findMany({
    where: { week },
    orderBy: { kickoff: "asc" },
  });
  return games.map(toDTO);
}

export async function getPicksForPlayer(
  playerName: string,
  week: number
): Promise<Record<string, Team>> {
  const name = playerName.trim();
  if (!name) return {};

  const player = await prisma.player.findUnique({ where: { name } });
  if (!player) return {};

  const picks = await prisma.pick.findMany({
    where: { playerId: player.id, game: { week } },
  });
  return Object.fromEntries(picks.map((p) => [p.gameId, p.pickedTeam as Team]));
}

export async function submitPicks(
  playerName: string,
  picks: { gameId: string; pickedTeam: Team }[]
): Promise<void> {
  const name = playerName.trim();
  if (!name) throw new Error("Enter your name first.");
  if (picks.length === 0) return;

  const player = await prisma.player.upsert({
    where: { name },
    update: {},
    create: { name },
  });

  const games = await prisma.game.findMany({
    where: { id: { in: picks.map((p) => p.gameId) } },
  });
  const gameById = new Map(games.map((g) => [g.id, g]));
  const now = new Date();

  const lockedOut = picks.some((p) => {
    const game = gameById.get(p.gameId);
    return !game || game.kickoff <= now;
  });
  if (lockedOut) {
    throw new Error("One or more of those games has already kicked off.");
  }

  await prisma.$transaction(
    picks.map((p) =>
      prisma.pick.upsert({
        where: {
          playerId_gameId: { playerId: player.id, gameId: p.gameId },
        },
        update: { pickedTeam: p.pickedTeam },
        create: {
          playerId: player.id,
          gameId: p.gameId,
          pickedTeam: p.pickedTeam,
        },
      })
    )
  );

  revalidatePath("/leaderboard");
}

export type LeaderboardRow = {
  name: string;
  correct: number;
  decided: number;
  totalPicks: number;
};

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const players = await prisma.player.findMany({
    include: { picks: { include: { game: true } } },
  });

  return players
    .map((player) => {
      const decidedPicks = player.picks.filter((pick) => pick.game.winner);
      const correct = decidedPicks.filter(
        (pick) => pick.game.winner === pick.pickedTeam
      ).length;
      return {
        name: player.name,
        correct,
        decided: decidedPicks.length,
        totalPicks: player.picks.length,
      };
    })
    .sort((a, b) => b.correct - a.correct || b.decided - a.decided);
}

function checkAdminPassword(adminPassword: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || adminPassword !== expected) {
    throw new Error("Incorrect admin password.");
  }
}

export async function getAllGamesForAdmin(): Promise<GameDTO[]> {
  const games = await prisma.game.findMany({
    orderBy: [{ week: "asc" }, { kickoff: "asc" }],
  });
  return games.map(toDTO);
}

export async function addGame(
  data: { week: number; homeTeam: string; awayTeam: string; kickoff: string },
  adminPassword: string
): Promise<void> {
  checkAdminPassword(adminPassword);

  await prisma.game.create({
    data: {
      week: data.week,
      homeTeam: data.homeTeam.trim(),
      awayTeam: data.awayTeam.trim(),
      kickoff: new Date(data.kickoff),
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function setGameResult(
  gameId: string,
  winner: Team | null,
  adminPassword: string
): Promise<void> {
  checkAdminPassword(adminPassword);

  await prisma.game.update({
    where: { id: gameId },
    data: { winner },
  });

  revalidatePath("/leaderboard");
  revalidatePath("/admin");
}

export async function deleteGame(
  gameId: string,
  adminPassword: string
): Promise<void> {
  checkAdminPassword(adminPassword);

  await prisma.game.delete({ where: { id: gameId } });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
}
