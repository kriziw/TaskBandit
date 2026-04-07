-- CreateEnum
CREATE TYPE "RecurrenceStartStrategy" AS ENUM ('DUE_AT', 'COMPLETED_AT');

-- CreateTable
CREATE TABLE "ChoreTemplateVariant" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChoreTemplateVariant_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ChoreTemplate"
ADD COLUMN "recurrenceStartStrategy" "RecurrenceStartStrategy" NOT NULL DEFAULT 'DUE_AT';

-- AlterTable
ALTER TABLE "ChoreInstance"
ADD COLUMN "recurrenceStartStrategyOverride" "RecurrenceStartStrategy",
ADD COLUMN "variantId" UUID;

-- AddForeignKey
ALTER TABLE "ChoreTemplateVariant" ADD CONSTRAINT "ChoreTemplateVariant_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChoreTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreInstance" ADD CONSTRAINT "ChoreInstance_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ChoreTemplateVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
