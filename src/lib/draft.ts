export const PICKS_PER_WEEK = 5;

/**
 * Flip winner takes picks 1, 3, 5; the loser takes 2, 4. The 3-vs-2 split is
 * intentional — winning the flip is the weekly edge.
 */
export function playerForPick(
  pickNumber: number,
  flipWinnerId: string,
  otherPlayerId: string
): string {
  return pickNumber % 2 === 1 ? flipWinnerId : otherPlayerId;
}

export function pickCountFor(
  playerId: string,
  flipWinnerId: string
): number {
  return playerId === flipWinnerId ? 3 : 2;
}
