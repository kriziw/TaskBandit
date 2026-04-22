ALTER TYPE "ChoreState" ADD VALUE IF NOT EXISTS 'DEFERRED';

ALTER TABLE "ChoreInstance"
ADD COLUMN "notBeforeAtUtc" TIMESTAMP(3),
ADD COLUMN "deferredReason" TEXT,
ADD COLUMN "dependencySourceInstanceId" UUID,
ADD COLUMN "completedByExternal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "externalCompleterName" TEXT,
ADD COLUMN "externalCompletionNote" TEXT;

CREATE INDEX "ChoreInstance_householdId_state_notBeforeAtUtc_idx"
ON "ChoreInstance"("householdId", "state", "notBeforeAtUtc");
