-- Release auto-deferred follow-up chores created by the old lock-up logic.
-- Identified by the specific deferredReason set during automated follow-up creation,
-- which is distinct from manually snoozed chores.
UPDATE "ChoreInstance"
SET
  state = CASE WHEN "assigneeId" IS NOT NULL THEN 'ASSIGNED' ELSE 'OPEN' END,
  "deferredReason" = NULL,
  "notBeforeAtUtc" = NULL
WHERE
  state = 'DEFERRED'
  AND "deferredReason" = 'Waiting for follow-up readiness window.';
