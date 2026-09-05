"use client";

import { useEffect, useState, useTransition } from "react";
import {
  addGame,
  deleteGame,
  getAllGamesForAdmin,
  setGameResult,
  type GameDTO,
  type Team,
} from "../actions";

const ADMIN_PASSWORD_KEY = "pickems:adminPassword";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [games, setGames] = useState<GameDTO[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [week, setWeek] = useState(1);
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [kickoff, setKickoff] = useState("");

  useEffect(() => {
    (async () => {
      setPassword(sessionStorage.getItem(ADMIN_PASSWORD_KEY) ?? "");
      await refreshGames();
    })();
  }, []);

  async function refreshGames() {
    setGames(await getAllGamesForAdmin());
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    sessionStorage.setItem(ADMIN_PASSWORD_KEY, value);
  }

  function runAction(fn: () => Promise<void>) {
    setStatus(null);
    startTransition(async () => {
      try {
        await fn();
        await refreshGames();
        setStatus("Done.");
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function handleAddGame(e: React.FormEvent) {
    e.preventDefault();
    if (!homeTeam.trim() || !awayTeam.trim() || !kickoff) {
      setStatus("Fill in both teams and a kickoff time.");
      return;
    }
    runAction(async () => {
      await addGame({ week, homeTeam, awayTeam, kickoff }, password);
      setHomeTeam("");
      setAwayTeam("");
      setKickoff("");
    });
  }

  function handleSetResult(gameId: string, winner: Team | null) {
    runAction(() => setGameResult(gameId, winner, password));
  }

  function handleDelete(gameId: string) {
    runAction(() => deleteGame(gameId, password));
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Admin</h1>

      <div className="mb-8">
        <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Admin password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          className="mt-1 w-56 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <form
        onSubmit={handleAddGame}
        className="mb-10 flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-end sm:flex-wrap"
      >
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Week
          </label>
          <input
            type="number"
            min={1}
            value={week}
            onChange={(e) => setWeek(Number(e.target.value))}
            className="mt-1 w-20 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Away team
          </label>
          <input
            type="text"
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            className="mt-1 w-40 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Home team
          </label>
          <input
            type="text"
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            className="mt-1 w-40 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Kickoff
          </label>
          <input
            type="datetime-local"
            value={kickoff}
            onChange={(e) => setKickoff(e.target.value)}
            className="mt-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Add game
        </button>
      </form>

      {status && (
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{status}</p>
      )}

      <div className="flex flex-col gap-3">
        {games.map((game) => (
          <div
            key={game.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <div className="text-xs text-zinc-500">
                Week {game.week} · {new Date(game.kickoff).toLocaleString()}
              </div>
              <div className="font-medium">
                {game.awayTeam} @ {game.homeTeam}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSetResult(game.id, "AWAY")}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  game.winner === "AWAY"
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
              >
                {game.awayTeam} won
              </button>
              <button
                type="button"
                onClick={() => handleSetResult(game.id, "HOME")}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  game.winner === "HOME"
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
              >
                {game.homeTeam} won
              </button>
              {game.winner && (
                <button
                  type="button"
                  onClick={() => handleSetResult(game.id, null)}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(game.id)}
                className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 dark:border-red-900"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
