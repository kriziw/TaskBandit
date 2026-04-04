CREATE TYPE "FollowUpDelayUnit" AS ENUM ('HOURS', 'DAYS');

ALTER TABLE "ChoreTemplateDependency"
ADD COLUMN "followUpDelayValue" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "followUpDelayUnit" "FollowUpDelayUnit" NOT NULL DEFAULT 'HOURS';
