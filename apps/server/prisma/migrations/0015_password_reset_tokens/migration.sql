CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "authIdentityId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAtUtc" TIMESTAMP(3) NOT NULL,
    "usedAtUtc" TIMESTAMP(3),
    "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_authIdentityId_expiresAtUtc_idx" ON "PasswordResetToken"("authIdentityId", "expiresAtUtc");

ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_authIdentityId_fkey" FOREIGN KEY ("authIdentityId") REFERENCES "AuthIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
