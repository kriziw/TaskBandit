import { create } from 'zustand';
import type {
  HouseholdSettings,
  NotificationPreferences,
  CreateHouseholdMemberInput,
  UpdateHouseholdMemberInput,
} from '../types/taskbandit';

export type MemberFormState = CreateHouseholdMemberInput;
export type MemberEditFormState = UpdateHouseholdMemberInput;

function createTemporaryPassword(length = 16) {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%*-_?';
  const allCharacters = uppercase + lowercase + digits + symbols;
  const randomValues = new Uint32Array(length);
  const cryptoProvider = globalThis.crypto;

  if (cryptoProvider?.getRandomValues) {
    cryptoProvider.getRandomValues(randomValues);
  } else {
    for (let index = 0; index < length; index += 1) {
      randomValues[index] = Math.floor(Math.random() * 0xffffffff);
    }
  }

  const requiredCharacters = [
    uppercase[randomValues[0] % uppercase.length],
    lowercase[randomValues[1] % lowercase.length],
    digits[randomValues[2] % digits.length],
    symbols[randomValues[3] % symbols.length],
  ];

  const generatedCharacters = [
    ...requiredCharacters,
    ...Array.from({ length: Math.max(length - requiredCharacters.length, 0) }, (_, index) => {
      const randomValue = randomValues[index + requiredCharacters.length];
      return allCharacters[randomValue % allCharacters.length];
    }),
  ];

  for (let index = generatedCharacters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomValues[index] % (index + 1);
    [generatedCharacters[index], generatedCharacters[swapIndex]] = [
      generatedCharacters[swapIndex],
      generatedCharacters[index],
    ];
  }

  return generatedCharacters.join('');
}

export function createEmptyMemberForm(): MemberFormState {
  return {
    displayName: '',
    role: 'child',
    email: '',
    password: createTemporaryPassword(),
    sendInviteEmail: false,
  };
}

export function createEmptyMemberEditForm(): MemberEditFormState {
  return {
    displayName: '',
    role: 'child',
    email: '',
    password: '',
  };
}

interface SettingsStore {
  settingsDraft: HouseholdSettings | null;
  smtpVerifiedFingerprint: string | null;
  notificationPreferencesDraft: NotificationPreferences | null;
  memberForm: MemberFormState;
  memberEditForm: MemberEditFormState;
  editingMemberId: string | null;
  expandedDeviceDetailsById: Record<string, boolean>;

  setSettingsDraft: (
    v: HouseholdSettings | null | ((prev: HouseholdSettings | null) => HouseholdSettings | null),
  ) => void;
  setSmtpVerifiedFingerprint: (v: string | null) => void;
  setNotificationPreferencesDraft: (
    v:
      | NotificationPreferences
      | null
      | ((prev: NotificationPreferences | null) => NotificationPreferences | null),
  ) => void;
  setMemberForm: (v: MemberFormState | ((prev: MemberFormState) => MemberFormState)) => void;
  setMemberEditForm: (
    v: MemberEditFormState | ((prev: MemberEditFormState) => MemberEditFormState),
  ) => void;
  setEditingMemberId: (v: string | null) => void;
  setExpandedDeviceDetailsById: (
    v: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>),
  ) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settingsDraft: null,
  smtpVerifiedFingerprint: null,
  notificationPreferencesDraft: null,
  memberForm: createEmptyMemberForm(),
  memberEditForm: createEmptyMemberEditForm(),
  editingMemberId: null,
  expandedDeviceDetailsById: {},

  setSettingsDraft: (v) =>
    set((s) => ({ settingsDraft: typeof v === 'function' ? v(s.settingsDraft) : v })),
  setSmtpVerifiedFingerprint: (v) => set({ smtpVerifiedFingerprint: v }),
  setNotificationPreferencesDraft: (v) =>
    set((s) => ({
      notificationPreferencesDraft: typeof v === 'function' ? v(s.notificationPreferencesDraft) : v,
    })),
  setMemberForm: (v) => set((s) => ({ memberForm: typeof v === 'function' ? v(s.memberForm) : v })),
  setMemberEditForm: (v) =>
    set((s) => ({ memberEditForm: typeof v === 'function' ? v(s.memberEditForm) : v })),
  setEditingMemberId: (v) => set({ editingMemberId: v }),
  setExpandedDeviceDetailsById: (v) =>
    set((s) => ({
      expandedDeviceDetailsById: typeof v === 'function' ? v(s.expandedDeviceDetailsById) : v,
    })),
}));
