type TaskBanditRuntimeConfig = {
  apiBaseUrl?: string;
  webBaseUrl?: string;
  hostedTenantRoutingMode?: "subdomain" | "path";
  tenantPathPrefix?: string;
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

function resolveWebBaseUrl() {
  const configuredBaseUrl = normalizeBaseUrl(readRuntimeConfig().webBaseUrl);
  return appendTenantMountPath(configuredBaseUrl);
}

function normalizeTenantPathPrefix(value: string | undefined) {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return "/t";
  }

  const withLeadingSlash = trimmedValue.startsWith("/") ? trimmedValue : `/${trimmedValue}`;
  return withLeadingSlash.replace(/\/+$/, "") || "/t";
}

function readHostedTenantRoutingMode() {
  return readRuntimeConfig().hostedTenantRoutingMode === "path" ? "path" : "subdomain";
}

function readTenantPathPrefix() {
  return normalizeTenantPathPrefix(readRuntimeConfig().tenantPathPrefix);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveTenantMountPathFromLocation() {
  if (readHostedTenantRoutingMode() !== "path") {
    return undefined;
  }

  const cleanedPath = window.location.pathname
    .replace(/index\.html$/, "")
    .replace(/admin\.html$/, "")
    .replace(/client\.html$/, "")
    .replace(/\/+$/, "");
  const match = cleanedPath.match(
    new RegExp(`^${escapeRegExp(readTenantPathPrefix())}/([a-z0-9][a-z0-9-]*)(?:/.*)?$`, "i")
  );

  return match ? `${readTenantPathPrefix()}/${match[1].toLowerCase()}` : undefined;
}

function appendTenantMountPath(baseUrl: string | undefined) {
  const tenantMountPath = resolveTenantMountPathFromLocation();
  if (!baseUrl || !tenantMountPath) {
    return baseUrl;
  }

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  if (normalizedBaseUrl.toLowerCase().endsWith(tenantMountPath.toLowerCase())) {
    return normalizedBaseUrl;
  }

  return `${normalizedBaseUrl}${tenantMountPath}`;
}

export function resolveApiBaseUrl() {
  const runtimeConfigured = appendTenantMountPath(normalizeBaseUrl(readRuntimeConfig().apiBaseUrl));
  if (runtimeConfigured) {
    return runtimeConfigured;
  }

  const buildConfigured = appendTenantMountPath(normalizeBaseUrl(import.meta.env.VITE_TASKBANDIT_API_BASE_URL));
  if (buildConfigured) {
    return buildConfigured;
  }

  const cleanedPath = window.location.pathname
    .replace(/index\.html$/, "")
    .replace(/admin\.html$/, "")
    .replace(/client\.html$/, "")
    .replace(/\/+$/, "");
  const adminMountMatch = cleanedPath.match(/^(.*)\/admin(?:\/.*)?$/);
  const pathWithoutAdminMount = adminMountMatch ? adminMountMatch[1] : cleanedPath;
  const inferredBasePath = pathWithoutAdminMount && pathWithoutAdminMount !== "/" ? pathWithoutAdminMount : "";

  return `${window.location.origin.replace(/\/+$/, "")}${inferredBasePath}`;
}

export function resolveAdminBaseUrl() {
  return (
    normalizeBaseUrl(import.meta.env.VITE_TASKBANDIT_ADMIN_BASE_URL) ??
    (resolveWebBaseUrl() ? `${resolveWebBaseUrl()}/admin` : undefined)
  );
}

export function resolveClientBaseUrl() {
  return (
    normalizeBaseUrl(import.meta.env.VITE_TASKBANDIT_CLIENT_BASE_URL) ??
    resolveWebBaseUrl()
  );
}
