ALTER TABLE "ChoreTemplate"
ADD COLUMN "groupTitle" VARCHAR(120);

ALTER TABLE "ChoreTemplate"
ADD COLUMN "groupTitleTranslations" JSONB;

UPDATE "ChoreTemplate"
SET "groupTitle" = 'General'
WHERE "groupTitle" IS NULL;

ALTER TABLE "ChoreTemplate"
ALTER COLUMN "groupTitle" SET NOT NULL;
