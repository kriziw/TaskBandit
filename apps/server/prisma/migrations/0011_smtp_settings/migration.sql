ALTER TABLE "HouseholdSettings"
ADD COLUMN "smtpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "smtpHost" TEXT,
ADD COLUMN "smtpPort" INTEGER,
ADD COLUMN "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "smtpUsername" TEXT,
ADD COLUMN "smtpPassword" TEXT,
ADD COLUMN "smtpFromEmail" TEXT,
ADD COLUMN "smtpFromName" TEXT;
