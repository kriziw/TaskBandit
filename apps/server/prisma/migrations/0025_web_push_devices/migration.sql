ALTER TYPE "NotificationDevicePlatform" ADD VALUE IF NOT EXISTS 'WEB';
ALTER TYPE "NotificationDeviceProvider" ADD VALUE IF NOT EXISTS 'WEB_PUSH';

ALTER TABLE "NotificationDevice"
ADD COLUMN "webPushP256dh" TEXT,
ADD COLUMN "webPushAuth" TEXT;
