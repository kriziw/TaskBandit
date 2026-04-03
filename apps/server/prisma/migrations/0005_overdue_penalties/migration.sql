-- AlterTable
ALTER TABLE "ChoreInstance"
ADD COLUMN "overduePenaltyAppliedAtUtc" TIMESTAMP(3),
ADD COLUMN "overduePenaltyPoints" INTEGER NOT NULL DEFAULT 0;
