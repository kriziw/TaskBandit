function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeTenantPathPrefix(prefix: string | undefined) {
  const trimmedValue = prefix?.trim();
  if (!trimmedValue) {
    return "/t";
  }

  const withLeadingSlash = trimmedValue.startsWith("/") ? trimmedValue : `/${trimmedValue}`;
  const normalized = withLeadingSlash.replace(/\/+$/, "");
  return normalized || "/t";
}

export function extractTenantMountPath(pathname: string, tenantPathPrefix: string) {
  const normalizedPrefix = normalizeTenantPathPrefix(tenantPathPrefix);
  const match = pathname.match(
    new RegExp(`^${escapeRegExp(normalizedPrefix)}/([a-z0-9][a-z0-9-]*)(?:/.*)?$`, "i")
  );

  if (!match) {
    return null;
  }

  return `${normalizedPrefix}/${match[1].toLowerCase()}`;
}

export function rewriteHostedApiPath(urlPath: string, tenantPathPrefix: string) {
  const normalizedPrefix = normalizeTenantPathPrefix(tenantPathPrefix);
  const [pathname, query = ""] = urlPath.split("?", 2);
  const match = pathname.match(
    new RegExp(`^${escapeRegExp(normalizedPrefix)}/([a-z0-9][a-z0-9-]*)(/api(?:/.*)?|/api)$`, "i")
  );

  if (!match) {
    return null;
  }

  return `${match[2]}${query ? `?${query}` : ""}`;
}
