const SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

export type EspnGame = {
  espnEventId: string;
  homeTeam: string;
  awayTeam: string;
  homeAbbr: string;
  awayAbbr: string;
  kickoff: Date;
  /** Home team's line; negative means home is favored. Null when ESPN omits odds. */
  homeSpread: number | null;
  homeScore: number | null;
  awayScore: number | null;
  completed: boolean;
};

type EspnCompetitor = {
  homeAway: "home" | "away";
  score?: string;
  team: { abbreviation: string; displayName: string };
};

type EspnEvent = {
  id: string;
  date: string;
  competitions: {
    status: { type: { completed: boolean } };
    competitors: EspnCompetitor[];
    odds?: { spread?: number }[];
  }[];
};

function parseScore(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export async function fetchSlate(
  season: number,
  week: number
): Promise<EspnGame[]> {
  const url = `${SCOREBOARD_URL}?dates=${season}&seasontype=2&week=${week}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`ESPN request failed (${res.status})`);
  }

  const data = (await res.json()) as { events?: EspnEvent[] };
  const events = data.events ?? [];

  return events.map((event) => {
    const competition = event.competitions[0];
    const home = competition.competitors.find((c) => c.homeAway === "home")!;
    const away = competition.competitors.find((c) => c.homeAway === "away")!;
    const completed = competition.status.type.completed;
    const spread = competition.odds?.[0]?.spread;

    return {
      espnEventId: event.id,
      homeTeam: home.team.displayName,
      awayTeam: away.team.displayName,
      homeAbbr: home.team.abbreviation,
      awayAbbr: away.team.abbreviation,
      kickoff: new Date(event.date),
      homeSpread: typeof spread === "number" ? spread : null,
      homeScore: completed ? parseScore(home.score) : null,
      awayScore: completed ? parseScore(away.score) : null,
      completed,
    };
  });
}
