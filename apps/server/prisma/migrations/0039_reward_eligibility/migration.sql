-- Add RewardEligibility enum and eligibility column to reward table

CREATE TYPE "RewardEligibility" AS ENUM ('CHILD_ONLY', 'ALL', 'ADULT_ONLY');

ALTER TABLE "reward"
  ADD COLUMN "eligibility" "RewardEligibility" NOT NULL DEFAULT 'ALL';
