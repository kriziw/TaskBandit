type TaskBanditRuntimeConfig = {
  apiBaseUrl?: string;
  adminBaseUrl?: string;
  clientBaseUrl?: string;
};

function normalizeBaseUrl(value: string | undefined) {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return undefined;
  }

  return trimmedValue.replace(/\/+$/, "");
}

function readRuntimeConfig(): TaskBanditRuntimeConfig {
  return window.__TASKBANDIT_RUNTIME_CONFIG__ ?? {};
}

export function resolveApiBaseUrl() {
  const runtimeConfigured = normalizeBaseUrl(readRuntimeConfig().apiBaseUrl);
  if (runtimeConfigured) {
    return runtimeConfigured;
  }

  const buildConfigured = normalizeBaseUrl(import.meta.env.VITE_TASKBANDIT_API_BASE_URL);
  if (buildConfigured) {
    return buildConfigured;
  }

  const cleanedPath = window.location.pathname
    .replace(/index\.html$/, "")
    .replace(/admin\.html$/, "")
    .replace(/client\.html$/, "")
    .replace(/\/+$/, "");
  const inferredBasePath = cleanedPath && cleanedPath !== "/" ? cleanedPath : "";

  return `${window.location.origin.replace(/\/+$/, "")}${inferredBasePath}`;
}

export function resolveAdminBaseUrl() {
  return normalizeBaseUrl(readRuntimeConfig().adminBaseUrl) ??
    normalizeBaseUrl(import.meta.env.VITE_TASKBANDIT_ADMIN_BASE_URL);
}

export function resolveClientBaseUrl() {
  return normalizeBaseUrl(readRuntimeConfig().clientBaseUrl) ??
    normalizeBaseUrl(import.meta.env.VITE_TASKBANDIT_CLIENT_BASE_URL);
}
