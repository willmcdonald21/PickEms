import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  recordCoinFlip,
  setManualSpread,
  syncScores,
  syncSlate,
  undoLastPick,
} from "../actions";
import { unlock, lock } from "../auth-actions";
import { getWeeks } from "@/lib/queries";
import { isUnlocked } from "@/lib/auth";

function backTo(message: string): never {
  redirect(`/admin?msg=${encodeURIComponent(message)}`);
}

async function run(fn: (password: string) => Promise<void>): Promise<string> {
  if (!(await isUnlocked())) return "Enter the league password first.";
  const password = process.env.ADMIN_PASSWORD!;
  try {
    await fn(password);
    return "Done.";
  } catch (err) {
    return err instanceof Error ? err.message : "Something went wrong.";
  }
}

async function doSyncSlate(formData: FormData) {
  "use server";
  const season = Number(formData.get("season"));
  const week = Number(formData.get("week"));
  if (!Number.isInteger(season) || !Number.isInteger(week) || week < 1) {
    backTo("Enter a valid season and week.");
  }
  backTo(await run((pw) => syncSlate(season, week, pw)));
}

async function doCoinFlip(formData: FormData) {
  "use server";
  const weekId = String(formData.get("weekId"));
  const raw = formData.get("playerId");
  const playerId = raw === "RANDOM" || raw === null ? null : String(raw);
  backTo(await run((pw) => recordCoinFlip(weekId, playerId, pw)));
}

async function doSyncScores(formData: FormData) {
  "use server";
  const weekId = String(formData.get("weekId"));
  backTo(await run((pw) => syncScores(weekId, pw)));
}

async function doUndo(formData: FormData) {
  "use server";
  const weekId = String(formData.get("weekId"));
  backTo(await run((pw) => undoLastPick(weekId, pw)));
}

async function doManualSpread(formData: FormData) {
  "use server";
  const gameId = String(formData.get("gameId"));
  const spread = Number(formData.get("spread"));
  if (!Number.isFinite(spread)) backTo("Enter a valid spread.");
  backTo(await run((pw) => setManualSpread(gameId, spread, pw)));
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const params = await searchParams;
  const message = typeof params.msg === "string" ? params.msg : null;
  const unlocked = await isUnlocked();

  const button =
    "rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900";
  const outline =
    "rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700";
  const input =
    "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";
  const card =
    "rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900";

  if (!unlocked) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Admin</h1>
        {message && (
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            {message}
          </p>
        )}
        <form action={unlock} className="flex items-end gap-2">
          <input type="hidden" name="redirectTo" value="/admin" />
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              League password
            </label>
            <input
              type="password"
              name="password"
              className={`mt-1 ${input}`}
            />
          </div>
          <button type="submit" className={button}>
            Unlock
          </button>
        </form>
      </div>
    );
  }

  const weeks = await getWeeks();
  const players = await prisma.player.findMany({ orderBy: { name: "asc" } });
  const missingSpreads = await prisma.game.findMany({
    where: { homeSpread: null },
    orderBy: { kickoff: "asc" },
    include: { week: true },
  });

  const now = new Date();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <form action={lock}>
          <input type="hidden" name="redirectTo" value="/admin" />
          <button type="submit" className={outline}>
            Lock
          </button>
        </form>
      </div>

      {message && (
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
      )}

      <section className={`mb-8 ${card}`}>
        <h2 className="mb-3 font-semibold">Sync a slate from ESPN</h2>
        <form action={doSyncSlate} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs text-zinc-600 dark:text-zinc-400">
              Season
            </label>
            <input
              type="number"
              name="season"
              defaultValue={now.getFullYear()}
              className={`mt-1 w-24 ${input}`}
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-600 dark:text-zinc-400">
              Week
            </label>
            <input
              type="number"
              name="week"
              min={1}
              defaultValue={1}
              className={`mt-1 w-20 ${input}`}
            />
          </div>
          <button type="submit" className={button}>
            Sync slate
          </button>
        </form>
        <p className="mt-2 text-xs text-zinc-500">
          Spreads are frozen the first time a game is loaded and are never
          overwritten by a later sync.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-semibold">Weeks</h2>
        {weeks.length === 0 ? (
          <p className="text-sm text-zinc-500">No weeks synced yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {weeks.map((week) => (
              <div key={week.id} className={card}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {week.season} · Week {week.number}
                  </span>
                  <span className="text-xs text-zinc-500">{week.status}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!week.flipWinnerId &&
                    players.map((player) => (
                      <form key={player.id} action={doCoinFlip}>
                        <input type="hidden" name="weekId" value={week.id} />
                        <input
                          type="hidden"
                          name="playerId"
                          value={player.id}
                        />
                        <button type="submit" className={outline}>
                          {player.name} won flip
                        </button>
                      </form>
                    ))}
                  {!week.flipWinnerId && (
                    <form action={doCoinFlip}>
                      <input type="hidden" name="weekId" value={week.id} />
                      <input type="hidden" name="playerId" value="RANDOM" />
                      <button type="submit" className={button}>
                        Flip a coin
                      </button>
                    </form>
                  )}

                  <form action={doSyncScores}>
                    <input type="hidden" name="weekId" value={week.id} />
                    <button type="submit" className={outline}>
                      Sync scores &amp; grade
                    </button>
                  </form>

                  <form action={doUndo}>
                    <input type="hidden" name="weekId" value={week.id} />
                    <button type="submit" className={outline}>
                      Undo last pick
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {missingSpreads.length > 0 && (
        <section>
          <h2 className="mb-1 font-semibold">Games missing a spread</h2>
          <p className="mb-3 text-xs text-zinc-500">
            ESPN omits odds for some games. Set a line manually to make them
            draftable.
          </p>
          <div className="flex flex-col gap-2">
            {missingSpreads.map((game) => (
              <form
                key={game.id}
                action={doManualSpread}
                className={`flex flex-wrap items-center gap-2 ${card}`}
              >
                <input type="hidden" name="gameId" value={game.id} />
                <span className="flex-1 text-sm">
                  Wk {game.week.number}: {game.awayAbbr} @ {game.homeAbbr}
                </span>
                <input
                  type="number"
                  step="0.5"
                  name="spread"
                  placeholder="home line"
                  className={`w-28 ${input}`}
                />
                <button type="submit" className={outline}>
                  Set
                </button>
              </form>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
