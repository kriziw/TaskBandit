import { FormEvent, useEffect, useMemo, useState } from "react";
import { taskBanditApi, TaskBanditApiError } from "./api/taskbanditApi";
import { DashboardCard } from "./components/DashboardCard";
import { AppLanguage, useI18n } from "./i18n/I18nProvider";
import type {
  AuditLogEntry,
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
  HouseholdSettings,
  NotificationEntry,
  PointsLedgerEntry,
  RecurrenceType,
  SignupInput
} from "./types/taskbandit";

const tokenStorageKey = "taskbandit-access-token";

type DashboardPayload = {
  currentUser: AuthenticatedUser;
  dashboard: DashboardSummary;
  household: Household;
  auditLog: AuditLogEntry[];
  notifications: NotificationEntry[];
  pointsLedger: PointsLedgerEntry[];
  templates: ChoreTemplate[];
  instances: ChoreInstance[];
};

type LoginFormState = {
  email: string;
  password: string;
};
type SignupFormState = SignupInput;

type MemberFormState = CreateHouseholdMemberInput;
type TemplateFormState = CreateChoreTemplateInput;
type InstanceFormState = CreateChoreInstanceInput;
type BootstrapFormState = BootstrapHouseholdInput;
type HouseholdChoreViewMode = "list" | "board" | "calendar";
type HouseholdChoreStateFilter = "all" | ChoreState;

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

