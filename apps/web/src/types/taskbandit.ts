export type RecurrenceStartStrategy = 'due_at' | 'completed_at';

export type HouseholdRole = 'admin' | 'parent' | 'child';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'every_x_days' | 'custom_weekly';

export type RecurrenceEndMode = 'never' | 'after_occurrences' | 'on_date';

export type ChoreState =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'deferred'
  | 'pending_approval'
  | 'needs_fixes'
  | 'completed'
  | 'overdue'
  | 'cancelled';

export type AuthenticatedUser = {
  id: string;
  tenantId: string;
  householdId: string;
  displayName: string;
  role: HouseholdRole;
  email: string | null;
  points: number;
  currentStreak: number;
  featureAccess: {
    templates_manage: boolean;
    chores_manage: boolean;
    reassignment: boolean;
    takeover_direct: boolean;
    takeover_requests: boolean;
    approvals: boolean;
    proof_uploads: boolean;
    follow_up_automation: boolean;
    external_completion: boolean;
    deferred_follow_up_control: boolean;
    quick_log: boolean;
    rewards_manage: boolean;
    mastery: boolean;
  };
};

export type AuthResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  tenantContext?: {
    tenantId: string;
    tenantSlug: string | null;
    hostedMode: boolean;
    canonicalApiBaseUrl: string | null;
    canonicalWebBaseUrl: string | null;
  };
  user: {
    id: string;
    tenantId: string;
    householdId: string;
    role: HouseholdRole;
    email: string | null;
  };
};

export type HostedSubscriptionOverview = {
  hostedMode: boolean;
  tenantId?: string;
  tenantSlug?: string | null;
  planCode?: string;
  packageCode?: string;
  packageDisplayName?: string;
  lifecycleState?: string;
  entitlementState?: string;
  billingStatus?: string;
  suspensionReason?: string | null;
  trialEndsAt?: string | null;
  graceEndsAt?: string | null;
  quotaPolicyVersion?: string;
  configVersion?: string;
  updatedAt?: string | null;
  quotas?: {
    membersLimit: number | null;
    storageBytesLimit: number | null;
    monthlyNotificationLimit: number | null;
    exportRetentionDays: number | null;
    proofRetentionDays: number | null;
    auditRetentionDays: number | null;
    customDomainEnabled: boolean | null;
    brandingEnabled: boolean | null;
  };
  usage?: {
    membersUsed: number;
    storageBytesUsed: number;
    monthlyNotificationsUsed: number;
  };
  featureAccess?: AuthenticatedUser['featureAccess'];
  canonicalApiBaseUrl?: string | null;
  canonicalWebBaseUrl?: string | null;
};

export type ApiStatusResponse = {
  ok: boolean;
  message: string;
};

export type ReleaseInfo = {
  releaseVersion: string;
  buildNumber: string;
  commitSha: string;
  imageTag?: string | null;
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
  leaderboard: Array<HouseholdMember & { isExternal?: boolean }>;
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
      status: 'not_configured' | 'pending' | 'sent' | 'failed';
      targetCount: number;
      sentCount: number;
      failedCount: number;
      pendingCount: number;
    };
    email: {
      status: 'pending' | 'sent' | 'failed' | 'skipped';
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
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'CANCELLED';
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
  level: 'log' | 'warn' | 'error' | 'debug' | 'verbose';
  context: string | null;
  message: string;
  stack: string | null;
};

export type HouseholdMember = {
  id: string;
  displayName: string;
  role: HouseholdRole;
  email?: string | null;
  authProviders: Array<'local' | 'oidc'>;
  localAuthConfigured: boolean;
  points: number;
  leaderboardPoints: number;
  currentStreak: number;
};

export type Achievement = {
  key: string;
  name: string;
  descriptionKey: string;
  category: string;
  isRepeatable: boolean;
  goal: number;
  bonusPoints: number;
  sortOrder: number;
  progress: number;
  earnedAt: string | null;
  timesEarned: number;
};

export type AchievementHouseholdEntry = Achievement & {
  userProgress: Array<{
    userId: string;
    displayName: string;
    progress: number;
    earnedAt: string | null;
    timesEarned: number;
  }>;
};

export type UnlockedAchievement = {
  key: string;
  name: string;
  descriptionKey: string;
  category: string;
  bonusPoints: number;
  timesEarned: number;
};

export type LeaderboardResetMode = 'never' | 'weekly' | 'monthly' | 'quarterly';

