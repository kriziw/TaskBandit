/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TASKBANDIT_API_BASE_URL?: string;
  readonly VITE_TASKBANDIT_ADMIN_BASE_URL?: string;
  readonly VITE_TASKBANDIT_CLIENT_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __TASKBANDIT_RUNTIME_CONFIG__?: {
    apiBaseUrl?: string;
    adminBaseUrl?: string;
    clientBaseUrl?: string;
  };
}
