ALTER TABLE "HouseholdSettings"
ADD COLUMN "localAuthEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "oidcEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "oidcAuthority" TEXT,
ADD COLUMN "oidcClientId" TEXT,
ADD COLUMN "oidcClientSecret" TEXT,
ADD COLUMN "oidcScope" TEXT NOT NULL DEFAULT 'openid profile email';
