import type {
  AdminSystemStatus,
  AuditLogEntry,
  ApiStatusResponse,
  AuthenticatedUser,
  AuthProviders,
  AuthResponse,
  BootstrapHouseholdInput,
  BootstrapStatus,
  ChoreInstance,
  ChoreTemplate,
  CreateChoreInstanceInput,
  CreateChoreTemplateInput,
  CreateHouseholdMemberInput,
  CreateHouseholdMemberResult,
  DashboardSummary,
  Household,
  HouseholdSettings,
  HouseholdNotificationHealthEntry,
  NotificationDevice,
  NotificationPreferences,
  NotificationEntry,
  PointsLedgerEntry,
  RuntimeLogEntry,
  SignupInput,
  UploadedProof
} from "../types/taskbandit";
import type { AppLanguage } from "../i18n/I18nProvider";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  token?: string | null;
  language: AppLanguage;
  body?: unknown;
};

type ApiErrorShape = {
  message?: string | string[];
  error?: string;
};

export class TaskBanditApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TaskBanditApiError";
    this.status = status;
  }
}

function buildHeaders(token: string | null | undefined, language: AppLanguage) {
  const headers = new Headers({
    Accept: "application/json",
    "Accept-Language": language
  });

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_TASKBANDIT_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const cleanedPath = window.location.pathname
    .replace(/index\.html$/, "")
    .replace(/\/+$/, "");
  const inferredBasePath = cleanedPath && cleanedPath !== "/" ? cleanedPath : "";

  return `${window.location.origin.replace(/\/+$/, "")}${inferredBasePath}`;
}

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const headers = buildHeaders(options.token, options.language);

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new TaskBanditApiError(message, response.status);
  }

  return (await response.json()) as T;
}

async function readErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as ApiErrorShape;
    if (Array.isArray(data.message)) {
      return data.message.join(", ");
    }

    return data.message ?? data.error ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

