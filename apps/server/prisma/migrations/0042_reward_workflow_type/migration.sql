-- CreateEnum
CREATE TYPE "RewardWorkflowType" AS ENUM ('STANDARD', 'DAILY_EXCLUSIVE');

-- AlterEnum: add REWARD_CLAIMED_EXCLUSIVE to NotificationType
-- PostgreSQL ALTER TYPE ADD VALUE cannot run inside a transaction block
ALTER TYPE "NotificationType" ADD VALUE 'REWARD_CLAIMED_EXCLUSIVE';

-- AlterTable: add workflowType column to Reward
ALTER TABLE "Reward" ADD COLUMN "workflowType" "RewardWorkflowType" NOT NULL DEFAULT 'STANDARD';

-- Data migration: tag existing pick_dinner rewards as DAILY_EXCLUSIVE
UPDATE "Reward" SET "workflowType" = 'DAILY_EXCLUSIVE' WHERE "catalogKey" = 'pick_dinner';