export type OnboardingAnswers = {
  householdType: 'solo' | 'couple' | 'family' | 'flatmates';
  childAges?: ('under_5' | '5_10' | '11_15' | '16_plus')[];
  homeType: 'flat' | 'house' | 'house_garden' | 'house_garden_lawn';
  appliances: ('dishwasher' | 'tumble_dryer' | 'washing_machine' | 'robot_vacuum')[];
  pets: ('none' | 'dog' | 'cat' | 'other')[];
  cookingStyle: 'one_person' | 'take_turns' | 'mostly_takeout' | 'mixed';
  gamificationStyle: 'track_only' | 'light' | 'full' | 'default';
};

export type OnboardingResult = {
  selectedTemplateCount: number;
  selectedTemplateKeys: string[];
  appliedSettings: Record<string, unknown>;
};

export type JointPointsMode = 'FULL_TO_EACH' | 'SPLIT_EQUALLY' | 'PRIMARY_PLUS_BONUS';
export type CoCompleterRole = 'HELPER' | 'SUPERVISOR';

export type ChoreCoCompleter = {
  id: string;
  userId: string;
  role: CoCompleterRole;
  joinedAt: string;
  user: { id: string; displayName: string; role: string };
};

export type HouseholdSettings = {
  selfSignupEnabled: boolean;
  onboardingCompleted: boolean;
  membersCanSeeFullHouseholdChoreDetails: boolean;
  quickLogPointsDefault: number | null;
  enablePushNotifications: boolean;
  enableOverduePenalties: boolean;
  enableAchievements: boolean;
  requireRewardApproval: boolean;
  takeoverPointsDelta: number;
  leaderboardResetMode: LeaderboardResetMode;
  lastLeaderboardResetAt: string | null;
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
  oidcSource: 'ui' | 'env' | 'control_plane' | 'none';
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUsername: string;
  smtpPassword: string;
  smtpPasswordConfigured: boolean;
  smtpFromEmail: string;
  smtpFromName: string;
  timezone: string;
  jointCompletionEnabled: boolean;
  jointCompletionPointsMode: JointPointsMode;
  jointCompletionHelperBonus: number;
  jointCompletionOpenJoin: boolean;
  onboardingAnswers: Record<string, unknown> | null;
};

export type NotificationPreferences = {
  receiveAssignments: boolean;
  receiveReviewUpdates: boolean;
  receiveDueSoonReminders: boolean;
  receiveOverdueAlerts: boolean;
  receiveDailySummary: boolean;
};

export type RewardCategory =
  | 'SCREEN_TIME'
  | 'ALLOWANCE'
  | 'TREAT'
  | 'ACTIVITY'
  | 'PRIVILEGE'
  | 'CUSTOM';
export type RewardRedemptionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type RewardEligibility = 'CHILD_ONLY' | 'ALL' | 'ADULT_ONLY';
export type RewardWorkflowType = 'STANDARD' | 'DAILY_EXCLUSIVE';

export type Reward = {
  id: string;
  catalogKey: string | null;
  isOperatorManaged: boolean;
  isEnabled: boolean;
  title: string;
  description: string | null;
  category: RewardCategory;
  eligibility: RewardEligibility;
  icon: string | null;
  pointCost: number;
  maxRedemptionsPerChild: number | null;
  cooldownDays: number | null;
  workflowType: RewardWorkflowType;
  /** Approved bookings with targetDate >= today, sorted by date ascending. */
  upcomingClaims: UpcomingClaim[];
};

export type UpcomingClaim = {
  redemptionId: string;
  userId: string;
  displayName: string;
  targetDate: string; // 'YYYY-MM-DD'
};

export type RewardRedemption = {
  id: string;
  reward: Reward;
  requestedBy: HouseholdMember;
  status: RewardRedemptionStatus;
  requestedAtUtc: string;
  resolvedAtUtc: string | null;
  resolvedBy: HouseholdMember | null;
  adminNote: string | null;
  pointsDeducted: number;
  targetDate: string | null; // 'YYYY-MM-DD', present for DAILY_EXCLUSIVE
};

export type NotificationDevicePlatform = 'android' | 'web';
export type NotificationDeviceProvider = 'generic' | 'fcm' | 'web_push';

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
  deliveryMode: 'push' | 'email_fallback' | 'none';
};

