import { create } from "zustand";
import type { BootstrapHouseholdInput, ReleaseInfo, UnlockedAchievement } from "../types/taskbandit";
import type { ClientWebPushStatus } from "../pwa/clientPush";

export type WorkspacePage =
  | "overview"
  | "chores"
  | "leaderboard"
  | "rewards"
  | "templates"
  | "household"
  | "notifications"
  | "settings"
  | "admin"
  | "logs";

export type OnboardingStep = string;
export type OnboardingTourMode = "admin" | "client" | "client-mobile";
export type BootstrapFormState = BootstrapHouseholdInput;

export type CompletionCelebration = {
  points: number;
  choreTitle: string;
  titleKey: string;
  eyebrowKey: string;
  phraseKey: string;
  variant: "standard" | "rare" | "chore" | "perfect" | "achievement";
  unlockedAchievement?: UnlockedAchievement;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

interface UiStore {
  // Navigation
  activePage: WorkspacePage;
  isMobileProfileOpen: boolean;
  isMobileMoreSheetOpen: boolean;
  isClientMobileViewport: boolean;
  mobileProfileAvatar: string;

  // Banners and alerts
  pageError: string | null;
  notice: string | null;
  busyAction: string | null;

  // Chore completion celebration
  completionCelebration: CompletionCelebration | null;
  lastCompletionCelebrationPhraseKey: string | null;

  // Server update info
  serverReleaseInfo: ReleaseInfo | null;
  dismissedUpdateKey: string | null;

  // PWA install prompt
  installPromptEvent: BeforeInstallPromptEvent | null;
  installPromptDismissed: boolean;

  // Client web push
  clientWebPushStatus: ClientWebPushStatus;

  // Bootstrap wizard
  bootstrapForm: BootstrapFormState;
  bootstrapSetupStep: "account" | "templates" | "review";
  selectedBootstrapStarterGroup: string;

  // Onboarding
  onboardingStep: OnboardingStep;
  onboardingDismissed: boolean;
  onboardingManuallyOpened: boolean;
  onboardingTourCompleted: boolean;

  // Setters
  setActivePage: (v: WorkspacePage) => void;
  setIsMobileProfileOpen: (v: boolean) => void;
  setIsMobileMoreSheetOpen: (v: boolean) => void;
  setIsClientMobileViewport: (v: boolean) => void;
  setMobileProfileAvatar: (v: string) => void;

  setPageError: (v: string | null) => void;
  setNotice: (v: string | null) => void;
  setBusyAction: (v: string | null) => void;

  setCompletionCelebration: (v: CompletionCelebration | null) => void;
  setLastCompletionCelebrationPhraseKey: (v: string | null) => void;

  setServerReleaseInfo: (v: ReleaseInfo | null) => void;
  setDismissedUpdateKey: (v: string | null) => void;

  setInstallPromptEvent: (v: BeforeInstallPromptEvent | null) => void;
  setInstallPromptDismissed: (v: boolean) => void;

  setClientWebPushStatus: (v: ClientWebPushStatus | ((prev: ClientWebPushStatus) => ClientWebPushStatus)) => void;

  setBootstrapForm: (v: BootstrapFormState | ((prev: BootstrapFormState) => BootstrapFormState)) => void;
  setBootstrapSetupStep: (v: "account" | "templates" | "review") => void;
  setSelectedBootstrapStarterGroup: (v: string) => void;

  setOnboardingStep: (v: OnboardingStep) => void;
  setOnboardingDismissed: (v: boolean) => void;
  setOnboardingManuallyOpened: (v: boolean) => void;
  setOnboardingTourCompleted: (v: boolean) => void;
}

// Circular import avoidance — type is declared in clientPush.ts
// We re-export it from there instead of duplicating
export type { ClientWebPushStatus } from "../pwa/clientPush";

export const useUiStore = create<UiStore>((set) => ({
  activePage: "overview",
  isMobileProfileOpen: false,
  isMobileMoreSheetOpen: false,
  isClientMobileViewport: false,
  mobileProfileAvatar: "",

  pageError: null,
  notice: null,
  busyAction: null,

  completionCelebration: null,
  lastCompletionCelebrationPhraseKey: null,

  serverReleaseInfo: null,
  dismissedUpdateKey: null,

  installPromptEvent: null,
  installPromptDismissed: false,

  clientWebPushStatus: { supported: false, enabled: false, permission: "unsupported" as const, needsPrompt: false },

  bootstrapForm: {
    householdName: "",
    ownerDisplayName: "",
    ownerEmail: "",
    ownerPassword: "",
    selfSignupEnabled: false,
    starterTemplateKeys: [],
  },
  bootstrapSetupStep: "account",
  selectedBootstrapStarterGroup: "",

  onboardingStep: "welcome",
  onboardingDismissed: false,
  onboardingManuallyOpened: false,
  onboardingTourCompleted: false,

  setActivePage: (v) => set({ activePage: v }),
  setIsMobileProfileOpen: (v) => set({ isMobileProfileOpen: v }),
  setIsMobileMoreSheetOpen: (v) => set({ isMobileMoreSheetOpen: v }),
  setIsClientMobileViewport: (v) => set({ isClientMobileViewport: v }),
  setMobileProfileAvatar: (v) => set({ mobileProfileAvatar: v }),

  setPageError: (v) => set({ pageError: v }),
  setNotice: (v) => set({ notice: v }),
  setBusyAction: (v) => set({ busyAction: v }),

  setCompletionCelebration: (v) => set({ completionCelebration: v }),
  setLastCompletionCelebrationPhraseKey: (v) => set({ lastCompletionCelebrationPhraseKey: v }),

  setServerReleaseInfo: (v) => set({ serverReleaseInfo: v }),
  setDismissedUpdateKey: (v) => set({ dismissedUpdateKey: v }),

  setInstallPromptEvent: (v) => set({ installPromptEvent: v }),
  setInstallPromptDismissed: (v) => set({ installPromptDismissed: v }),

  setClientWebPushStatus: (v) =>
    set((s) => ({ clientWebPushStatus: typeof v === "function" ? v(s.clientWebPushStatus) : v })),

  setBootstrapForm: (v) =>
    set((s) => ({ bootstrapForm: typeof v === "function" ? v(s.bootstrapForm) : v })),
  setBootstrapSetupStep: (v) => set({ bootstrapSetupStep: v }),
  setSelectedBootstrapStarterGroup: (v) => set({ selectedBootstrapStarterGroup: v }),

  setOnboardingStep: (v) => set({ onboardingStep: v }),
  setOnboardingDismissed: (v) => set({ onboardingDismissed: v }),
  setOnboardingManuallyOpened: (v) => set({ onboardingManuallyOpened: v }),
  setOnboardingTourCompleted: (v) => set({ onboardingTourCompleted: v }),
}));
