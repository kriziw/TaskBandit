-- Add LeaderboardResetMode enum
CREATE TYPE "LeaderboardResetMode" AS ENUM ('NEVER', 'WEEKLY', 'MONTHLY', 'QUARTERLY');

-- Add leaderboard configuration to HouseholdSettings
ALTER TABLE "HouseholdSettings"
  ADD COLUMN "leaderboardResetMode" "LeaderboardResetMode" NOT NULL DEFAULT 'NEVER',
  ADD COLUMN "lastLeaderboardResetAt" TIMESTAMP(3);

-- Add leaderboard score column to User (IF NOT EXISTS: mastery migration 0045
-- adds this column first if it runs before this one; both are safe in either order).
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "leaderboardPoints" INTEGER NOT NULL DEFAULT 0;

-- Backfill: only update rows where leaderboardPoints is still 0 and points > 0
-- so we don't overwrite data that a previous migration already backfilled.
UPDATE "User" SET "leaderboardPoints" = "points"
  WHERE "leaderboardPoints" = 0 AND "points" > 0;
