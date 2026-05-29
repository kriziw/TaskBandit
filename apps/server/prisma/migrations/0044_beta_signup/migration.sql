-- Add beta signup fields to Tenant
ALTER TABLE "Tenant" ADD COLUMN "isBeta" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN "betaSignupRequestId" UUID;

-- CreateEnum
CREATE TYPE "BetaSignupStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable: BetaSignupRequest
CREATE TABLE "BetaSignupRequest" (
    "id"                    UUID NOT NULL,
    "email"                 TEXT NOT NULL,
    "displayName"           TEXT NOT NULL,
    "phone"                 TEXT NOT NULL,
    "householdName"         TEXT NOT NULL,
    "householdSizeEstimate" INTEGER,
    "billingAddressLine1"   TEXT NOT NULL,
    "billingCity"           TEXT NOT NULL,
    "billingPostalCode"     TEXT NOT NULL,
    "billingCountry"        TEXT NOT NULL,
    "message"               TEXT,
    "status"                "BetaSignupStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason"       TEXT,
    "packageCode"           TEXT,
    "createdAtUtc"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAtUtc"         TIMESTAMP(3),
    "provisionedTenantId"   UUID,

    CONSTRAINT "BetaSignupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BetaSignupRequest_email_key" ON "BetaSignupRequest"("email");
CREATE INDEX "BetaSignupRequest_status_createdAtUtc_idx" ON "BetaSignupRequest"("status", "createdAtUtc");

-- CreateTable: BetaSignupSettings (singleton, id always = 1)
CREATE TABLE "BetaSignupSettings" (
    "id"                 INTEGER NOT NULL DEFAULT 1,
    "defaultPackageCode" TEXT NOT NULL DEFAULT 'free',

    CONSTRAINT "BetaSignupSettings_pkey" PRIMARY KEY ("id")
);
