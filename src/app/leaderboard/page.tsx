import { getLeaderboard } from "../actions";

export default async function LeaderboardPage() {
  const rows = await getLeaderboard();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Leaderboard</h1>

      {rows.length === 0 ? (
        <p className="text-zinc-500">No picks yet.</p>
      ) : (
        <table className="w-full border-collapse overflow-hidden rounded-lg border border-zinc-200 text-sm dark:border-zinc-800">
          <thead>
            <tr className="bg-zinc-100 text-left dark:bg-zinc-900">
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">Player</th>
              <th className="px-4 py-2 font-medium">Correct</th>
              <th className="px-4 py-2 font-medium">Decided games</th>
              <th className="px-4 py-2 font-medium">Total picks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.name}
                className="border-t border-zinc-200 dark:border-zinc-800"
              >
                <td className="px-4 py-2 text-zinc-500">{i + 1}</td>
                <td className="px-4 py-2 font-medium">{row.name}</td>
                <td className="px-4 py-2">{row.correct}</td>
                <td className="px-4 py-2">{row.decided}</td>
                <td className="px-4 py-2">{row.totalPicks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
