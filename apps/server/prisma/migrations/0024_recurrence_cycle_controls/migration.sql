CREATE TYPE "RecurrenceEndMode" AS ENUM ('NEVER', 'AFTER_OCCURRENCES', 'ON_DATE');

ALTER TABLE "ChoreInstance"
ADD COLUMN "cycleId" UUID,
ADD COLUMN "recurrenceEndModeOverride" "RecurrenceEndMode",
ADD COLUMN "recurrenceRemainingOccurrencesOverride" INTEGER,
ADD COLUMN "recurrenceEndsAtUtcOverride" TIMESTAMP(3);

CREATE INDEX "chore_instance_household_cycle_state_idx"
ON "ChoreInstance"("householdId", "cycleId", "state");
