ALTER TABLE "ChoreTemplate"
ADD COLUMN "defaultLocale" VARCHAR(5) NOT NULL DEFAULT 'en',
ADD COLUMN "titleTranslations" JSONB,
ADD COLUMN "descriptionTranslations" JSONB;

ALTER TABLE "ChoreTemplateVariant"
ADD COLUMN "labelTranslations" JSONB;
