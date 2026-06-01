-- Add LeaderboardResetMode enum
CREATE TYPE "LeaderboardResetMode" AS ENUM ('NEVER', 'WEEKLY', 'MONTHLY', 'QUARTERLY');

-- Add leaderboard configuration to HouseholdSettings
ALTER TABLE "HouseholdSettings"
  ADD COLUMN "leaderboardResetMode" "LeaderboardResetMode" NOT NULL DEFAULT 'NEVER',
  ADD COLUMN "lastLeaderboardResetAt" TIMESTAMP(3);

-- Add leaderboard score column to User
ALTER TABLE "User"
  ADD COLUMN "leaderboardPoints" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing users: leaderboardPoints starts equal to points balance.
-- Since the default mode is NEVER (no resets), existing users should see the
-- same leaderboard ranking as before — all-time cumulative points.
UPDATE "User" SET "leaderboardPoints" = "points";
