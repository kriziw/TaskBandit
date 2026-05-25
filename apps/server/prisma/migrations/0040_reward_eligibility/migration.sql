-- Migration: add eligibility column to the Reward table.
--
-- The eligibility field controls which household members can see and redeem
-- a given reward: ALL (everyone), CHILD_ONLY, or ADULT_ONLY.
--
-- All existing rewards default to ALL so there is no behavioural change for
-- households that were provisioned before this migration.
--
-- This field was accidentally omitted from migration 0038 even though the
-- frontend type and UI already expected it.

-- CreateEnum
CREATE TYPE "RewardEligibility" AS ENUM ('ALL', 'CHILD_ONLY', 'ADULT_ONLY');

-- AlterTable
ALTER TABLE "Reward" ADD COLUMN "eligibility" "RewardEligibility" NOT NULL DEFAULT 'ALL';