export type AdminSystemStatus = {
  checkedAt: string;
  application: {
    status: 'ready';
    port: number;
    serveEmbeddedWeb: boolean;
    corsAllowedOrigins: string[];
    reverseProxyEnabled: boolean;
    reverseProxyPathBase: string | null;
  };
  database: {
    status: 'ready' | 'error';
    error: string | null;
  };
  storage: {
    status: 'ready' | 'error';
    rootPath: string;
    runtimeLogFilePath: string;
    runtimeLogMaxFileSizeMb: number;
    runtimeLogMaxTotalSizeMb: number;
    dockerLogMaxSize: string;
    dockerLogMaxFiles: number;
    error: string | null;
  };
  auth: {
    status: 'ready' | 'error';
    localAuthEnabled: boolean;
    localAuthForcedByConfig: boolean;
    localAuthEffective: boolean;
    oidcEnabled: boolean;
    oidcEffective: boolean;
    oidcSource: 'ui' | 'env' | 'control_plane' | 'none';
    oidcAuthority: string;
    oidcClientId: string;
  };
  smtp: {
    status: 'ready' | 'warning';
    enabled: boolean;
    configured: boolean;
    host: string | null;
    port: number | null;
    secure: boolean;
    fromEmail: string | null;
  };
  push: {
    status: 'ready' | 'warning';
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
    status: 'ready' | 'warning';
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

export type AssignmentStrategy = 'round_robin' | 'least_completed_recently' | 'highest_streak';

export type ChoreAssignmentReason =
  | 'round_robin'
  | 'least_completed_recently'
  | 'highest_streak'
  | 'manual'
  | 'claimed'
  | 'sticky_follow_up'
  | 'rebalanced';

export type FollowUpDelayUnit = 'hours' | 'days';
export type TemplateTranslationLocale = 'en' | 'de' | 'hu';
export type LocalizedTemplateTranslation = {
  locale: TemplateTranslationLocale;
  groupTitle?: string;
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

export type ChoreTemplateMastery = {
  disabled: boolean;
  level1Threshold: number;
  level2Threshold: number;
  level2BonusPercentage: number;
};

export type ChoreTemplate = {
  id: string;
  groupTitle: string;
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
  stickyFollowUpAssignee: boolean;
  recurrenceStartStrategy: RecurrenceStartStrategy;
  variants: Array<{ id: string; label: string; translations: LocalizedVariantLabelTranslation[] }>;
  checklist: ChoreTemplateChecklistItem[];
  dependencyTemplateIds: string[];
  dependencyRules: ChoreTemplateDependencyRule[];
  mastery?: ChoreTemplateMastery;
};

export type ChoreAttachment = {
  id: string;
  clientFilename: string;
  contentType: string | null;
  storageKey: string | null;
  createdAt: string;
};

export type CompletionMilestone = {
  type: 'perfect_day';
  userId: string;
  dayKey: string;
  completedChoreCount: number;
  messageIndex: number;
};

export type ChoreInstance = {
  id: string;
  templateId: string | null;
  cycleId: string | null;
  occurrenceRootId: string;
  title: string;
  groupTitle: string;
  typeTitle: string;
  subtypeLabel: string | null;
  state: ChoreState;
  supportsOccurrenceCancellation: boolean;
  supportsSeriesCancellation: boolean;
  assigneeId: string | null;
  assigneeDisplayName?: string | null;
  assignmentReason: ChoreAssignmentReason | null;
  dueAt: string;
  difficulty: Difficulty;
  basePoints: number;
  requirePhotoProof: boolean;
  awardedPoints: number;
  completedChecklistItems: number;
  isOverdue: boolean;
  attachmentCount: number;
  notBeforeAt: string | null;
  deferredReason: string | null;
  dependencySourceInstanceId: string | null;
  completedAt: string | null;
  completedByExternal: boolean;
  externalCompleterName: string | null;
  externalCompletionNote: string | null;
  cancelledAt: string | null;
  submittedAt: string | null;
  submittedById: string | null;
  submissionNote: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
  reviewNote: string | null;
  variantId: string | null;
  recurrenceEndMode: RecurrenceEndMode | null;
  recurrenceOccurrences: number | null;
  recurrenceEndsAt: string | null;
  checklist: ChoreTemplateChecklistItem[];
  checklistCompletionIds: string[];
  attachments: ChoreAttachment[];
  coCompleters?: ChoreCoCompleter[];
  userMasteryLevel?: number;
  masteryResult?: { earned: boolean; newLevel: number; bonusPoints: number };
  completionMilestone?: CompletionMilestone | null;
  newlyUnlockedAchievements?: UnlockedAchievement[];
  triggerInfo?: {
    title: string;
    completedAt: string | null;
    completedByDisplayName: string | null;
    completedByExternal: boolean;
    externalCompleterName: string | null;
  } | null;
};

export type QuickLogInput = {
  instanceId?: string;
  templateId?: string;
  title?: string;
  note?: string;
  createTemplateFromEntry?: boolean;
  pointsOverride?: number;
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
    householdId: string | null;
    selfSignupEnabled: boolean;
  };
  oidc: {
    enabled: boolean;
    authority: string;
    clientId: string;
    source: 'ui' | 'env' | 'none';
  };
};

export type SignupInput = {
  displayName: string;
  email: string;
  password: string;
};

export type CreateHouseholdMemberInput = {
  displayName: string;
  role: 'parent' | 'child';
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
  role: 'parent' | 'child';
  email: string;
  password?: string;
};

export type MasteryStats = {
  templateId: string;
  templateTitle: string;
  groupTitle: string;
  completionCount: number;
  masteryLevel: number;
  level1AwardedAt: string | null;
  level2AwardedAt: string | null;
  masteryLevel1Threshold: number;
  masteryLevel2Threshold: number;
  masteryLevel2BonusPercentage: number;
  masteryDisabled: boolean;
};

export type CreateChoreTemplateInput = {
  defaultLocale?: TemplateTranslationLocale;
  groupTitle: string;
  title: string;
  description: string;
  translations?: LocalizedTemplateTranslation[];
  difficulty: Difficulty;
  assignmentStrategy: AssignmentStrategy;
  recurrenceType?: RecurrenceType;
  recurrenceIntervalDays?: number;
  recurrenceWeekdays?: string[];
  requirePhotoProof: boolean;
  stickyFollowUpAssignee?: boolean;
  recurrenceStartStrategy?: RecurrenceStartStrategy;
  variants?: Array<{
    id?: string;
    label: string;
    translations?: LocalizedVariantLabelTranslation[];
  }>;
  dependencyTemplateIds?: string[];
  dependencyRules?: ChoreTemplateDependencyRule[];
  checklist?: Array<{
    title: string;
    required: boolean;
  }>;
  masteryDisabled?: boolean;
  masteryLevel1Threshold?: number;
  masteryLevel2Threshold?: number;
  masteryLevel2BonusPercentage?: number;
};

export type CreateChoreInstanceInput = {
  templateId: string;
  assigneeId?: string;
  title?: string;
  dueAt: string;
  variantId?: string;
  assignmentStrategy?: AssignmentStrategy;
  reassignAutomatically?: boolean;
  recurrenceType?: RecurrenceType;
  recurrenceIntervalDays?: number;
  recurrenceWeekdays?: string[];
  recurrenceEndMode?: RecurrenceEndMode;
  recurrenceOccurrences?: number;
  recurrenceEndsAt?: string;
  suppressRecurrence?: boolean;
};

export type BootstrapStatus = {
  isBootstrapped: boolean;
  householdCount: number;
  /** URL of the control plane public-site register page. When set in hosted mode, the login panel shows a "Request access" link. */
  betaSignupUrl?: string | null;
};

export type BootstrapHouseholdInput = {
  householdName: string;
  ownerDisplayName: string;
  ownerEmail: string;
  ownerPassword: string;
  selfSignupEnabled: boolean;
  starterTemplateKeys?: string[];
};

export type BootstrapStarterTemplateOption = {
  key: string;
  groupTitle: string;
  title: string;
  description: string;
  recommended: boolean;
  followUps: Array<{
    key: string;
    title: string;
  }>;
};

export type DashboardSyncToken = {
  token: string;
  expiresInSeconds: number;
};

export type WebPushPublicKeyResponse = {
  supported: boolean;
  publicKey: string | null;
  platform: 'web_push';
  householdId: string;
};

export type DashboardPayload = {
  currentUser: AuthenticatedUser;
  dashboard: DashboardSummary;
  household: Household;
  auditLog: AuditLogEntry[];
  notifications: NotificationEntry[];
  notificationDevices: NotificationDevice[];
  householdNotificationHealth: HouseholdNotificationHealthEntry[];
  notificationRecovery: NotificationRecovery | null;
  systemStatus: AdminSystemStatus | null;
  backupReadiness: BackupReadiness | null;
  notificationPreferences: NotificationPreferences;
  pointsLedger: PointsLedgerEntry[];
  templates: ChoreTemplate[];
  instances: ChoreInstance[];
  takeoverRequests: TakeoverRequestEntry[];
  hostedSubscription: HostedSubscriptionOverview;
  compatibility: ServerCompatibility;
  achievements: Achievement[];
  masteryStats: MasteryStats[];
  rewards: Reward[];
  redemptions: RewardRedemption[];
  holidayBlocks: HolidayBlock[];
};

// ── Holiday blocks ─────────────────────────────────────────────────────────────

export type HolidayExistingMode = 'DEFER' | 'LEAVE';
export type HolidayBlockStatus = 'upcoming' | 'active' | 'past';

export type HolidayBlock = {
  id: string;
  householdId: string;
  name: string;
  startDate: string;
  endDate: string;
  existingMode: HolidayExistingMode;
  createdBy: string;
  appliedAt: string | null;
  createdAt: string;
  status: HolidayBlockStatus;
};

export type CreateHolidayBlockPayload = {
  name: string;
  startDate: string;
  endDate: string;
  existingMode: HolidayExistingMode;
};
