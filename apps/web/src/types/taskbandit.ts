export type RecurrenceStartStrategy = "due_at" | "completed_at";

export type HouseholdRole = "admin" | "parent" | "child";

export type Difficulty = "easy" | "medium" | "hard";

export type RecurrenceType =
  | "none"
  | "daily"
  | "weekly"
  | "every_x_days"
  | "custom_weekly";

export type RecurrenceEndMode = "never" | "after_occurrences" | "on_date";

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

export type ApiStatusResponse = {
  ok: boolean;
  message: string;
};

export type ReleaseInfo = {
  releaseVersion: string;
  buildNumber: string;
  commitSha: string;
};

export type ServerCompatibility = {
  notificationDevices: boolean;
  notificationHealth: boolean;
  takeoverRequests: boolean;
  systemStatus: boolean;
  backupReadiness: boolean;
  notificationRecovery: boolean;
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
  delivery: {
    push: {
      status: "not_configured" | "pending" | "sent" | "failed";
      targetCount: number;
      sentCount: number;
      failedCount: number;
      pendingCount: number;
    };
    email: {
      status: "pending" | "sent" | "failed" | "skipped";
      deliveredAt: string | null;
      attemptedAt: string | null;
      error: string | null;
    };
  };
};

export type TakeoverRequestEntry = {
  id: string;
  choreId: string;
  choreTitle: string;
  status: "PENDING" | "APPROVED" | "DECLINED" | "CANCELLED";
  note: string | null;
  createdAt: string;
  respondedAt: string | null;
  requester: {
    id: string;
    displayName: string;
    role: HouseholdRole;
  };
  requested: {
    id: string;
    displayName: string;
    role: HouseholdRole;
  };
};

export type RuntimeLogEntry = {
  id: string;
  timestamp: string;
  level: "log" | "warn" | "error" | "debug" | "verbose";
  context: string | null;
  message: string;
  stack: string | null;
};

export type HouseholdMember = {
  id: string;
  displayName: string;
  role: HouseholdRole;
  email?: string | null;
  authProviders: Array<"local" | "oidc">;
  localAuthConfigured: boolean;
  points: number;
  currentStreak: number;
};

export type HouseholdSettings = {
  selfSignupEnabled: boolean;
  onboardingCompleted: boolean;
  membersCanSeeFullHouseholdChoreDetails: boolean;
  enablePushNotifications: boolean;
  enableOverduePenalties: boolean;
  localAuthEnabled: boolean;
  localAuthForcedByConfig: boolean;
  localAuthEffective: boolean;
  oidcEnabled: boolean;
  oidcAuthority: string;
  oidcClientId: string;
  oidcClientSecret: string;
  oidcClientSecretConfigured: boolean;
  oidcScope: string;
  oidcEffective: boolean;
  oidcSource: "ui" | "env" | "none";
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUsername: string;
  smtpPassword: string;
  smtpPasswordConfigured: boolean;
  smtpFromEmail: string;
  smtpFromName: string;
};

export type NotificationPreferences = {
  receiveAssignments: boolean;
  receiveReviewUpdates: boolean;
  receiveDueSoonReminders: boolean;
  receiveOverdueAlerts: boolean;
  receiveDailySummary: boolean;
};

export type NotificationDevicePlatform = "android" | "web";
export type NotificationDeviceProvider = "generic" | "fcm" | "web_push";

export type NotificationDevice = {
  id: string;
  installationId: string;
  platform: NotificationDevicePlatform;
  provider: NotificationDeviceProvider;
  pushTokenConfigured: boolean;
  deviceName: string | null;
  appVersion: string | null;
  locale: string | null;
  notificationsEnabled: boolean;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};

export type HouseholdNotificationHealthEntry = {
  userId: string;
  displayName: string;
  role: HouseholdRole;
  email: string | null;
  registeredDeviceCount: number;
  pushReadyDeviceCount: number;
  latestDeviceSeenAt: string | null;
  emailFallbackEligible: boolean;
  deliveryMode: "push" | "email_fallback" | "none";
};

export type AdminSystemStatus = {
  checkedAt: string;
  application: {
    status: "ready";
    port: number;
    serveEmbeddedWeb: boolean;
    corsAllowedOrigins: string[];
    reverseProxyEnabled: boolean;
    reverseProxyPathBase: string | null;
  };
  database: {
    status: "ready" | "error";
    error: string | null;
  };
  storage: {
    status: "ready" | "error";
    rootPath: string;
    runtimeLogFilePath: string;
    error: string | null;
  };
  auth: {
    status: "ready" | "error";
    localAuthEnabled: boolean;
    localAuthForcedByConfig: boolean;
    localAuthEffective: boolean;
    oidcEnabled: boolean;
    oidcEffective: boolean;
    oidcSource: "ui" | "env" | "none";
    oidcAuthority: string;
    oidcClientId: string;
  };
  smtp: {
    status: "ready" | "warning";
    enabled: boolean;
    configured: boolean;
    host: string | null;
    port: number | null;
    secure: boolean;
    fromEmail: string | null;
  };
  push: {
    status: "ready" | "warning";
    householdPushEnabled: boolean;
    serverFcmEnabled: boolean;
    serviceAccountConfigured: boolean;
    serverWebPushEnabled: boolean;
    registeredDeviceCount: number;
    pushReadyDeviceCount: number;
    membersWithPushReadyDevices: number;
    membersUsingEmailFallback: number;
    membersWithoutDeliveryPath: number;
    deliveryWorkerIntervalMs: number;
  };
  emailFallback: {
    status: "ready" | "warning";
    smtpReady: boolean;
    eligibleMemberCount: number;
    activeFallbackMemberCount: number;
    workerIntervalMs: number;
  };
};

