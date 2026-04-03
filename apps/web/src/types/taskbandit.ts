export type HouseholdRole = "admin" | "parent" | "child";

export type Difficulty = "easy" | "medium" | "hard";

export type RecurrenceType =
  | "none"
  | "daily"
  | "weekly"
  | "every_x_days"
  | "custom_weekly";

export type ChoreState =
  | "open"
  | "assigned"
  | "in_progress"
  | "pending_approval"
  | "needs_fixes"
  | "completed"
  | "overdue"
  | "cancelled";

export type AuthenticatedUser = {
  id: string;
  householdId: string;
  displayName: string;
  role: HouseholdRole;
  email: string | null;
  points: number;
  currentStreak: number;
};

export type AuthResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  user: {
    id: string;
    householdId: string;
    role: HouseholdRole;
    email: string | null;
  };
};

export type DashboardSummary = {
  pendingApprovals: number;
  activeChores: number;
  streakLeader: string;
  leaderboard: HouseholdMember[];
};

export type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  createdAt: string;
  actor: {
    id: string;
    displayName: string;
    role: HouseholdRole;
  } | null;
};

export type PointsLedgerEntry = {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  createdAt: string;
  choreInstanceId: string | null;
  user: {
    id: string;
    displayName: string;
    role: HouseholdRole;
  };
};

export type NotificationEntry = {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
};

export type HouseholdMember = {
  id: string;
  displayName: string;
  role: HouseholdRole;
  email?: string | null;
  points: number;
  currentStreak: number;
};

export type HouseholdSettings = {
  selfSignupEnabled: boolean;
  membersCanSeeFullHouseholdChoreDetails: boolean;
  enablePushNotifications: boolean;
  enableOverduePenalties: boolean;
};

export type Household = {
  householdId: string;
  name: string;
  settings: HouseholdSettings;
  members: HouseholdMember[];
};

export type ChoreTemplateChecklistItem = {
  id: string;
  title: string;
  required: boolean;
};

export type AssignmentStrategy =
  | "round_robin"
  | "least_completed_recently"
  | "highest_streak"
  | "manual_default_assignee";

export type ChoreTemplate = {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  basePoints: number;
  assignmentStrategy: AssignmentStrategy;
  recurrence: {
    type: RecurrenceType;
    intervalDays?: number | null;
    weekdays: string[];
  };
  requirePhotoProof: boolean;
  checklist: ChoreTemplateChecklistItem[];
  dependencyTemplateIds: string[];
};

export type ChoreAttachment = {
  id: string;
  clientFilename: string;
  contentType: string | null;
  storageKey: string | null;
  createdAt: string;
};

export type ChoreInstance = {
  id: string;
  templateId: string;
  title: string;
  state: ChoreState;
  assigneeId: string | null;
  dueAt: string;
  difficulty: Difficulty;
  basePoints: number;
  requirePhotoProof: boolean;
  awardedPoints: number;
  completedChecklistItems: number;
  isOverdue: boolean;
  attachmentCount: number;
  submittedAt: string | null;
  submittedById: string | null;
  submissionNote: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
  reviewNote: string | null;
  checklist: ChoreTemplateChecklistItem[];
  checklistCompletionIds: string[];
  attachments: ChoreAttachment[];
};

export type UploadedProof = {
  clientFilename: string;
  contentType: string;
  storageKey: string;
  sizeBytes: number;
};

export type AuthProviders = {
  local: {
    enabled: boolean;
  };
  oidc: {
    enabled: boolean;
    authority: string;
    clientId: string;
  };
};

export type CreateHouseholdMemberInput = {
  displayName: string;
  role: "parent" | "child";
  email: string;
  password: string;
};

export type CreateChoreTemplateInput = {
  title: string;
  description: string;
  difficulty: Difficulty;
  assignmentStrategy: AssignmentStrategy;
  recurrenceType?: RecurrenceType;
  recurrenceIntervalDays?: number;
  recurrenceWeekdays?: string[];
  requirePhotoProof: boolean;
  dependencyTemplateIds?: string[];
  checklist?: Array<{
    title: string;
    required: boolean;
  }>;
};

export type CreateChoreInstanceInput = {
  templateId: string;
  assigneeId?: string;
  title?: string;
  dueAt: string;
};

export type BootstrapStatus = {
  isBootstrapped: boolean;
  householdCount: number;
};

export type BootstrapHouseholdInput = {
  householdName: string;
  ownerDisplayName: string;
  ownerEmail: string;
  ownerPassword: string;
  selfSignupEnabled: boolean;
};
