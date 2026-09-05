-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Week" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "season" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "flipWinnerId" TEXT,
    "flippedAt" DATETIME,
    "spreadsFrozenAt" DATETIME,
    CONSTRAINT "Week_flipWinnerId_fkey" FOREIGN KEY ("flipWinnerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekId" TEXT NOT NULL,
    "espnEventId" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "homeAbbr" TEXT NOT NULL,
    "awayAbbr" TEXT NOT NULL,
    "kickoff" DATETIME NOT NULL,
    "homeSpread" REAL,
    "spreadFrozenAt" DATETIME,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Game_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DraftPick" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "pickNumber" INTEGER NOT NULL,
    "side" TEXT NOT NULL,
    "result" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DraftPick_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DraftPick_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DraftPick_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_name_key" ON "Player"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Week_season_number_key" ON "Week"("season", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Game_espnEventId_key" ON "Game"("espnEventId");

-- CreateIndex
CREATE INDEX "Game_weekId_idx" ON "Game"("weekId");

-- CreateIndex
CREATE INDEX "DraftPick_weekId_idx" ON "DraftPick"("weekId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPick_gameId_side_key" ON "DraftPick"("gameId", "side");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPick_weekId_pickNumber_key" ON "DraftPick"("weekId", "pickNumber");
