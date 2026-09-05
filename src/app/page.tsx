"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getAvailableWeeks,
  getCurrentWeek,
  getGamesForWeek,
  getPicksForPlayer,
  submitPicks,
  type GameDTO,
  type Team,
} from "./actions";

const PLAYER_NAME_KEY = "pickems:playerName";

function formatKickoff(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Home() {
  const [playerName, setPlayerName] = useState("");
  const [week, setWeek] = useState<number | null>(null);
  const [weeks, setWeeks] = useState<number[]>([]);
  const [games, setGames] = useState<GameDTO[]>([]);
  const [picks, setPicks] = useState<Record<string, Team>>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      setPlayerName(localStorage.getItem(PLAYER_NAME_KEY) ?? "");

      const [availableWeeks, currentWeek] = await Promise.all([
        getAvailableWeeks(),
        getCurrentWeek(),
      ]);
      setWeeks(availableWeeks);
      setWeek(currentWeek);
    })();
  }, []);

  useEffect(() => {
    if (week === null) return;
    (async () => {
      setLoading(true);
      const weekGames = await getGamesForWeek(week);
      setGames(weekGames);
      const savedName = localStorage.getItem(PLAYER_NAME_KEY) ?? "";
      if (savedName) {
        setPicks(await getPicksForPlayer(savedName, week));
      } else {
        setPicks({});
      }
      setLoading(false);
    })();
  }, [week]);

  function handleNameChange(value: string) {
    setPlayerName(value);
    localStorage.setItem(PLAYER_NAME_KEY, value);
  }

  function handlePick(gameId: string, team: Team) {
    setPicks((prev) => ({ ...prev, [gameId]: team }));
  }

  function handleSubmit() {
    setStatus(null);
    const name = playerName.trim();
    if (!name) {
      setStatus("Enter your name before submitting picks.");
      return;
    }

    const payload = Object.entries(picks).map(([gameId, pickedTeam]) => ({
      gameId,
      pickedTeam,
    }));

    startTransition(async () => {
      try {
        await submitPicks(name, payload);
        setStatus("Picks saved!");
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Failed to save picks.");
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Your name
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Alex"
            className="mt-1 w-56 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        {weeks.length > 0 && week !== null && (
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Week
            </label>
            <select
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              className="mt-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {weeks.map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-zinc-500">Loading games…</p>
      ) : games.length === 0 ? (
        <p className="text-zinc-500">
          No games for this week yet. Add some from the{" "}
          <a href="/admin" className="underline">
            admin
          </a>{" "}
          page.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {games.map((game) => {
            const kicked = new Date(game.kickoff) <= new Date();
            const pick = picks[game.id];
            return (
              <div
                key={game.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-3 flex items-center justify-between text-xs text-zinc-500">
                  <span>{formatKickoff(game.kickoff)}</span>
                  {kicked && <span className="font-medium text-amber-600">Locked</span>}
                  {game.winner && (
                    <span className="font-medium text-emerald-600">Final</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(["AWAY", "HOME"] as const).map((side) => {
                    const team = side === "AWAY" ? game.awayTeam : game.homeTeam;
                    const selected = pick === side;
                    const isWinner = game.winner === side;
                    return (
                      <button
                        key={side}
                        type="button"
                        disabled={kicked}
                        onClick={() => handlePick(game.id, side)}
                        className={`rounded-md border px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                          selected
                            ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                            : "border-zinc-300 bg-white text-zinc-900 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        } ${isWinner ? "ring-2 ring-emerald-500" : ""}`}
                      >
                        {side === "AWAY" ? "@ " : ""}
                        {team}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {isPending ? "Saving…" : "Save picks"}
            </button>
            {status && <span className="text-sm text-zinc-600 dark:text-zinc-400">{status}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
