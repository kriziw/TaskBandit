window.__TASKBANDIT_RUNTIME_CONFIG__ = Object.assign(
  {
    apiBaseUrl: "${TASKBANDIT_API_BASE_URL}",
    webBaseUrl: "${TASKBANDIT_WEB_BASE_URL}",
    adminBaseUrl: "${TASKBANDIT_ADMIN_BASE_URL}",
    clientBaseUrl: "${TASKBANDIT_CLIENT_BASE_URL}"
  },
  window.__TASKBANDIT_RUNTIME_CONFIG__ || {}
);
