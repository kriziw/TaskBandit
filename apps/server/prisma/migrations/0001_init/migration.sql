-- CreateEnum
CREATE TYPE "HouseholdRole" AS ENUM ('ADMIN', 'PARENT', 'CHILD');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'OIDC');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "ChoreState" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'NEEDS_FIXES', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssignmentStrategyType" AS ENUM ('ROUND_ROBIN', 'LEAST_COMPLETED_RECENTLY', 'HIGHEST_STREAK', 'MANUAL_DEFAULT_ASSIGNEE');

-- CreateTable
CREATE TABLE "Household" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdSettings" (
    "householdId" UUID NOT NULL,
    "selfSignupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "membersCanSeeFullHouseholdChoreDetails" BOOLEAN NOT NULL DEFAULT true,
    "enablePushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "enableOverduePenalties" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "HouseholdSettings_pkey" PRIMARY KEY ("householdId")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "HouseholdRole" NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthIdentity" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerSubject" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAtUtc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreTemplate" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "basePoints" INTEGER NOT NULL,
    "assignmentStrategy" "AssignmentStrategyType" NOT NULL,
    "requirePhotoProof" BOOLEAN NOT NULL DEFAULT false,
    "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChoreTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreTemplateChecklistItem" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "ChoreTemplateChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreTemplateDependency" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "followUpTemplateId" UUID NOT NULL,

    CONSTRAINT "ChoreTemplateDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreInstance" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "state" "ChoreState" NOT NULL,
    "assigneeId" UUID,
    "dueAtUtc" TIMESTAMP(3) NOT NULL,
    "awardedPoints" INTEGER NOT NULL DEFAULT 0,
    "attachmentCount" INTEGER NOT NULL DEFAULT 0,
    "completedChecklistItems" INTEGER NOT NULL DEFAULT 0,
    "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAtUtc" TIMESTAMP(3),
    "submittedById" UUID,
    "submissionNote" TEXT,
    "completedAtUtc" TIMESTAMP(3),
    "completedById" UUID,
    "reviewedAtUtc" TIMESTAMP(3),
    "reviewedById" UUID,
    "reviewNote" TEXT,

    CONSTRAINT "ChoreInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreChecklistCompletion" (
    "id" UUID NOT NULL,
    "choreInstanceId" UUID NOT NULL,
    "checklistItemId" UUID NOT NULL,
    "completedById" UUID NOT NULL,
    "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChoreChecklistCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreAttachment" (
    "id" UUID NOT NULL,
    "choreInstanceId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "clientFilename" TEXT NOT NULL,
    "contentType" TEXT,
    "storageKey" TEXT,
    "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChoreAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthIdentity_provider_providerSubject_key" ON "AuthIdentity"("provider", "providerSubject");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identity_email_unique" ON "AuthIdentity"("email");

-- CreateIndex
CREATE UNIQUE INDEX "chore_checklist_completion_unique" ON "ChoreChecklistCompletion"("choreInstanceId", "checklistItemId");

-- AddForeignKey
ALTER TABLE "HouseholdSettings" ADD CONSTRAINT "HouseholdSettings_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreTemplate" ADD CONSTRAINT "ChoreTemplate_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreTemplateChecklistItem" ADD CONSTRAINT "ChoreTemplateChecklistItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChoreTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreTemplateDependency" ADD CONSTRAINT "ChoreTemplateDependency_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChoreTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreInstance" ADD CONSTRAINT "ChoreInstance_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreInstance" ADD CONSTRAINT "ChoreInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChoreTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreChecklistCompletion" ADD CONSTRAINT "ChoreChecklistCompletion_choreInstanceId_fkey" FOREIGN KEY ("choreInstanceId") REFERENCES "ChoreInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreChecklistCompletion" ADD CONSTRAINT "ChoreChecklistCompletion_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ChoreTemplateChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreAttachment" ADD CONSTRAINT "ChoreAttachment_choreInstanceId_fkey" FOREIGN KEY ("choreInstanceId") REFERENCES "ChoreInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

