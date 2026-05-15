ALTER TABLE "HouseholdSettings"
ADD COLUMN "quickLogPointsDefault" INTEGER;

ALTER TABLE "ChoreInstance"
ALTER COLUMN "templateId" DROP NOT NULL;

ALTER TABLE "ChoreInstance"
DROP CONSTRAINT "ChoreInstance_templateId_fkey";

ALTER TABLE "ChoreInstance"
ADD CONSTRAINT "ChoreInstance_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "ChoreTemplate"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
