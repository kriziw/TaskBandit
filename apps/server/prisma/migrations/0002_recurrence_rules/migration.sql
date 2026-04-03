-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'EVERY_X_DAYS', 'CUSTOM_WEEKLY');

-- AlterTable
ALTER TABLE "ChoreTemplate"
ADD COLUMN "recurrenceType" "RecurrenceType" NOT NULL DEFAULT 'NONE',
ADD COLUMN "recurrenceIntervalDays" INTEGER,
ADD COLUMN "recurrenceWeekdays" TEXT[] DEFAULT ARRAY[]::TEXT[];
