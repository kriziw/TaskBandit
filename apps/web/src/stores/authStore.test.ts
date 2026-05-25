import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './authStore';

// Mock modules used by the store
vi.mock('../api/taskbanditApi', () => ({
  taskBanditApi: {
    login: vi.fn(),
    signup: vi.fn(),
    requestPasswordReset: vi.fn(),
    completePasswordReset: vi.fn(),
    getProviders: vi.fn(),
    getBootstrapStatus: vi.fn(),
    getBootstrapStarterTemplates: vi.fn(),
  },
  TaskBanditApiError: class TaskBanditApiError extends Error {},
}));

vi.mock('../runtimeConfig', () => ({
  setApiBaseUrlOverride: vi.fn(),
  resolveApiBaseUrl: vi.fn(() => '/'),
}));

vi.mock('../features/auth/tokenStorage', () => ({
  readStoredToken: vi.fn(() => null),
  writeStoredToken: vi.fn(),
  clearStoredToken: vi.fn(),
}));

import { taskBanditApi } from '../api/taskbanditApi';
import { writeStoredToken, clearStoredToken } from '../features/auth/tokenStorage';

const mockedApi = vi.mocked(taskBanditApi);
const mockedWriteToken = vi.mocked(writeStoredToken);
const mockedClearToken = vi.mocked(clearStoredToken);

beforeEach(() => {
  vi.clearAllMocks();
  // Reset store state between tests
  useAuthStore.setState({
    token: null,
    providers: null,
    bootstrapStatus: null,
    bootstrapStarterTemplates: [],
    isAuthEntryLoading: false,
    authEntryError: null,
    loginError: null,
    isAuthenticating: false,
  });
});

describe('authStore.login', () => {
  it('sets token and writes to storage on success', async () => {
    mockedApi.login.mockResolvedValue({
      accessToken: 'tok-123',
      tenantContext: null,
    } as never);

    await useAuthStore.getState().login('user@example.com', 'pass', 'en', 'client');

    expect(useAuthStore.getState().token).toBe('tok-123');
    expect(mockedWriteToken).toHaveBeenCalledWith('client', 'tok-123');
    expect(useAuthStore.getState().loginError).toBeNull();
  });

  it('sets loginError and rethrows on failure', async () => {
    mockedApi.login.mockRejectedValue(new Error('Invalid credentials'));

    await expect(
      useAuthStore.getState().login('x@y.com', 'bad', 'en', 'client'),
    ).rejects.toThrow();

    expect(useAuthStore.getState().loginError).toBe('Invalid credentials');
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('clears isAuthenticating after completion', async () => {
    mockedApi.login.mockResolvedValue({ accessToken: 'tok', tenantContext: null } as never);
    await useAuthStore.getState().login('a@b.com', 'p', 'en', 'client');
    expect(useAuthStore.getState().isAuthenticating).toBe(false);
  });
});

describe('authStore.logout', () => {
  it('clears token and storage', () => {
    useAuthStore.setState({ token: 'existing-tok' });

    useAuthStore.getState().logout('client');

    expect(useAuthStore.getState().token).toBeNull();
    expect(mockedClearToken).toHaveBeenCalledWith('client');
    expect(useAuthStore.getState().loginError).toBeNull();
  });

  it('stores logout message as loginError', () => {
    useAuthStore.getState().logout('client', 'Session expired');
    expect(useAuthStore.getState().loginError).toBe('Session expired');
  });
});

describe('authStore.signup', () => {
  it('sets token on success', async () => {
    mockedApi.signup.mockResolvedValue({
      accessToken: 'signup-tok',
      tenantContext: null,
    } as never);

    await useAuthStore.getState().signup(
      { displayName: 'Alice', email: 'a@b.com', password: 'pw' },
      'en',
      'client',
    );

    expect(useAuthStore.getState().token).toBe('signup-tok');
    expect(mockedWriteToken).toHaveBeenCalledWith('client', 'signup-tok');
  });
});

describe('authStore.requestPasswordReset', () => {
  it('returns server message on success', async () => {
    mockedApi.requestPasswordReset.mockResolvedValue({ message: 'Email sent' } as never);

    const result = await useAuthStore.getState().requestPasswordReset('a@b.com', 'en');

    expect(result).toBe('Email sent');
    expect(useAuthStore.getState().loginError).toBeNull();
  });
});

describe('authStore.handleOidcCallback', () => {
  it('sets token and writes to storage', () => {
    useAuthStore.getState().handleOidcCallback('oidc-tok', 'client');

    expect(useAuthStore.getState().token).toBe('oidc-tok');
    expect(mockedWriteToken).toHaveBeenCalledWith('client', 'oidc-tok');
  });
});
