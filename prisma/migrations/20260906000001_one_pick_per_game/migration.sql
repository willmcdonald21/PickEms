-- One pick per game, period: the opposite side is no longer a separate
-- available pick once either side of a matchup is drafted.
-- DropIndex
DROP INDEX "DraftPick_gameId_side_key";

-- CreateIndex
CREATE UNIQUE INDEX "DraftPick_gameId_key" ON "DraftPick"("gameId");
