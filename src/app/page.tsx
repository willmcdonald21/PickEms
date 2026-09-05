import Link from "next/link";
import { makePick } from "./actions";
import {
  getWeekDetail,
  getWeeks,
  sideLabel,
  tallyPicks,
  weeklyWinner,
} from "@/lib/queries";
import { PICKS_PER_WEEK } from "@/lib/draft";
import type { Side } from "@/lib/ats";

const RESULT_STYLES: Record<string, string> = {
  WIN: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  LOSS: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  PUSH: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export default async function WeekPage({
  searchParams,
}: PageProps<"/">) {
  const params = await searchParams;
  const weeks = await getWeeks();

  if (weeks.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <h1 className="mb-3 text-2xl font-semibold tracking-tight">No weeks yet</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Head to <Link href="/admin" className="underline">Admin</Link> and sync
          a week&rsquo;s slate from ESPN to get started.
        </p>
      </div>
    );
  }

  const requested = typeof params.week === "string" ? params.week : null;
  const weekId = weeks.find((w) => w.id === requested)?.id ?? weeks[0].id;
  const detail = await getWeekDetail(weekId);
  if (!detail) return null;

  const { week, players, takenSides, nextPickNumber, onTheClock } = detail;
  const tallies = tallyPicks(week.picks, players);
  const graded = week.picks.some((p) => p.result !== null);
  const winner = graded ? weeklyWinner(tallies) : null;
  const now = new Date();

  const draftable = week.games.filter(
    (g) => g.homeSpread !== null && g.kickoff > now
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {week.season} · Week {week.number}
        </h1>
        <form className="flex items-center gap-2">
          <select
            name="week"
            defaultValue={week.id}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.season} Week {w.number}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
          >
            Go
          </button>
        </form>
      </div>

      <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        {week.flipWinner ? (
          <p>
            <span className="font-medium">{week.flipWinner.name}</span> won the
            coin flip &mdash; picks 1, 3, 5.
          </p>
        ) : (
          <p className="text-zinc-600 dark:text-zinc-400">
            No coin flip recorded yet.{" "}
            <Link href="/admin" className="underline">
              Record it in Admin
            </Link>{" "}
            to open the draft.
          </p>
        )}
        {onTheClock && (
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            On the clock: pick {nextPickNumber} of {PICKS_PER_WEEK} &mdash;{" "}
            <span className="font-medium">{onTheClock.name}</span>
          </p>
        )}
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Picks</h2>
        <div className="flex flex-col gap-2">
          {Array.from({ length: PICKS_PER_WEEK }, (_, i) => i + 1).map((n) => {
            const pick = week.picks.find((p) => p.pickNumber === n);
            return (
              <div
                key={n}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="w-6 text-zinc-500">{n}</span>
                {pick ? (
                  <>
                    <span className="w-28 font-medium">{pick.player.name}</span>
                    <span className="flex-1">
                      {sideLabel(pick.game, pick.side as Side)}
                      <span className="ml-2 text-zinc-500">
                        {pick.game.awayAbbr} @ {pick.game.homeAbbr}
                      </span>
                    </span>
                    {pick.result && (
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${RESULT_STYLES[pick.result]}`}
                      >
                        {pick.result}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-zinc-400">
                    {onTheClock && nextPickNumber === n
                      ? `${onTheClock.name} on the clock`
                      : "—"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {graded && (
        <section className="mb-8 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 text-lg font-semibold">This week</h2>
          <div className="flex flex-wrap gap-6 text-sm">
            {tallies.map((t) => (
              <span key={t.playerId}>
                <span className="font-medium">{t.name}</span>: {t.wins}-
                {t.losses}
                {t.pushes > 0 && `-${t.pushes}`}
              </span>
            ))}
          </div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {winner === "TIE"
              ? "Tied this week."
              : winner
                ? `${winner.name} takes the week.`
                : null}
          </p>
        </section>
      )}

      {week.status === "DRAFTING" && onTheClock && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">
            Board &mdash; {onTheClock.name} picks
          </h2>
          {draftable.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No draftable games left (all kicked off, or missing spreads).
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {draftable.map((game) => (
                <div
                  key={game.id}
                  className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="mb-2 text-xs text-zinc-500">
                    {game.kickoff.toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(["AWAY", "HOME"] as const).map((side) => {
                      const taken = takenSides.has(`${game.id}:${side}`);
                      return (
                        <form
                          key={side}
                          action={async () => {
                            "use server";
                            await makePick(week.id, game.id, side);
                          }}
                        >
                          <button
                            type="submit"
                            disabled={taken}
                            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium enabled:hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700"
                          >
                            {sideLabel(game, side)}
                            {taken && " · taken"}
                          </button>
                        </form>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
