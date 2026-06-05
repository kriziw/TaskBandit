-- CreateEnum
CREATE TYPE "TemplateAudience" AS ENUM ('ALL', 'ADULTS', 'CHILDREN');

-- AlterTable: add audience column to ChoreTemplate, defaulting all existing rows to ALL
ALTER TABLE "ChoreTemplate" ADD COLUMN "audience" "TemplateAudience" NOT NULL DEFAULT 'ALL';
