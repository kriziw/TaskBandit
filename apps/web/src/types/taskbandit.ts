export type HouseholdRole = "admin" | "parent" | "child";

export type Difficulty = "easy" | "medium" | "hard";

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

export type HouseholdMember = {
  id: string;
  displayName: string;
  role: HouseholdRole;
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
  checklistCompletionIds: string[];
  attachments: ChoreAttachment[];
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
