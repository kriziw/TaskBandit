-- Add ACHIEVEMENT_UNLOCKED notification type
ALTER TYPE "NotificationType" ADD VALUE 'ACHIEVEMENT_UNLOCKED';

-- Add enableAchievements to HouseholdSettings
ALTER TABLE "HouseholdSettings"
ADD COLUMN "enableAchievements" BOOLEAN NOT NULL DEFAULT true;

-- Create Achievement definition table (global, not per-tenant)
CREATE TABLE "Achievement" (
    "key"            TEXT        NOT NULL,
    "name"           TEXT        NOT NULL,
    "descriptionKey" TEXT        NOT NULL,
    "category"       TEXT        NOT NULL,
    "isRepeatable"   BOOLEAN     NOT NULL DEFAULT false,
    "goal"           INTEGER     NOT NULL,
    "bonusPoints"    INTEGER     NOT NULL DEFAULT 0,
    "sortOrder"      INTEGER     NOT NULL DEFAULT 0,
    "createdAtUtc"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("key")
);

-- Create UserAchievement table for per-user progress and earned state
CREATE TABLE "UserAchievement" (
    "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
    "tenantId"       UUID        NOT NULL,
    "householdId"    UUID        NOT NULL,
    "userId"         UUID        NOT NULL,
    "achievementKey" TEXT        NOT NULL,
    "progress"       INTEGER     NOT NULL DEFAULT 0,
    "earnedAt"       TIMESTAMP(3),
    "timesEarned"    INTEGER     NOT NULL DEFAULT 0,
    "updatedAtUtc"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one progress row per user per achievement
CREATE UNIQUE INDEX "UserAchievement_userId_achievementKey_key"
    ON "UserAchievement"("userId", "achievementKey");

-- Indexes for common query patterns
CREATE INDEX "UserAchievement_householdId_achievementKey_idx"
    ON "UserAchievement"("householdId", "achievementKey");

CREATE INDEX "UserAchievement_userId_updatedAtUtc_idx"
    ON "UserAchievement"("userId", "updatedAtUtc");

-- Foreign keys
ALTER TABLE "UserAchievement"
ADD CONSTRAINT "UserAchievement_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserAchievement"
ADD CONSTRAINT "UserAchievement_householdId_fkey"
    FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserAchievement"
ADD CONSTRAINT "UserAchievement_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserAchievement"
ADD CONSTRAINT "UserAchievement_achievementKey_fkey"
    FOREIGN KEY ("achievementKey") REFERENCES "Achievement"("key") ON DELETE CASCADE ON UPDATE CASCADE;
