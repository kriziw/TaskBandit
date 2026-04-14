ALTER TABLE "ChoreInstance"
ADD COLUMN "occurrenceRootId" UUID;

UPDATE "ChoreInstance"
SET "occurrenceRootId" = "id"
WHERE "occurrenceRootId" IS NULL;

CREATE INDEX "chore_instance_household_occurrence_root_state_idx"
ON "ChoreInstance"("householdId", "occurrenceRootId", "state");
