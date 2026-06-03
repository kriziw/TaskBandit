-- AlterTable: store partial wizard answers so users can resume if they close mid-flow
ALTER TABLE "HouseholdSettings" ADD COLUMN "onboardingAnswers" JSONB;
