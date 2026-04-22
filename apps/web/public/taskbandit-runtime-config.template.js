window.__TASKBANDIT_RUNTIME_CONFIG__ = Object.assign(
  {
    apiBaseUrl: "${TASKBANDIT_API_BASE_URL}",
    webBaseUrl: "${TASKBANDIT_WEB_BASE_URL}",
    hostedTenantRoutingMode: "${TASKBANDIT_HOSTED_TENANT_ROUTING_MODE}",
    tenantPathPrefix: "${TASKBANDIT_TENANT_PATH_PREFIX}"
  },
  window.__TASKBANDIT_RUNTIME_CONFIG__ || {}
);
