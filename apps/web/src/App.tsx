import { FormEvent, useEffect, useMemo, useState } from "react";
import { taskBanditApi, TaskBanditApiError } from "./api/taskbanditApi";
import { DashboardCard } from "./components/DashboardCard";
import { AppLanguage, useI18n } from "./i18n/I18nProvider";
import type {
  AuthProviders,
  AuthenticatedUser,
  ChoreInstance,
  ChoreTemplate,
  DashboardSummary,
  Household,
  HouseholdSettings
} from "./types/taskbandit";

const tokenStorageKey = "taskbandit-access-token";

type DashboardPayload = {
  currentUser: AuthenticatedUser;
  dashboard: DashboardSummary;
  household: Household;
  templates: ChoreTemplate[];
  instances: ChoreInstance[];
};

type LoginFormState = {
  email: string;
  password: string;
};

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
  const [loginForm, setLoginForm] = useState<LoginFormState>({
    email: "alex@taskbandit.local",
    password: "TaskBandit123!"
  });
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<HouseholdSettings | null>(null);
  const [submitSelections, setSubmitSelections] = useState<Record<string, string[]>>({});
  const [submitNotes, setSubmitNotes] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
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

  const memberLookup = useMemo(() => {
    const members = payload?.household.members ?? [];
    return new Map(members.map((member) => [member.id, member]));
  }, [payload]);

  const templateLookup = useMemo(() => {
    const templates = payload?.templates ?? [];
    return new Map(templates.map((template) => [template.id, template]));
  }, [payload]);

  const pendingApprovals = useMemo(
    () => payload?.instances.filter((instance) => instance.state === "pending_approval") ?? [],
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
    return [...instances].slice(0, 8);
  }, [payload]);

  async function refreshDashboard(accessToken: string, options: { silent: boolean }) {
    if (!options.silent) {
      setIsLoading(true);
    }

    try {
      const [currentUser, dashboard, household, templates, instances] = await Promise.all([
        taskBanditApi.getCurrentUser(accessToken, language),
        taskBanditApi.getDashboardSummary(accessToken, language),
        taskBanditApi.getHousehold(accessToken, language),
        taskBanditApi.getTemplates(accessToken, language),
        taskBanditApi.getInstances(accessToken, language)
      ]);

      setPayload({
        currentUser,
        dashboard,
        household,
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

  async function handleSubmitChore(instanceId: string) {
    if (!token || !payload) {
      return;
    }

    const targetInstance = payload.instances.find((item) => item.id === instanceId);
    if (!targetInstance) {
      setPageError(t("error.missing_template"));
      return;
    }

    const template = payload.templates.find((item) => item.id === targetInstance.templateId);
    if (!template) {
      setPageError(t("error.missing_template"));
      return;
    }

    if (template.requirePhotoProof) {
      setPageError(t("submission.photo_required_web"));
      return;
    }

    const selectedChecklistIds = submitSelections[instanceId] ?? targetInstance.checklistCompletionIds;
    const missingRequiredItems = template.checklist.filter(
      (item) => item.required && !selectedChecklistIds.includes(item.id)
    );

    if (missingRequiredItems.length > 0) {
      setPageError(t("submission.complete_required"));
      return;
    }

    setBusyAction(`submit:${instanceId}`);
    try {
      await taskBanditApi.submitChore(token, language, instanceId, {
        completedChecklistItemIds: selectedChecklistIds,
        note: submitNotes[instanceId]
      });
      setNotice(t("submission.success"));
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

  function formatDate(value: string | null) {
    if (!value) {
      return t("common.none");
    }

    return new Intl.DateTimeFormat(language, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
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
                {t(`role.${payload.currentUser.role}`)} · {formatNumber(payload.currentUser.points)} {t("user.points")}
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

          <article className="panel">
            <div className="section-heading">
              <h2>{t("panel.demo_accounts")}</h2>
              <span className="section-kicker">{t("panel.demo_password")}</span>
            </div>
            <ul className="simple-list">
              <li>Alex · alex@taskbandit.local · {t("role.admin")}</li>
              <li>Maya · maya@taskbandit.local · {t("role.parent")}</li>
              <li>Luca · luca@taskbandit.local · {t("role.child")}</li>
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
                    const template = templateLookup.get(instance.templateId);
                    const selectedChecklistIds = getSelectedChecklistIds(instance);
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
                          {t("task.points")}: {instance.awardedPoints > 0 ? instance.awardedPoints : template?.basePoints ?? 0}
                        </p>
                        {template?.requirePhotoProof ? (
                          <p className="inline-message">{t("submission.photo_required_web")}</p>
                        ) : null}
                        {template?.checklist.length ? (
                          <div className="checklist">
                            {template.checklist.map((item) => (
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
                                  {item.required ? ` · ${t("task.required")}` : ""}
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="inline-message">{t("submission.one_tap")}</p>
                        )}
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
                          disabled={busyAction === `submit:${instance.id}` || Boolean(template?.requirePhotoProof)}
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
                        {t(`role.${member.role}`)} · {member.currentStreak} {t("user.streak")}
                      </p>
                    </div>
                    <strong>
                      {formatNumber(member.points)} {t("user.points")}
                    </strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel panel-wide">
              <div className="section-heading">
                <h2>{t("panel.household_chores")}</h2>
                <span className="section-kicker">{visibleHouseholdChores.length}</span>
              </div>
              <div className="stack-list">
                {visibleHouseholdChores.map((instance) => (
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
                  </div>
                ))}
              </div>
            </article>

            {payload.currentUser.role === "admin" && settingsDraft ? (
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
              </article>
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
