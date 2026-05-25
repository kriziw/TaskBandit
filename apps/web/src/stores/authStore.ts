import { create } from 'zustand';
import { taskBanditApi, TaskBanditApiError } from '../api/taskbanditApi';
import type { AppLanguage } from '../i18n/I18nProvider';
import type {
  AuthProviders,
  BootstrapStarterTemplateOption,
  BootstrapStatus,
  SignupInput,
} from '../types/taskbandit';
import { setApiBaseUrlOverride } from '../runtimeConfig';
import {
  clearStoredToken,
  readStoredToken,
  writeStoredToken,
  type WorkspaceVariant,
} from '../features/auth/tokenStorage';

export type { WorkspaceVariant };

export interface AuthStore {
  token: string | null;
  providers: AuthProviders | null;
  bootstrapStatus: BootstrapStatus | null;
  bootstrapStarterTemplates: BootstrapStarterTemplateOption[];
  isAuthEntryLoading: boolean;
  authEntryError: string | null;
  loginError: string | null;
  isAuthenticating: boolean;

  // Called once at app boot to hydrate token from storage
  initToken: (variant: WorkspaceVariant) => void;

  loadAuthEntry: (language: AppLanguage) => Promise<void>;

  // Returns the raw access token on success; throws on failure
  login: (
    email: string,
    password: string,
    language: AppLanguage,
    variant: WorkspaceVariant,
  ) => Promise<void>;

  signup: (form: SignupInput, language: AppLanguage, variant: WorkspaceVariant) => Promise<void>;

  // Returns the server-provided success message
  requestPasswordReset: (email: string, language: AppLanguage) => Promise<string>;

  // Returns the server-provided success message
  completePasswordReset: (
    resetToken: string,
    password: string,
    language: AppLanguage,
  ) => Promise<string>;

  handleOidcCallback: (oidcToken: string, variant: WorkspaceVariant) => void;

  setProviders: (providers: AuthProviders | null) => void;

  setBootstrapStatus: (status: import('../types/taskbandit').BootstrapStatus) => void;

  setLoginError: (message: string | null) => void;

  logout: (variant: WorkspaceVariant, message?: string) => void;
}

function readError(error: unknown, fallback: string): string {
  if (error instanceof TaskBanditApiError || error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  token: null,
  providers: null,
  bootstrapStatus: null,
  bootstrapStarterTemplates: [],
  isAuthEntryLoading: false,
  authEntryError: null,
  loginError: null,
  isAuthenticating: false,

  initToken(variant) {
    const token = readStoredToken(variant);
    set({ token, isAuthEntryLoading: !token });
  },

  async loadAuthEntry(language) {
    if (get().token) {
      set({ isAuthEntryLoading: false, authEntryError: null });
      return;
    }

    set({ isAuthEntryLoading: true, authEntryError: null });

    try {
      const [providersResult, bootstrapResult, templatesResult] = await Promise.allSettled([
        taskBanditApi.getProviders(language),
        taskBanditApi.getBootstrapStatus(language),
        taskBanditApi.getBootstrapStarterTemplates(language),
      ]);

      const providers = providersResult.status === 'fulfilled' ? providersResult.value : null;
      const bootstrapStatus = bootstrapResult.status === 'fulfilled' ? bootstrapResult.value : null;
      const bootstrapStarterTemplates =
        templatesResult.status === 'fulfilled' ? templatesResult.value : [];

      const firstError =
        (providersResult.status === 'rejected' ? providersResult.reason : null) ??
        (bootstrapResult.status === 'rejected' ? bootstrapResult.reason : null) ??
        (templatesResult.status === 'rejected' ? templatesResult.reason : null);

      const hasFatalError = providers === null && bootstrapStatus === null;

      set({
        providers,
        bootstrapStatus,
        bootstrapStarterTemplates,
        authEntryError: hasFatalError ? readError(firstError, 'Request failed.') : null,
        isAuthEntryLoading: false,
      });
    } catch (error) {
      set({
        authEntryError: readError(error, 'Request failed.'),
        isAuthEntryLoading: false,
      });
    }
  },

  async login(email, password, language, variant) {
    set({ isAuthenticating: true, loginError: null });
    try {
      const response = await taskBanditApi.login(email, password, language);
      if (response.tenantContext?.hostedMode && response.tenantContext.canonicalApiBaseUrl) {
        setApiBaseUrlOverride(response.tenantContext.canonicalApiBaseUrl);
      } else {
        setApiBaseUrlOverride(null);
      }
      writeStoredToken(variant, response.accessToken);
      set({ token: response.accessToken });
    } catch (error) {
      set({ loginError: readError(error, 'Login failed.') });
      throw error;
    } finally {
      set({ isAuthenticating: false });
    }
  },

  async signup(form, language, variant) {
    set({ isAuthenticating: true, loginError: null });
    try {
      const response = await taskBanditApi.signup(form, language);
      if (response.tenantContext?.hostedMode && response.tenantContext.canonicalApiBaseUrl) {
        setApiBaseUrlOverride(response.tenantContext.canonicalApiBaseUrl);
      } else {
        setApiBaseUrlOverride(null);
      }
      writeStoredToken(variant, response.accessToken);
      set({ token: response.accessToken });
    } catch (error) {
      set({ loginError: readError(error, 'Signup failed.') });
      throw error;
    } finally {
      set({ isAuthenticating: false });
    }
  },

  async requestPasswordReset(email, language) {
    set({ isAuthenticating: true, loginError: null });
    try {
      const response = await taskBanditApi.requestPasswordReset(email, language);
      return response.message;
    } catch (error) {
      set({ loginError: readError(error, 'Password reset request failed.') });
      throw error;
    } finally {
      set({ isAuthenticating: false });
    }
  },

  async completePasswordReset(resetToken, password, language) {
    set({ isAuthenticating: true, loginError: null });
    try {
      const response = await taskBanditApi.completePasswordReset(resetToken, password, language);
      return response.message;
    } catch (error) {
      set({ loginError: readError(error, 'Password reset failed.') });
      throw error;
    } finally {
      set({ isAuthenticating: false });
    }
  },

  handleOidcCallback(oidcToken, variant) {
    writeStoredToken(variant, oidcToken);
    set({ token: oidcToken, loginError: null });
  },

  setProviders(providers) {
    set({ providers });
  },

  setBootstrapStatus(status) {
    set({ bootstrapStatus: status });
  },

  setLoginError(message) {
    set({ loginError: message });
  },

  logout(variant, message) {
    clearStoredToken(variant);
    setApiBaseUrlOverride(null);
    set({ token: null, loginError: message ?? null });
  },
}));
