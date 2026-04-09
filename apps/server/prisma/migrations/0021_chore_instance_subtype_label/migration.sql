ALTER TABLE "ChoreInstance"
ADD COLUMN "subtypeLabel" TEXT;

UPDATE "ChoreInstance" AS ci
SET "subtypeLabel" = ctv."label"
FROM "ChoreTemplateVariant" AS ctv
WHERE ci."variantId" = ctv."id"
  AND ci."subtypeLabel" IS NULL;
