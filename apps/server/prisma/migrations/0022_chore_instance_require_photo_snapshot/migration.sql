ALTER TABLE "ChoreInstance"
ADD COLUMN "requirePhotoProofOverride" BOOLEAN;

UPDATE "ChoreInstance" AS ci
SET "requirePhotoProofOverride" = ct."requirePhotoProof"
FROM "ChoreTemplate" AS ct
WHERE ci."templateId" = ct."id"
  AND ci."requirePhotoProofOverride" IS NULL;
