export type RequestUrlContext = {
  headers: Record<string, string | string[] | undefined>;
  get?: (header: string) => string | undefined;
  originalUrl?: string | null;
  url?: string | null;
  protocol?: string | null;
};

export type TenantRequestContext = {
  hostHeader?: string | null;
  originalUrl?: string | null;
};

function readForwardedValue(value: string | string[] | undefined) {
  const resolved = Array.isArray(value) ? value[0] : value;
  return resolved?.split(",")[0]?.trim() || null;
}

export function buildRequestHost(request: RequestUrlContext) {
  return readForwardedValue(request.headers["x-forwarded-host"]) || request.get?.("host") || null;
}

export function buildRequestOrigin(request: RequestUrlContext) {
  const protocol = readForwardedValue(request.headers["x-forwarded-proto"]) || request.protocol || "http";
  const host = buildRequestHost(request);
  return `${protocol}://${host}`;
}

export function buildOriginalUrl(request: RequestUrlContext) {
  return request.originalUrl || request.url || "/";
}

export function buildTenantRequestContext(request: RequestUrlContext): TenantRequestContext {
  return {
    hostHeader: buildRequestHost(request),
    originalUrl: buildOriginalUrl(request)
  };
}

export function resolveMountedAppPath(request: RequestUrlContext, apiRouteMarker: string) {
  const originalUrl = buildOriginalUrl(request);
  const apiRouteIndex = originalUrl.indexOf(apiRouteMarker);
  if (apiRouteIndex < 0) {
    return "/";
  }

  const appPath = originalUrl.slice(0, apiRouteIndex).replace(/\/+$/, "");
  return appPath || "/";
}