export type BackupReadiness = {
  checkedAt: string;
  hostPaths: {
    dataRootHint: string | null;
    postgresDataPathHint: string | null;
    appDataPathHint: string | null;
    composeFileHint: string | null;
    envFileHint: string | null;
  };
  serverPaths: {
    storageRootPath: string;
    runtimeLogFilePath: string;
  };
  exports: {
    householdSnapshotReady: boolean;
    runtimeLogsReady: boolean;
  };
  recovery: {
    localAuthForcedByConfig: boolean;
    oidcUiConfigured: boolean;
    oidcEnvFallbackEnabled: boolean;
    smtpConfigured: boolean;
    pushConfigured: boolean;
  };
};

export type NotificationRecovery = {
  failedPushDeliveries: Array<{
    id: string;
    notificationId: string;
    title: string;
    message: string;
    recipientDisplayName: string;
    deviceName: string | null;
    provider: NotificationDeviceProvider;
    attemptedAt: string | null;
    error: string | null;
    createdAt: string;
  }>;
  failedEmailNotifications: Array<{
    id: string;
    title: string;
    message: string;
    recipientDisplayName: string;
    recipientEmail: string | null;
    attemptedAt: string | null;
    error: string | null;
    createdAt: string;
  }>;
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

export type FollowUpDelayUnit = "hours" | "days";
export type TemplateTranslationLocale = "en" | "de" | "hu";
export type LocalizedTemplateTranslation = {
  locale: TemplateTranslationLocale;
  title?: string;
  description?: string;
};

export type LocalizedVariantLabelTranslation = {
  locale: TemplateTranslationLocale;
  label?: string;
};

export type ChoreTemplateDependencyRule = {
  templateId: string;
  delayValue: number;
  delayUnit: FollowUpDelayUnit;
};

export type ChoreTemplate = {
  id: string;
  title: string;
  description: string;
  defaultLocale: TemplateTranslationLocale;
  translations: LocalizedTemplateTranslation[];
  difficulty: Difficulty;
  basePoints: number;
  assignmentStrategy: AssignmentStrategy;
  recurrence: {
    type: RecurrenceType;
    intervalDays?: number | null;
    weekdays: string[];
  };
  requirePhotoProof: boolean;
  recurrenceStartStrategy: RecurrenceStartStrategy;
  variants: Array<{ id: string; label: string; translations: LocalizedVariantLabelTranslation[] }>;
  checklist: ChoreTemplateChecklistItem[];
  dependencyTemplateIds: string[];
  dependencyRules: ChoreTemplateDependencyRule[];
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
  cycleId: string | null;
  title: string;
  typeTitle: string;
  subtypeLabel: string | null;
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
  completedAt: string | null;
  cancelledAt: string | null;
  submittedAt: string | null;
  submittedById: string | null;
  submissionNote: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
  reviewNote: string | null;
  variantId: string | null;
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
    forcedByConfig: boolean;
    selfSignupEnabled: boolean;
  };
  oidc: {
    enabled: boolean;
    authority: string;
    clientId: string;
    source: "ui" | "env" | "none";
  };
};

export type SignupInput = {
  displayName: string;
  email: string;
  password: string;
};

export type CreateHouseholdMemberInput = {
  displayName: string;
  role: "parent" | "child";
  email: string;
  password: string;
  sendInviteEmail?: boolean;
};

export type CreateHouseholdMemberResult = {
  household: Household;
  inviteEmailSent: boolean;
};

export type UpdateHouseholdMemberInput = {
  displayName: string;
  role: "parent" | "child";
  email: string;
  password?: string;
};

export type CreateChoreTemplateInput = {
  defaultLocale?: TemplateTranslationLocale;
  title: string;
  description: string;
  translations?: LocalizedTemplateTranslation[];
  difficulty: Difficulty;
  assignmentStrategy: AssignmentStrategy;
  recurrenceType?: RecurrenceType;
  recurrenceIntervalDays?: number;
  recurrenceWeekdays?: string[];
  requirePhotoProof: boolean;
  recurrenceStartStrategy?: RecurrenceStartStrategy;
  variants?: Array<{ id?: string; label: string; translations?: LocalizedVariantLabelTranslation[] }>;
  dependencyTemplateIds?: string[];
  dependencyRules?: ChoreTemplateDependencyRule[];
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
  variantId?: string;
  assignmentStrategy?: AssignmentStrategy;
  recurrenceType?: RecurrenceType;
  recurrenceIntervalDays?: number;
  recurrenceEndMode?: RecurrenceEndMode;
  recurrenceOccurrences?: number;
  recurrenceEndsAt?: string;
  suppressRecurrence?: boolean;
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

export type DashboardSyncToken = {
  token: string;
  expiresInSeconds: number;
};

export type WebPushPublicKeyResponse = {
  supported: boolean;
  publicKey: string | null;
  platform: "web_push";
  householdId: string;
};
