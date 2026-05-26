import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from './uiStore';

const defaultBootstrapForm = {
  householdName: '',
  ownerDisplayName: '',
  ownerEmail: '',
  ownerPassword: '',
  selfSignupEnabled: false,
  starterTemplateKeys: [],
};

beforeEach(() => {
  useUiStore.setState({
    activePage: 'overview',
    isMobileProfileOpen: false,
    isMobileMoreSheetOpen: false,
    isClientMobileViewport: false,
    mobileProfileAvatar: '',
    pageError: null,
    notice: null,
    busyAction: null,
    completionCelebration: null,
    lastCompletionCelebrationPhraseKey: null,
    serverReleaseInfo: null,
    dismissedUpdateKey: null,
    installPromptEvent: null,
    installPromptDismissed: false,
    clientWebPushStatus: { supported: false, enabled: false, permission: 'unsupported', needsPrompt: false },
    bootstrapForm: defaultBootstrapForm,
    bootstrapSetupStep: 'account',
    selectedBootstrapStarterGroup: '',
    onboardingStep: 'welcome',
    onboardingDismissed: false,
    onboardingManuallyOpened: false,
    onboardingTourCompleted: false,
  });
});

describe('activePage', () => {
  it('updates activePage', () => {
    useUiStore.getState().setActivePage('chores');
    expect(useUiStore.getState().activePage).toBe('chores');
  });
});

describe('pageError / notice / busyAction', () => {
  it('sets and clears pageError', () => {
    useUiStore.getState().setPageError('Something went wrong');
    expect(useUiStore.getState().pageError).toBe('Something went wrong');
    useUiStore.getState().setPageError(null);
    expect(useUiStore.getState().pageError).toBeNull();
  });

  it('sets and clears notice', () => {
    useUiStore.getState().setNotice('Saved!');
    expect(useUiStore.getState().notice).toBe('Saved!');
    useUiStore.getState().setNotice(null);
    expect(useUiStore.getState().notice).toBeNull();
  });

  it('sets and clears busyAction', () => {
    useUiStore.getState().setBusyAction('loading');
    expect(useUiStore.getState().busyAction).toBe('loading');
    useUiStore.getState().setBusyAction(null);
    expect(useUiStore.getState().busyAction).toBeNull();
  });
});

describe('setBootstrapForm functional updater', () => {
  it('applies updater to current bootstrap form', () => {
    useUiStore.getState().setBootstrapForm((prev) => ({ ...prev, householdName: 'My Home' }));
    expect(useUiStore.getState().bootstrapForm.householdName).toBe('My Home');
  });

  it('accepts a direct value', () => {
    const form = { ...defaultBootstrapForm, ownerEmail: 'admin@example.com' };
    useUiStore.getState().setBootstrapForm(form);
    expect(useUiStore.getState().bootstrapForm.ownerEmail).toBe('admin@example.com');
  });
});

describe('setClientWebPushStatus functional updater', () => {
  it('applies updater to current status', () => {
    useUiStore.getState().setClientWebPushStatus((prev) => ({ ...prev, enabled: true }));
    expect(useUiStore.getState().clientWebPushStatus.enabled).toBe(true);
  });
});

describe('onboarding state', () => {
  it('tracks onboarding step', () => {
    useUiStore.getState().setOnboardingStep('chores');
    expect(useUiStore.getState().onboardingStep).toBe('chores');
  });

  it('tracks tour completion', () => {
    useUiStore.getState().setOnboardingTourCompleted(true);
    expect(useUiStore.getState().onboardingTourCompleted).toBe(true);
  });

  it('tracks dismissed flag', () => {
    useUiStore.getState().setOnboardingDismissed(true);
    expect(useUiStore.getState().onboardingDismissed).toBe(true);
  });
});
