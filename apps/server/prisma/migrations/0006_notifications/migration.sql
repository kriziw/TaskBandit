-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
  'CHORE_ASSIGNED',
  'CHORE_SUBMITTED',
  'CHORE_APPROVED',
  'CHORE_REJECTED',
  'CHORE_CANCELLED',
  'OVERDUE_PENALTY'
);

-- CreateTable
CREATE TABLE "Notification" (
  "id" UUID NOT NULL,
  "householdId" UUID NOT NULL,
  "recipientUserId" UUID NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAtUtc" TIMESTAMP(3),

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_householdId_recipientUserId_createdAtUtc_idx"
ON "Notification"("householdId", "recipientUserId", "createdAtUtc");

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_isRead_createdAtUtc_idx"
ON "Notification"("recipientUserId", "isRead", "createdAtUtc");

-- AddForeignKey
ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_householdId_fkey"
FOREIGN KEY ("householdId") REFERENCES "Household"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_recipientUserId_fkey"
FOREIGN KEY ("recipientUserId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
