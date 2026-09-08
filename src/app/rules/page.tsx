const card =
  "rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";

export default function RulesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Rules</h1>
      <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
        How the league works, and a plain-English version of what the app is
        doing behind the scenes.
      </p>

      <section className={`mb-6 ${card}`}>
        <h2 className="mb-3 text-lg font-semibold">The weekly cycle</h2>
        <ol className="list-decimal space-y-3 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          <li>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              Coin flip.
            </span>{" "}
            Each week opens with a flip. The winner gets picks{" "}
            <span className="font-medium">1, 3, and 5</span>; the loser gets{" "}
            <span className="font-medium">2 and 4</span>. Winning the flip is
            a real edge — one extra pick every week.
          </li>
          <li>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              Draft, in order.
            </span>{" "}
            Taking turns by that order, each of you picks a team{" "}
            <span className="italic">against the spread</span> from that
            week&rsquo;s full NFL slate — for example{" "}
            <span className="font-mono">SEA -3.5</span> means you&rsquo;re
            betting Seattle wins by more than 3.5 points.
          </li>
          <li>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              One pick per game.
            </span>{" "}
            Once either side of a matchup is taken, that whole game is off
            the board. If you take <span className="font-mono">SEA -3.5</span>,{" "}
            <span className="font-mono">NE +3.5</span> isn&rsquo;t available
            to your opponent either — you can&rsquo;t both have a stake in
            the same game.
          </li>
          <li>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              Games play out.
            </span>{" "}
            Once the games finish, every pick gets graded automatically.
          </li>
        </ol>
      </section>

      <section className={`mb-6 ${card}`}>
        <h2 className="mb-3 text-lg font-semibold">How scoring works</h2>
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            A pick <span className="font-medium">wins</span> if that team
            covers the spread, and <span className="font-medium">loses</span>{" "}
            if it doesn&rsquo;t. A margin that lands exactly on the number is
            a <span className="font-medium">push</span> — no one gains.
          </p>
          <p>
            Here&rsquo;s the part that makes every pick a real head-to-head
            bet:{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              if your pick loses, your opponent gets the win for it
            </span>{" "}
            — as if they&rsquo;d automatically held the other side, even
            though they never drafted it. So a bad pick doesn&rsquo;t just
            hurt you; it directly helps whoever you&rsquo;re playing against.
          </p>
          <p>
            That makes every fully graded week a clean split: with 5 picks
            and however many pushes, the wins between the two of you always
            add up to <span className="font-mono">5 − pushes</span>. One
            player&rsquo;s good week is mechanically the other&rsquo;s bad
            one.
          </p>
          <p>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              Weekly winner
            </span>{" "}
            is whoever has more wins that week (a tie is a tie).{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              Season champion
            </span>{" "}
            is whoever has the most total wins across every week.
          </p>
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-3 text-lg font-semibold">
          Behind the scenes, in plain terms
        </h2>
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            The app runs on its own — nothing needs to be left open on
            anyone&rsquo;s computer for it to work. It&rsquo;s always live at
            its usual link.
          </p>
          <p>
            Game matchups and point spreads come from ESPN automatically. A
            spread keeps updating with the real market right up until that
            game actually kicks off — the site checks in every few hours, and
            more often as a game gets close.
          </p>
          <p>
            The moment a game kicks off, its spread locks in for good and
            never changes again, no matter what happens afterward.
            That&rsquo;s what makes grading fair: both of you are always
            judged against the exact same number.
          </p>
          <p>
            Everything else — recording the coin flip, grading finished
            games, fixing a misclick — happens from the Admin tab, behind a
            shared password.
          </p>
        </div>
      </section>
    </div>
  );
}
