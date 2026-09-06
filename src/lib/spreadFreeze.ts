export type SpreadState = {
  homeSpread: number | null;
  spreadFrozenAt: Date | null;
};

/**
 * Decide what to write for a game's spread on a given sync.
 *
 * Before kickoff, the line stays live — each sync tracks whatever ESPN
 * reports now. At or after kickoff it freezes for good, using the freshest
 * value available and falling back to whatever was already stored if ESPN
 * has already dropped the odds (which happens once a game goes final, and
 * may happen earlier). Once frozen, it never changes again regardless of
 * what a later sync reports.
 */
export function resolveSpreadFreeze(
  existing: SpreadState | null,
  freshSpread: number | null,
  kickoff: Date,
  now: Date
): SpreadState {
  if (existing?.spreadFrozenAt) {
    return existing;
  }

  const kickoffPassed = kickoff <= now;
  const spread = freshSpread ?? existing?.homeSpread ?? null;

  return {
    homeSpread: spread,
    spreadFrozenAt: kickoffPassed ? now : null,
  };
}
