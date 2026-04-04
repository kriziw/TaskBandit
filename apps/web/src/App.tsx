import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { taskBanditApi, TaskBanditApiError } from "./api/taskbanditApi";
import { DashboardCard } from "./components/DashboardCard";
import { AppLanguage, useI18n } from "./i18n/I18nProvider";
import type {
  AdminSystemStatus,
  AuditLogEntry,
  BackupReadiness,
  ChoreAttachment,
  AuthProviders,
  AuthenticatedUser,
  BootstrapHouseholdInput,
  BootstrapStatus,
  ChoreInstance,
  ChoreState,
  ChoreTemplate,
  CreateChoreInstanceInput,
  CreateChoreTemplateInput,
  CreateHouseholdMemberInput,
  DashboardSummary,
  Household,
  HouseholdNotificationHealthEntry,
  HouseholdSettings,
  NotificationDevice,
  NotificationRecovery,
  NotificationPreferences,
  NotificationEntry,
  PointsLedgerEntry,
  ReleaseInfo,
  RecurrenceType,
  RuntimeLogEntry,
  SignupInput,
  UpdateHouseholdMemberInput
} from "./types/taskbandit";

const tokenStorageKey = "taskbandit-access-token";
const workspacePageStorageKey = "taskbandit-active-page";
const dismissedUpdateStorageKey = "taskbandit-dismissed-update";

type DashboardPayload = {
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
};

type LoginFormState = {
  email: string;
  password: string;
};
type SignupFormState = SignupInput;
type PasswordResetRequestFormState = {
  email: string;
};
type PasswordResetCompleteFormState = {
  password: string;
};

type MemberFormState = CreateHouseholdMemberInput;
type MemberEditFormState = UpdateHouseholdMemberInput;
type TemplateFormState = CreateChoreTemplateInput;
type InstanceFormState = CreateChoreInstanceInput;
type BootstrapFormState = BootstrapHouseholdInput;
type HouseholdChoreViewMode = "list" | "board" | "calendar";
type HouseholdChoreStateFilter = "all" | ChoreState;
type OnboardingStep = "welcome" | "settings" | "members" | "chores" | "overview";
type WorkspacePage = "overview" | "chores" | "templates" | "household" | "notifications" | "settings" | "admin";
type WorkspaceSectionLink = {
  key: string;
  label: string;
  ref: RefObject<HTMLElement | null>;
};

const workspacePageOrder: WorkspacePage[] = [
  "overview",
  "chores",
  "templates",
  "household",
  "notifications",
  "settings",
  "admin"
];

const householdBoardStateOrder: ChoreState[] = [
  "open",
  "assigned",
  "in_progress",
  "pending_approval",
  "needs_fixes",
  "overdue",
  "completed",
  "cancelled"
];

const recurrenceWeekdayOrder = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY"
] as const;

function createTemporaryPassword(length = 16) {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%*-_?";
  const allCharacters = uppercase + lowercase + digits + symbols;
  const randomValues = new Uint32Array(length);
  const cryptoProvider = globalThis.crypto;

  if (cryptoProvider?.getRandomValues) {
    cryptoProvider.getRandomValues(randomValues);
  } else {
    for (let index = 0; index < length; index += 1) {
      randomValues[index] = Math.floor(Math.random() * 0xffffffff);
    }
  }

  const requiredCharacters = [
    uppercase[randomValues[0] % uppercase.length],
    lowercase[randomValues[1] % lowercase.length],
    digits[randomValues[2] % digits.length],
    symbols[randomValues[3] % symbols.length]
  ];

  const generatedCharacters = [
    ...requiredCharacters,
    ...Array.from({ length: Math.max(length - requiredCharacters.length, 0) }, (_, index) => {
      const randomValue = randomValues[index + requiredCharacters.length];
      return allCharacters[randomValue % allCharacters.length];
    })
  ];

  for (let index = generatedCharacters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomValues[index] % (index + 1);
    [generatedCharacters[index], generatedCharacters[swapIndex]] = [
      generatedCharacters[swapIndex],
      generatedCharacters[index]
    ];
  }

  return generatedCharacters.join("");
}

function createEmptyMemberForm(): MemberFormState {
  return {
    displayName: "",
    role: "child",
    email: "",
    password: createTemporaryPassword(),
    sendInviteEmail: false
  };
}

function createEmptyMemberEditForm(): MemberEditFormState {
  return {
    displayName: "",
    role: "child",
    email: "",
    password: ""
  };
}

function readStoredToken() {
  return window.localStorage.getItem(tokenStorageKey);
}

function isWorkspacePage(value: string | null): value is WorkspacePage {
  return value !== null && workspacePageOrder.includes(value as WorkspacePage);
}