function readStoredToken() {
  return window.localStorage.getItem(tokenStorageKey);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

export function App() {
  const { language, setLanguage, t } = useI18n();
  const [token, setToken] = useState<string | null>(() => readStoredToken());
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
  const [bootstrapForm, setBootstrapForm] = useState<BootstrapFormState>({
    householdName: "",
    ownerDisplayName: "",
    ownerEmail: "",
    ownerPassword: "",
    selfSignupEnabled: false
  });
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<HouseholdSettings | null>(null);
  const [submitSelections, setSubmitSelections] = useState<Record<string, string[]>>({});
  const [selectedProofFiles, setSelectedProofFiles] = useState<Record<string, File[]>>({});
  const [submitNotes, setSubmitNotes] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [memberForm, setMemberForm] = useState<MemberFormState>({
    displayName: "",
    role: "child",
    email: "",
    password: ""
  });
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
  const [loginError, setLoginError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [busyAction, setBusyAction] = useState<string | null>(null);

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
      setSettingsDraft(null);
      setIsLoading(false);
      return;
    }

    void refreshDashboard(token, { silent: false });
  }, [token, language]);

  useEffect(() => {
    if (payload) {
      setSettingsDraft(payload.household.settings);
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
      const [dashboard, household, auditLog, notifications, pointsLedger, templates, instances] =
        await Promise.all([
        taskBanditApi.getDashboardSummary(accessToken, language),
        taskBanditApi.getHousehold(accessToken, language),
        currentUser.role === "child"
          ? Promise.resolve([])
          : taskBanditApi.getAuditLog(accessToken, language),
        taskBanditApi.getNotifications(accessToken, language),
        taskBanditApi.getPointsLedger(accessToken, language),
        currentUser.role === "child"
          ? Promise.resolve([])
          : taskBanditApi.getTemplates(accessToken, language),
        taskBanditApi.getInstances(accessToken, language)
        ]);

      setPayload({
        currentUser,
        dashboard,
        household,
        auditLog,
        notifications,
        pointsLedger,
        templates,
        instances
      });
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
    setSettingsDraft(null);
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
      setPayload((current) => (current ? { ...current, household } : current));
      setNotice(t("settings.saved"));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t("settings.save_failed")));
    } finally {
      setBusyAction(null);
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
      const household = await taskBanditApi.createHouseholdMember(token, language, memberForm);
      setPayload((current) => (current ? { ...current, household } : current));
      setMemberForm({
        displayName: "",
        role: "child",
        email: "",
        password: ""
      });
      setNotice(t("members.created"));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t("members.create_failed")));
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
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "taskbandit-chores.csv";
      document.body.append(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      setNotice(t("exports.chores_downloaded"));
    } catch (error) {
      setPageError(readErrorMessage(error, t("exports.chores_failed")));
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

  const roadmap = [
    t("roadmap.bootstrap"),
    t("roadmap.templates"),
    t("roadmap.approvals"),
    t("roadmap.leaderboard")
  ];

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
          <div className="mascot-face">
            <span className="ear left" />
            <span className="ear right" />
            <span className="eye left" />
            <span className="eye right" />
            <span className="mask" />
            <span className="nose" />
          </div>
          <p>{payload ? t("hero.mascot_ready") : t("hero.mascot")}</p>
        </div>
      </section>

      {notice ? <div className="notice-banner success">{notice}</div> : null}
      {pageError ? <div className="notice-banner error">{pageError}</div> : null}

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
                <span className="section-kicker">{t("auth.demo_ready")}</span>
              </div>
              <form className="login-form" onSubmit={handleLoginSubmit}>
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
                {loginError ? <p className="inline-message error-text">{loginError}</p> : null}
                <button className="primary-button" type="submit" disabled={isAuthenticating}>
                  {isAuthenticating ? t("auth.signing_in") : t("auth.sign_in")}
                </button>
              </form>
            </article>
          )}

          {bootstrapStatus?.isBootstrapped !== false && providers?.local.selfSignupEnabled ? (
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

          <article className="panel">
            <div className="section-heading">
              <h2>{t("panel.providers")}</h2>
              <span className="section-kicker">{t("panel.providers_hint")}</span>
            </div>
            <ul className="simple-list">
              <li>
                {t("auth.local_provider")}: {providers?.local.enabled ? t("common.enabled") : t("common.disabled")}
              </li>
              <li>
                {t("auth.oidc_provider")}: {providers?.oidc.enabled ? t("common.enabled") : t("common.disabled")}
              </li>
              {providers?.oidc.enabled ? <li>{providers.oidc.authority}</li> : null}
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
        <>
          <section className="metrics">
            {featuredMetrics.map((metric) => (
              <DashboardCard key={metric.label} label={metric.label} value={metric.value} />
            ))}
          </section>

          {isLoading ? <div className="notice-banner info">{t("common.loading")}</div> : null}

          <section className="content-grid dashboard-grid">
            {payload.currentUser.role !== "child" ? (
              <article className="panel">
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
                          <div className="attachment-list">
                            <strong>{t("task.attachments")}:</strong>
                            <ul className="simple-list compact-list">
                              {instance.attachments.map((attachment) => (
                                <li key={attachment.id}>{attachment.clientFilename}</li>
                              ))}
                            </ul>
                          </div>
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

            <article className="panel">
              <div className="section-heading">
                <h2>{t("panel.my_chores")}</h2>
                <span className="section-kicker">{myChores.length}</span>
              </div>
              {myChores.length === 0 ? (
                <p className="empty-state">{t("submission.empty")}</p>
              ) : (
                <div className="stack-list">
                  {myChores.map((instance) => {
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
                        {instance.attachments.length > 0 ? (
                          <div className="attachment-list">
                            <strong>{t("submission.previous_uploads")}:</strong>
                            <ul className="simple-list compact-list">
                              {instance.attachments.map((attachment) => (
                                <li key={attachment.id}>{attachment.clientFilename}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
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
                        <button
                          className="primary-button"
                          type="button"
                          disabled={busyAction === `submit:${instance.id}`}
                          onClick={() => void handleSubmitChore(instance.id)}
                        >
                          {t("submission.submit")}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>

            <article className="panel">
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

            <article className="panel">
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

            <article className="panel">
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
              <article className="panel">
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

            <article className="panel panel-wide">
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

            {payload.currentUser.role === "admin" && settingsDraft ? (
              <>
                <article className="panel">
                  <div className="section-heading">
                    <h2>{t("panel.household_settings")}</h2>
                    <span className="section-kicker">{t("settings.admin_only")}</span>
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
                  </div>
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
                </article>

                <article className="panel">
                  <div className="section-heading">
                    <h2>{t("panel.household_members")}</h2>
                    <span className="section-kicker">{payload.household.members.length}</span>
                  </div>
                  <div className="stack-list">
                    {payload.household.members.map((member) => (
                      <div className="leader-row" key={member.id}>
                        <div>
                          <strong>{member.displayName}</strong>
                          <p>
                            {t(`role.${member.role}`)} - {member.email ?? t("common.none")}
                          </p>
                        </div>
                        <strong>
                          {formatNumber(member.points)} {t("user.points")}
                        </strong>
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
                    <button className="primary-button" type="submit" disabled={busyAction === "create-member"}>
                      {t("members.create")}
                    </button>
                  </form>
                </article>

                <article className="panel panel-wide">
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

                <article className="panel">
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

            <article className="panel">
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
        </>
      )}
    </main>
  );
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
