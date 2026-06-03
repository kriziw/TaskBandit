-- AlterEnum
ALTER TYPE "AssignmentStrategyType" ADD VALUE 'FIXED_ASSIGNEE';

-- AlterEnum
ALTER TYPE "AssignmentReasonType" ADD VALUE 'FIXED_ASSIGNEE';

-- AlterTable
ALTER TABLE "ChoreTemplate" ADD COLUMN "fixedAssigneeId" TEXT;
