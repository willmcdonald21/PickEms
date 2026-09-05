export type Side = "HOME" | "AWAY";
export type PickResult = "WIN" | "LOSS" | "PUSH";

export type GradableGame = {
  homeSpread: number | null;
  homeScore: number | null;
  awayScore: number | null;
  completed: boolean;
};

/**
 * `homeSpread` is the home team's line (negative = home favored), matching
 * ESPN's convention. Half-point increments are exact in binary floating point,
 * so this comparison never needs an epsilon.
 */
export function gradePick(
  game: GradableGame,
  side: Side
): PickResult | null {
  if (!game.completed) return null;
  if (game.homeSpread === null) return null;
  if (game.homeScore === null || game.awayScore === null) return null;

  const adjusted = game.homeScore + game.homeSpread - game.awayScore;
  if (adjusted === 0) return "PUSH";

  const coveringSide: Side = adjusted > 0 ? "HOME" : "AWAY";
  return side === coveringSide ? "WIN" : "LOSS";
}

export function formatSpread(homeSpread: number, side: Side): string {
  const value = side === "HOME" ? homeSpread : -homeSpread;
  return value > 0 ? `+${value}` : `${value}`;
}
