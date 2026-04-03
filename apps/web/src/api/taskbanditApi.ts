import type {
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
  DashboardSummary,
  Household,
  HouseholdSettings,
  UploadedProof
} from "../types/taskbandit";
import type { AppLanguage } from "../i18n/I18nProvider";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT";
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
  getHousehold(token: string, language: AppLanguage) {
    return request<Household>("/api/settings/household", {
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
  createHouseholdMember(token: string, language: AppLanguage, input: CreateHouseholdMemberInput) {
    return request<Household>("/api/settings/household/members", {
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
  createInstance(token: string, language: AppLanguage, input: CreateChoreInstanceInput) {
    return request<ChoreInstance>("/api/chores/instances", {
      method: "POST",
      token,
      language,
      body: input
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
