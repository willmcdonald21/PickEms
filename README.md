# PickEms

A weekly sports pick'em pool. Enter your name, pick winners for each game
in a week, and see how you stack up on the leaderboard.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Prisma](https://www.prisma.io) + SQLite for storage

## Getting started

```bash
npm install
cp .env.example .env   # set your own ADMIN_PASSWORD
npx prisma migrate dev
npm run db:seed        # optional: adds a few sample games
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

- **/** — enter your name (saved in your browser) and pick a winner for
  each game in the current week. Picks lock once a game's kickoff time
  passes.
- **/leaderboard** — shows every player's number of correct picks.
- **/admin** — add games and record final results. Protected by the
  `ADMIN_PASSWORD` env var (entered once per browser session, not a real
  auth system — don't reuse a sensitive password).

## Data model

`Player` and `Game` are joined by `Pick` (one per player per game). A
`Game`'s `winner` field (`HOME`/`AWAY`) is set from the admin page once
the real game finishes; the leaderboard compares it against each
player's `pickedTeam`.