function readStoredWorkspacePage() {
  const hashValue = window.location.hash.replace(/^#/, "").trim();
  if (isWorkspacePage(hashValue)) {
    return hashValue;
  }

  const stored = window.localStorage.getItem(workspacePageStorageKey);
  if (isWorkspacePage(stored)) {
    return stored;
  }

  return "overview";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function parseReleaseVersionParts(value: string) {
  return value
    .split(/[.-]/)
    .map((segment) => Number.parseInt(segment, 10))
    .filter((segment) => Number.isFinite(segment));
}

function compareReleaseVersions(left: string, right: string) {
  const leftParts = parseReleaseVersionParts(left);
  const rightParts = parseReleaseVersionParts(right);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;
    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }

  return 0;
}

function compareReleaseInfo(current: ReleaseInfo, latest: ReleaseInfo) {
  const versionComparison = compareReleaseVersions(current.releaseVersion, latest.releaseVersion);
  if (versionComparison !== 0) {
    return versionComparison;
  }

  const currentBuild = Number.parseInt(current.buildNumber, 10);
  const latestBuild = Number.parseInt(latest.buildNumber, 10);
  if (Number.isFinite(currentBuild) && Number.isFinite(latestBuild) && currentBuild !== latestBuild) {
    return currentBuild - latestBuild;
  }

  return current.buildNumber.localeCompare(latest.buildNumber);
}

function createReleaseKey(release: ReleaseInfo) {
  return `${release.releaseVersion}+${release.buildNumber}`;
}

function formatReleaseLabel(release: ReleaseInfo) {
  return `v${release.releaseVersion} · build ${release.buildNumber}`;
}

const currentWebReleaseInfo: ReleaseInfo = {
  releaseVersion: import.meta.env.VITE_TASKBANDIT_RELEASE_VERSION ?? "0.0.0-dev",
  buildNumber: import.meta.env.VITE_TASKBANDIT_BUILD_NUMBER ?? "local",
  commitSha: import.meta.env.VITE_TASKBANDIT_COMMIT_SHA ?? "local"
};

export function App() {
  const { language, setLanguage, t } = useI18n();
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [serverReleaseInfo, setServerReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [dismissedUpdateKey, setDismissedUpdateKey] = useState<string | null>(() =>
    window.localStorage.getItem(dismissedUpdateStorageKey)
  );
  const [providers, setProviders] = useState<AuthProviders | null>(null);
  const [bootstrapStatus, setBootstrapStatus] = useState<BootstrapStatus | null>(null);
  const [loginForm, setLoginForm] = useState<LoginFormState>({
    email: "alex@taskbandit.local",
    password: "TaskBandit123!"
  });
  const [signupForm, setSignupForm] = useState<SignupFormState>({
    displayName: "",
    email: "",
    password: ""
  });
  const [passwordResetRequestForm, setPasswordResetRequestForm] =
    useState<PasswordResetRequestFormState>({
      email: ""
    });
  const [passwordResetCompleteForm, setPasswordResetCompleteForm] =
    useState<PasswordResetCompleteFormState>({
      password: ""
    });
  const [passwordResetToken, setPasswordResetToken] = useState<string | null>(null);
  const [bootstrapForm, setBootstrapForm] = useState<BootstrapFormState>({
    householdName: "",
    ownerDisplayName: "",
    ownerEmail: "",
    ownerPassword: "",
    selfSignupEnabled: false
  });
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [runtimeLogs, setRuntimeLogs] = useState<RuntimeLogEntry[]>([]);
  const [settingsDraft, setSettingsDraft] = useState<HouseholdSettings | null>(null);
  const [notificationPreferencesDraft, setNotificationPreferencesDraft] =
    useState<NotificationPreferences | null>(null);
  const [submitSelections, setSubmitSelections] = useState<Record<string, string[]>>({});
  const [selectedProofFiles, setSelectedProofFiles] = useState<Record<string, File[]>>({});
  const [submitNotes, setSubmitNotes] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [memberForm, setMemberForm] = useState<MemberFormState>(createEmptyMemberForm);
  const [memberEditForm, setMemberEditForm] = useState<MemberEditFormState>(createEmptyMemberEditForm);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>({
    title: "",
    description: "",
    difficulty: "easy",
    assignmentStrategy: "round_robin",
    recurrenceType: "none",
    recurrenceIntervalDays: 2,
    recurrenceWeekdays: [],
    requirePhotoProof: false,
    dependencyTemplateIds: [],
    checklist: []
  });
  const [instanceForm, setInstanceForm] = useState<InstanceFormState>({
    templateId: "",
    assigneeId: "",
    title: "",
    dueAt: ""
  });
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  const [householdViewMode, setHouseholdViewMode] = useState<HouseholdChoreViewMode>("list");
  const [householdStateFilter, setHouseholdStateFilter] = useState<HouseholdChoreStateFilter>("all");
  const [householdAssigneeFilter, setHouseholdAssigneeFilter] = useState<string>("all");
  const [activePage, setActivePage] = useState<WorkspacePage>(() => readStoredWorkspacePage());
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("welcome");
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const householdSettingsRef = useRef<HTMLElement | null>(null);
  const membersRef = useRef<HTMLElement | null>(null);
  const templatesRef = useRef<HTMLElement | null>(null);
  const scheduleRef = useRef<HTMLElement | null>(null);
  const approvalQueueRef = useRef<HTMLElement | null>(null);
  const myChoresRef = useRef<HTMLElement | null>(null);
  const householdChoresRef = useRef<HTMLElement | null>(null);
  const notificationsRef = useRef<HTMLElement | null>(null);
  const notificationPreferencesRef = useRef<HTMLElement | null>(null);
  const notificationDevicesRef = useRef<HTMLElement | null>(null);
  const notificationHealthRef = useRef<HTMLElement | null>(null);
  const backupReadinessRef = useRef<HTMLElement | null>(null);
  const systemStatusRef = useRef<HTMLElement | null>(null);
  const runtimeLogsRef = useRef<HTMLElement | null>(null);
  const notificationRecoveryRef = useRef<HTMLElement | null>(null);

  const languageOptions: Array<{ code: AppLanguage; label: string }> = [
    { code: "en", label: t("language.english") },
    { code: "de", label: t("language.german") },
    { code: "hu", label: t("language.hungarian") }
  ];

  useEffect(() => {
    void taskBanditApi
      .getProviders(language)
      .then((response) => setProviders(response))
      .catch(() => setProviders(null));
  }, [language]);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const oidcToken = currentUrl.searchParams.get("oidcToken");
    const oidcError = currentUrl.searchParams.get("oidcError");
    const resetToken = currentUrl.searchParams.get("resetToken");

    if (!oidcToken && !oidcError && !resetToken) {
      return;
    }

    if (resetToken) {
      setPasswordResetToken(resetToken);
      setLoginError(null);
      setNotice(t("auth.password_reset_token_ready"));
    }

    if (oidcToken) {
      window.localStorage.setItem(tokenStorageKey, oidcToken);
      setToken(oidcToken);
      setLoginError(null);
      setNotice(t("auth.oidc_success"));
    } else if (oidcError) {
      setLoginError(oidcError);
      setNotice(null);
    }

    currentUrl.searchParams.delete("oidcToken");
    currentUrl.searchParams.delete("oidcError");
    currentUrl.searchParams.delete("resetToken");
    window.history.replaceState({}, document.title, currentUrl.toString());
  }, [t]);

  useEffect(() => {
    if (token) {
      return;
    }

    void taskBanditApi
      .getBootstrapStatus(language)
      .then((response) => setBootstrapStatus(response))
      .catch(() => setBootstrapStatus(null));
  }, [token, language]);

  useEffect(() => {
    if (!token) {
      setPayload(null);
      setRuntimeLogs([]);
      setSettingsDraft(null);
      setNotificationPreferencesDraft(null);
      setIsLoading(false);
      return;
    }

    void refreshDashboard(token, { silent: false });
  }, [token, language]);

  useEffect(() => {
    if (payload) {
      setSettingsDraft(payload.household.settings);
      setNotificationPreferencesDraft(payload.notificationPreferences);
      if (payload.household.settings.onboardingCompleted) {
        setOnboardingDismissed(false);
        setOnboardingStep("welcome");
      }
    }
  }, [payload]);

  useEffect(() => {
    if (!payload || payload.templates.length === 0) {
      return;
    }

    setInstanceForm((current) =>
      current.templateId
        ? current
        : {
            ...current,
            templateId: payload.templates[0].id
          }
    );
  }, [payload]);

  useEffect(() => {
    if (!token || payload?.currentUser.role !== "admin") {
      return;
    }

    if (activePage !== "admin") {
      return;
    }

    void refreshRuntimeLogs(token, { reportErrors: false });

    const intervalId = window.setInterval(() => {
      void refreshRuntimeLogs(token, { reportErrors: false });
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [activePage, language, payload?.currentUser.role, token]);

  useEffect(() => {
    window.localStorage.setItem(workspacePageStorageKey, activePage);
    const currentUrl = new URL(window.location.href);
    if (currentUrl.hash !== `#${activePage}`) {
      currentUrl.hash = activePage;
      window.history.replaceState({}, document.title, currentUrl.toString());
    }
  }, [activePage]);

  useEffect(() => {
    const onHashChange = () => {
      const hashValue = window.location.hash.replace(/^#/, "").trim();
      if (isWorkspacePage(hashValue)) {
        setActivePage(hashValue);
      }
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void taskBanditApi
      .getReleaseInfo(language)
      .then((releaseInfo) => {
        if (!cancelled) {
          setServerReleaseInfo(releaseInfo);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setServerReleaseInfo(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [language]);

  const memberLookup = useMemo(() => {
    const members = payload?.household.members ?? [];
    return new Map(members.map((member) => [member.id, member]));
  }, [payload]);

  const pendingApprovals = useMemo(
    () => payload?.instances.filter((instance) => instance.state === "pending_approval") ?? [],
    [payload]
  );

  const unreadNotifications = useMemo(
    () => payload?.notifications.filter((notification) => !notification.isRead) ?? [],
    [payload]
  );

  const pushReadyDeviceCount = useMemo(
    () =>
      payload?.notificationDevices.filter(
        (device) => device.notificationsEnabled && device.pushTokenConfigured
      ).length ?? 0,
    [payload]
  );

  const householdPushReadyCount = useMemo(
    () =>
      payload?.householdNotificationHealth.filter((entry) => entry.deliveryMode === "push").length ?? 0,
    [payload]
  );

  const restrictHouseholdDetails = Boolean(
    payload &&
      !payload.household.settings.membersCanSeeFullHouseholdChoreDetails &&
      payload.currentUser.role === "child"
  );

  const myChores = useMemo(() => {
    if (!payload) {
      return [];
    }

    return payload.instances.filter((instance) => {
      if (instance.assigneeId !== payload.currentUser.id) {
        return false;
      }

      return ["open", "assigned", "in_progress", "needs_fixes", "overdue"].includes(instance.state);
    });
  }, [payload]);

  const myNeedsFixesChores = useMemo(
    () => myChores.filter((instance) => instance.state === "needs_fixes"),
    [myChores]
  );

  const myInProgressChores = useMemo(
    () => myChores.filter((instance) => instance.state === "in_progress"),
    [myChores]
  );

  const myReadyToStartChores = useMemo(
    () => myChores.filter((instance) => ["open", "assigned", "overdue"].includes(instance.state)),
    [myChores]
  );

  const featuredMetrics = useMemo(
    () => [
      {
        label: t("metric.approvals_waiting"),
        value: payload?.dashboard.pendingApprovals ?? 0
      },
      {
        label: t("metric.active_chores"),
        value: payload?.dashboard.activeChores ?? 0
      },
      {
        label: t("metric.streak_leader"),
        value: payload?.dashboard.streakLeader ?? t("common.none")
      }
    ],
    [payload, t]
  );

  const showOnboarding = Boolean(
    payload &&
      payload.currentUser.role === "admin" &&
      !payload.household.settings.onboardingCompleted &&
      !onboardingDismissed
  );

  const availablePages = useMemo(() => {
    if (!payload) {
      return [];
    }

    const pages: Array<{ key: WorkspacePage; label: string }> = [
      { key: "overview", label: t("nav.overview") },
      { key: "chores", label: t("nav.chores") },
      { key: "notifications", label: t("nav.notifications") }
    ];

    if (payload.currentUser.role === "admin") {
      pages.splice(2, 0, { key: "templates", label: t("nav.templates") });
      pages.splice(3, 0, { key: "household", label: t("nav.household") });
      pages.push({ key: "settings", label: t("nav.settings") });
      pages.push({ key: "admin", label: t("nav.admin") });
    }

    return pages;
  }, [payload, t]);

  useEffect(() => {
    if (!availablePages.length) {
      return;
    }

    if (!availablePages.some((page) => page.key === activePage)) {
      setActivePage(availablePages[0].key);
    }
  }, [activePage, availablePages]);

  const activePageLabel =
    availablePages.find((page) => page.key === activePage)?.label ?? t("nav.overview");
  const availableUpdate = useMemo(() => {
    if (!serverReleaseInfo) {
      return null;
    }

    return compareReleaseInfo(currentWebReleaseInfo, serverReleaseInfo) < 0 ? serverReleaseInfo : null;
  }, [serverReleaseInfo]);
  const availableUpdateKey = availableUpdate ? createReleaseKey(availableUpdate) : null;
  const showAvailableUpdateNotice = Boolean(
    availableUpdate && availableUpdateKey && dismissedUpdateKey !== availableUpdateKey
  );

  const pageDescriptions: Record<WorkspacePage, string> = {
    overview: t("page.overview_description"),
    chores: t("page.chores_description"),
    templates: t("page.templates_description"),
    household: t("page.household_description"),
    notifications: t("page.notifications_description"),
    settings: t("page.settings_description"),
    admin: t("page.admin_description")
  };

  const onboardingSteps = useMemo(
    () => [
      {
        key: "welcome" as const,
        title: t("onboarding.welcome_title"),
        description: t("onboarding.welcome_body"),
        actionLabel: null,
        action: null
      },
      {
        key: "settings" as const,
        title: t("onboarding.settings_title"),
        description: t("onboarding.settings_body"),
        actionLabel: t("onboarding.go_settings"),
        action: () => openWorkspacePage("settings", householdSettingsRef)
      },
      {
        key: "members" as const,
        title: t("onboarding.members_title"),
        description: t("onboarding.members_body"),
        actionLabel: t("onboarding.go_members"),
        action: () => openWorkspacePage("household", membersRef)
      },
      {
        key: "chores" as const,
        title: t("onboarding.chores_title"),
        description: t("onboarding.chores_body"),
        actionLabel: t("onboarding.go_templates"),
        action: () => openWorkspacePage("templates", templatesRef)
      },
      {
        key: "overview" as const,
        title: t("onboarding.overview_title"),
        description: t("onboarding.overview_body"),
        actionLabel: t("onboarding.go_schedule"),
        action: () => openWorkspacePage("templates", scheduleRef)
      }
    ],
    [t]
  );

  const onboardingIndex = onboardingSteps.findIndex((step) => step.key === onboardingStep);
  const currentOnboardingStep = onboardingSteps[Math.max(onboardingIndex, 0)];

  const visibleHouseholdChores = useMemo(() => {
    const instances = payload?.instances ?? [];
    return [...instances]
      .filter((instance) => {
        if (householdStateFilter !== "all" && instance.state !== householdStateFilter) {
          return false;
        }

        if (householdAssigneeFilter === "all") {
          return true;
        }

        if (householdAssigneeFilter === "unassigned") {
          return !instance.assigneeId;
        }

        return instance.assigneeId === householdAssigneeFilter;
      })
      .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime());
  }, [payload, householdAssigneeFilter, householdStateFilter]);

  const householdBoardColumns = useMemo(
    () =>
      householdBoardStateOrder
        .map((state) => ({
          state,
          chores: visibleHouseholdChores.filter((instance) => instance.state === state)
        }))
        .filter((column) => column.chores.length > 0 || householdStateFilter !== "all"),
    [visibleHouseholdChores, householdStateFilter]
  );

  const householdCalendarGroups = useMemo(() => {
    const groups = new Map<string, ChoreInstance[]>();

    for (const instance of visibleHouseholdChores) {
      const dateKey = instance.dueAt.slice(0, 10);
      const currentGroup = groups.get(dateKey) ?? [];
      currentGroup.push(instance);
      groups.set(dateKey, currentGroup);
    }

    return [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([dateKey, chores]) => ({
        dateKey,
        chores
      }));
  }, [visibleHouseholdChores]);

  const assignmentStrategyOptions: Array<{
    value: TemplateFormState["assignmentStrategy"];
    label: string;
  }> = [
    { value: "round_robin", label: t("assignment.round_robin") },
    { value: "least_completed_recently", label: t("assignment.least_completed_recently") },
    { value: "highest_streak", label: t("assignment.highest_streak") },
    { value: "manual_default_assignee", label: t("assignment.manual_default") }
  ];

  const recurrenceOptions: Array<{ value: RecurrenceType; label: string }> = [
    { value: "none", label: t("recurrence.none") },
    { value: "daily", label: t("recurrence.daily") },
    { value: "weekly", label: t("recurrence.weekly") },
    { value: "every_x_days", label: t("recurrence.every_x_days") },
    { value: "custom_weekly", label: t("recurrence.custom_weekly") }
  ];

  const recurrenceWeekdayOptions = recurrenceWeekdayOrder.map((weekday) => ({
    value: weekday,
    label: t(`weekday.${weekday.toLowerCase()}`)
  }));

  async function refreshDashboard(accessToken: string, options: { silent: boolean }) {
    if (!options.silent) {
      setIsLoading(true);
    }

    try {
      const currentUser = await taskBanditApi.getCurrentUser(accessToken, language);
      const [
        dashboard,
        household,
        auditLog,
        notifications,
        notificationDevices,
        householdNotificationHealth,
        notificationRecovery,
        systemStatus,
        backupReadiness,
        notificationPreferences,
        pointsLedger,
        templates,
        instances,
        nextRuntimeLogs
      ] =
        await Promise.all([
        taskBanditApi.getDashboardSummary(accessToken, language),
        taskBanditApi.getHousehold(accessToken, language),
        currentUser.role === "child"
          ? Promise.resolve([])
          : taskBanditApi.getAuditLog(accessToken, language),
        taskBanditApi.getNotifications(accessToken, language),
        taskBanditApi.getNotificationDevices(accessToken, language),
        currentUser.role === "admin"
          ? taskBanditApi.getHouseholdNotificationHealth(accessToken, language)
          : Promise.resolve([]),
        currentUser.role === "admin"
          ? taskBanditApi.getNotificationRecovery(accessToken, language)
          : Promise.resolve(null),
        currentUser.role === "admin"
          ? taskBanditApi.getSystemStatus(accessToken, language)
          : Promise.resolve(null),
        currentUser.role === "admin"
          ? taskBanditApi.getBackupReadiness(accessToken, language)
          : Promise.resolve(null),
        taskBanditApi.getNotificationPreferences(accessToken, language),
        taskBanditApi.getPointsLedger(accessToken, language),
        currentUser.role === "child"
          ? Promise.resolve([])
          : taskBanditApi.getTemplates(accessToken, language),
        taskBanditApi.getInstances(accessToken, language),
        currentUser.role === "admin" && activePage === "admin"
          ? taskBanditApi.getRuntimeLogs(accessToken, language, 250)
          : Promise.resolve(runtimeLogs)
        ]);

      setPayload({
        currentUser,
        dashboard,
        household,
        auditLog,
        notifications,
        notificationDevices,
        householdNotificationHealth,
        notificationRecovery,
        systemStatus,
        backupReadiness,
        notificationPreferences,
        pointsLedger,
        templates,
        instances
      });
      setRuntimeLogs(nextRuntimeLogs);
      setPageError(null);
    } catch (error) {
      if (error instanceof TaskBanditApiError && error.status === 401) {
        handleLogout(t("auth.session_expired"));
        return;
      }

      setPageError(readErrorMessage(error, t("error.load_dashboard")));
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshRuntimeLogs(accessToken: string, options: { reportErrors: boolean }) {
    try {
      const nextRuntimeLogs = await taskBanditApi.getRuntimeLogs(accessToken, language, 250);
      setRuntimeLogs(nextRuntimeLogs);
    } catch (error) {
      if (error instanceof TaskBanditApiError && error.status === 401) {
        handleLogout(t("auth.session_expired"));
        return;
      }

      if (options.reportErrors) {
        setPageError(readErrorMessage(error, t("logs.load_failed")));
      }
    }
  }

  async function refreshSystemStatus(accessToken: string, options: { reportErrors: boolean }) {
    try {
      const nextSystemStatus = await taskBanditApi.getSystemStatus(accessToken, language);
      setPayload((current) =>
        current
          ? {
              ...current,
              systemStatus: nextSystemStatus
            }
          : current
      );
    } catch (error) {
      if (error instanceof TaskBanditApiError && error.status === 401) {
        handleLogout(t("auth.session_expired"));
        return;
      }

      if (options.reportErrors) {
        setPageError(readErrorMessage(error, t("system_status.load_failed")));
      }
    }
  }

  async function refreshBackupReadiness(accessToken: string, options: { reportErrors: boolean }) {
    try {
      const nextBackupReadiness = await taskBanditApi.getBackupReadiness(accessToken, language);
      setPayload((current) =>
        current
          ? {
              ...current,
              backupReadiness: nextBackupReadiness
            }
          : current
      );
    } catch (error) {
      if (error instanceof TaskBanditApiError && error.status === 401) {
        handleLogout(t("auth.session_expired"));
        return;
      }

      if (options.reportErrors) {
        setPageError(readErrorMessage(error, t("backup.load_failed")));
      }
    }
  }

  function renderHouseholdChoreCard(instance: ChoreInstance) {
    return (
      <div className="task-row compact" key={instance.id}>
        <div className="task-row-header">
          <strong>{instance.title}</strong>
          <span className={`status-pill state-${instance.state}`}>{t(`state.${instance.state}`)}</span>
        </div>
        <p>
          {t("task.assignee")}:{" "}
          {restrictHouseholdDetails
            ? t("task.visible_limited")
            : instance.assigneeId
              ? memberLookup.get(instance.assigneeId)?.displayName ?? t("common.unknown")
              : t("common.unassigned")}
        </p>
        <p>
          {t("task.due")}: {formatDate(instance.dueAt)}
        </p>
        {!restrictHouseholdDetails ? (
          <p>
            {t("task.difficulty")}: {t(`difficulty.${instance.difficulty}`)}
          </p>
        ) : null}
        {payload?.currentUser.role !== "child" &&
          instance.state !== "completed" &&
          instance.state !== "cancelled" ? (
            <div className="button-row">
              {instance.state !== "pending_approval" && instance.state !== "in_progress" ? (
                <button
                  className="secondary-button"
                  type="button"
                  disabled={busyAction === `start:${instance.id}`}
                  onClick={() => void handleStartInstance(instance.id)}
                >
                  {t("instances.start")}
                </button>
              ) : null}
              {instance.state !== "pending_approval" ? (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => startEditingInstance(instance)}
              >
                {t("common.edit")}
              </button>
            ) : null}
            <button
              className="secondary-button"
              type="button"
              disabled={busyAction === `cancel:${instance.id}`}
              onClick={() => void handleCancelInstance(instance.id)}
            >
              {t("instances.cancel")}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  function renderMyChoreCard(instance: ChoreInstance) {
    const selectedChecklistIds = getSelectedChecklistIds(instance);
    const selectedFiles = selectedProofFiles[instance.id] ?? [];

    return (
      <div className="task-row" key={instance.id}>
        <div className="task-row-header">
          <strong>{instance.title}</strong>
          <span className={`status-pill state-${instance.state}`}>{t(`state.${instance.state}`)}</span>
        </div>
        <p>
          {t("task.due")}: {formatDate(instance.dueAt)}
        </p>
        <p>
          {t("task.points")}: {instance.awardedPoints > 0 ? instance.awardedPoints : instance.basePoints}
        </p>
        {instance.requirePhotoProof ? (
          <p className="inline-message">{t("submission.photo_hint_required")}</p>
        ) : (
          <p className="inline-message">{t("submission.photo_hint_optional")}</p>
        )}
        {instance.attachments.length > 0
          ? renderAttachmentList(t("submission.previous_uploads"), instance.attachments)
          : null}
        {instance.checklist.length ? (
          <div className="checklist">
            {instance.checklist.map((item) => (
              <label key={item.id} className="checklist-item">
                <input
                  type="checkbox"
                  checked={selectedChecklistIds.includes(item.id)}
                  onChange={() =>
                    toggleChecklistItem(instance.id, item.id, instance.checklistCompletionIds)
                  }
                />
                <span>
                  {item.title}
                  {item.required ? ` - ${t("task.required")}` : ""}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="inline-message">{t("submission.one_tap")}</p>
        )}
        <label className="inline-field">
          <span>{t("task.attachments")}</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => handleProofFilesSelected(instance.id, event.target.files)}
          />
        </label>
        {selectedFiles.length > 0 ? (
          <p className="inline-message">
            {t("submission.selected_files")}: {selectedFiles.length}
          </p>
        ) : null}
        <label className="inline-field">
          <span>{t("task.note")}</span>
          <textarea
            value={submitNotes[instance.id] ?? ""}
            onChange={(event) =>
              setSubmitNotes((current) => ({
                ...current,
                [instance.id]: event.target.value
              }))
            }
            rows={3}
          />
        </label>
        <div className="button-row">
          <button
            className="secondary-button"
            type="button"
            disabled={busyAction === `start:${instance.id}` || instance.state === "in_progress"}
            onClick={() => void handleStartInstance(instance.id)}
          >
            {instance.state === "in_progress" ? t("state.in_progress") : t("instances.start")}
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={busyAction === `submit:${instance.id}`}
            onClick={() => void handleSubmitChore(instance.id)}
          >
            {t("submission.submit")}
          </button>
        </div>
      </div>
    );
  }

  function renderMyChoreSection(title: string, items: ChoreInstance[], emptyMessage: string) {
    return (
      <section className="my-chore-section">
        <div className="section-heading section-heading-compact">
          <h3>{title}</h3>
          <span className="section-kicker">{items.length}</span>
        </div>
        {items.length === 0 ? (
          <p className="empty-state">{emptyMessage}</p>
        ) : (
          <div className="stack-list">{items.map((instance) => renderMyChoreCard(instance))}</div>
        )}
      </section>
    );
  }

  function formatTemplateRecurrence(template: ChoreTemplate) {
    switch (template.recurrence.type) {
      case "daily":
        return t("recurrence.daily");
      case "weekly":
        return t("recurrence.weekly");
      case "every_x_days":
        return `${t("recurrence.every_x_days")} (${template.recurrence.intervalDays ?? 1})`;
      case "custom_weekly":
        return `${t("recurrence.custom_weekly")}: ${template.recurrence.weekdays
          .map((weekday) => t(`weekday.${weekday.toLowerCase()}`))
          .join(", ")}`;
      case "none":
      default:
        return t("recurrence.none");
    }
  }

  function handleLogout(message?: string) {
    window.localStorage.removeItem(tokenStorageKey);
    setToken(null);
    setPayload(null);
    setRuntimeLogs([]);
    setSettingsDraft(null);
    setNotificationPreferencesDraft(null);
    setLoginError(message ?? null);
    setNotice(null);
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAuthenticating(true);
    setLoginError(null);

    try {
      const response = await taskBanditApi.login(loginForm.email, loginForm.password, language);
      window.localStorage.setItem(tokenStorageKey, response.accessToken);
      setToken(response.accessToken);
      setNotice(t("auth.login_success"));
    } catch (error) {
      setLoginError(readErrorMessage(error, t("auth.login_failed")));
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleSignupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAuthenticating(true);
    setLoginError(null);

    try {
      const response = await taskBanditApi.signup(signupForm, language);
      window.localStorage.setItem(tokenStorageKey, response.accessToken);
      setToken(response.accessToken);
      setSignupForm({
        displayName: "",
        email: "",
        password: ""
      });
      setNotice(t("auth.signup_success"));
    } catch (error) {
      setLoginError(readErrorMessage(error, t("auth.signup_failed")));
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handlePasswordResetRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAuthenticating(true);
    setLoginError(null);

    try {
      const response = await taskBanditApi.requestPasswordReset(passwordResetRequestForm.email, language);
      setPasswordResetRequestForm({ email: "" });
      setNotice(response.message);
    } catch (error) {
      setLoginError(readErrorMessage(error, t("auth.password_reset_request_failed")));
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handlePasswordResetCompleteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordResetToken) {
      return;
    }

    setIsAuthenticating(true);
    setLoginError(null);

    try {
      const response = await taskBanditApi.completePasswordReset(
        passwordResetToken,
        passwordResetCompleteForm.password,
        language
      );
      setPasswordResetCompleteForm({ password: "" });
      setPasswordResetToken(null);
      setNotice(response.message);
    } catch (error) {
      setLoginError(readErrorMessage(error, t("auth.password_reset_complete_failed")));
    } finally {
      setIsAuthenticating(false);
    }
  }

  function handleOidcSignIn() {
    setIsAuthenticating(true);
    setLoginError(null);
    setNotice(t("auth.oidc_redirecting"));
    window.location.assign(taskBanditApi.getOidcStartUrl(language, window.location.href));
  }

  async function handleBootstrapSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("bootstrap");
    setPageError(null);

    try {
      await taskBanditApi.bootstrapHousehold(language, bootstrapForm);
      const authResponse = await taskBanditApi.login(
        bootstrapForm.ownerEmail,
        bootstrapForm.ownerPassword,
        language
      );
      window.localStorage.setItem(tokenStorageKey, authResponse.accessToken);
      setToken(authResponse.accessToken);
      setBootstrapStatus({
        isBootstrapped: true,
        householdCount: 1
      });
      setNotice(t("bootstrap.created"));
    } catch (error) {
      setPageError(readErrorMessage(error, t("bootstrap.create_failed")));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSubmitChore(instanceId: string) {
    if (!token || !payload) {
      return;
    }

    const targetInstance = payload.instances.find((item) => item.id === instanceId);
    if (!targetInstance) {
      setPageError(t("error.missing_template"));
      return;
    }

    const selectedChecklistIds = submitSelections[instanceId] ?? targetInstance.checklistCompletionIds;
    const selectedFiles = selectedProofFiles[instanceId] ?? [];
    const missingRequiredItems = targetInstance.checklist.filter(
      (item) => item.required && !selectedChecklistIds.includes(item.id)
    );

    if (missingRequiredItems.length > 0) {
      setPageError(t("submission.complete_required"));
      return;
    }

    if (targetInstance.requirePhotoProof && selectedFiles.length < 1) {
      setPageError(t("submission.photo_required_missing"));
      return;
    }

    setBusyAction(`submit:${instanceId}`);
    try {
      const attachments =
        selectedFiles.length > 0
          ? await Promise.all(
              selectedFiles.map((file) => taskBanditApi.uploadProof(token, language, file))
            )
          : [];

      await taskBanditApi.submitChore(token, language, instanceId, {
        completedChecklistItemIds: selectedChecklistIds,
        attachments,
        note: submitNotes[instanceId]
      });
      setNotice(t("submission.success"));
      setSubmitNotes((current) => ({ ...current, [instanceId]: "" }));
      setSubmitSelections((current) => ({ ...current, [instanceId]: [] }));
      setSelectedProofFiles((current) => ({ ...current, [instanceId]: [] }));
      await refreshDashboard(token, { silent: true });
    } catch (error) {
      setPageError(readErrorMessage(error, t("submission.failed")));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReview(instanceId: string, action: "approve" | "reject") {
    if (!token) {
      return;
    }

    setBusyAction(`${action}:${instanceId}`);
    try {
      if (action === "approve") {
        await taskBanditApi.approveChore(token, language, instanceId, reviewNotes[instanceId]);
        setNotice(t("approval.approved_notice"));
      } else {
        await taskBanditApi.rejectChore(token, language, instanceId, reviewNotes[instanceId]);
        setNotice(t("approval.rejected_notice"));
      }

      await refreshDashboard(token, { silent: true });
    } catch (error) {
      setPageError(readErrorMessage(error, t("approval.failed")));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSaveSettings() {
    if (!token || !settingsDraft) {
      return;
    }

    setBusyAction("save-settings");
    try {
      const household = await taskBanditApi.updateHousehold(token, language, settingsDraft);
      const nextProviders = await taskBanditApi.getProviders(language);
      setPayload((current) => (current ? { ...current, household } : current));
      setProviders(nextProviders);
      setNotice(t("settings.saved"));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t("settings.save_failed")));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSaveNotificationPreferences() {
    if (!token || !notificationPreferencesDraft) {
      return;
    }

    setBusyAction("save-notification-preferences");
    try {
      const nextPreferences = await taskBanditApi.updateNotificationPreferences(
        token,
        language,
        notificationPreferencesDraft
      );
      setPayload((current) =>
        current ? { ...current, notificationPreferences: nextPreferences } : current
      );
      setNotificationPreferencesDraft(nextPreferences);
      setNotice(t("settings.notification_preferences_saved"));
      setPageError(null);
    } catch (error) {
      setPageError(
        readErrorMessage(error, t("settings.notification_preferences_save_failed"))
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCompleteOnboarding() {
    if (!token) {
      return;
    }

    setBusyAction("complete-onboarding");
    try {
      const household = await taskBanditApi.updateHousehold(token, language, {
        onboardingCompleted: true
      });
      setPayload((current) => (current ? { ...current, household } : current));
      setSettingsDraft(household.settings);
      setOnboardingDismissed(false);
      setOnboardingStep("welcome");
      setNotice(t("onboarding.completed"));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t("onboarding.complete_failed")));
    } finally {
      setBusyAction(null);
    }
  }

  function handleNextOnboardingStep() {
    if (onboardingIndex < onboardingSteps.length - 1) {
      setOnboardingStep(onboardingSteps[onboardingIndex + 1].key);
    }
  }

  function handlePreviousOnboardingStep() {
    if (onboardingIndex > 0) {
      setOnboardingStep(onboardingSteps[onboardingIndex - 1].key);
    }
  }

  async function handleProcessOverduePenalties() {
    if (!token) {
      return;
    }

    setBusyAction("process-overdue-penalties");
    try {
      const result = await taskBanditApi.processOverduePenalties(token, language);
      await refreshDashboard(token, { silent: true });
      setNotice(
        result.processedCount > 0
          ? t("settings.overdue_processed")
              .replace("{count}", String(result.processedCount))
              .replace("{points}", String(result.totalPenaltyPoints))
          : t("settings.overdue_none")
      );
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t("settings.overdue_process_failed")));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleProcessNotificationMaintenance() {
    if (!token) {
      return;
    }

    setBusyAction("process-notification-maintenance");
    try {
      const result = await taskBanditApi.processNotificationMaintenance(token, language);
      await refreshDashboard(token, { silent: true });
      setNotice(
        t("settings.notifications_processed")
          .replace("{reminders}", String(result.reminderCount))
          .replace("{summaries}", String(result.dailySummaryCount))
          .replace("{pushSent}", String(result.pushSentCount))
          .replace("{pushFailed}", String(result.pushFailedCount))
          .replace("{emailSent}", String(result.emailSentCount))
          .replace("{emailFailed}", String(result.emailFailedCount))
          .replace("{emailSkipped}", String(result.emailSkippedCount))
      );
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t("settings.notifications_process_failed")));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSendTestNotification(recipientUserId: string) {
    if (!token) {
      return;
    }

    setBusyAction(`test-notification:${recipientUserId}`);
    try {
      const result = await taskBanditApi.sendTestNotification(token, language, recipientUserId);
      await refreshDashboard(token, { silent: true });
      setNotice(
        t("settings.test_notification_sent")
          .replace("{name}", result.recipientDisplayName)
          .replace("{pushSent}", String(result.pushSentCount))
          .replace("{pushFailed}", String(result.pushFailedCount))
          .replace("{emailSent}", String(result.emailSentCount))
          .replace("{emailFailed}", String(result.emailFailedCount))
          .replace("{emailSkipped}", String(result.emailSkippedCount))
      );
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t("settings.test_notification_failed")));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleTestSmtp() {
    if (!token) {
      return;
    }

    setBusyAction("test-smtp");
    try {
      await taskBanditApi.testSmtp(token, language);
      setNotice(t("settings.smtp_test_success"));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t("settings.smtp_test_failed")));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteNotificationDevice(deviceId: string) {
    if (!token || !payload) {
      return;
    }

    setBusyAction(`delete-device:${deviceId}`);
    try {
      const nextDevices = await taskBanditApi.deleteNotificationDevice(token, language, deviceId);
      setPayload((current) => (current ? { ...current, notificationDevices: nextDevices } : current));
      setNotice(t("settings.notification_device_removed"));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t("settings.notification_device_remove_failed")));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleMarkNotificationRead(notificationId: string) {
    if (!token || !payload) {
      return;
    }

    setBusyAction(`notification-read:${notificationId}`);
    try {
      const notifications = await taskBanditApi.markNotificationRead(token, language, notificationId);
      setPayload({
        ...payload,
        notifications
      });
    } catch (error) {
      setPageError(readErrorMessage(error, t("notifications.mark_failed")));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleMarkAllNotificationsRead() {
    if (!token || !payload || unreadNotifications.length === 0) {
      return;
    }

    setBusyAction("notification-read-all");
    try {
      const notifications = await taskBanditApi.markAllNotificationsRead(token, language);
      setPayload({
        ...payload,
        notifications
      });
    } catch (error) {
      setPageError(readErrorMessage(error, t("notifications.mark_failed")));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateHouseholdMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setBusyAction("create-member");
    try {
      const result = await taskBanditApi.createHouseholdMember(token, language, memberForm);
      setPayload((current) => (current ? { ...current, household: result.household } : current));
      setMemberForm(createEmptyMemberForm());
      setNotice(result.inviteEmailSent ? t("members.created_invited") : t("members.created"));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t("members.create_failed")));
    } finally {
      setBusyAction(null);
    }
  }

  function beginEditingMember(member: Household["members"][number]) {
    setEditingMemberId(member.id);
    setMemberEditForm({
      displayName: member.displayName,
      role: member.role === "admin" ? "parent" : member.role,
      email: member.email ?? "",
      password: ""
    });
    setNotice(null);
    setPageError(null);
  }

  function cancelEditingMember() {
    setEditingMemberId(null);
    setMemberEditForm(createEmptyMemberEditForm());
  }

  async function handleUpdateHouseholdMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !editingMemberId) {
      return;
    }

    setBusyAction(`update-member:${editingMemberId}`);
    try {
      await taskBanditApi.updateHouseholdMember(token, language, editingMemberId, {
        displayName: memberEditForm.displayName,
        role: memberEditForm.role,
        email: memberEditForm.email,
        password: memberEditForm.password?.trim() ? memberEditForm.password : undefined
      });
      await refreshDashboard(token, { silent: true });
      cancelEditingMember();
      setNotice(t("members.updated"));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t("members.update_failed")));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !payload) {
      return;
    }

    const sanitizedChecklist = (templateForm.checklist ?? [])
      .map((item) => ({
        title: item.title.trim(),
        required: item.required
      }))
      .filter((item) => item.title.length > 0);
    const sanitizedDependencyIds = [...new Set(templateForm.dependencyTemplateIds ?? [])];
    const sanitizedRecurrenceWeekdays =
      templateForm.recurrenceType === "custom_weekly"
        ? [...new Set(templateForm.recurrenceWeekdays ?? [])]
        : [];
    const sanitizedIntervalDays =
      templateForm.recurrenceType === "every_x_days"
        ? Math.max(1, Number(templateForm.recurrenceIntervalDays ?? 1))
        : undefined;

    setBusyAction("create-template");
    try {
      const templatePayload = {
        ...templateForm,
        title: templateForm.title.trim(),
        description: templateForm.description.trim(),
        dependencyTemplateIds: sanitizedDependencyIds,
        recurrenceWeekdays: sanitizedRecurrenceWeekdays,
        recurrenceIntervalDays: sanitizedIntervalDays,
        checklist: sanitizedChecklist
      };
      const savedTemplate = editingTemplateId
        ? await taskBanditApi.updateTemplate(token, language, editingTemplateId, templatePayload)
        : await taskBanditApi.createTemplate(token, language, templatePayload);
      setPayload((current) =>
        current
          ? {
              ...current,
              templates: editingTemplateId
                ? current.templates
                    .map((template) => (template.id === editingTemplateId ? savedTemplate : template))
                    .sort((left, right) => left.title.localeCompare(right.title))
                : [...current.templates, savedTemplate].sort((left, right) =>
                    left.title.localeCompare(right.title)
                  )
            }
          : current
      );
      resetTemplateForm();
      setNotice(editingTemplateId ? t("templates.updated") : t("templates.created"));
      setPageError(null);
    } catch (error) {
      setPageError(
        readErrorMessage(error, editingTemplateId ? t("templates.update_failed") : t("templates.create_failed"))
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateInstance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !payload) {
      return;
    }

    setBusyAction("create-instance");
    try {
      const instancePayload = {
        templateId: instanceForm.templateId,
        assigneeId: instanceForm.assigneeId || undefined,
        title: instanceForm.title?.trim() || undefined,
        dueAt: new Date(instanceForm.dueAt).toISOString()
      };
      const savedInstance = editingInstanceId
        ? await taskBanditApi.updateInstance(token, language, editingInstanceId, instancePayload)
        : await taskBanditApi.createInstance(token, language, instancePayload);
      setPayload((current) =>
        current
          ? {
              ...current,
              instances: editingInstanceId
                ? current.instances
                    .map((instance) => (instance.id === editingInstanceId ? savedInstance : instance))
                    .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime())
                : [...current.instances, savedInstance].sort(
                    (left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()
                  )
            }
          : current
      );
      resetInstanceForm();
      setNotice(editingInstanceId ? t("instances.updated") : t("instances.created"));
      setPageError(null);
    } catch (error) {
      setPageError(
        readErrorMessage(error, editingInstanceId ? t("instances.update_failed") : t("instances.create_failed"))
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDownloadChoresExport() {
    if (!token) {
      return;
    }

    setBusyAction("download-chores-export");
    try {
      const blob = await taskBanditApi.downloadChoresCsv(token, language);
      downloadBlob(blob, "taskbandit-chores.csv");
      setNotice(t("exports.chores_downloaded"));
    } catch (error) {
      setPageError(readErrorMessage(error, t("exports.chores_failed")));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRefreshRuntimeLogs() {
    if (!token) {
      return;
    }

    setBusyAction("refresh-runtime-logs");
    try {
      await refreshRuntimeLogs(token, { reportErrors: true });
      setNotice(t("logs.refreshed"));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDownloadRuntimeLogs(format: "txt" | "json") {
    if (!token) {
      return;
    }

    setBusyAction(`download-runtime-logs-${format}`);
    try {
      const blob =
        format === "txt"
          ? await taskBanditApi.downloadRuntimeLogsText(token, language)
          : await taskBanditApi.downloadRuntimeLogsJson(token, language);
      downloadBlob(
        blob,
        format === "txt" ? "taskbandit-runtime.log" : "taskbandit-runtime-logs.json"
      );
      setNotice(
        format === "txt" ? t("logs.exported_text") : t("logs.exported_json")
      );
    } catch (error) {
      setPageError(readErrorMessage(error, t("logs.export_failed")));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDownloadHouseholdSnapshot() {
    if (!token) {
      return;
    }

    setBusyAction("download-household-snapshot");
    try {
      const blob = await taskBanditApi.downloadHouseholdSnapshot(token, language);
      downloadBlob(blob, "taskbandit-household-snapshot.json");
      setNotice(t("exports.household_snapshot_downloaded"));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t("exports.household_snapshot_failed")));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRefreshSystemStatus() {
    if (!token) {
      return;
    }

    setBusyAction("refresh-system-status");
    try {
      await refreshSystemStatus(token, { reportErrors: true });
      setNotice(t("system_status.refreshed"));
      setPageError(null);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRefreshBackupReadiness() {
    if (!token) {
      return;
    }

    setBusyAction("refresh-backup-readiness");
    try {
      await refreshBackupReadiness(token, { reportErrors: true });
      setNotice(t("backup.refreshed"));
      setPageError(null);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRetryPushDelivery(deliveryId: string) {
    if (!token) {
      return;
    }

    setBusyAction(`retry-push:${deliveryId}`);
    try {
      await taskBanditApi.retryPushDelivery(token, language, deliveryId);
      await refreshDashboard(token, { silent: true });
      setNotice(t("notification_recovery.push_retry_success"));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t("notification_recovery.push_retry_failed")));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRetryEmailDelivery(notificationId: string) {
    if (!token) {
      return;
    }

    setBusyAction(`retry-email:${notificationId}`);
    try {
      await taskBanditApi.retryEmailDelivery(token, language, notificationId);
      await refreshDashboard(token, { silent: true });
      setNotice(t("notification_recovery.email_retry_success"));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t("notification_recovery.email_retry_failed")));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCancelInstance(instanceId: string) {
    if (!token) {
      return;
    }

    setBusyAction(`cancel:${instanceId}`);
    try {
      const cancelledInstance = await taskBanditApi.cancelInstance(token, language, instanceId);
      setPayload((current) =>
        current
          ? {
              ...current,
              instances: current.instances.map((instance) =>
                instance.id === instanceId ? cancelledInstance : instance
              )
            }
          : current
      );
      setNotice(t("instances.cancelled"));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t("instances.cancel_failed")));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleStartInstance(instanceId: string) {
    if (!token) {
      return;
    }

    setBusyAction(`start:${instanceId}`);
    try {
      const startedInstance = await taskBanditApi.startInstance(token, language, instanceId);
      setPayload((current) =>
        current
          ? {
              ...current,
              instances: current.instances.map((instance) =>
                instance.id === instanceId ? startedInstance : instance
              )
            }
          : current
      );
      setNotice(t("instances.started"));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t("instances.start_failed")));
    } finally {
      setBusyAction(null);
    }
  }

  function toggleChecklistItem(instanceId: string, checklistItemId: string, fallbackIds: string[]) {
    setSubmitSelections((current) => {
      const selected = new Set(current[instanceId] ?? fallbackIds);
      if (selected.has(checklistItemId)) {
        selected.delete(checklistItemId);
      } else {
        selected.add(checklistItemId);
      }

      return {
        ...current,
        [instanceId]: [...selected]
      };
    });
  }

  function getSelectedChecklistIds(instance: ChoreInstance) {
    return submitSelections[instance.id] ?? instance.checklistCompletionIds;
  }

  function handleProofFilesSelected(instanceId: string, files: FileList | null) {
    setSelectedProofFiles((current) => ({
      ...current,
      [instanceId]: files ? Array.from(files) : []
    }));
  }

  async function handleOpenAttachment(attachment: ChoreAttachment) {
    if (!token) {
      return;
    }

    setBusyAction(`attachment:${attachment.id}`);

    try {
      const result = await taskBanditApi.downloadProofAttachment(token, language, attachment.id);
      const objectUrl = window.URL.createObjectURL(result.blob);
      const popup = window.open(objectUrl, "_blank", "noopener,noreferrer");

      if (!popup) {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = result.filename ?? attachment.clientFilename;
        document.body.append(link);
        link.click();
        link.remove();
      }

      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 60_000);
    } catch (error) {
      setPageError(readErrorMessage(error, t("attachments.open_failed")));
    } finally {
      setBusyAction(null);
    }
  }

  function renderAttachmentList(label: string, attachments: ChoreAttachment[]) {
    return (
      <div className="attachment-list">
        <strong>{label}:</strong>
        <ul className="simple-list compact-list">
          {attachments.map((attachment) => (
            <li key={attachment.id}>
                <button
                  className="ghost-button"
                  type="button"
                  disabled={busyAction === `attachment:${attachment.id}`}
                  onClick={() => void handleOpenAttachment(attachment)}
                >
                  {busyAction === `attachment:${attachment.id}`
                    ? t("attachments.opening")
                    : `${t("attachments.open")}: ${attachment.clientFilename}`}
                </button>
              </li>
            ))}
        </ul>
      </div>
    );
  }

  function addChecklistDraftItem() {
    setTemplateForm((current) => ({
      ...current,
      checklist: [...(current.checklist ?? []), { title: "", required: true }]
    }));
  }

  function updateChecklistDraftItem(index: number, nextValue: { title?: string; required?: boolean }) {
    setTemplateForm((current) => ({
      ...current,
      checklist: (current.checklist ?? []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...nextValue } : item
      )
    }));
  }

  function removeChecklistDraftItem(index: number) {
    setTemplateForm((current) => ({
      ...current,
      checklist: (current.checklist ?? []).filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  function resetTemplateForm() {
    setEditingTemplateId(null);
    setTemplateForm({
      title: "",
      description: "",
      difficulty: "easy",
      assignmentStrategy: "round_robin",
      recurrenceType: "none",
      recurrenceIntervalDays: 2,
      recurrenceWeekdays: [],
      requirePhotoProof: false,
      dependencyTemplateIds: [],
      checklist: []
    });
  }

  function resetInstanceForm() {
    setEditingInstanceId(null);
    setInstanceForm((current) => ({
      ...current,
      assigneeId: "",
      title: "",
      dueAt: ""
    }));
  }

  function startEditingTemplate(template: ChoreTemplate) {
    setEditingTemplateId(template.id);
    setTemplateForm({
      title: template.title,
      description: template.description,
      difficulty: template.difficulty,
      assignmentStrategy: template.assignmentStrategy,
      recurrenceType: template.recurrence.type,
      recurrenceIntervalDays: template.recurrence.intervalDays ?? 2,
      recurrenceWeekdays: template.recurrence.weekdays,
      requirePhotoProof: template.requirePhotoProof,
      dependencyTemplateIds: template.dependencyTemplateIds,
      checklist: template.checklist.map((item) => ({
        title: item.title,
        required: item.required
      }))
    });
  }

  function startEditingInstance(instance: ChoreInstance) {
    setEditingInstanceId(instance.id);
    setInstanceForm({
      templateId: instance.templateId,
      assigneeId: instance.assigneeId ?? "",
      title: instance.title,
      dueAt: formatDateTimeLocal(instance.dueAt)
    });
  }

  function formatDate(value: string | null) {
    if (!value) {
      return t("common.none");
    }

    return new Intl.DateTimeFormat(language, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  }

  function formatCalendarDate(value: string) {
    return new Intl.DateTimeFormat(language, {
      weekday: "short",
      month: "short",
      day: "numeric"
    }).format(new Date(`${value}T00:00:00`));
  }

  function formatDateTimeLocal(value: string) {
    const date = new Date(value);
    const pad = (part: number) => part.toString().padStart(2, "0");

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function formatStatusChip(status: "ready" | "warning" | "error") {
    return t(`system_status.status_${status}`);
  }

  const roadmap = [
    t("roadmap.bootstrap"),
    t("roadmap.templates"),
    t("roadmap.approvals"),
    t("roadmap.leaderboard")
  ];

  const pageSectionLinks = useMemo<WorkspaceSectionLink[]>(() => {
    switch (activePage) {
      case "overview":
        return [
          ...(payload?.currentUser.role !== "child"
            ? [{ key: "overview-approvals", label: t("panel.approval_queue"), ref: approvalQueueRef }]
            : []),
          { key: "overview-notifications", label: t("panel.notifications"), ref: notificationsRef }
        ];
      case "chores":
        return [
          { key: "chores-mine", label: t("panel.my_chores"), ref: myChoresRef },
          { key: "chores-household", label: t("panel.household_chores"), ref: householdChoresRef }
        ];
      case "templates":
        return [
          { key: "templates-list", label: t("panel.chore_templates"), ref: templatesRef },
          { key: "templates-schedule", label: t("panel.schedule_chore"), ref: scheduleRef }
        ];
      case "household":
        return [{ key: "household-members", label: t("panel.household_members"), ref: membersRef }];
      case "notifications":
        return [
          { key: "notifications-inbox", label: t("panel.notifications"), ref: notificationsRef },
          {
            key: "notifications-preferences",
            label: t("panel.notification_preferences"),
            ref: notificationPreferencesRef
          },
          {
            key: "notifications-devices",
            label: t("panel.mobile_push_devices"),
            ref: notificationDevicesRef
          },
          ...(payload?.currentUser.role === "admin"
            ? [
                {
                  key: "notifications-health",
                  label: t("panel.household_notification_health"),
                  ref: notificationHealthRef
                }
              ]
            : [])
        ];
      case "settings":
        return [{ key: "settings-household", label: t("panel.household_settings"), ref: householdSettingsRef }];
      case "admin":
        return [
          { key: "admin-backup", label: t("panel.backup_readiness"), ref: backupReadinessRef },
          { key: "admin-system", label: t("panel.system_status"), ref: systemStatusRef },
          { key: "admin-logs", label: t("panel.runtime_logs"), ref: runtimeLogsRef },
          {
            key: "admin-recovery",
            label: t("panel.notification_recovery"),
            ref: notificationRecoveryRef
          }
        ];
      default:
        return [];
    }
  }, [activePage, payload?.currentUser.role, t]);

  function openWorkspacePage(page: WorkspacePage, targetRef?: RefObject<HTMLElement | null>) {
    setActivePage(page);
    if (targetRef) {
      window.setTimeout(() => {
        scrollToSection(targetRef);
      }, 60);
    }
  }

  function handleDismissAvailableUpdate() {
    if (!availableUpdateKey) {
      return;
    }

    window.localStorage.setItem(dismissedUpdateStorageKey, availableUpdateKey);
    setDismissedUpdateKey(availableUpdateKey);
  }

  return (
    <main className="app-shell">
      <section className="toolbar">
        <div className="toolbar-group">
          {payload?.currentUser ? (
            <div className="user-badge">
              <strong>{payload.currentUser.displayName}</strong>
              <span>
                {t(`role.${payload.currentUser.role}`)} - {formatNumber(payload.currentUser.points)} {t("user.points")}
              </span>
            </div>
          ) : (
            <div className="toolbar-pill">{t("auth.local_sign_in")}</div>
          )}
        </div>
        <div className="toolbar-group">
          <label className="language-picker">
            <span>{t("locale.label")}</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value as AppLanguage)}>
              {languageOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {payload?.currentUser ? (
            <button className="ghost-button" type="button" onClick={() => handleLogout()}>
              {t("auth.logout")}
            </button>
          ) : null}
        </div>
      </section>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{payload ? t("hero.authenticated_eyebrow") : t("hero.eyebrow")}</p>
          <h1>{payload ? t("hero.authenticated_title") : t("hero.title")}</h1>
          <p className="lede">{payload ? t("hero.authenticated_lede") : t("hero.lede")}</p>
          {payload?.household ? (
            <div className="hero-meta">
              <span>{payload.household.name}</span>
              <span>
                {payload.household.members.length} {t("household.members")}
              </span>
              <span>
                {formatNumber(payload.currentUser.currentStreak)} {t("user.streak")}
              </span>
            </div>
          ) : null}
        </div>
        <div className="mascot-card" aria-label="TaskBandit mascot placeholder">
          <img className="mascot-art" src="./taskbandit-raccoon.svg" alt={t("hero.mascot_alt")} />
          <p>{payload ? t("hero.mascot_ready") : t("hero.mascot")}</p>
        </div>
      </section>

      {notice ? <div className="notice-banner success">{notice}</div> : null}
      {pageError ? <div className="notice-banner error">{pageError}</div> : null}
      {showAvailableUpdateNotice && availableUpdate ? (
        <div className="notice-banner info update-banner">
          <div>
            <strong>{t("release.update_available_title")}</strong>
            <p>
              {t("release.update_available_body")
                .replace("{current}", formatReleaseLabel(currentWebReleaseInfo))
                .replace("{latest}", formatReleaseLabel(availableUpdate))}
            </p>
          </div>
          <button className="ghost-button" type="button" onClick={handleDismissAvailableUpdate}>
            {t("release.dismiss_update")}
          </button>
        </div>
      ) : null}
      <div className="release-strip">
        <span className="status-pill">
          {t("release.web_build").replace("{release}", formatReleaseLabel(currentWebReleaseInfo))}
        </span>
        {serverReleaseInfo ? (
          <span className="status-pill">
            {t("release.server_build").replace("{release}", formatReleaseLabel(serverReleaseInfo))}
          </span>
        ) : null}
      </div>

      {!payload ? (
        <section className="content-grid login-grid">
          {bootstrapStatus?.isBootstrapped === false ? (
            <article className="panel login-panel">
              <div className="section-heading">
                <h2>{t("bootstrap.title")}</h2>
                <span className="section-kicker">{t("bootstrap.kicker")}</span>
              </div>
              <form className="login-form" onSubmit={handleBootstrapSubmit}>
                <label>
                  <span>{t("bootstrap.household_name")}</span>
                  <input
                    type="text"
                    value={bootstrapForm.householdName}
                    onChange={(event) =>
                      setBootstrapForm((current) => ({ ...current, householdName: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>{t("bootstrap.owner_display_name")}</span>
                  <input
                    type="text"
                    value={bootstrapForm.ownerDisplayName}
                    onChange={(event) =>
                      setBootstrapForm((current) => ({ ...current, ownerDisplayName: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>{t("bootstrap.owner_email")}</span>
                  <input
                    type="email"
                    value={bootstrapForm.ownerEmail}
                    onChange={(event) =>
                      setBootstrapForm((current) => ({ ...current, ownerEmail: event.target.value }))
                    }
                    autoComplete="email"
                  />
                </label>
                <label>
                  <span>{t("bootstrap.owner_password")}</span>
                  <input
                    type="password"
                    value={bootstrapForm.ownerPassword}
                    onChange={(event) =>
                      setBootstrapForm((current) => ({ ...current, ownerPassword: event.target.value }))
                    }
                    autoComplete="new-password"
                  />
                </label>
                <label className="toggle-row">
                  <span>{t("bootstrap.self_signup")}</span>
                  <input
                    type="checkbox"
                    checked={bootstrapForm.selfSignupEnabled}
                    onChange={(event) =>
                      setBootstrapForm((current) => ({ ...current, selfSignupEnabled: event.target.checked }))
                    }
                  />
                </label>
                <button className="primary-button" type="submit" disabled={busyAction === "bootstrap"}>
                  {t("bootstrap.create")}
                </button>
              </form>
            </article>
          ) : (
            <article className="panel login-panel">
              <div className="section-heading">
                <h2>{t("auth.sign_in")}</h2>
                <span className="section-kicker">
                  {providers?.local.enabled ? t("auth.demo_ready") : t("auth.local_disabled_notice")}
                </span>
              </div>
              <form className="login-form" onSubmit={handleLoginSubmit}>
                {providers?.local.enabled ? (
                  <>
                    <label>
                      <span>{t("auth.email")}</span>
                      <input
                        type="email"
                        value={loginForm.email}
                        onChange={(event) =>
                          setLoginForm((current) => ({ ...current, email: event.target.value }))
                        }
                        autoComplete="email"
                      />
                    </label>
                    <label>
                      <span>{t("auth.password")}</span>
                      <input
                        type="password"
                        value={loginForm.password}
                        onChange={(event) =>
                          setLoginForm((current) => ({ ...current, password: event.target.value }))
                        }
                        autoComplete="current-password"
                      />
                    </label>
                    <button
                      className="ghost-button"
                      type="button"
                      disabled={isAuthenticating}
                      onClick={() =>
                        setPasswordResetRequestForm({
                          email: passwordResetRequestForm.email || loginForm.email
                        })
                      }
                    >
                      {t("auth.forgot_password")}
                    </button>
                  </>
                ) : (
                  <p className="inline-message">{t("auth.local_disabled_notice")}</p>
                )}
                {loginError ? <p className="inline-message error-text">{loginError}</p> : null}
                {providers?.local.enabled ? (
                  <button className="primary-button" type="submit" disabled={isAuthenticating}>
                    {isAuthenticating ? t("auth.signing_in") : t("auth.sign_in")}
                  </button>
                ) : null}
                {providers?.oidc.enabled ? (
                  <>
                    <p className="inline-message">{t("auth.oidc_hint")}</p>
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={isAuthenticating}
                      onClick={handleOidcSignIn}
                    >
                      {t("auth.oidc_sign_in")}
                    </button>
                  </>
                ) : null}
              </form>
            </article>
          )}

          {bootstrapStatus?.isBootstrapped !== false && providers?.local.enabled ? (
            <article className="panel login-panel">
              <div className="section-heading">
                <h2>
                  {passwordResetToken
                    ? t("auth.password_reset_complete_title")
                    : t("auth.password_reset_request_title")}
                </h2>
                <span className="section-kicker">
                  {passwordResetToken
                    ? t("auth.password_reset_complete_kicker")
                    : t("auth.password_reset_request_kicker")}
                </span>
              </div>
              {passwordResetToken ? (
                <form className="login-form" onSubmit={handlePasswordResetCompleteSubmit}>
                  <label>
                    <span>{t("auth.password")}</span>
                    <input
                      type="password"
                      value={passwordResetCompleteForm.password}
                      onChange={(event) =>
                        setPasswordResetCompleteForm({ password: event.target.value })
                      }
                      autoComplete="new-password"
                    />
                  </label>
                  {loginError ? <p className="inline-message error-text">{loginError}</p> : null}
                  <button className="primary-button" type="submit" disabled={isAuthenticating}>
                    {isAuthenticating
                      ? t("auth.password_reset_completing")
                      : t("auth.password_reset_complete_action")}
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    disabled={isAuthenticating}
                    onClick={() => {
                      setPasswordResetToken(null);
                      setPasswordResetCompleteForm({ password: "" });
                    }}
                  >
                    {t("common.cancel")}
                  </button>
                </form>
              ) : (
                <form className="login-form" onSubmit={handlePasswordResetRequestSubmit}>
                  <label>
                    <span>{t("auth.email")}</span>
                    <input
                      type="email"
                      value={passwordResetRequestForm.email}
                      onChange={(event) =>
                        setPasswordResetRequestForm({ email: event.target.value })
                      }
                      autoComplete="email"
                    />
                  </label>
                  <p className="inline-message">{t("auth.password_reset_request_hint")}</p>
                  {loginError ? <p className="inline-message error-text">{loginError}</p> : null}
                  <button className="secondary-button" type="submit" disabled={isAuthenticating}>
                    {isAuthenticating
                      ? t("auth.password_reset_requesting")
                      : t("auth.password_reset_request_action")}
                  </button>
                </form>
              )}
            </article>
          ) : null}

          {bootstrapStatus?.isBootstrapped !== false &&
          providers?.local.enabled &&
          providers.local.selfSignupEnabled ? (
            <article className="panel login-panel">
              <div className="section-heading">
                <h2>{t("auth.sign_up")}</h2>
                <span className="section-kicker">{t("auth.sign_up_kicker")}</span>
              </div>
              <form className="login-form" onSubmit={handleSignupSubmit}>
                <label>
                  <span>{t("auth.display_name")}</span>
                  <input
                    type="text"
                    value={signupForm.displayName}
                    onChange={(event) =>
                      setSignupForm((current) => ({ ...current, displayName: event.target.value }))
                    }
                    autoComplete="name"
                  />
                </label>
                <label>
                  <span>{t("auth.email")}</span>
                  <input
                    type="email"
                    value={signupForm.email}
                    onChange={(event) =>
                      setSignupForm((current) => ({ ...current, email: event.target.value }))
                    }
                    autoComplete="email"
                  />
                </label>
                <label>
                  <span>{t("auth.password")}</span>
                  <input
                    type="password"
                    value={signupForm.password}
                    onChange={(event) =>
                      setSignupForm((current) => ({ ...current, password: event.target.value }))
                    }
                    autoComplete="new-password"
                  />
                </label>
                <button className="primary-button" type="submit" disabled={isAuthenticating}>
                  {isAuthenticating ? t("auth.signing_up") : t("auth.sign_up")}
                </button>
              </form>
            </article>
          ) : null}

          {providers?.local.enabled ? (
            <article className="panel">
              <div className="section-heading">
                <h2>{t("panel.demo_accounts")}</h2>
                <span className="section-kicker">{t("panel.demo_password")}</span>
              </div>
              <ul className="simple-list">
                <li>Alex - alex@taskbandit.local - {t("role.admin")}</li>
                <li>Maya - maya@taskbandit.local - {t("role.parent")}</li>
                <li>Luca - luca@taskbandit.local - {t("role.child")}</li>
              </ul>
            </article>
          ) : null}

          <article className="panel">
            <div className="section-heading">
              <h2>{t("panel.providers")}</h2>
              <span className="section-kicker">{t("panel.providers_hint")}</span>
            </div>
            <ul className="simple-list">
              <li>
                {t("auth.local_provider")}: {providers?.local.enabled ? t("common.enabled") : t("common.disabled")}
              </li>
              {providers?.local.forcedByConfig ? <li>{t("auth.local_forced_note")}</li> : null}
              <li>
                {t("auth.oidc_provider")}: {providers?.oidc.enabled ? t("common.enabled") : t("common.disabled")}
              </li>
              {providers?.oidc.enabled ? <li>{providers.oidc.authority}</li> : null}
              {providers?.oidc.enabled ? <li>{t(`auth.oidc_source_${providers.oidc.source}`)}</li> : null}
              {providers?.oidc.enabled ? <li>{t("auth.oidc_callback_hint")}</li> : null}
            </ul>
          </article>

          <article className="panel">
            <div className="section-heading">
              <h2>{t("panel.v1_focus")}</h2>
              <span className="section-kicker">{t("hero.eyebrow")}</span>
            </div>
            <ul className="simple-list">
              {roadmap.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>
      ) : (
        <div className="workspace-shell">
          <aside className="workspace-sidebar">
            <div className="panel workspace-sidebar-panel">
              <p className="workspace-nav-kicker">{t("nav.workspace")}</p>
              <div className="workspace-nav">
                {availablePages.map((page) => (
                  <button
                    key={page.key}
                    className={`workspace-nav-button ${page.key === activePage ? "active" : ""}`}
                    type="button"
                    onClick={() => openWorkspacePage(page.key)}
                  >
                    {page.label}
                  </button>
                ))}
              </div>
              <div className="workspace-version-block">
                <p className="workspace-version-label">{t("release.web_label")}</p>
                <strong>{formatReleaseLabel(currentWebReleaseInfo)}</strong>
                {serverReleaseInfo ? (
                  <p>{t("release.server_label").replace("{release}", formatReleaseLabel(serverReleaseInfo))}</p>
                ) : null}
              </div>
            </div>
          </aside>
          <div className="workspace-main" data-page={activePage}>
            <section className="panel workspace-page-header">
              <div>
                <p className="workspace-nav-kicker">{payload.household.name}</p>
                <h2>{activePageLabel}</h2>
                <p className="workspace-page-copy">{pageDescriptions[activePage]}</p>
              </div>
              <div className="workspace-page-meta">
                <span className="status-pill">{t(`role.${payload.currentUser.role}`)}</span>
                <span className="status-pill">
                  {formatNumber(payload.currentUser.points)} {t("user.points")}
                </span>
                <span className="status-pill">
                  {formatNumber(payload.currentUser.currentStreak)} {t("user.streak")}
                </span>
              </div>
            </section>

            {pageSectionLinks.length > 0 ? (
              <section className="panel workspace-subnav-panel">
                <span className="section-kicker">{t("nav.jump_to")}</span>
                <div className="workspace-subnav">
                  {pageSectionLinks.map((link) => (
                    <button
                      key={link.key}
                      className="workspace-subnav-button"
                      type="button"
                      onClick={() => scrollToSection(link.ref)}
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

          {showOnboarding && activePage === "overview" ? (
            <section className="onboarding-shell">
              <article className="panel onboarding-panel">
                <div className="section-heading">
                  <h2>{t("onboarding.title")}</h2>
                  <span className="section-kicker">
                    {t("onboarding.progress")
                      .replace("{current}", String(onboardingIndex + 1))
                      .replace("{total}", String(onboardingSteps.length))}
                  </span>
                </div>
                <div className="onboarding-step-list">
                  {onboardingSteps.map((step, index) => (
                    <button
                      key={step.key}
                      className={`onboarding-chip ${step.key === onboardingStep ? "active" : ""}`}
                      type="button"
                      onClick={() => setOnboardingStep(step.key)}
                    >
                      <span>{index + 1}</span>
                      <strong>{step.title}</strong>
                    </button>
                  ))}
                </div>
                <div className="onboarding-body">
                  <h3>{currentOnboardingStep.title}</h3>
                  <p>{currentOnboardingStep.description}</p>
                </div>
                <div className="button-row">
                  <button
                    className="ghost-button"
                    type="button"
                    disabled={onboardingIndex === 0}
                    onClick={handlePreviousOnboardingStep}
                  >
                    {t("onboarding.back")}
                  </button>
                  {currentOnboardingStep.actionLabel && currentOnboardingStep.action ? (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={currentOnboardingStep.action}
                    >
                      {currentOnboardingStep.actionLabel}
                    </button>
                  ) : null}
                  {onboardingIndex < onboardingSteps.length - 1 ? (
                    <button className="primary-button" type="button" onClick={handleNextOnboardingStep}>
                      {t("onboarding.next")}
                    </button>
                  ) : (
                    <button
                      className="primary-button"
                      type="button"
                      disabled={busyAction === "complete-onboarding"}
                      onClick={() => void handleCompleteOnboarding()}
                    >
                      {t("onboarding.finish")}
                    </button>
                  )}
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => setOnboardingDismissed(true)}
                  >
                    {t("onboarding.later")}
                  </button>
                </div>
              </article>
            </section>
          ) : null}

          {activePage === "overview" ? (
          <section className="metrics">
            {featuredMetrics.map((metric) => (
              <DashboardCard key={metric.label} label={metric.label} value={metric.value} />
            ))}
          </section>
          ) : null}

          {isLoading ? <div className="notice-banner info">{t("common.loading")}</div> : null}

          <section className="content-grid dashboard-grid">
            {payload.currentUser.role !== "child" ? (
              <article className="panel page-panel page-overview" ref={approvalQueueRef}>
                <div className="section-heading">
                  <h2>{t("panel.approval_queue")}</h2>
                  <span className="section-kicker">{pendingApprovals.length}</span>
                </div>
                {pendingApprovals.length === 0 ? (
                  <p className="empty-state">{t("approval.empty")}</p>
                ) : (
                  <div className="stack-list">
                    {pendingApprovals.map((instance) => (
                      <div className="task-row" key={instance.id}>
                        <div className="task-row-header">
                          <strong>{instance.title}</strong>
                          <span className={`status-pill state-${instance.state}`}>{t(`state.${instance.state}`)}</span>
                        </div>
                        <p>
                          {t("task.assignee")}:{" "}
                          {instance.assigneeId
                            ? memberLookup.get(instance.assigneeId)?.displayName ?? t("common.unknown")
                            : t("common.unassigned")}
                        </p>
                        <p>
                          {t("task.submitted")}: {formatDate(instance.submittedAt)}
                        </p>
                        {instance.submissionNote ? (
                          <p>
                            {t("task.note")}: {instance.submissionNote}
                          </p>
                        ) : null}
                          {instance.attachments.length > 0 ? (
                            renderAttachmentList(t("task.attachments"), instance.attachments)
                          ) : null}
                        <label className="inline-field">
                          <span>{t("approval.review_note")}</span>
                          <textarea
                            value={reviewNotes[instance.id] ?? ""}
                            onChange={(event) =>
                              setReviewNotes((current) => ({
                                ...current,
                                [instance.id]: event.target.value
                              }))
                            }
                            rows={3}
                          />
                        </label>
                        <div className="button-row">
                          <button
                            className="primary-button"
                            type="button"
                            disabled={busyAction === `approve:${instance.id}` || busyAction === `reject:${instance.id}`}
                            onClick={() => void handleReview(instance.id, "approve")}
                          >
                            {t("approval.approve")}
                          </button>
                          <button
                            className="secondary-button"
                            type="button"
                            disabled={busyAction === `approve:${instance.id}` || busyAction === `reject:${instance.id}`}
                            onClick={() => void handleReview(instance.id, "reject")}
                          >
                            {t("approval.reject")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ) : null}

            <article className="panel page-panel page-chores" ref={myChoresRef}>
              <div className="section-heading">
                <h2>{t("panel.my_chores")}</h2>
                <span className="section-kicker">{myChores.length}</span>
              </div>
              {myChores.length === 0 ? (
                <p className="empty-state">{t("submission.empty")}</p>
              ) : (
                <div className="stack-list my-chore-groups">
                  <p className="inline-message">{t("submission.priority_hint")}</p>
                  {renderMyChoreSection(
                    t("panel.needs_fixes"),
                    myNeedsFixesChores,
                    t("submission.empty_needs_fixes")
                  )}
                  {renderMyChoreSection(
                    t("panel.in_progress"),
                    myInProgressChores,
                    t("submission.empty_in_progress")
                  )}
                  {renderMyChoreSection(
                    t("panel.ready_to_start"),
                    myReadyToStartChores,
                    t("submission.empty_ready_to_start")
                  )}
                </div>
              )}
            </article>

            <article className="panel page-panel page-overview">
              <div className="section-heading">
                <h2>{t("panel.leaderboard")}</h2>
                <span className="section-kicker">{payload.dashboard.streakLeader}</span>
              </div>
              <div className="stack-list">
                {payload.dashboard.leaderboard.map((member, index) => (
                  <div className="leader-row" key={member.id}>
                    <div>
                      <strong>
                        {index + 1}. {member.displayName}
                      </strong>
                      <p>
                        {t(`role.${member.role}`)} - {member.currentStreak} {t("user.streak")}
                      </p>
                    </div>
                    <strong>
                      {formatNumber(member.points)} {t("user.points")}
                    </strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel page-panel page-notifications" ref={notificationsRef}>
              <div className="section-heading">
                <h2>{t("panel.notifications")}</h2>
                <div className="toolbar-group">
                  <span className="section-kicker">{unreadNotifications.length}</span>
                  {unreadNotifications.length > 0 ? (
                    <button
                      className="ghost-button"
                      type="button"
                      disabled={busyAction === "notification-read-all"}
                      onClick={() => void handleMarkAllNotificationsRead()}
                    >
                      {t("notifications.mark_all_read")}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="stack-list">
                {payload.notifications.length === 0 ? (
                  <p className="inline-message">{t("notifications.empty")}</p>
                ) : (
                  payload.notifications.map((notification) => (
                    <div className="task-row compact" key={notification.id}>
                      <div className="task-row-header">
                        <strong>{notification.title}</strong>
                        <span className="status-pill">
                          {notification.isRead ? t("notifications.read") : t("notifications.unread")}
                        </span>
                      </div>
                      <p>{notification.message}</p>
                      <div className="notification-delivery-grid">
                        <div className="notification-delivery-block">
                          <span className={`status-pill delivery-${notification.delivery.push.status}`}>
                            {t("notifications.push_delivery")}:{" "}
                            {t(`notifications.delivery_${notification.delivery.push.status}`)}
                          </span>
                          <p>
                            {t("notifications.delivery_targets")}:{" "}
                            {notification.delivery.push.targetCount}
                          </p>
                          {notification.delivery.push.targetCount > 0 ? (
                            <p>
                              {t("notifications.delivery_counts")
                                .replace("{sent}", String(notification.delivery.push.sentCount))
                                .replace("{pending}", String(notification.delivery.push.pendingCount))
                                .replace("{failed}", String(notification.delivery.push.failedCount))}
                            </p>
                          ) : null}
                        </div>
                        <div className="notification-delivery-block">
                          <span className={`status-pill delivery-${notification.delivery.email.status}`}>
                            {t("notifications.email_fallback")}:{" "}
                            {t(`notifications.delivery_${notification.delivery.email.status}`)}
                          </span>
                          {notification.delivery.email.attemptedAt ? (
                            <p>
                              {t("notifications.delivery_attempted")}:{" "}
                              {formatDate(notification.delivery.email.attemptedAt)}
                            </p>
                          ) : null}
                          {notification.delivery.email.error ? (
                            <p>
                              {t("notifications.delivery_error")}: {notification.delivery.email.error}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="button-row">
                        <p>
                          {t("notifications.recorded")}: {formatDate(notification.createdAt)}
                        </p>
                        {!notification.isRead ? (
                          <button
                            className="ghost-button"
                            type="button"
                            disabled={busyAction === `notification-read:${notification.id}`}
                            onClick={() => void handleMarkNotificationRead(notification.id)}
                          >
                            {t("notifications.mark_read")}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="panel page-panel page-overview">
              <div className="section-heading">
                <h2>{t("panel.points_feed")}</h2>
                <span className="section-kicker">{payload.pointsLedger.length}</span>
              </div>
              <div className="stack-list">
                {payload.pointsLedger.length === 0 ? (
                  <p className="inline-message">{t("points.empty")}</p>
                ) : (
                  payload.pointsLedger.map((entry) => (
                    <div className="task-row compact" key={entry.id}>
                      <div className="task-row-header">
                        <strong>{entry.user.displayName}</strong>
                        <span className="status-pill">
                          {entry.amount > 0 ? `+${entry.amount}` : entry.amount} {t("user.points")}
                        </span>
                      </div>
                      <p>{entry.reason}</p>
                      <p>
                        {t("points.recorded")}: {formatDate(entry.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </article>

            {payload.currentUser.role !== "child" ? (
              <article className="panel page-panel page-overview">
                <div className="section-heading">
                  <h2>{t("panel.audit_log")}</h2>
                  <span className="section-kicker">{payload.auditLog.length}</span>
                </div>
                <div className="stack-list">
                  {payload.auditLog.length === 0 ? (
                    <p className="inline-message">{t("audit.empty")}</p>
                  ) : (
                    payload.auditLog.map((entry) => (
                      <div className="task-row compact" key={entry.id}>
                        <div className="task-row-header">
                          <strong>{entry.summary}</strong>
                          <span className="status-pill">{formatDate(entry.createdAt)}</span>
                        </div>
                        <p>
                          {t("audit.actor")}:{" "}
                          {entry.actor
                            ? `${entry.actor.displayName} (${t(`role.${entry.actor.role}`)})`
                            : t("audit.system")}
                        </p>
                        <p>
                          {t("audit.entity")}: {entry.entityType}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            ) : null}

            {payload.currentUser.role === "admin" ? (
              <article className="panel page-panel page-admin" ref={runtimeLogsRef}>
                <div className="section-heading">
                  <h2>{t("panel.runtime_logs")}</h2>
                  <div className="toolbar-group">
                    <span className="section-kicker">{runtimeLogs.length}</span>
                    <button
                      className="ghost-button"
                      type="button"
                      disabled={busyAction === "refresh-runtime-logs"}
                      onClick={() => void handleRefreshRuntimeLogs()}
                    >
                      {t("logs.refresh")}
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      disabled={busyAction === "download-runtime-logs-txt"}
                      onClick={() => void handleDownloadRuntimeLogs("txt")}
                    >
                      {t("logs.export_text")}
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      disabled={busyAction === "download-runtime-logs-json"}
                      onClick={() => void handleDownloadRuntimeLogs("json")}
                    >
                      {t("logs.export_json")}
                    </button>
                  </div>
                </div>
                <div className="log-viewer">
                  {runtimeLogs.length === 0 ? (
                    <p className="inline-message">{t("logs.empty")}</p>
                  ) : (
                    runtimeLogs.map((entry) => (
                      <div className={`log-entry log-level-${entry.level}`} key={entry.id}>
                        <div className="log-meta">
                          <span className={`status-pill log-pill log-pill-${entry.level}`}>
                            {t(`logs.level.${entry.level}`)}
                          </span>
                          <span>{formatDate(entry.timestamp)}</span>
                          {entry.context ? <span>{entry.context}</span> : null}
                        </div>
                        <p className="log-message">{entry.message}</p>
                        {entry.stack ? <pre className="log-stack">{entry.stack}</pre> : null}
                      </div>
                    ))
                  )}
                </div>
              </article>
            ) : null}

            <article className="panel panel-wide page-panel page-chores" ref={householdChoresRef}>
              <div className="section-heading">
                <h2>{t("panel.household_chores")}</h2>
                <div className="toolbar-group">
                  <span className="section-kicker">{visibleHouseholdChores.length}</span>
                  <button
                    className="ghost-button"
                    type="button"
                    disabled={busyAction === "download-chores-export"}
                    onClick={() => void handleDownloadChoresExport()}
                  >
                    {t("exports.download_chores")}
                  </button>
                  {payload.currentUser.role === "admin" ? (
                    <button
                      className="ghost-button"
                      type="button"
                      disabled={busyAction === "download-household-snapshot"}
                      onClick={() => void handleDownloadHouseholdSnapshot()}
                    >
                      {t("exports.download_household_snapshot")}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="household-filter-bar">
                <label>
                  <span>{t("filters.view")}</span>
                  <div className="segmented-toggle" role="tablist" aria-label={t("filters.view")}>
                    <button
                      className={householdViewMode === "list" ? "active" : ""}
                      type="button"
                      onClick={() => setHouseholdViewMode("list")}
                    >
                      {t("view.list")}
                    </button>
                    <button
                      className={householdViewMode === "board" ? "active" : ""}
                      type="button"
                      onClick={() => setHouseholdViewMode("board")}
                    >
                      {t("view.board")}
                    </button>
                    <button
                      className={householdViewMode === "calendar" ? "active" : ""}
                      type="button"
                      onClick={() => setHouseholdViewMode("calendar")}
                    >
                      {t("view.calendar")}
                    </button>
                  </div>
                </label>
                <label>
                  <span>{t("filters.state")}</span>
                  <select
                    value={householdStateFilter}
                    onChange={(event) =>
                      setHouseholdStateFilter(event.target.value as HouseholdChoreStateFilter)
                    }
                  >
                    <option value="all">{t("filters.all_states")}</option>
                    {householdBoardStateOrder.map((state) => (
                      <option key={state} value={state}>
                        {t(`state.${state}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("filters.assignee")}</span>
                  <select
                    value={householdAssigneeFilter}
                    onChange={(event) => setHouseholdAssigneeFilter(event.target.value)}
                  >
                    <option value="all">{t("filters.all_members")}</option>
                    <option value="unassigned">{t("filters.unassigned")}</option>
                    {payload.household.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.displayName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {visibleHouseholdChores.length === 0 ? (
                <p className="empty-state">{t("empty.filtered_chores")}</p>
              ) : householdViewMode === "list" ? (
                <div className="stack-list">
                  {visibleHouseholdChores.map((instance) => renderHouseholdChoreCard(instance))}
                </div>
              ) : householdViewMode === "board" ? (
                <div className="board-grid">
                  {householdBoardColumns.map((column) => (
                    <section className="board-column" key={column.state}>
                      <div className="board-column-header">
                        <strong>{t(`state.${column.state}`)}</strong>
                        <span className={`status-pill state-${column.state}`}>{column.chores.length}</span>
                      </div>
                      <div className="stack-list">
                        {column.chores.map((instance) => renderHouseholdChoreCard(instance))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="calendar-grid">
                  {householdCalendarGroups.map((group) => (
                    <section className="calendar-day" key={group.dateKey}>
                      <div className="calendar-day-header">
                        <strong>{formatCalendarDate(group.dateKey)}</strong>
                        <span className="status-pill">{group.chores.length}</span>
                      </div>
                      <div className="stack-list">
                        {group.chores.map((instance) => renderHouseholdChoreCard(instance))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </article>

            {notificationPreferencesDraft ? (
              <article className="panel page-panel page-notifications" ref={notificationPreferencesRef}>
                <div className="section-heading">
                  <h2>{t("panel.notification_preferences")}</h2>
                  <span className="section-kicker">{t("settings.member_level")}</span>
                </div>
                <div className="settings-list">
                  <label className="toggle-row">
                    <span>{t("settings.notify_assignments")}</span>
                    <input
                      type="checkbox"
                      checked={notificationPreferencesDraft.receiveAssignments}
                      onChange={(event) =>
                        setNotificationPreferencesDraft((current) =>
                          current ? { ...current, receiveAssignments: event.target.checked } : current
                        )
                      }
                    />
                  </label>
                  <label className="toggle-row">
                    <span>{t("settings.notify_reviews")}</span>
                    <input
                      type="checkbox"
                      checked={notificationPreferencesDraft.receiveReviewUpdates}
                      onChange={(event) =>
                        setNotificationPreferencesDraft((current) =>
                          current ? { ...current, receiveReviewUpdates: event.target.checked } : current
                        )
                      }
                    />
                  </label>
                  <label className="toggle-row">
                    <span>{t("settings.notify_due_soon")}</span>
                    <input
                      type="checkbox"
                      checked={notificationPreferencesDraft.receiveDueSoonReminders}
                      onChange={(event) =>
                        setNotificationPreferencesDraft((current) =>
                          current
                            ? { ...current, receiveDueSoonReminders: event.target.checked }
                            : current
                        )
                      }
                    />
                  </label>
                  <label className="toggle-row">
                    <span>{t("settings.notify_overdue")}</span>
                    <input
                      type="checkbox"
                      checked={notificationPreferencesDraft.receiveOverdueAlerts}
                      onChange={(event) =>
                        setNotificationPreferencesDraft((current) =>
                          current ? { ...current, receiveOverdueAlerts: event.target.checked } : current
                        )
                      }
                    />
                  </label>
                  <label className="toggle-row">
                    <span>{t("settings.notify_daily_summary")}</span>
                    <input
                      type="checkbox"
                      checked={notificationPreferencesDraft.receiveDailySummary}
                      onChange={(event) =>
                        setNotificationPreferencesDraft((current) =>
                          current ? { ...current, receiveDailySummary: event.target.checked } : current
                        )
                      }
                    />
                  </label>
                </div>
                <button
                  className="primary-button"
                  type="button"
                  disabled={busyAction === "save-notification-preferences"}
                  onClick={() => void handleSaveNotificationPreferences()}
                >
                  {t("settings.save_notification_preferences")}
                </button>
              </article>
            ) : null}

            {payload.notificationDevices ? (
              <article className="panel page-panel page-notifications" ref={notificationDevicesRef}>
                <div className="section-heading">
                  <h2>{t("panel.mobile_push_devices")}</h2>
                  <span className="section-kicker">{formatNumber(pushReadyDeviceCount)}</span>
                </div>
                <p>{t("settings.push_primary_hint")}</p>
                {!payload.household.settings.enablePushNotifications ? (
                  <p className="error-text">{t("settings.push_household_disabled")}</p>
                ) : null}
                {payload.notificationDevices.length === 0 ? (
                  <p className="inline-message">{t("settings.no_notification_devices")}</p>
                ) : (
                  <div className="stack-list">
                    {payload.notificationDevices.map((device) => (
                      <div className="task-row compact" key={device.id}>
                        <div className="task-row-header">
                          <strong>{device.deviceName || t("settings.notification_device_android")}</strong>
                          <span
                            className={`status-pill ${device.pushTokenConfigured ? "state-completed" : "state-open"}`}
                          >
                            {device.pushTokenConfigured
                              ? t("settings.notification_device_push_ready")
                              : t("settings.notification_device_waiting")}
                          </span>
                        </div>
                        <p>
                          {t("settings.notification_device_provider")}:{" "}
                          {device.provider === "fcm"
                            ? t("settings.notification_device_provider_fcm")
                            : t("settings.notification_device_provider_generic")}
                        </p>
                        <p>
                          {t("settings.notification_device_last_seen")}: {formatDate(device.lastSeenAt)}
                        </p>
                        {device.appVersion ? (
                          <p>
                            {t("settings.notification_device_app_version")}: {device.appVersion}
                          </p>
                        ) : null}
                        {device.locale ? (
                          <p>
                            {t("settings.notification_device_locale")}: {device.locale}
                          </p>
                        ) : null}
                        <div className="button-row">
                          <button
                            className="ghost-button"
                            type="button"
                            disabled={busyAction === `delete-device:${device.id}`}
                            onClick={() => void handleDeleteNotificationDevice(device.id)}
                          >
                            {t("settings.notification_device_remove")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ) : null}

            {payload.currentUser.role === "admin" ? (
              <article className="panel page-panel page-notifications" ref={notificationHealthRef}>
                <div className="section-heading">
                  <h2>{t("panel.household_notification_health")}</h2>
                  <span className="section-kicker">{formatNumber(householdPushReadyCount)}</span>
                </div>
                <p>{t("settings.household_notification_health_hint")}</p>
                {payload.householdNotificationHealth.length === 0 ? (
                  <p className="inline-message">{t("settings.household_notification_health_empty")}</p>
                ) : (
                  <div className="stack-list">
                    {payload.householdNotificationHealth.map((entry) => (
                      <div className="task-row compact" key={entry.userId}>
                        <div className="task-row-header">
                          <strong>{entry.displayName}</strong>
                          <span className={`status-pill delivery-${entry.deliveryMode}`}>
                            {t(`settings.delivery_mode_${entry.deliveryMode}`)}
                          </span>
                        </div>
                        <p>
                          {t("members.role")}: {t(`role.${entry.role}`)}
                        </p>
                        <p>
                          {t("settings.notification_device_count")}: {entry.registeredDeviceCount}
                        </p>
                        <p>
                          {t("settings.notification_push_ready_count")}: {entry.pushReadyDeviceCount}
                        </p>
                        <p>
                          {t("settings.notification_email_fallback")}:{" "}
                          {entry.emailFallbackEligible ? t("common.enabled") : t("common.disabled")}
                        </p>
                        {entry.email ? (
                          <p>
                            {t("members.email")}: {entry.email}
                          </p>
                        ) : null}
                        {entry.latestDeviceSeenAt ? (
                          <p>
                            {t("settings.notification_device_last_seen")}:{" "}
                            {formatDate(entry.latestDeviceSeenAt)}
                          </p>
                        ) : null}
                        <div className="button-row">
                          <button
                            className="ghost-button"
                            type="button"
                            disabled={busyAction === `test-notification:${entry.userId}`}
                            onClick={() => void handleSendTestNotification(entry.userId)}
                          >
                            {t("settings.send_test_notification")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ) : null}

            {payload.currentUser.role === "admin" ? (
              <article className="panel page-panel page-admin" ref={backupReadinessRef}>
                <div className="section-heading">
                  <h2>{t("panel.backup_readiness")}</h2>
                  <div className="toolbar-group">
                    <span className="section-kicker">
                      {payload.backupReadiness
                        ? formatDate(payload.backupReadiness.checkedAt)
                        : t("common.none")}
                    </span>
                    <button
                      className="ghost-button"
                      type="button"
                      disabled={busyAction === "refresh-backup-readiness"}
                      onClick={() => void handleRefreshBackupReadiness()}
                    >
                      {t("backup.refresh")}
                    </button>
                  </div>
                </div>
                <p>{t("backup.hint")}</p>
                {payload.backupReadiness ? (
                  <div className="system-status-grid">
                    <div className="task-row compact">
                      <div className="task-row-header">
                        <strong>{t("backup.host_paths")}</strong>
                        <span className="status-pill system-ready">{t("system_status.status_ready")}</span>
                      </div>
                      <p>
                        {t("backup.data_root")}:{" "}
                        {payload.backupReadiness.hostPaths.dataRootHint ?? t("backup.path_unavailable")}
                      </p>
                      <p>
                        {t("backup.postgres_data")}:{" "}
                        {payload.backupReadiness.hostPaths.postgresDataPathHint ?? t("backup.path_unavailable")}
                      </p>
                      <p>
                        {t("backup.taskbandit_data")}:{" "}
                        {payload.backupReadiness.hostPaths.appDataPathHint ?? t("backup.path_unavailable")}
                      </p>
                      <p>
                        {t("backup.compose_file")}:{" "}
                        {payload.backupReadiness.hostPaths.composeFileHint ?? t("backup.path_unavailable")}
                      </p>
                      <p>
                        {t("backup.env_file")}:{" "}
                        {payload.backupReadiness.hostPaths.envFileHint ?? t("backup.path_unavailable")}
                      </p>
                    </div>
                    <div className="task-row compact">
                      <div className="task-row-header">
                        <strong>{t("backup.server_paths")}</strong>
                        <span className="status-pill system-ready">{t("system_status.status_ready")}</span>
                      </div>
                      <p>
                        {t("backup.storage_root")}: {payload.backupReadiness.serverPaths.storageRootPath}
                      </p>
                      <p>
                        {t("backup.runtime_log_path")}: {payload.backupReadiness.serverPaths.runtimeLogFilePath}
                      </p>
                      <p>{t("backup.server_paths_hint")}</p>
                    </div>
                    <div className="task-row compact">
                      <div className="task-row-header">
                        <strong>{t("backup.exports")}</strong>
                        <span className="status-pill system-ready">{t("system_status.status_ready")}</span>
                      </div>
                      <p>
                        {t("backup.snapshot_export")}:{" "}
                        {payload.backupReadiness.exports.householdSnapshotReady
                          ? t("common.enabled")
                          : t("common.disabled")}
                      </p>
                      <p>
                        {t("backup.runtime_log_export")}:{" "}
                        {payload.backupReadiness.exports.runtimeLogsReady
                          ? t("common.enabled")
                          : t("common.disabled")}
                      </p>
                      <div className="button-row">
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={busyAction === "download-household-snapshot"}
                          onClick={() => void handleDownloadHouseholdSnapshot()}
                        >
                          {t("exports.download_household_snapshot")}
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={busyAction === "export-runtime-logs-text"}
                          onClick={() => void handleDownloadRuntimeLogs("txt")}
                        >
                          {t("logs.export_text")}
                        </button>
                      </div>
                    </div>
                    <div className="task-row compact">
                      <div className="task-row-header">
                        <strong>{t("backup.recovery_features")}</strong>
                        <span className="status-pill system-ready">{t("system_status.status_ready")}</span>
                      </div>
                      <p>
                        {t("backup.local_recovery")}:{" "}
                        {payload.backupReadiness.recovery.localAuthForcedByConfig
                          ? t("common.enabled")
                          : t("common.disabled")}
                      </p>
                      <p>
                        {t("backup.oidc_ui")}:{" "}
                        {payload.backupReadiness.recovery.oidcUiConfigured
                          ? t("common.enabled")
                          : t("common.disabled")}
                      </p>
                      <p>
                        {t("backup.oidc_env")}:{" "}
                        {payload.backupReadiness.recovery.oidcEnvFallbackEnabled
                          ? t("common.enabled")
                          : t("common.disabled")}
                      </p>
                      <p>
                        {t("backup.smtp")}:{" "}
                        {payload.backupReadiness.recovery.smtpConfigured
                          ? t("common.enabled")
                          : t("common.disabled")}
                      </p>
                      <p>
                        {t("backup.push")}:{" "}
                        {payload.backupReadiness.recovery.pushConfigured
                          ? t("common.enabled")
                          : t("common.disabled")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="inline-message">{t("backup.empty")}</p>
                )}
              </article>
            ) : null}

            {payload.currentUser.role === "admin" ? (
              <article className="panel page-panel page-admin" ref={systemStatusRef}>
                <div className="section-heading">
                  <h2>{t("panel.system_status")}</h2>
                  <div className="toolbar-group">
                    <span className="section-kicker">
                      {payload.systemStatus
                        ? formatDate(payload.systemStatus.checkedAt)
                        : t("common.none")}
                    </span>
                    <button
                      className="ghost-button"
                      type="button"
                      disabled={busyAction === "refresh-system-status"}
                      onClick={() => void handleRefreshSystemStatus()}
                    >
                      {t("system_status.refresh")}
                    </button>
                  </div>
                </div>
                <p>{t("system_status.hint")}</p>
                {payload.systemStatus ? (
                  <div className="system-status-grid">
                    <div className="task-row compact">
                      <div className="task-row-header">
                        <strong>{t("system_status.application")}</strong>
                        <span className={`status-pill system-${payload.systemStatus.application.status}`}>
                          {formatStatusChip(payload.systemStatus.application.status)}
                        </span>
                      </div>
                      <p>
                        {t("system_status.listen_port")}: {payload.systemStatus.application.port}
                      </p>
                      <p>
                        {t("system_status.reverse_proxy")}:{" "}
                        {payload.systemStatus.application.reverseProxyEnabled
                          ? t("common.enabled")
                          : t("common.disabled")}
                      </p>
                      <p>
                        {t("system_status.path_base")}:{" "}
                        {payload.systemStatus.application.reverseProxyPathBase ?? t("common.none")}
                      </p>
                    </div>
                    <div className="task-row compact">
                      <div className="task-row-header">
                        <strong>{t("system_status.database")}</strong>
                        <span className={`status-pill system-${payload.systemStatus.database.status}`}>
                          {formatStatusChip(payload.systemStatus.database.status)}
                        </span>
                      </div>
                      <p>
                        {t("system_status.database_hint")}:{" "}
                        {payload.systemStatus.database.error ?? t("system_status.ok")}
                      </p>
                    </div>
                    <div className="task-row compact">
                      <div className="task-row-header">
                        <strong>{t("system_status.storage")}</strong>
                        <span className={`status-pill system-${payload.systemStatus.storage.status}`}>
                          {formatStatusChip(payload.systemStatus.storage.status)}
                        </span>
                      </div>
                      <p>
                        {t("system_status.storage_root")}: {payload.systemStatus.storage.rootPath}
                      </p>
                      <p>
                        {t("system_status.runtime_log_path")}:{" "}
                        {payload.systemStatus.storage.runtimeLogFilePath}
                      </p>
                      <p>
                        {t("system_status.storage_hint")}:{" "}
                        {payload.systemStatus.storage.error ?? t("system_status.ok")}
                      </p>
                    </div>
                    <div className="task-row compact">
                      <div className="task-row-header">
                        <strong>{t("system_status.auth")}</strong>
                        <span className={`status-pill system-${payload.systemStatus.auth.status}`}>
                          {formatStatusChip(payload.systemStatus.auth.status)}
                        </span>
                      </div>
                      <p>
                        {t("system_status.local_auth_effective")}:{" "}
                        {payload.systemStatus.auth.localAuthEffective
                          ? t("common.enabled")
                          : t("common.disabled")}
                      </p>
                      <p>
                        {t("system_status.local_auth_forced")}:{" "}
                        {payload.systemStatus.auth.localAuthForcedByConfig
                          ? t("common.enabled")
                          : t("common.disabled")}
                      </p>
                      <p>
                        {t("system_status.oidc_effective")}:{" "}
                        {payload.systemStatus.auth.oidcEffective
                          ? t("common.enabled")
                          : t("common.disabled")}{" "}
                        ({t(`auth.oidc_source_${payload.systemStatus.auth.oidcSource}`)})
                      </p>
                      {payload.systemStatus.auth.oidcEffective ? (
                        <p>
                          {t("system_status.oidc_authority")}:{" "}
                          {payload.systemStatus.auth.oidcAuthority || t("common.none")}
                        </p>
                      ) : null}
                    </div>
                    <div className="task-row compact">
                      <div className="task-row-header">
                        <strong>{t("system_status.push")}</strong>
                        <span className={`status-pill system-${payload.systemStatus.push.status}`}>
                          {formatStatusChip(payload.systemStatus.push.status)}
                        </span>
                      </div>
                      <p>
                        {t("system_status.push_household_enabled")}:{" "}
                        {payload.systemStatus.push.householdPushEnabled
                          ? t("common.enabled")
                          : t("common.disabled")}
                      </p>
                      <p>
                        {t("system_status.fcm_server_enabled")}:{" "}
                        {payload.systemStatus.push.serverFcmEnabled
                          ? t("common.enabled")
                          : t("common.disabled")}
                      </p>
                      <p>
                        {t("system_status.service_account")}:{" "}
                        {payload.systemStatus.push.serviceAccountConfigured
                          ? t("common.enabled")
                          : t("common.disabled")}
                      </p>
                      <p>
                        {t("system_status.push_devices")}:{" "}
                        {payload.systemStatus.push.pushReadyDeviceCount} /{" "}
                        {payload.systemStatus.push.registeredDeviceCount}
                      </p>
                      <p>
                        {t("system_status.member_delivery_breakdown")}{" "}
                        {payload.systemStatus.push.membersWithPushReadyDevices} /{" "}
                        {payload.systemStatus.push.membersUsingEmailFallback} /{" "}
                        {payload.systemStatus.push.membersWithoutDeliveryPath}
                      </p>
                    </div>
                    <div className="task-row compact">
                      <div className="task-row-header">
                        <strong>{t("system_status.email_fallback")}</strong>
                        <span className={`status-pill system-${payload.systemStatus.emailFallback.status}`}>
                          {formatStatusChip(payload.systemStatus.emailFallback.status)}
                        </span>
                      </div>
                      <p>
                        {t("system_status.smtp_ready")}:{" "}
                        {payload.systemStatus.emailFallback.smtpReady
                          ? t("common.enabled")
                          : t("common.disabled")}
                      </p>
                      <p>
                        {t("system_status.smtp_configured")}:{" "}
                        {payload.systemStatus.smtp.configured
                          ? t("common.enabled")
                          : t("common.disabled")}
                      </p>
                      <p>
                        {t("system_status.smtp_host")}:{" "}
                        {payload.systemStatus.smtp.host ?? t("common.none")}
                      </p>
                      <p>
                        {t("system_status.email_fallback_members")}:{" "}
                        {payload.systemStatus.emailFallback.activeFallbackMemberCount} /{" "}
                        {payload.systemStatus.emailFallback.eligibleMemberCount}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="inline-message">{t("system_status.empty")}</p>
                )}
              </article>
            ) : null}

            {payload.currentUser.role === "admin" ? (
              <article className="panel page-panel page-admin" ref={notificationRecoveryRef}>
                <div className="section-heading">
                  <h2>{t("panel.notification_recovery")}</h2>
                  <span className="section-kicker">
                    {(payload.notificationRecovery?.failedPushDeliveries.length ?? 0) +
                      (payload.notificationRecovery?.failedEmailNotifications.length ?? 0)}
                  </span>
                </div>
                <p>{t("notification_recovery.hint")}</p>
                {payload.notificationRecovery &&
                payload.notificationRecovery.failedPushDeliveries.length === 0 &&
                payload.notificationRecovery.failedEmailNotifications.length === 0 ? (
                  <p className="inline-message">{t("notification_recovery.empty")}</p>
                ) : (
                  <div className="stack-list">
                    <div className="recovery-group">
                      <div className="section-heading">
                        <h3>{t("notification_recovery.failed_push")}</h3>
                        <span className="section-kicker">
                          {payload.notificationRecovery?.failedPushDeliveries.length ?? 0}
                        </span>
                      </div>
                      {payload.notificationRecovery?.failedPushDeliveries.length ? (
                        payload.notificationRecovery.failedPushDeliveries.map((entry) => (
                          <div className="task-row compact" key={entry.id}>
                            <div className="task-row-header">
                              <strong>{entry.title}</strong>
                              <span className="status-pill delivery-failed">
                                {t("notifications.delivery_failed")}
                              </span>
                            </div>
                            <p>
                              {t("notification_recovery.recipient")}: {entry.recipientDisplayName}
                            </p>
                            <p>
                              {t("notification_recovery.device")}:{" "}
                              {entry.deviceName ?? t("common.unknown")} ({entry.provider})
                            </p>
                            <p>
                              {t("notification_recovery.last_attempt")}: {formatDate(entry.attemptedAt)}
                            </p>
                            <p>
                              {t("notification_recovery.error")}: {entry.error ?? t("common.none")}
                            </p>
                            <div className="button-row">
                              <button
                                className="ghost-button"
                                type="button"
                                disabled={busyAction === `retry-push:${entry.id}`}
                                onClick={() => void handleRetryPushDelivery(entry.id)}
                              >
                                {t("notification_recovery.retry_push")}
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="inline-message">{t("notification_recovery.none_push")}</p>
                      )}
                    </div>
                    <div className="recovery-group">
                      <div className="section-heading">
                        <h3>{t("notification_recovery.failed_email")}</h3>
                        <span className="section-kicker">
                          {payload.notificationRecovery?.failedEmailNotifications.length ?? 0}
                        </span>
                      </div>
                      {payload.notificationRecovery?.failedEmailNotifications.length ? (
                        payload.notificationRecovery.failedEmailNotifications.map((entry) => (
                          <div className="task-row compact" key={entry.id}>
                            <div className="task-row-header">
                              <strong>{entry.title}</strong>
                              <span className="status-pill delivery-failed">
                                {t("notifications.delivery_failed")}
                              </span>
                            </div>
                            <p>
                              {t("notification_recovery.recipient")}: {entry.recipientDisplayName}
                            </p>
                            <p>
                              {t("notification_recovery.email")}:{" "}
                              {entry.recipientEmail ?? t("common.none")}
                            </p>
                            <p>
                              {t("notification_recovery.last_attempt")}: {formatDate(entry.attemptedAt)}
                            </p>
                            <p>
                              {t("notification_recovery.error")}: {entry.error ?? t("common.none")}
                            </p>
                            <div className="button-row">
                              <button
                                className="ghost-button"
                                type="button"
                                disabled={busyAction === `retry-email:${entry.id}`}
                                onClick={() => void handleRetryEmailDelivery(entry.id)}
                              >
                                {t("notification_recovery.retry_email")}
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="inline-message">{t("notification_recovery.none_email")}</p>
                      )}
                    </div>
                  </div>
                )}
              </article>
            ) : null}

            {payload.currentUser.role === "admin" && settingsDraft ? (
              <>
                <article className="panel page-panel page-settings" ref={householdSettingsRef}>
                  <div className="section-heading">
                    <h2>{t("panel.household_settings")}</h2>
                    <span className="section-kicker">{t("settings.admin_only")}</span>
                  </div>
                  <div className="settings-sections">
                    <section className="settings-section">
                      <div className="section-heading section-heading-compact">
                        <h3>{t("settings.section_oidc")}</h3>
                      </div>
                      <div className="settings-list">
                        <label className="toggle-row">
                          <span>{t("settings.oidc_enabled")}</span>
                          <input
                            type="checkbox"
                            checked={settingsDraft.oidcEnabled}
                            onChange={(event) =>
                              setSettingsDraft((current) =>
                                current ? { ...current, oidcEnabled: event.target.checked } : current
                              )
                            }
                          />
                        </label>
                        <label>
                          <span>{t("settings.oidc_authority")}</span>
                          <input
                            type="text"
                            value={settingsDraft.oidcAuthority}
                            onChange={(event) =>
                              setSettingsDraft((current) =>
                                current ? { ...current, oidcAuthority: event.target.value } : current
                              )
                            }
                            placeholder="https://auth.example.com/application/o/taskbandit/"
                          />
                        </label>
                        <label>
                          <span>{t("settings.oidc_client_id")}</span>
                          <input
                            type="text"
                            value={settingsDraft.oidcClientId}
                            onChange={(event) =>
                              setSettingsDraft((current) =>
                                current ? { ...current, oidcClientId: event.target.value } : current
                              )
                            }
                          />
                        </label>
                        <label>
                          <span>{t("settings.oidc_client_secret")}</span>
                          <input
                            type="password"
                            value={settingsDraft.oidcClientSecret}
                            onChange={(event) =>
                              setSettingsDraft((current) =>
                                current ? { ...current, oidcClientSecret: event.target.value } : current
                              )
                            }
                            placeholder={
                              settingsDraft.oidcClientSecretConfigured
                                ? t("settings.oidc_secret_saved")
                                : ""
                            }
                          />
                        </label>
                        <label>
                          <span>{t("settings.oidc_scope")}</span>
                          <input
                            type="text"
                            value={settingsDraft.oidcScope}
                            onChange={(event) =>
                              setSettingsDraft((current) =>
                                current ? { ...current, oidcScope: event.target.value } : current
                              )
                            }
                          />
                        </label>
                        <p className="inline-message">
                          {t("settings.oidc_runtime_status")
                            .replace(
                              "{effective}",
                              settingsDraft.oidcEffective ? t("common.enabled") : t("common.disabled")
                            )
                            .replace("{source}", t(`auth.oidc_source_${settingsDraft.oidcSource}`))}
                        </p>
                      </div>
                    </section>

                    <section className="settings-section">
                      <div className="section-heading section-heading-compact">
                        <h3>{t("settings.section_smtp")}</h3>
                      </div>
                      <div className="settings-list">
                        <label className="toggle-row">
                          <span>{t("settings.smtp_enabled")}</span>
                          <input
                            type="checkbox"
                            checked={settingsDraft.smtpEnabled}
                            onChange={(event) =>
                              setSettingsDraft((current) =>
                                current ? { ...current, smtpEnabled: event.target.checked } : current
                              )
                            }
                          />
                        </label>
                        <label>
                          <span>{t("settings.smtp_host")}</span>
                          <input
                            type="text"
                            value={settingsDraft.smtpHost}
                            onChange={(event) =>
                              setSettingsDraft((current) =>
                                current ? { ...current, smtpHost: event.target.value } : current
                              )
                            }
                            placeholder="smtp.example.com"
                          />
                        </label>
                        <label>
                          <span>{t("settings.smtp_port")}</span>
                          <input
                            type="number"
                            min={1}
                            max={65535}
                            value={settingsDraft.smtpPort}
                            onChange={(event) =>
                              setSettingsDraft((current) =>
                                current
                                  ? { ...current, smtpPort: Number(event.target.value || 0) }
                                  : current
                              )
                            }
                          />
                        </label>
                        <label className="toggle-row">
                          <span>{t("settings.smtp_secure")}</span>
                          <input
                            type="checkbox"
                            checked={settingsDraft.smtpSecure}
                            onChange={(event) =>
                              setSettingsDraft((current) =>
                                current ? { ...current, smtpSecure: event.target.checked } : current
                              )
                            }
                          />
                        </label>
                        <label>
                          <span>{t("settings.smtp_username")}</span>
                          <input
                            type="text"
                            value={settingsDraft.smtpUsername}
                            onChange={(event) =>
                              setSettingsDraft((current) =>
                                current ? { ...current, smtpUsername: event.target.value } : current
                              )
                            }
                          />
                        </label>
                        <label>
                          <span>{t("settings.smtp_password")}</span>
                          <input
                            type="password"
                            value={settingsDraft.smtpPassword}
                            onChange={(event) =>
                              setSettingsDraft((current) =>
                                current ? { ...current, smtpPassword: event.target.value } : current
                              )
                            }
                            placeholder={
                              settingsDraft.smtpPasswordConfigured
                                ? t("settings.smtp_password_saved")
                                : ""
                            }
                          />
                        </label>
                        <label>
                          <span>{t("settings.smtp_from_email")}</span>
                          <input
                            type="email"
                            value={settingsDraft.smtpFromEmail}
                            onChange={(event) =>
                              setSettingsDraft((current) =>
                                current ? { ...current, smtpFromEmail: event.target.value } : current
                              )
                            }
                          />
                        </label>
                        <label>
                          <span>{t("settings.smtp_from_name")}</span>
                          <input
                            type="text"
                            value={settingsDraft.smtpFromName}
                            onChange={(event) =>
                              setSettingsDraft((current) =>
                                current ? { ...current, smtpFromName: event.target.value } : current
                              )
                            }
                          />
                        </label>
                      </div>
                      <div className="button-row">
                        <button
                          className="secondary-button"
                          type="button"
                          disabled={busyAction === "test-smtp"}
                          onClick={() => void handleTestSmtp()}
                        >
                          {t("settings.smtp_test")}
                        </button>
                      </div>
                    </section>

                    <section className="settings-section">
                      <div className="section-heading section-heading-compact">
                        <h3>{t("settings.section_general")}</h3>
                      </div>
                      <div className="settings-list">
                        <label className="toggle-row">
                          <span>{t("settings.self_signup")}</span>
                          <input
                            type="checkbox"
                            checked={settingsDraft.selfSignupEnabled}
                            onChange={(event) =>
                              setSettingsDraft((current) =>
                                current ? { ...current, selfSignupEnabled: event.target.checked } : current
                              )
                            }
                          />
                        </label>
                        <label className="toggle-row">
                          <span>{t("settings.full_visibility")}</span>
                          <input
                            type="checkbox"
                            checked={settingsDraft.membersCanSeeFullHouseholdChoreDetails}
                            onChange={(event) =>
                              setSettingsDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      membersCanSeeFullHouseholdChoreDetails: event.target.checked
                                    }
                                  : current
                              )
                            }
                          />
                        </label>
                        <label className="toggle-row">
                          <span>{t("settings.push_notifications")}</span>
                          <input
                            type="checkbox"
                            checked={settingsDraft.enablePushNotifications}
                            onChange={(event) =>
                              setSettingsDraft((current) =>
                                current ? { ...current, enablePushNotifications: event.target.checked } : current
                              )
                            }
                          />
                        </label>
                        <label className="toggle-row">
                          <span>{t("settings.overdue_penalties")}</span>
                          <input
                            type="checkbox"
                            checked={settingsDraft.enableOverduePenalties}
                            onChange={(event) =>
                              setSettingsDraft((current) =>
                                current ? { ...current, enableOverduePenalties: event.target.checked } : current
                              )
                            }
                          />
                        </label>
                        <label className="toggle-row">
                          <span>{t("settings.local_auth_enabled")}</span>
                          <input
                            type="checkbox"
                            checked={settingsDraft.localAuthEnabled}
                            onChange={(event) =>
                              setSettingsDraft((current) =>
                                current ? { ...current, localAuthEnabled: event.target.checked } : current
                              )
                            }
                          />
                        </label>
                        {settingsDraft.localAuthForcedByConfig ? (
                          <p className="inline-message">{t("settings.local_auth_forced_note")}</p>
                        ) : null}
                      </div>
                    </section>
                  </div>
                  <div className="button-row">
                    <button
                      className="primary-button"
                      type="button"
                      disabled={busyAction === "save-settings"}
                      onClick={() => void handleSaveSettings()}
                    >
                      {t("settings.save")}
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={busyAction === "process-overdue-penalties"}
                      onClick={() => void handleProcessOverduePenalties()}
                    >
                      {t("settings.process_overdue")}
                    </button>
                  <button
                    className="ghost-button"
                    type="button"
                    disabled={busyAction === "process-notification-maintenance"}
                    onClick={() => void handleProcessNotificationMaintenance()}
                    >
                      {t("settings.process_notifications")}
                    </button>
                  </div>
                  </article>

                <article className="panel page-panel page-household" ref={membersRef}>
                  <div className="section-heading">
                    <h2>{t("panel.household_members")}</h2>
                    <span className="section-kicker">{payload.household.members.length}</span>
                  </div>
                  <div className="stack-list">
                    {payload.household.members.map((member) => (
                      <div key={member.id}>
                        <div className="leader-row member-row">
                          <div>
                            <strong>{member.displayName}</strong>
                            <p>
                              {t(`role.${member.role}`)} - {member.email ?? t("common.none")}
                            </p>
                            <div className="member-provider-row">
                              {member.authProviders.map((provider) => (
                                <span className="status-pill member-provider-pill" key={provider}>
                                  {t(`members.provider_${provider}`)}
                                </span>
                              ))}
                              <span className="member-provider-note">
                                {member.localAuthConfigured
                                  ? t("members.local_recovery_ready")
                                  : t("members.local_recovery_missing")}
                              </span>
                            </div>
                          </div>
                          <div className="member-row-actions">
                            <strong>
                              {formatNumber(member.points)} {t("user.points")}
                            </strong>
                            <button
                              className="ghost-button"
                              type="button"
                              onClick={() => beginEditingMember(member)}
                              disabled={busyAction === `update-member:${member.id}`}
                            >
                              {t("common.edit")}
                            </button>
                          </div>
                        </div>
                        {editingMemberId === member.id ? (
                          <form className="login-form member-form member-edit-form" onSubmit={handleUpdateHouseholdMember}>
                            <label>
                              <span>{t("members.display_name")}</span>
                              <input
                                type="text"
                                value={memberEditForm.displayName}
                                onChange={(event) =>
                                  setMemberEditForm((current) => ({
                                    ...current,
                                    displayName: event.target.value
                                  }))
                                }
                              />
                            </label>
                            <label>
                              <span>{t("members.role")}</span>
                              <select
                                value={member.role === "admin" ? "parent" : memberEditForm.role}
                                disabled={member.role === "admin"}
                                onChange={(event) =>
                                  setMemberEditForm((current) => ({
                                    ...current,
                                    role: event.target.value as "parent" | "child"
                                  }))
                                }
                              >
                                <option value="child">{t("role.child")}</option>
                                <option value="parent">{t("role.parent")}</option>
                              </select>
                            </label>
                            {member.role === "admin" ? (
                              <p className="inline-message">{t("members.admin_role_locked")}</p>
                            ) : null}
                            {!member.localAuthConfigured ? (
                              <p className="inline-message">{t("members.password_adds_local_auth")}</p>
                            ) : null}
                            <label>
                              <span>{t("members.email")}</span>
                              <input
                                type="email"
                                value={memberEditForm.email}
                                onChange={(event) =>
                                  setMemberEditForm((current) => ({
                                    ...current,
                                    email: event.target.value
                                  }))
                                }
                                autoComplete="email"
                              />
                            </label>
                            <label>
                              <span>{t("members.new_password")}</span>
                              <input
                                type="password"
                                value={memberEditForm.password ?? ""}
                                onChange={(event) =>
                                  setMemberEditForm((current) => ({
                                    ...current,
                                    password: event.target.value
                                  }))
                                }
                                autoComplete="new-password"
                              />
                            </label>
                            <div className="button-row">
                              <button
                                className="primary-button"
                                type="submit"
                                disabled={busyAction === `update-member:${member.id}`}
                              >
                                {t("members.save")}
                              </button>
                              <button className="ghost-button" type="button" onClick={cancelEditingMember}>
                                {t("common.cancel")}
                              </button>
                            </div>
                          </form>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <form className="login-form member-form" onSubmit={handleCreateHouseholdMember}>
                    <label>
                      <span>{t("members.display_name")}</span>
                      <input
                        type="text"
                        value={memberForm.displayName}
                        onChange={(event) =>
                          setMemberForm((current) => ({ ...current, displayName: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>{t("members.role")}</span>
                      <select
                        value={memberForm.role}
                        onChange={(event) =>
                          setMemberForm((current) => ({
                            ...current,
                            role: event.target.value as "parent" | "child"
                          }))
                        }
                      >
                        <option value="child">{t("role.child")}</option>
                        <option value="parent">{t("role.parent")}</option>
                      </select>
                    </label>
                    <label>
                      <span>{t("members.email")}</span>
                      <input
                        type="email"
                        value={memberForm.email}
                        onChange={(event) =>
                          setMemberForm((current) => ({ ...current, email: event.target.value }))
                        }
                        autoComplete="email"
                      />
                    </label>
                    <label>
                      <span>{t("members.password")}</span>
                      <input
                        type="password"
                        value={memberForm.password}
                        onChange={(event) =>
                          setMemberForm((current) => ({ ...current, password: event.target.value }))
                        }
                        autoComplete="new-password"
                      />
                    </label>
                    <p className="inline-message">{t("members.password_generated_hint")}</p>
                    <label className="toggle-row">
                      <span>{t("members.send_invite_email")}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(memberForm.sendInviteEmail)}
                        onChange={(event) =>
                          setMemberForm((current) => ({
                            ...current,
                            sendInviteEmail: event.target.checked
                          }))
                        }
                      />
                    </label>
                    <button className="primary-button" type="submit" disabled={busyAction === "create-member"}>
                      {t("members.create")}
                    </button>
                  </form>
                </article>

                <article className="panel panel-wide page-panel page-templates" ref={templatesRef}>
                  <div className="section-heading">
                    <h2>{t("panel.chore_templates")}</h2>
                    <span className="section-kicker">{payload.templates.length}</span>
                  </div>
                  <div className="stack-list">
                    {payload.templates.map((template) => (
                      <div className="task-row compact" key={template.id}>
                        <div className="task-row-header">
                          <strong>{template.title}</strong>
                          <span className="status-pill">{t(`difficulty.${template.difficulty}`)}</span>
                        </div>
                        <p>{template.description}</p>
                        <p>
                          {t("templates.strategy")}: {t(`assignment.${template.assignmentStrategy}`)}
                        </p>
                        <p>
                          {t("templates.recurrence")}: {formatTemplateRecurrence(template)}
                        </p>
                        <p>
                          {t("templates.base_points")}: {template.basePoints}
                        </p>
                        <p>
                          {template.requirePhotoProof
                            ? t("templates.photo_required")
                            : t("templates.photo_optional")}
                        </p>
                        {template.dependencyTemplateIds.length > 0 ? (
                          <p>
                            {t("templates.follow_ups")}:{" "}
                            {template.dependencyTemplateIds
                              .map(
                                (dependencyId) =>
                                  payload.templates.find((candidate) => candidate.id === dependencyId)?.title ??
                                  t("common.unknown")
                              )
                              .join(", ")}
                          </p>
                        ) : (
                          <p className="inline-message">{t("templates.no_follow_ups")}</p>
                        )}
                        {template.checklist.length > 0 ? (
                          <ul className="simple-list compact-list">
                            {template.checklist.map((item) => (
                              <li key={item.id}>
                                {item.title}
                                {item.required ? ` - ${t("task.required")}` : ""}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="inline-message">{t("templates.no_checklist")}</p>
                        )}
                        <div className="button-row">
                          <button
                            className="ghost-button"
                            type="button"
                            onClick={() => startEditingTemplate(template)}
                          >
                            {t("common.edit")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <form className="login-form member-form" onSubmit={handleCreateTemplate}>
                    <label>
                      <span>{t("templates.title")}</span>
                      <input
                        type="text"
                        value={templateForm.title}
                        onChange={(event) =>
                          setTemplateForm((current) => ({ ...current, title: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>{t("templates.description")}</span>
                      <textarea
                        value={templateForm.description}
                        onChange={(event) =>
                          setTemplateForm((current) => ({ ...current, description: event.target.value }))
                        }
                        rows={4}
                      />
                    </label>
                    <label>
                      <span>{t("templates.difficulty")}</span>
                      <select
                        value={templateForm.difficulty}
                        onChange={(event) =>
                          setTemplateForm((current) => ({
                            ...current,
                            difficulty: event.target.value as TemplateFormState["difficulty"]
                          }))
                        }
                      >
                        <option value="easy">{t("difficulty.easy")}</option>
                        <option value="medium">{t("difficulty.medium")}</option>
                        <option value="hard">{t("difficulty.hard")}</option>
                      </select>
                    </label>
                    <label>
                      <span>{t("templates.assignment_strategy")}</span>
                      <select
                        value={templateForm.assignmentStrategy}
                        onChange={(event) =>
                          setTemplateForm((current) => ({
                            ...current,
                            assignmentStrategy: event.target.value as TemplateFormState["assignmentStrategy"]
                          }))
                        }
                      >
                        {assignmentStrategyOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>{t("templates.recurrence")}</span>
                      <select
                        value={templateForm.recurrenceType ?? "none"}
                        onChange={(event) =>
                          setTemplateForm((current) => ({
                            ...current,
                            recurrenceType: event.target.value as TemplateFormState["recurrenceType"]
                          }))
                        }
                      >
                        {recurrenceOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {templateForm.recurrenceType === "every_x_days" ? (
                      <label>
                        <span>{t("templates.interval_days")}</span>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={templateForm.recurrenceIntervalDays ?? 1}
                          onChange={(event) =>
                            setTemplateForm((current) => ({
                              ...current,
                              recurrenceIntervalDays: Number(event.target.value || 1)
                            }))
                          }
                        />
                      </label>
                    ) : null}
                    {templateForm.recurrenceType === "custom_weekly" ? (
                      <div className="stack-list">
                        <div className="section-heading">
                          <h3>{t("templates.weekdays")}</h3>
                          <span className="section-kicker">
                            {(templateForm.recurrenceWeekdays ?? []).length}
                          </span>
                        </div>
                        {recurrenceWeekdayOptions.map((weekday) => {
                          const selected = (templateForm.recurrenceWeekdays ?? []).includes(weekday.value);
                          return (
                            <label className="toggle-row" key={weekday.value}>
                              <span>{weekday.label}</span>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={(event) =>
                                  setTemplateForm((current) => ({
                                    ...current,
                                    recurrenceWeekdays: event.target.checked
                                      ? [...new Set([...(current.recurrenceWeekdays ?? []), weekday.value])]
                                      : (current.recurrenceWeekdays ?? []).filter(
                                          (value) => value !== weekday.value
                                        )
                                  }))
                                }
                              />
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                    <label className="toggle-row">
                      <span>{t("templates.require_photo")}</span>
                      <input
                        type="checkbox"
                        checked={templateForm.requirePhotoProof}
                        onChange={(event) =>
                          setTemplateForm((current) => ({
                            ...current,
                            requirePhotoProof: event.target.checked
                          }))
                        }
                      />
                    </label>
                    <div className="stack-list">
                      <div className="section-heading">
                        <h3>{t("templates.follow_ups")}</h3>
                        <span className="section-kicker">
                          {(templateForm.dependencyTemplateIds ?? []).length}
                        </span>
                      </div>
                      {payload.templates.length === 0 ? (
                        <p className="inline-message">{t("templates.follow_up_hint")}</p>
                      ) : (
                        payload.templates.map((template) => {
                          const selected = (templateForm.dependencyTemplateIds ?? []).includes(template.id);
                          return (
                            <label className="toggle-row" key={template.id}>
                              <span>{template.title}</span>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={(event) =>
                                  setTemplateForm((current) => ({
                                    ...current,
                                    dependencyTemplateIds: event.target.checked
                                      ? [...new Set([...(current.dependencyTemplateIds ?? []), template.id])]
                                      : (current.dependencyTemplateIds ?? []).filter(
                                          (dependencyId) => dependencyId !== template.id
                                        )
                                  }))
                                }
                              />
                            </label>
                          );
                        })
                      )}
                    </div>
                    <div className="stack-list">
                      <div className="section-heading">
                        <h3>{t("templates.checklist")}</h3>
                        <button className="ghost-button" type="button" onClick={addChecklistDraftItem}>
                          {t("templates.add_checklist_item")}
                        </button>
                      </div>
                      {(templateForm.checklist ?? []).length === 0 ? (
                        <p className="inline-message">{t("templates.no_checklist_draft")}</p>
                      ) : (
                        (templateForm.checklist ?? []).map((item, index) => (
                          <div className="task-row compact" key={`${item.title}-${index}`}>
                            <label>
                              <span>{t("templates.checklist_item_title")}</span>
                              <input
                                type="text"
                                value={item.title}
                                onChange={(event) =>
                                  updateChecklistDraftItem(index, { title: event.target.value })
                                }
                              />
                            </label>
                            <label className="toggle-row">
                              <span>{t("templates.checklist_required")}</span>
                              <input
                                type="checkbox"
                                checked={item.required}
                                onChange={(event) =>
                                  updateChecklistDraftItem(index, { required: event.target.checked })
                                }
                              />
                            </label>
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => removeChecklistDraftItem(index)}
                            >
                              {t("templates.remove_checklist_item")}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    <button className="primary-button" type="submit" disabled={busyAction === "create-template"}>
                      {editingTemplateId ? t("templates.save") : t("templates.create")}
                    </button>
                    {editingTemplateId ? (
                      <button className="ghost-button" type="button" onClick={resetTemplateForm}>
                        {t("common.cancel")}
                      </button>
                    ) : null}
                  </form>
                </article>

                <article className="panel page-panel page-templates" ref={scheduleRef}>
                  <div className="section-heading">
                    <h2>{t("panel.schedule_chore")}</h2>
                    <span className="section-kicker">{visibleHouseholdChores.length}</span>
                  </div>
                  <form className="login-form member-form" onSubmit={handleCreateInstance}>
                    <label>
                      <span>{t("instances.template")}</span>
                      <select
                        value={instanceForm.templateId}
                        onChange={(event) =>
                          setInstanceForm((current) => ({ ...current, templateId: event.target.value }))
                        }
                      >
                        {payload.templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>{t("instances.assignee")}</span>
                      <select
                        value={instanceForm.assigneeId ?? ""}
                        onChange={(event) =>
                          setInstanceForm((current) => ({ ...current, assigneeId: event.target.value }))
                        }
                      >
                        <option value="">{t("instances.unassigned")}</option>
                        {payload.household.members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.displayName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>{t("instances.title_override")}</span>
                      <input
                        type="text"
                        value={instanceForm.title ?? ""}
                        onChange={(event) =>
                          setInstanceForm((current) => ({ ...current, title: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>{t("instances.due_at")}</span>
                      <input
                        type="datetime-local"
                        value={instanceForm.dueAt}
                        onChange={(event) =>
                          setInstanceForm((current) => ({ ...current, dueAt: event.target.value }))
                        }
                        required
                      />
                    </label>
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={busyAction === "create-instance" || payload.templates.length === 0}
                    >
                      {editingInstanceId ? t("instances.save") : t("instances.create")}
                    </button>
                    {editingInstanceId ? (
                      <button className="ghost-button" type="button" onClick={resetInstanceForm}>
                        {t("common.cancel")}
                      </button>
                    ) : null}
                  </form>
                </article>
              </>
            ) : null}

            <article className="panel page-panel page-overview">
              <div className="section-heading">
                <h2>{t("panel.assignment_logic")}</h2>
                <span className="section-kicker">{t("panel.strategy_live")}</span>
              </div>
              <ul className="simple-list">
                <li>{t("assignment.round_robin")}</li>
                <li>{t("assignment.least_completed_recently")}</li>
                <li>{t("assignment.highest_streak")}</li>
                <li>{t("assignment.manual_default")}</li>
              </ul>
            </article>
          </section>
          </div>
        </div>
      )}
    </main>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

function scrollToSection(targetRef: RefObject<HTMLElement | null>) {
  targetRef.current?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function readErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof TaskBanditApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}