export const taskBanditApi = {
  getOidcStartUrl(language: AppLanguage, returnTo?: string) {
    const apiBaseUrl = resolveApiBaseUrl();
    const normalizedApiBaseUrl = /^https?:\/\//i.test(apiBaseUrl)
      ? apiBaseUrl
      : new URL(apiBaseUrl, window.location.origin).toString().replace(/\/+$/, "");
    const url = new URL(`${normalizedApiBaseUrl}/api/auth/oidc/start`);
    url.searchParams.set("language", language);

    if (returnTo) {
      url.searchParams.set("returnTo", returnTo);
    }

    return url.toString();
  },
  getBootstrapStatus(language: AppLanguage) {
    return request<BootstrapStatus>("/api/bootstrap/status", { language });
  },
  bootstrapHousehold(language: AppLanguage, input: BootstrapHouseholdInput) {
    return request("/api/bootstrap/household", {
      method: "POST",
      language,
      body: input
    });
  },
  getProviders(language: AppLanguage) {
    return request<AuthProviders>("/api/auth/providers", { language });
  },
  login(email: string, password: string, language: AppLanguage) {
    return request<AuthResponse>("/api/auth/login", {
      method: "POST",
      language,
      body: { email, password }
    });
  },
  signup(input: SignupInput, language: AppLanguage) {
    return request<AuthResponse>("/api/auth/signup", {
      method: "POST",
      language,
      body: input
    });
  },
  requestPasswordReset(email: string, language: AppLanguage) {
    return request<ApiStatusResponse>("/api/auth/password-reset/request", {
      method: "POST",
      language,
      body: { email }
    });
  },
  completePasswordReset(token: string, password: string, language: AppLanguage) {
    return request<ApiStatusResponse>("/api/auth/password-reset/complete", {
      method: "POST",
      language,
      body: { token, password }
    });
  },
  getCurrentUser(token: string, language: AppLanguage) {
    return request<AuthenticatedUser>("/api/auth/me", {
      token,
      language
    });
  },
  getDashboardSummary(token: string, language: AppLanguage) {
    return request<DashboardSummary>("/api/dashboard/summary", {
      token,
      language
    });
  },
  getPointsLedger(token: string, language: AppLanguage) {
    return request<PointsLedgerEntry[]>("/api/dashboard/points-ledger", {
      token,
      language
    });
  },
  getNotifications(token: string, language: AppLanguage) {
    return request<NotificationEntry[]>("/api/dashboard/notifications", {
      token,
      language
    });
  },
  markNotificationRead(token: string, language: AppLanguage, notificationId: string) {
    return request<NotificationEntry[]>(`/api/dashboard/notifications/${notificationId}/read`, {
      method: "POST",
      token,
      language
    });
  },
  markAllNotificationsRead(token: string, language: AppLanguage) {
    return request<NotificationEntry[]>("/api/dashboard/notifications/read-all", {
      method: "POST",
      token,
      language
    });
  },
  processOverduePenalties(token: string, language: AppLanguage) {
    return request<{ processedCount: number; totalPenaltyPoints: number }>(
      "/api/dashboard/maintenance/process-overdue",
      {
        method: "POST",
        token,
        language
      }
    );
  },
  processNotificationMaintenance(token: string, language: AppLanguage) {
    return request<{
      reminderCount: number;
      dailySummaryCount: number;
      pushSentCount: number;
      pushFailedCount: number;
      emailSentCount: number;
      emailFailedCount: number;
      emailSkippedCount: number;
    }>(
      "/api/dashboard/maintenance/process-notifications",
      {
        method: "POST",
        token,
        language
      }
    );
  },
  sendTestNotification(token: string, language: AppLanguage, recipientUserId?: string) {
    return request<{
      recipientUserId: string;
      recipientDisplayName: string;
      reminderCount: number;
      dailySummaryCount: number;
      pushSentCount: number;
      pushFailedCount: number;
      emailSentCount: number;
      emailFailedCount: number;
      emailSkippedCount: number;
    }>("/api/dashboard/maintenance/test-notification", {
      method: "POST",
      token,
      language,
      body: recipientUserId ? { recipientUserId } : {}
    });
  },
  testSmtp(token: string, language: AppLanguage) {
    return request<{ ok: boolean }>("/api/settings/smtp/test", {
      method: "POST",
      token,
      language
    });
  },
  getRuntimeLogs(token: string, language: AppLanguage, limit = 200) {
    return request<RuntimeLogEntry[]>(`/api/dashboard/admin/logs?limit=${limit}`, {
      token,
      language
    });
  },
  getSystemStatus(token: string, language: AppLanguage) {
    return request<AdminSystemStatus>("/api/dashboard/admin/system-status", {
      token,
      language
    });
  },
  getHousehold(token: string, language: AppLanguage) {
    return request<Household>("/api/settings/household", {
      token,
      language
    });
  },
  getNotificationPreferences(token: string, language: AppLanguage) {
    return request<NotificationPreferences>("/api/settings/notifications", {
      token,
      language
    });
  },
  getNotificationDevices(token: string, language: AppLanguage) {
    return request<NotificationDevice[]>("/api/settings/notification-devices", {
      token,
      language
    });
  },
  getHouseholdNotificationHealth(token: string, language: AppLanguage) {
    return request<HouseholdNotificationHealthEntry[]>("/api/settings/notification-health", {
      token,
      language
    });
  },
  getAuditLog(token: string, language: AppLanguage) {
    return request<AuditLogEntry[]>("/api/settings/audit-log", {
      token,
      language
    });
  },
  updateHousehold(token: string, language: AppLanguage, settings: Partial<HouseholdSettings>) {
    return request<Household>("/api/settings/household", {
      method: "PUT",
      token,
      language,
      body: settings
    });
  },
  updateNotificationPreferences(
    token: string,
    language: AppLanguage,
    preferences: Partial<NotificationPreferences>
  ) {
    return request<NotificationPreferences>("/api/settings/notifications", {
      method: "PUT",
      token,
      language,
      body: preferences
    });
  },
  deleteNotificationDevice(token: string, language: AppLanguage, deviceId: string) {
    return request<NotificationDevice[]>(`/api/settings/notification-devices/${deviceId}`, {
      method: "DELETE",
      token,
      language
    });
  },
  createHouseholdMember(token: string, language: AppLanguage, input: CreateHouseholdMemberInput) {
    return request<CreateHouseholdMemberResult>("/api/settings/household/members", {
      method: "POST",
      token,
      language,
      body: input
    });
  },
  getTemplates(token: string, language: AppLanguage) {
    return request<ChoreTemplate[]>("/api/chores/templates", {
      token,
      language
    });
  },
  createTemplate(token: string, language: AppLanguage, input: CreateChoreTemplateInput) {
    return request<ChoreTemplate>("/api/chores/templates", {
      method: "POST",
      token,
      language,
      body: input
    });
  },
  updateTemplate(token: string, language: AppLanguage, templateId: string, input: CreateChoreTemplateInput) {
    return request<ChoreTemplate>(`/api/chores/templates/${templateId}`, {
      method: "PUT",
      token,
      language,
      body: input
    });
  },
  createInstance(token: string, language: AppLanguage, input: CreateChoreInstanceInput) {
    return request<ChoreInstance>("/api/chores/instances", {
      method: "POST",
      token,
      language,
      body: input
    });
  },
  updateInstance(token: string, language: AppLanguage, instanceId: string, input: CreateChoreInstanceInput) {
    return request<ChoreInstance>(`/api/chores/instances/${instanceId}`, {
      method: "PUT",
      token,
      language,
      body: input
    });
  },
  cancelInstance(token: string, language: AppLanguage, instanceId: string) {
    return request<ChoreInstance>(`/api/chores/instances/${instanceId}/cancel`, {
      method: "POST",
      token,
      language
    });
  },
  startInstance(token: string, language: AppLanguage, instanceId: string) {
    return request<ChoreInstance>(`/api/chores/instances/${instanceId}/start`, {
      method: "POST",
      token,
      language
    });
  },
  async downloadChoresCsv(token: string, language: AppLanguage) {
    const response = await fetch(`${resolveApiBaseUrl()}/api/dashboard/exports/chores.csv`, {
      method: "GET",
      headers: buildHeaders(token, language)
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new TaskBanditApiError(message, response.status);
    }

    return response.blob();
  },
  async downloadRuntimeLogsText(token: string, language: AppLanguage) {
    const response = await fetch(`${resolveApiBaseUrl()}/api/dashboard/admin/logs/export.txt`, {
      method: "GET",
      headers: buildHeaders(token, language)
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new TaskBanditApiError(message, response.status);
    }

    return response.blob();
  },
  async downloadRuntimeLogsJson(token: string, language: AppLanguage) {
    const response = await fetch(`${resolveApiBaseUrl()}/api/dashboard/admin/logs/export.json`, {
      method: "GET",
      headers: buildHeaders(token, language)
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new TaskBanditApiError(message, response.status);
    }

    return response.blob();
  },
  async downloadHouseholdSnapshot(token: string, language: AppLanguage) {
    const response = await fetch(`${resolveApiBaseUrl()}/api/dashboard/admin/exports/household.json`, {
      method: "GET",
      headers: buildHeaders(token, language)
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new TaskBanditApiError(message, response.status);
    }

    return response.blob();
  },
  getInstances(token: string, language: AppLanguage) {
    return request<ChoreInstance[]>("/api/chores/instances", {
      token,
      language
    });
  },
  submitChore(
    token: string,
    language: AppLanguage,
    instanceId: string,
    payload: {
      completedChecklistItemIds: string[];
      attachments: Array<{
        clientFilename: string;
        contentType?: string;
        storageKey: string;
      }>;
      note?: string;
    }
  ) {
    return request<ChoreInstance>(`/api/chores/instances/${instanceId}/submit`, {
      method: "POST",
      token,
      language,
      body: {
        completedChecklistItemIds: payload.completedChecklistItemIds,
        note: payload.note,
        attachments: payload.attachments
      }
    });
  },
  async uploadProof(token: string, language: AppLanguage, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${resolveApiBaseUrl()}/api/chores/uploads/proof`, {
      method: "POST",
      headers: buildHeaders(token, language),
      body: formData
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new TaskBanditApiError(message, response.status);
    }

    return (await response.json()) as UploadedProof;
  },
  async downloadProofAttachment(token: string, language: AppLanguage, attachmentId: string) {
    const response = await fetch(`${resolveApiBaseUrl()}/api/chores/attachments/${attachmentId}`, {
      method: "GET",
      headers: buildHeaders(token, language)
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new TaskBanditApiError(message, response.status);
    }

    const contentDisposition = response.headers.get("Content-Disposition");
    const encodedFilename =
      contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1] ??
      contentDisposition?.match(/filename=\"?([^\";]+)\"?/i)?.[1] ??
      null;

    return {
      blob: await response.blob(),
      filename: encodedFilename ? decodeURIComponent(encodedFilename) : null,
      contentType: response.headers.get("Content-Type")
    };
  },
  approveChore(token: string, language: AppLanguage, instanceId: string, note?: string) {
    return request<ChoreInstance>(`/api/chores/instances/${instanceId}/approve`, {
      method: "POST",
      token,
      language,
      body: { note }
    });
  },
  rejectChore(token: string, language: AppLanguage, instanceId: string, note?: string) {
    return request<ChoreInstance>(`/api/chores/instances/${instanceId}/reject`, {
      method: "POST",
      token,
      language,
      body: { note }
    });
  }
};
