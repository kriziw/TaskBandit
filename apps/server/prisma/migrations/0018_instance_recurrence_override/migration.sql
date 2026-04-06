ALTER TYPE "RecurrenceType" ADD VALUE IF NOT EXISTS 'MONTHLY';

ALTER TABLE "ChoreInstance"
ADD COLUMN "suppressRecurrence" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "assignmentStrategyOverride" "AssignmentStrategyType",
ADD COLUMN "recurrenceTypeOverride" "RecurrenceType",
ADD COLUMN "recurrenceIntervalDaysOverride" INTEGER,
ADD COLUMN "recurrenceWeekdaysOverride" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
