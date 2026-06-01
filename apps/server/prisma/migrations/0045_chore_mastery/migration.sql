-- Add MASTERY_EARNED notification type
ALTER TYPE "NotificationType" ADD VALUE 'MASTERY_EARNED';

-- Add mastery configuration fields to ChoreTemplate
ALTER TABLE "ChoreTemplate"
  ADD COLUMN "masteryDisabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "masteryLevel1Threshold" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "masteryLevel2Threshold" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "masteryLevel2BonusPercentage" INTEGER NOT NULL DEFAULT 10;

-- Create UserTemplateStats table
CREATE TABLE "UserTemplateStats" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "householdId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "templateId" UUID NOT NULL,
  "completionCount" INTEGER NOT NULL DEFAULT 0,
  "masteryLevel" INTEGER NOT NULL DEFAULT 0,
  "level1AwardedAt" TIMESTAMP(3),
  "level2AwardedAt" TIMESTAMP(3),
  "updatedAtUtc" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserTemplateStats_pkey" PRIMARY KEY ("id")
);

-- Unique index: one stats row per user per template
CREATE UNIQUE INDEX "UserTemplateStats_userId_templateId_key" ON "UserTemplateStats"("userId", "templateId");

-- Performance indexes
CREATE INDEX "UserTemplateStats_tenantId_householdId_idx" ON "UserTemplateStats"("tenantId", "householdId");
CREATE INDEX "UserTemplateStats_userId_updatedAtUtc_idx" ON "UserTemplateStats"("userId", "updatedAtUtc");

-- Foreign key constraints
ALTER TABLE "UserTemplateStats"
  ADD CONSTRAINT "UserTemplateStats_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "UserTemplateStats_householdId_fkey"
    FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "UserTemplateStats_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "UserTemplateStats_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "ChoreTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
