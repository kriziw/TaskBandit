CREATE TYPE "NotificationPushDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE "NotificationPushDelivery" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "notificationDeviceId" UUID NOT NULL,
    "status" "NotificationPushDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "attemptedAtUtc" TIMESTAMP(3),
    "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAtUtc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPushDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_push_delivery_unique" ON "NotificationPushDelivery"("notificationId", "notificationDeviceId");

CREATE INDEX "NotificationPushDelivery_status_updatedAtUtc_idx" ON "NotificationPushDelivery"("status", "updatedAtUtc");

ALTER TABLE "NotificationPushDelivery" ADD CONSTRAINT "NotificationPushDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationPushDelivery" ADD CONSTRAINT "NotificationPushDelivery_notificationDeviceId_fkey" FOREIGN KEY ("notificationDeviceId") REFERENCES "NotificationDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
