-- Quick log now uses difficulty selection; the per-household points default
-- is no longer read by the application. Drop the column.
--
-- ⚠ DEPLOYMENT ORDER: the control-plane SQL provisioner must be updated to
-- remove its reference to this column BEFORE this migration runs in production.
-- See the companion PR in TaskBandit-control-plane.

ALTER TABLE "HouseholdSettings" DROP COLUMN "quickLogPointsDefault";
