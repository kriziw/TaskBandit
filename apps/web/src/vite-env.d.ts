/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TASKBANDIT_API_BASE_URL?: string;
  readonly VITE_TASKBANDIT_ADMIN_BASE_URL?: string;
  readonly VITE_TASKBANDIT_CLIENT_BASE_URL?: string;
  readonly VITE_TASKBANDIT_RELEASE_VERSION?: string;
  readonly VITE_TASKBANDIT_BUILD_NUMBER?: string;
  readonly VITE_TASKBANDIT_COMMIT_SHA?: string;
  readonly VITE_TASKBANDIT_WEB_IMAGE_TAG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __TASKBANDIT_RUNTIME_CONFIG__?: {
    apiBaseUrl?: string;
    webBaseUrl?: string;
    hostedTenantRoutingMode?: "subdomain" | "path";
    tenantPathPrefix?: string;
  };
}
