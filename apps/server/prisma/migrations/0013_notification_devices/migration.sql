CREATE TYPE "NotificationDevicePlatform" AS ENUM ('ANDROID');

CREATE TYPE "NotificationDeviceProvider" AS ENUM ('GENERIC', 'FCM');

CREATE TABLE "NotificationDevice" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "installationId" TEXT NOT NULL,
    "platform" "NotificationDevicePlatform" NOT NULL,
    "provider" "NotificationDeviceProvider" NOT NULL DEFAULT 'GENERIC',
    "pushToken" TEXT,
    "deviceName" TEXT,
    "appVersion" TEXT,
    "locale" TEXT,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAtUtc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationDevice_installationId_key" ON "NotificationDevice"("installationId");

CREATE INDEX "NotificationDevice_userId_notificationsEnabled_updatedAtUtc_idx" ON "NotificationDevice"("userId", "notificationsEnabled", "updatedAtUtc");

ALTER TABLE "NotificationDevice" ADD CONSTRAINT "NotificationDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
