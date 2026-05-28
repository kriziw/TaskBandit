import { beforeEach, describe, expect, it } from 'vitest';
import { useDashboardStore } from './dashboardStore';
import type { DashboardPayload, RuntimeLogEntry } from '../types/taskbandit';

const makePayload = (overrides: Partial<DashboardPayload> = {}): DashboardPayload =>
  ({
    currentUser: { id: 'u1', displayName: 'Alice', role: 'admin', email: 'a@test.com', points: 100, authProviders: ['local'] } as unknown as DashboardPayload['currentUser'],
    dashboard: {} as DashboardPayload['dashboard'],
    household: { householdId: 'h1', name: 'Home', settings: {} as DashboardPayload['household']['settings'], members: [] } as DashboardPayload['household'],
    auditLog: [],
    notifications: [],
    notificationDevices: [],
    householdNotificationHealth: [],
    notificationRecovery: null,
    systemStatus: null,
    backupReadiness: null,
    notificationPreferences: {} as DashboardPayload['notificationPreferences'],
    pointsLedger: [],
    templates: [],
    instances: [],
    takeoverRequests: [],
    hostedSubscription: {} as DashboardPayload['hostedSubscription'],
    compatibility: {} as DashboardPayload['compatibility'],
    achievements: [],
    rewards: [],
    redemptions: [],
    ...overrides,
  });

const makeLogEntry = (id: string): RuntimeLogEntry => ({
  id,
  timestamp: '2024-01-01T00:00:00Z',
  level: 'log',
  context: null,
  message: 'test',
  stack: null,
});

beforeEach(() => {
  useDashboardStore.setState({ payload: null, runtimeLogs: [], isLoading: false });
});

describe('setPayload', () => {
  it('sets payload', () => {
    const payload = makePayload();
    useDashboardStore.getState().setPayload(payload);
    expect(useDashboardStore.getState().payload).toBe(payload);
  });

  it('clears payload when null', () => {
    useDashboardStore.setState({ payload: makePayload() });
    useDashboardStore.getState().setPayload(null);
    expect(useDashboardStore.getState().payload).toBeNull();
  });
});

describe('updatePayload', () => {
  it('applies updater when payload exists', () => {
    useDashboardStore.setState({ payload: makePayload() });
    useDashboardStore.getState().updatePayload((c) => ({ ...c, auditLog: [{ id: 'log1' } as never] }));
    expect(useDashboardStore.getState().payload?.auditLog).toHaveLength(1);
  });

  it('is a no-op when payload is null', () => {
    useDashboardStore.getState().updatePayload((c) => ({ ...c, auditLog: [] }));
    expect(useDashboardStore.getState().payload).toBeNull();
  });
});

describe('setRuntimeLogs', () => {
  it('sets runtime logs', () => {
    const logs = [makeLogEntry('l1'), makeLogEntry('l2')];
    useDashboardStore.getState().setRuntimeLogs(logs);
    expect(useDashboardStore.getState().runtimeLogs).toEqual(logs);
  });
});

describe('setIsLoading', () => {
  it('sets loading state', () => {
    useDashboardStore.getState().setIsLoading(true);
    expect(useDashboardStore.getState().isLoading).toBe(true);
    useDashboardStore.getState().setIsLoading(false);
    expect(useDashboardStore.getState().isLoading).toBe(false);
  });
});

describe('clearDashboard', () => {
  it('resets all state to defaults', () => {
    useDashboardStore.setState({ payload: makePayload(), runtimeLogs: [makeLogEntry('l1')], isLoading: true });
    useDashboardStore.getState().clearDashboard();
    const { payload, runtimeLogs, isLoading } = useDashboardStore.getState();
    expect(payload).toBeNull();
    expect(runtimeLogs).toEqual([]);
    expect(isLoading).toBe(false);
  });
});
