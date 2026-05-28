import { beforeEach, describe, expect, it } from 'vitest';
import {
  useSettingsStore,
  createEmptyMemberForm,
  createEmptyMemberEditForm,
} from './settingsStore';

beforeEach(() => {
  useSettingsStore.setState({
    settingsDraft: null,
    smtpVerifiedFingerprint: null,
    notificationPreferencesDraft: null,
    memberForm: createEmptyMemberForm(),
    memberEditForm: createEmptyMemberEditForm(),
    editingMemberId: null,
    expandedDeviceDetailsById: {},
  });
});

describe('createEmptyMemberForm', () => {
  it('generates a non-empty password', () => {
    const form = createEmptyMemberForm();
    expect(form.displayName).toBe('');
    expect(form.role).toBe('child');
    expect(form.password.length).toBeGreaterThan(8);
  });
});

describe('createEmptyMemberEditForm', () => {
  it('returns blank edit form', () => {
    const form = createEmptyMemberEditForm();
    expect(form.password).toBe('');
    expect(form.role).toBe('child');
  });
});

describe('setSettingsDraft functional updater', () => {
  it('applies updater to current draft', () => {
    useSettingsStore.setState({ settingsDraft: { smtpEnabled: false } as never });
    useSettingsStore
      .getState()
      .setSettingsDraft((prev) => (prev ? { ...prev, smtpEnabled: true } : prev));
    expect(
      (useSettingsStore.getState().settingsDraft as { smtpEnabled: boolean } | null)?.smtpEnabled,
    ).toBe(true);
  });

  it('accepts null to clear draft', () => {
    useSettingsStore.setState({ settingsDraft: {} as never });
    useSettingsStore.getState().setSettingsDraft(null);
    expect(useSettingsStore.getState().settingsDraft).toBeNull();
  });
});

describe('setExpandedDeviceDetailsById', () => {
  it('merges new entries via functional updater', () => {
    useSettingsStore.getState().setExpandedDeviceDetailsById((prev) => ({ ...prev, d1: true }));
    expect(useSettingsStore.getState().expandedDeviceDetailsById).toEqual({ d1: true });
  });
});
