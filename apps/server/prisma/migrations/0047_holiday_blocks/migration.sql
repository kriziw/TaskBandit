-- CreateEnum
CREATE TYPE "HolidayExistingMode" AS ENUM ('DEFER', 'LEAVE');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'HOLIDAY_BLOCK_STARTED';
ALTER TYPE "NotificationType" ADD VALUE 'HOLIDAY_BLOCK_ENDED';

-- AlterTable: add timezone to HouseholdSettings (default UTC covers existing rows)
ALTER TABLE "HouseholdSettings" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- CreateTable
CREATE TABLE "HouseholdHolidayBlock" (
    "id"           UUID NOT NULL,
    "householdId"  UUID NOT NULL,
    "name"         TEXT NOT NULL,
    "startDate"    DATE NOT NULL,
    "endDate"      DATE NOT NULL,
    "existingMode" "HolidayExistingMode" NOT NULL,
    "createdBy"    UUID NOT NULL,
    "appliedAt"    TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseholdHolidayBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HouseholdHolidayBlock_householdId_startDate_idx" ON "HouseholdHolidayBlock"("householdId", "startDate");

-- AddForeignKey
ALTER TABLE "HouseholdHolidayBlock" ADD CONSTRAINT "HouseholdHolidayBlock_householdId_fkey"
    FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
