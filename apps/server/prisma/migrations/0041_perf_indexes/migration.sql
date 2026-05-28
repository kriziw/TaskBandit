-- Add missing FK / filter indexes that were absent from the initial schema.
-- These are frequently queried columns that lack explicit indexes.

-- AuthIdentity.userId: looked up on every JWT validation to resolve the user's identity
CREATE INDEX "AuthIdentity_userId_idx" ON "AuthIdentity"("userId");

-- ChoreTemplate.householdId: every template listing query filters by household
CREATE INDEX "ChoreTemplate_householdId_idx" ON "ChoreTemplate"("householdId");

-- ChoreInstance.assigneeId: dashboard and "my chores" views filter by assignee
CREATE INDEX "ChoreInstance_assigneeId_idx" ON "ChoreInstance"("assigneeId");

-- User.householdId: member listings and leaderboard queries filter by household
CREATE INDEX "User_householdId_idx" ON "User"("householdId");
