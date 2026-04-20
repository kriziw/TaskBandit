CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

INSERT INTO "Tenant" ("id", "slug", "displayName", "createdAtUtc")
SELECT
    "id",
    LOWER("id"::text),
    "name",
    "createdAtUtc"
FROM "Household"
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "Household" ADD COLUMN "tenantId" UUID;
UPDATE "Household" SET "tenantId" = "id" WHERE "tenantId" IS NULL;
ALTER TABLE "Household" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE UNIQUE INDEX "Household_tenantId_key" ON "Household"("tenantId");
ALTER TABLE "Household"
  ADD CONSTRAINT "Household_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" ADD COLUMN "tenantId" UUID;
UPDATE "User" SET "tenantId" = "householdId" WHERE "tenantId" IS NULL;
ALTER TABLE "User" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "User_tenantId_createdAtUtc_idx" ON "User"("tenantId", "createdAtUtc");
ALTER TABLE "User"
  ADD CONSTRAINT "User_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChoreAttachment" ADD COLUMN "tenantId" UUID;
UPDATE "ChoreAttachment" AS attachment
SET "tenantId" = instance."householdId"
FROM "ChoreInstance" AS instance
WHERE attachment."choreInstanceId" = instance."id" AND attachment."tenantId" IS NULL;
ALTER TABLE "ChoreAttachment" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "ChoreAttachment_tenantId_createdAtUtc_idx" ON "ChoreAttachment"("tenantId", "createdAtUtc");
ALTER TABLE "ChoreAttachment"
  ADD CONSTRAINT "ChoreAttachment_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD COLUMN "tenantId" UUID;
UPDATE "AuditLog" SET "tenantId" = "householdId" WHERE "tenantId" IS NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "AuditLog_tenantId_createdAtUtc_idx" ON "AuditLog"("tenantId", "createdAtUtc");
ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PointsLedgerEntry" ADD COLUMN "tenantId" UUID;
UPDATE "PointsLedgerEntry" SET "tenantId" = "householdId" WHERE "tenantId" IS NULL;
ALTER TABLE "PointsLedgerEntry" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "PointsLedgerEntry_tenantId_createdAtUtc_idx" ON "PointsLedgerEntry"("tenantId", "createdAtUtc");
ALTER TABLE "PointsLedgerEntry"
  ADD CONSTRAINT "PointsLedgerEntry_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD COLUMN "tenantId" UUID;
UPDATE "Notification" SET "tenantId" = "householdId" WHERE "tenantId" IS NULL;
ALTER TABLE "Notification" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "Notification_tenantId_recipientUserId_createdAtUtc_idx" ON "Notification"("tenantId", "recipientUserId", "createdAtUtc");
ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationPreference" ADD COLUMN "tenantId" UUID;
UPDATE "NotificationPreference" AS preference
SET "tenantId" = "User"."tenantId"
FROM "User"
WHERE preference."userId" = "User"."id" AND preference."tenantId" IS NULL;
ALTER TABLE "NotificationPreference" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "NotificationPreference_tenantId_updatedAtUtc_idx" ON "NotificationPreference"("tenantId", "updatedAtUtc");
ALTER TABLE "NotificationPreference"
  ADD CONSTRAINT "NotificationPreference_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationDevice" ADD COLUMN "tenantId" UUID;
UPDATE "NotificationDevice" AS device
SET "tenantId" = "User"."tenantId"
FROM "User"
WHERE device."userId" = "User"."id" AND device."tenantId" IS NULL;
ALTER TABLE "NotificationDevice" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "NotificationDevice_tenantId_notificationsEnabled_updatedAtUtc_idx" ON "NotificationDevice"("tenantId", "notificationsEnabled", "updatedAtUtc");
ALTER TABLE "NotificationDevice"
  ADD CONSTRAINT "NotificationDevice_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationPushDelivery" ADD COLUMN "tenantId" UUID;
UPDATE "NotificationPushDelivery" AS delivery
SET "tenantId" = notification."tenantId"
FROM "Notification" AS notification
WHERE delivery."notificationId" = notification."id" AND delivery."tenantId" IS NULL;
ALTER TABLE "NotificationPushDelivery" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "NotificationPushDelivery_tenantId_status_updatedAtUtc_idx" ON "NotificationPushDelivery"("tenantId", "status", "updatedAtUtc");
ALTER TABLE "NotificationPushDelivery"
  ADD CONSTRAINT "NotificationPushDelivery_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
