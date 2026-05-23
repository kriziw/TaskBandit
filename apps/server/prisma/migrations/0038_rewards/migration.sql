-- CreateEnum
CREATE TYPE "RewardCategory" AS ENUM ('SCREEN_TIME', 'ALLOWANCE', 'TREAT', 'ACTIVITY', 'PRIVILEGE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RewardRedemptionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REWARD_REDEMPTION_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'REWARD_REDEMPTION_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'REWARD_REDEMPTION_REJECTED';

-- AlterTable: add requireRewardApproval to HouseholdSettings
ALTER TABLE "HouseholdSettings" ADD COLUMN "requireRewardApproval" BOOLEAN NOT NULL DEFAULT TRUE;

-- CreateTable
CREATE TABLE "Reward" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "catalogKey" TEXT,
    "isOperatorManaged" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultLocale" VARCHAR(5) NOT NULL DEFAULT 'en',
    "title" VARCHAR(200) NOT NULL,
    "titleTranslations" JSONB,
    "description" VARCHAR(2000),
    "descriptionTranslations" JSONB,
    "category" "RewardCategory" NOT NULL DEFAULT 'CUSTOM',
    "icon" TEXT,
    "pointCost" INTEGER NOT NULL,
    "maxRedemptionsPerChild" INTEGER,
    "cooldownDays" INTEGER,
    "createdAtUtc" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardRedemption" (
    "id" UUID NOT NULL,
    "rewardId" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "requestedById" UUID NOT NULL,
    "status" "RewardRedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAtUtc" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAtUtc" TIMESTAMPTZ(6),
    "resolvedById" UUID,
    "adminNote" TEXT,
    "pointsDeducted" INTEGER NOT NULL,

    CONSTRAINT "RewardRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reward_householdId_catalogKey_key" ON "Reward"("householdId", "catalogKey");

-- CreateIndex
CREATE INDEX "RewardRedemption_householdId_requestedAtUtc_idx" ON "RewardRedemption"("householdId", "requestedAtUtc");

-- CreateIndex
CREATE INDEX "RewardRedemption_requestedById_requestedAtUtc_idx" ON "RewardRedemption"("requestedById", "requestedAtUtc");

-- CreateIndex
CREATE INDEX "RewardRedemption_tenantId_requestedAtUtc_idx" ON "RewardRedemption"("tenantId", "requestedAtUtc");

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
