-- CreateTable
CREATE TABLE "PointsLedgerEntry" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "choreInstanceId" UUID,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PointsLedgerEntry_householdId_createdAtUtc_idx" ON "PointsLedgerEntry"("householdId", "createdAtUtc");

-- CreateIndex
CREATE INDEX "PointsLedgerEntry_userId_createdAtUtc_idx" ON "PointsLedgerEntry"("userId", "createdAtUtc");

-- AddForeignKey
ALTER TABLE "PointsLedgerEntry" ADD CONSTRAINT "PointsLedgerEntry_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsLedgerEntry" ADD CONSTRAINT "PointsLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
