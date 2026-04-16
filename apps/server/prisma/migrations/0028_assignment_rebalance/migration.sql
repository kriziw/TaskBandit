CREATE TYPE "AssignmentReasonType" AS ENUM (
  'ROUND_ROBIN',
  'LEAST_COMPLETED_RECENTLY',
  'HIGHEST_STREAK',
  'MANUAL',
  'CLAIMED',
  'STICKY_FOLLOW_UP',
  'REBALANCED'
);

ALTER TABLE "ChoreTemplate"
ADD COLUMN "stickyFollowUpAssignee" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ChoreInstance"
ADD COLUMN "assignmentLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "assignmentReason" "AssignmentReasonType";

UPDATE "ChoreTemplate"
SET "assignmentStrategy" = 'ROUND_ROBIN'
WHERE "assignmentStrategy" = 'MANUAL_DEFAULT_ASSIGNEE';
