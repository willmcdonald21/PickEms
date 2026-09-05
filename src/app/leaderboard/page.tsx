import { getSeasonStandings, getWeeks } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const weeks = await getWeeks();

  if (weeks.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <h1 className="mb-3 text-2xl font-semibold tracking-tight">Standings</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Nothing to show yet &mdash; sync a week and record some picks first.
        </p>
      </div>
    );
  }

  const season = weeks[0].season;
  const standings = await getSeasonStandings(season);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        {season} standings
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Season champion is whoever finishes with the most ATS wins.
      </p>

      <table className="w-full border-collapse overflow-hidden rounded-lg border border-zinc-200 text-sm dark:border-zinc-800">
        <thead>
          <tr className="bg-zinc-100 text-left dark:bg-zinc-900">
            <th className="px-4 py-2 font-medium">#</th>
            <th className="px-4 py-2 font-medium">Player</th>
            <th className="px-4 py-2 font-medium">ATS wins</th>
            <th className="px-4 py-2 font-medium">Record</th>
            <th className="px-4 py-2 font-medium">Weeks won</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, i) => (
            <tr
              key={row.playerId}
              className="border-t border-zinc-200 dark:border-zinc-800"
            >
              <td className="px-4 py-2 text-zinc-500">{i + 1}</td>
              <td className="px-4 py-2 font-medium">{row.name}</td>
              <td className="px-4 py-2 font-semibold">{row.wins}</td>
              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                {row.wins}-{row.losses}
                {row.pushes > 0 && `-${row.pushes}`}
              </td>
              <td className="px-4 py-2">{row.weeksWon}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
