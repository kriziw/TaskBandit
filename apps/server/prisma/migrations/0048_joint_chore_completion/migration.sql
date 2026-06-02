-- CreateEnum
CREATE TYPE "CoCompleterRole" AS ENUM ('HELPER', 'SUPERVISOR');

-- CreateEnum
CREATE TYPE "JointPointsMode" AS ENUM ('FULL_TO_EACH', 'SPLIT_EQUALLY', 'PRIMARY_PLUS_BONUS');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CHORE_CO_COMPLETER_JOINED';

-- AlterTable: HouseholdSettings joint completion settings
ALTER TABLE "HouseholdSettings"
  ADD COLUMN "jointCompletionEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "jointCompletionPointsMode" "JointPointsMode" NOT NULL DEFAULT 'FULL_TO_EACH',
  ADD COLUMN "jointCompletionHelperBonus" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "jointCompletionOpenJoin" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ChoreInstanceCoCompleter" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "choreInstanceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "CoCompleterRole" NOT NULL,
    "joinedAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChoreInstanceCoCompleter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChoreInstanceCoCompleter_choreInstanceId_userId_key" ON "ChoreInstanceCoCompleter"("choreInstanceId", "userId");

-- AddForeignKey
ALTER TABLE "ChoreInstanceCoCompleter" ADD CONSTRAINT "ChoreInstanceCoCompleter_choreInstanceId_fkey" FOREIGN KEY ("choreInstanceId") REFERENCES "ChoreInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreInstanceCoCompleter" ADD CONSTRAINT "ChoreInstanceCoCompleter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
