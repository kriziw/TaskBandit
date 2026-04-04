CREATE TYPE "NotificationEmailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

ALTER TABLE "Notification"
ADD COLUMN "emailDeliveryStatus" "NotificationEmailDeliveryStatus" NOT NULL DEFAULT 'SKIPPED',
ADD COLUMN "emailDeliveryError" TEXT,
ADD COLUMN "emailDeliveredAtUtc" TIMESTAMP(3),
ADD COLUMN "emailLastAttemptedAtUtc" TIMESTAMP(3);

CREATE INDEX "Notification_emailDeliveryStatus_createdAtUtc_idx"
ON "Notification"("emailDeliveryStatus", "createdAtUtc");
