CREATE TYPE "ChoreTakeoverRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED');

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHORE_TAKEOVER_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHORE_TAKEOVER_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHORE_TAKEOVER_DECLINED';

CREATE TABLE "ChoreTakeoverRequest" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "choreInstanceId" UUID NOT NULL,
    "requesterUserId" UUID NOT NULL,
    "requestedUserId" UUID NOT NULL,
    "status" "ChoreTakeoverRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAtUtc" TIMESTAMP(3),

    CONSTRAINT "ChoreTakeoverRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChoreTakeoverRequest_requestedUserId_status_createdAtUtc_idx" ON "ChoreTakeoverRequest"("requestedUserId", "status", "createdAtUtc");
CREATE INDEX "ChoreTakeoverRequest_choreInstanceId_status_createdAtUtc_idx" ON "ChoreTakeoverRequest"("choreInstanceId", "status", "createdAtUtc");
CREATE INDEX "ChoreTakeoverRequest_householdId_createdAtUtc_idx" ON "ChoreTakeoverRequest"("householdId", "createdAtUtc");

ALTER TABLE "ChoreTakeoverRequest"
ADD CONSTRAINT "ChoreTakeoverRequest_householdId_fkey"
FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChoreTakeoverRequest"
ADD CONSTRAINT "ChoreTakeoverRequest_choreInstanceId_fkey"
FOREIGN KEY ("choreInstanceId") REFERENCES "ChoreInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChoreTakeoverRequest"
ADD CONSTRAINT "ChoreTakeoverRequest_requesterUserId_fkey"
FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChoreTakeoverRequest"
ADD CONSTRAINT "ChoreTakeoverRequest_requestedUserId_fkey"
FOREIGN KEY ("requestedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
