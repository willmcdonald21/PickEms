# PickEms

A two-person NFL league scored **against the spread**. Each week a coin flip
decides who drafts first; the two of you draft 5 sides from that week's slate,
and whoever finishes the season with the most ATS wins takes it.

## The rules it enforces

- **Coin flip** each week. The winner gets picks **1, 3, 5**; the loser gets
  **2, 4**. The 3-vs-2 split is the point — winning the flip is the weekly edge.
- **Draft a side, not a winner.** You take `SEA -3.5`, not "Seattle."
- **One pick per game.** Once either side of a matchup is drafted, the whole
  game is gone — if you take `SEA -3.5`, `NE +3.5` isn't available to your
  opponent either.
- **A losing pick hands the win to the other player.** If your pick fails to
  cover, your opponent is credited the win for it, as if they'd implicitly held
  the other side without drafting it. A push moves nothing — no one gains. This
  makes a fully graded week zero-sum: with 5 picks and P pushes, the total wins
  between you always add up to `5 - P`.
- **Weekly winner** = most ATS wins. **Season champion** = most total ATS wins.

## Stack

Next.js (App Router) + TypeScript + Tailwind, Prisma + Postgres (Neon), hosted
on Vercel. Slate, spreads, and final scores come from ESPN's public scoreboard
endpoint — no API key.

## Getting started

You need a free [Neon](https://neon.com) Postgres database — there's no local
SQLite file any more, so local development talks to the same database as
production.

```bash
npm install
cp .env.example .env   # paste your Neon URLs + pick a league password
npx prisma migrate dev
npm run db:seed        # creates the two players
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Player names are set in
`prisma/seed.ts` — edit them before seeding.

`DATABASE_URL` must be Neon's **pooled** string (the host contains `-pooler`)
and `DIRECT_URL` the unpooled one. Serverless functions open a connection per
invocation, so queries go through the pooler, while `prisma migrate` needs a
direct connection.

## Deploying

1. Push to GitHub (already wired up).
2. Import the repo at [vercel.com](https://vercel.com) — the Hobby plan is free
   for personal projects.
3. Add three environment variables in Vercel: `DATABASE_URL`, `DIRECT_URL`, and
   `ADMIN_PASSWORD`.
4. Run `npx prisma migrate deploy` and `npm run db:seed` once against Neon.

`package.json` runs `prisma generate` on `postinstall` because Vercel caches
`node_modules` — without it the deployed Prisma Client can silently go stale
against a changed schema.

## Weekly flow

1. **Admin → Sync slate** for the season and week. This pulls the full slate and
   **freezes each game's spread**.
2. **Admin → coin flip.** Record who won it, or let the app flip. Write-once per
   week, so it can't be re-rolled.
3. **Home page → draft.** Enter the 5 picks in order; the app tracks whose slot
   is next and greys out sides that are gone.
4. **Admin → Sync scores & grade** once games finish. Grades every pick W/L/PUSH
   and decides the week.

## Why spreads are frozen

ESPN **drops the odds once a game goes final** — a line that isn't captured
before kickoff is gone for good. So the spread is written once, when the slate
is first loaded, and no later sync overwrites it. Both players are graded
against that same frozen line, which guarantees exactly one side covers (or it's
a push).

If ESPN has no line for a game, that game isn't draftable until you set one by
hand under **Games missing a spread** in Admin.

## ATS grading

With `homeSpread` stored as the home team's line (negative = home favored):

```
adjusted = homeScore + homeSpread - awayScore
adjusted > 0 → home side covers
adjusted < 0 → away side covers
adjusted = 0 → push
```

## Notes

- `ADMIN_PASSWORD` is a single shared league password. It gates entering picks
  and every admin action; viewing the week and the standings is open to anyone
  with the link. It keeps strangers out, but it does not stop the two of you
  from entering each other's picks — there are no per-player logins.
- **Undo** removes only the most recent pick; deleting a middle pick would leak
  information about the picks made after it.
- Neon's free tier scales the database to zero after ~5 minutes idle, so the
  first page load after a quiet spell takes about a second.
