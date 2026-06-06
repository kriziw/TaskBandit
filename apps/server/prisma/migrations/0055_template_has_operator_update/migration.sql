-- AlterTable: track whether a skipped operator push contained content
-- that differs from the tenant's current template version.
-- Only set to true when an operator push is skipped AND content changed;
-- cleared on update, force-push, user edit, and restore-to-default.
ALTER TABLE "ChoreTemplate" ADD COLUMN "hasOperatorUpdate" BOOLEAN NOT NULL DEFAULT false;
