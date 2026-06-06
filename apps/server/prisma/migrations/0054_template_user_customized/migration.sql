-- AlterTable: add userCustomized flag to ChoreTemplate
-- Tracks whether a household member has edited an operator-seeded template.
-- When true, operator template pushes will skip this record to preserve
-- the household's customisations.
ALTER TABLE "ChoreTemplate" ADD COLUMN "userCustomized" BOOLEAN NOT NULL DEFAULT false;
