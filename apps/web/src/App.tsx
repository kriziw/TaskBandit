import React, { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { taskBanditApi, TaskBanditApiError } from './api/taskbanditApi';
import { DashboardCard } from './components/DashboardCard';
import { AuthPanel } from './features/auth/AuthPanel';
import { useAuthStore } from './stores/authStore';
import { useDashboardStore } from './stores/dashboardStore';
import {
  useChoreStore,
  type HouseholdChoreStateFilter,
  type ChoreExportStatusFilter,
  type InstanceFormState,
} from './stores/choreStore';
import {
  useTemplateStore,
  createEmptyTemplateForm,
  type TemplateFormState,
} from './stores/templateStore';
import { useRewardStore } from './stores/rewardStore';
import {
  useSettingsStore,
  createEmptyMemberForm,
  createEmptyMemberEditForm,
} from './stores/settingsStore';
import {
  useUiStore,
  type WorkspacePage,
  type OnboardingStep,
  type OnboardingTourMode,
  type CompletionCelebration,
  type ClientWebPushStatus,
} from './stores/uiStore';
import { AppLanguage, useI18n } from './i18n/I18nProvider';
import {
  enableClientWebPush,
  getClientWebPushSupportStatus,
  syncClientWebPushRegistration,
} from './pwa/clientPush';
import { resolveApiBaseUrl, setApiBaseUrlOverride } from './runtimeConfig';
import type {
  Achievement,
  AdminSystemStatus,
  BackupReadiness,
  BootstrapStarterTemplateOption,
  ChoreAttachment,
  AuthenticatedUser,
  ChoreInstance,
  ChoreState,
  ChoreTemplate,
  ChoreTemplateDependencyRule,
  Household,
  HouseholdNotificationHealthEntry,
  HostedSubscriptionOverview,
  HouseholdSettings,
  LocalizedTemplateTranslation,
  MasteryStats,
  NotificationDevice,
  NotificationRecovery,
  Reward,
  RewardCategory,
  RewardEligibility,
  ReleaseInfo,
  RecurrenceType,
  FollowUpDelayUnit,
  TakeoverRequestEntry,
  TemplateTranslationLocale,
  HolidayBlock,
  OnboardingAnswers,
} from './types/taskbandit';

const workspacePageStorageKey = 'taskbandit-active-page';
const dismissedUpdateStorageKey = 'taskbandit-dismissed-update';
const dismissedPwaInstallKey = 'taskbandit-dismissed-pwa-install';
const mobileAvatarStorageKey = 'taskbandit-mobile-avatar';
type WorkspaceVariant = 'admin' | 'client';

type ReadinessChecklistItem = {
  key: string;
  status: 'ready' | 'warning';
  title: string;
  detail: string;
};

type ClientMobileChoreSection = 'mine' | 'unassigned' | 'others';
type ClientMobileDueBucket = 'today' | 'this_week' | 'later';
type WorkspaceRoute = 'home' | 'plan' | 'household' | 'settings' | 'ops';

const mobileNavIconByPage: Record<string, string> = {
  chores: '/mobile-icons/chores.png',
  leaderboard: '/mobile-icons/leaderboard.png',
  rewards: '/mobile-icons/rewards.png',
  settings: '/mobile-icons/settings.png',
  more: '/mobile-icons/more.png',
};
type WorkspaceSectionLink = {
  key: string;
  label: string;
  ref: RefObject<HTMLElement | null>;
};
type OnboardingStepDefinition = {
  key: OnboardingStep;
  title: string;
  description: string;
  page: WorkspacePage;
  targetRef?: RefObject<HTMLElement | null>;
};

const workspacePageOrder: WorkspacePage[] = [
  'overview',
  'chores',
  'leaderboard',
  'rewards',
  'templates',
  'household',
  'notifications',
  'settings',
  'admin',
  'logs',
];

const workspaceRouteOrder: WorkspaceRoute[] = ['home', 'plan', 'household', 'settings', 'ops'];

const workspacePageByRoute: Record<WorkspaceRoute, WorkspacePage> = {
  home: 'overview',
  plan: 'chores',
  household: 'household',
  settings: 'settings',
  ops: 'admin',
};

const householdBoardStateOrder: ChoreState[] = [
  'open',
  'assigned',
  'in_progress',
  'deferred',
  'pending_approval',
  'needs_fixes',
  'overdue',
  'completed',
  'cancelled',
];

const activeChoreStates: ChoreState[] = [
  'open',
  'assigned',
  'in_progress',
  'deferred',
  'pending_approval',
  'needs_fixes',
  'overdue',
];

type PackageFeatureId = keyof AuthenticatedUser['featureAccess'];

const fullFeatureAccess: AuthenticatedUser['featureAccess'] = {
  templates_manage: true,
  chores_manage: true,
  reassignment: true,
  takeover_direct: true,
  takeover_requests: true,
  approvals: true,
  proof_uploads: true,
  follow_up_automation: true,
  external_completion: true,
  deferred_follow_up_control: true,
  quick_log: true,
  rewards_manage: true,
  mastery: true,
};

const historicChoreStates: ChoreState[] = ['completed', 'cancelled'];
const choreHistoryPageSize = 25;
const clientMobileBreakpointPx = 820;

const recurrenceWeekdayOrder = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

const defaultDependencyDelayValue = 1;
const defaultDependencyDelayUnit: FollowUpDelayUnit = 'hours';
const templateTranslationLocales: AppLanguage[] = ['en', 'de', 'hu'];
const completionCelebrationPhraseKeys = [
  'celebration.phrase_1',
  'celebration.phrase_2',
  'celebration.phrase_3',
  'celebration.phrase_4',
  'celebration.phrase_5',
];
const rareCompletionCelebrationPhraseKeys = [
  'celebration.rare_phrase_1',
  'celebration.rare_phrase_2',
  'celebration.rare_phrase_3',
];
const perfectDayCelebrationPhraseKeys = [
  'celebration.perfect_day_phrase_1',
  'celebration.perfect_day_phrase_2',
  'celebration.perfect_day_phrase_3',
];
const choreAwareCelebrationPhraseGroups: Array<{
  keywords: string[];
  phraseKeys: string[];
}> = [
  {
    keywords: ['kitchen', 'dish', 'dishwasher', 'plate', 'fridge', 'oven'],
    phraseKeys: ['celebration.chore_kitchen_1', 'celebration.chore_kitchen_2'],
  },
  {
    keywords: ['laundry', 'clothes', 'washing', 'dryer', 'fold', 'linen'],
    phraseKeys: ['celebration.chore_laundry_1', 'celebration.chore_laundry_2'],
  },
  {
    keywords: ['clean', 'tidy', 'vacuum', 'mop', 'dust', 'bathroom', 'toilet'],
    phraseKeys: ['celebration.chore_cleaning_1', 'celebration.chore_cleaning_2'],
  },
  {
    keywords: ['trash', 'rubbish', 'garbage', 'recycling', 'waste', 'bin'],
    phraseKeys: ['celebration.chore_waste_1', 'celebration.chore_waste_2'],
  },
  {
    keywords: ['plant', 'water', 'garden'],
    phraseKeys: ['celebration.chore_plants_1', 'celebration.chore_plants_2'],
  },
];

function pickRandomFromPool(pool: string[], previousKey?: string | null) {
  if (pool.length === 1) {
    return pool[0];
  }

  let nextKey = pool[getRandomNumber(pool.length)];
  while (nextKey === previousKey) {
    nextKey = pool[getRandomNumber(pool.length)];
  }

  return nextKey;
}

function pickDeterministicFromPool(pool: string[], index?: number | null) {
  if (pool.length === 0) {
    return '';
  }

  const rawIndex = typeof index === 'number' && Number.isFinite(index) ? index : 0;
  const normalizedIndex = Math.abs(Math.trunc(rawIndex));
  return pool[normalizedIndex % pool.length];
}

function buildCompletionCelebration(
  chore: ChoreInstance,
  previousKey?: string | null,
): CompletionCelebration {
  const searchableChoreText = [chore.groupTitle, chore.typeTitle, chore.subtypeLabel, chore.title]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const choreAwareGroup = choreAwareCelebrationPhraseGroups.find((group) =>
    group.keywords.some((keyword) => searchableChoreText.includes(keyword)),
  );
  const rareVariant = getRandomNumber(8) === 0;

  if (chore.completionMilestone?.type === 'perfect_day') {
    return {
      points: Math.max(0, chore.awardedPoints),
      choreTitle: chore.typeTitle || chore.title,
      titleKey: 'celebration.perfect_day_title',
      eyebrowKey: 'celebration.perfect_day_eyebrow',
      phraseKey: pickDeterministicFromPool(
        perfectDayCelebrationPhraseKeys,
        chore.completionMilestone.messageIndex,
      ),
      variant: 'perfect',
    };
  }

  if (rareVariant) {
    return {
      points: Math.max(0, chore.awardedPoints),
      choreTitle: chore.typeTitle || chore.title,
      titleKey: 'celebration.rare_title',
      eyebrowKey: 'celebration.rare_eyebrow',
      phraseKey: pickRandomFromPool(rareCompletionCelebrationPhraseKeys, previousKey),
      variant: 'rare',
    };
  }

  if (choreAwareGroup) {
    return {
      points: Math.max(0, chore.awardedPoints),
      choreTitle: chore.typeTitle || chore.title,
      titleKey: 'celebration.chore_title',
      eyebrowKey: 'celebration.chore_eyebrow',
      phraseKey: pickRandomFromPool(choreAwareGroup.phraseKeys, previousKey),
      variant: 'chore',
    };
  }

  return {
    points: Math.max(0, chore.awardedPoints),
    choreTitle: chore.typeTitle || chore.title,
    titleKey: 'celebration.title',
    eyebrowKey: 'celebration.eyebrow',
    phraseKey: pickRandomFromPool(completionCelebrationPhraseKeys, previousKey),
    variant: 'standard',
  };
}

function getRandomNumber(max: number) {
  if (max <= 1) {
    return 0;
  }

  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const randomValues = new Uint32Array(1);
    window.crypto.getRandomValues(randomValues);
    return randomValues[0] % max;
  }

  return Math.floor(Math.random() * max);
}

async function convertImageFileToAvatarDataUrl(file: File) {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Unable to load image.'));
      element.src = sourceUrl;
    });

    const targetSize = 256;
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const context2d = canvas.getContext('2d');
    if (!context2d) {
      throw new Error('Unable to prepare avatar image.');
    }

    const minSide = Math.min(image.naturalWidth, image.naturalHeight);
    const sx = Math.max(0, (image.naturalWidth - minSide) / 2);
    const sy = Math.max(0, (image.naturalHeight - minSide) / 2);
    context2d.drawImage(image, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);
    return canvas.toDataURL('image/jpeg', 0.86);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function normalizeTemplateDependencyRules(
  dependencyRules?: ChoreTemplateDependencyRule[],
  dependencyTemplateIds?: string[],
) {
  const normalized = new Map<string, ChoreTemplateDependencyRule>();
  for (const dependencyRule of dependencyRules ?? []) {
    if (!dependencyRule.templateId) {
      continue;
    }

    normalized.set(dependencyRule.templateId, {
      templateId: dependencyRule.templateId,
      delayValue: Math.max(1, Math.floor(Number(dependencyRule.delayValue || 1))),
      delayUnit: dependencyRule.delayUnit === 'days' ? 'days' : 'hours',
    });
  }

  for (const templateId of dependencyTemplateIds ?? []) {
    if (!normalized.has(templateId)) {
      normalized.set(templateId, {
        templateId,
        delayValue: defaultDependencyDelayValue,
        delayUnit: defaultDependencyDelayUnit,
      });
    }
  }

  return [...normalized.values()];
}

function normalizeLabelToken(value?: string | null) {
  return value?.trim().toLocaleLowerCase() ?? '';
}

function hasTemplateTranslationCoverage(
  template: ChoreTemplate,
  locale: TemplateTranslationLocale,
) {
  if (locale === template.defaultLocale) {
    return true;
  }

  const translation = template.translations.find((entry) => entry.locale === locale);
  return Boolean(translation?.groupTitle?.trim() && translation?.title?.trim());
}

function getSmtpTestSettings(
  settings: Pick<
    HouseholdSettings,
    | 'smtpHost'
    | 'smtpPort'
    | 'smtpSecure'
    | 'smtpUsername'
    | 'smtpPassword'
    | 'smtpFromEmail'
    | 'smtpFromName'
  >,
) {
  return {
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpSecure: settings.smtpSecure,
    smtpUsername: settings.smtpUsername,
    smtpPassword: settings.smtpPassword,
    smtpFromEmail: settings.smtpFromEmail,
    smtpFromName: settings.smtpFromName,
  };
}

function getSmtpSettingsFingerprint(
  settings: Pick<
    HouseholdSettings,
    | 'smtpHost'
    | 'smtpPort'
    | 'smtpSecure'
    | 'smtpUsername'
    | 'smtpPassword'
    | 'smtpFromEmail'
    | 'smtpFromName'
  >,
) {
  return JSON.stringify(settings);
}

function getOnboardingTourStorageKey(mode: OnboardingTourMode) {
  return `taskbandit-onboarding-tour-${mode}`;
}

function getOnboardingTourMode(
  variant: WorkspaceVariant,
  isClientMobileViewport: boolean,
): OnboardingTourMode {
  if (variant === 'client' && isClientMobileViewport) {
    return 'client-mobile';
  }

  return variant;
}

function readStoredOnboardingTourCompletion(mode: OnboardingTourMode) {
  return window.localStorage.getItem(getOnboardingTourStorageKey(mode)) === 'true';
}

function writeStoredOnboardingTourCompletion(mode: OnboardingTourMode, completed: boolean) {
  if (completed) {
    window.localStorage.setItem(getOnboardingTourStorageKey(mode), 'true');
    return;
  }

  window.localStorage.removeItem(getOnboardingTourStorageKey(mode));
}

function getClientOnboardingStepForMode(
  step: OnboardingStep,
  mode: OnboardingTourMode,
  isChildClientUser: boolean,
) {
  const mobileActionStep = isChildClientUser ? 'mobile-sections' : 'mobile-add';

  if (mode === 'client-mobile') {
    switch (step) {
      case 'chores':
      case 'mobile-summary':
      case 'mobile-my-chores':
        return step === 'mobile-summary' ? 'mobile-summary' : 'mobile-my-chores';
      case 'schedule':
      case 'mobile-add':
      case 'mobile-sections':
        return mobileActionStep;
      case 'notifications':
      case 'devices':
      case 'mobile-nav':
        return 'mobile-nav';
      default:
        return 'welcome';
    }
  }

  switch (step) {
    case 'mobile-summary':
    case 'mobile-my-chores':
      return 'chores';
    case 'mobile-add':
    case 'mobile-sections':
      return 'schedule';
    case 'mobile-nav':
      return 'notifications';
    case 'welcome':
    case 'chores':
    case 'schedule':
    case 'notifications':
    case 'devices':
      return step;
    default:
      return 'welcome';
  }
}

function getDismissedUpdateStorageKey(variant: WorkspaceVariant) {
  return `${dismissedUpdateStorageKey}-${variant}`;
}

function getDismissedPwaInstallStorageKey(variant: WorkspaceVariant) {
  return `${dismissedPwaInstallKey}-${variant}`;
}

function isWorkspacePage(value: string | null): value is WorkspacePage {
  return value !== null && workspacePageOrder.includes(value as WorkspacePage);
}

function isWorkspaceRoute(value: string | null): value is WorkspaceRoute {
  return value !== null && workspaceRouteOrder.includes(value as WorkspaceRoute);
}

function getWorkspacePageStorageKey(variant: WorkspaceVariant) {
  return `${workspacePageStorageKey}-${variant}`;
}

function getMobileAvatarStorageKey(variant: WorkspaceVariant) {
  return `${mobileAvatarStorageKey}-${variant}`;
}

function readStoredMobileAvatar(variant: WorkspaceVariant) {
  return window.localStorage.getItem(getMobileAvatarStorageKey(variant));
}

function writeStoredMobileAvatar(variant: WorkspaceVariant, avatarValue: string) {
  window.localStorage.setItem(getMobileAvatarStorageKey(variant), avatarValue);
}

function getDefaultWorkspacePage(variant: WorkspaceVariant): WorkspacePage {
  return 'overview';
}

function getWorkspaceRouteFromPathname(pathname: string) {
  const normalizedPath = pathname.replace(/\/+$/, '');
  const routeMatch = normalizedPath.match(/\/app\/([^/]+)$/i);
  if (!routeMatch?.[1]) {
    return null;
  }

  const routeValue = routeMatch[1].toLowerCase();
  return isWorkspaceRoute(routeValue) ? routeValue : null;
}

function resolveWorkspaceRouteFromPage(page: WorkspacePage): WorkspaceRoute {
  switch (page) {
    case 'overview':
    case 'leaderboard':
      return 'home';
    case 'chores':
    case 'templates':
    case 'rewards':
      return 'plan';
    case 'household':
      return 'household';
    case 'notifications':
    case 'settings':
      return 'settings';
    case 'admin':
    case 'logs':
      return 'ops';
    default:
      return 'home';
  }
}

function getPathnameForWorkspacePage(page: WorkspacePage) {
  const route = resolveWorkspaceRouteFromPage(page);
  return `/app/${route}`;
}

function readStoredWorkspacePage(variant: WorkspaceVariant) {
  const routeFromPath = getWorkspaceRouteFromPathname(window.location.pathname);
  if (routeFromPath) {
    return workspacePageByRoute[routeFromPath];
  }

  const stored = window.localStorage.getItem(getWorkspacePageStorageKey(variant));
  if (isWorkspacePage(stored)) {
    return workspacePageByRoute[resolveWorkspaceRouteFromPage(stored)];
  }

  return getDefaultWorkspacePage(variant);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatByteSize(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'unlimited';
  }
  if (value < 1024) {
    return `${formatNumber(value)} B`;
  }
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: size >= 100 ? 0 : size >= 10 ? 1 : 2,
  }).format(size)} ${units[unitIndex]}`;
}

function formatUsageLine(
  used: number | null | undefined,
  limit: number | null | undefined,
  valueFormatter: (value: number) => string = formatNumber,
) {
  if (used === null || used === undefined || !Number.isFinite(used)) {
    return `n/a / ${limit === null || limit === undefined ? 'unlimited' : valueFormatter(limit)}`;
  }
  if (limit === null || limit === undefined || !Number.isFinite(limit) || limit <= 0) {
    return `${valueFormatter(used)} / unlimited`;
  }
  const percent = Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
  return `${valueFormatter(used)} / ${valueFormatter(limit)} (${percent}%)`;
}

function formatRetentionDaysLine(
  auditRetentionDays: number | null | undefined,
  exportRetentionDays: number | null | undefined,
  proofRetentionDays: number | null | undefined,
) {
  const formatValue = (value: number | null | undefined) =>
    value === null || value === undefined || !Number.isFinite(value) ? 'n/a' : formatNumber(value);
  return `${formatValue(auditRetentionDays)} / ${formatValue(exportRetentionDays)} / ${formatValue(proofRetentionDays)}`;
}

function parseReleaseVersionParts(value: string) {
  return value
    .split(/[.-]/)
    .map((segment) => Number.parseInt(segment, 10))
    .filter((segment) => Number.isFinite(segment));
}

function compareReleaseVersions(left: string, right: string) {
  const leftParts = parseReleaseVersionParts(left);
  const rightParts = parseReleaseVersionParts(right);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;
    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }

  return 0;
}

function compareReleaseInfo(current: ReleaseInfo, latest: ReleaseInfo) {
  const versionComparison = compareReleaseVersions(current.releaseVersion, latest.releaseVersion);
  if (versionComparison !== 0) {
    return versionComparison;
  }

  const currentBuild = Number.parseInt(current.buildNumber, 10);
  const latestBuild = Number.parseInt(latest.buildNumber, 10);
  if (
    Number.isFinite(currentBuild) &&
    Number.isFinite(latestBuild) &&
    currentBuild !== latestBuild
  ) {
    return currentBuild - latestBuild;
  }

  return current.buildNumber.localeCompare(latest.buildNumber);
}

function createReleaseKey(release: ReleaseInfo) {
  return `${release.releaseVersion}+${release.buildNumber}`;
}

function formatReleaseLabel(release: ReleaseInfo) {
  return `v${release.releaseVersion} - build ${release.buildNumber}`;
}

function formatReleaseDetails(release: ReleaseInfo) {
  const commit =
    release.commitSha && release.commitSha !== 'local'
      ? `commit ${release.commitSha.slice(0, 12)}`
      : null;
  const image = release.imageTag ? `image ${release.imageTag}` : null;
  return [commit, image].filter(Boolean).join(' | ');
}

const featureLabelMap: Record<string, string> = {
  templates_manage: 'Template management',
  chores_manage: 'Chore management',
  reassignment: 'Reassignment',
  takeover_direct: 'Direct takeover',
  takeover_requests: 'Takeover requests',
  approvals: 'Approvals',
  proof_uploads: 'Proof uploads',
  follow_up_automation: 'Follow-up automation',
  external_completion: 'External completion',
  deferred_follow_up_control: 'Deferred follow-up control',
  quick_log: 'Quick log',
  rewards_manage: 'Rewards',
  mastery: 'Chore Mastery',
};

function formatFeatureLabel(featureId: string) {
  return (
    featureLabelMap[featureId] ??
    featureId.replace(/_/g, ' ').replace(/\b\w/g, (value: string) => value.toUpperCase())
  );
}

function formatSubscriptionStatusLabel(status: string | null | undefined) {
  if (!status?.trim()) {
    return null;
  }

  return status.replace(/[_-]+/g, ' ').replace(/\b\w/g, (value: string) => value.toUpperCase());
}

type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isOptionalFeatureUnavailable(error: unknown) {
  if (!(error instanceof TaskBanditApiError)) {
    return false;
  }

  return (
    [404, 405, 501].includes(error.status) ||
    (error.status === 403 && error.code === 'package_feature_disabled')
  );
}

async function loadOptionalFeature<T>(loader: () => Promise<T>, fallbackValue: T) {
  try {
    return {
      value: await loader(),
      supported: true,
    };
  } catch (error) {
    if (isOptionalFeatureUnavailable(error)) {
      return {
        value: fallbackValue,
        supported: false,
      };
    }

    throw error;
  }
}

function getInitialClientWebPushStatus(): ClientWebPushStatus {
  if (!getClientWebPushSupportStatus()) {
    return {
      supported: false,
      enabled: false,
      permission: 'unsupported',
      needsPrompt: false,
    };
  }

  return {
    supported: true,
    enabled: false,
    permission: Notification.permission,
    needsPrompt: Notification.permission === 'default',
  };
}

function sortByLabel<T>(items: T[], getLabel: (item: T) => string) {
  return [...items].sort((left, right) => getLabel(left).localeCompare(getLabel(right)));
}

const quickLogIcons = {
  check: '\u2705',
  broom: '\u{1F9F9}',
  basket: '\u{1F9FA}',
  trash: '\u{1F5D1}\uFE0F',
  plate: '\u{1F37D}\uFE0F',
  bath: '\u{1F6C1}',
  teddy: '\u{1F9F8}',
  cart: '\u{1F6D2}',
  box: '\u{1F4E6}',
  sparkle: '\u2728',
} as const;

const mobileAvatarPresetAssets = Array.from({ length: 20 }, (_, index) => {
  const suffix = `${index + 1}`.padStart(2, '0');
  return `/brand/avatars/mascot_avatar_${suffix}.png`;
});
const defaultMobileAvatarAsset = mobileAvatarPresetAssets[0];

const legacyQuickLogMojibakePrefix = /^[\u00C3\u00E2\u00F0]/;

const quickLogIconOptions = [
  quickLogIcons.check,
  quickLogIcons.broom,
  quickLogIcons.basket,
  quickLogIcons.trash,
  quickLogIcons.plate,
  quickLogIcons.bath,
  quickLogIcons.teddy,
  quickLogIcons.cart,
  quickLogIcons.box,
  quickLogIcons.sparkle,
] as const;

const choreIconPresets = [
  { id: 'take_out_trash', label: 'Trash', assetPath: '/chore-icons/take_out_trash.png' },
  { id: 'recycle_sorting', label: 'Recycling', assetPath: '/chore-icons/recycle_sorting.png' },
  { id: 'feed_pets', label: 'Pets', assetPath: '/chore-icons/feed_pets.png' },
  { id: 'wash_dishes_sink', label: 'Dishes', assetPath: '/chore-icons/wash_dishes_sink.png' },
  { id: 'make_bed', label: 'Make bed', assetPath: '/chore-icons/make_bed.png' },
  {
    id: 'change_bed_sheets',
    label: 'Change sheets',
    assetPath: '/chore-icons/change_bed_sheets.png',
  },
  { id: 'do_laundry', label: 'Laundry', assetPath: '/chore-icons/do_laundry.png' },
  { id: 'vacuum_floor', label: 'Vacuum', assetPath: '/chore-icons/vacuum_floor.png' },
  { id: 'water_plants', label: 'Water plants', assetPath: '/chore-icons/water_plants.png' },
  { id: 'clean_toilet', label: 'Bathroom', assetPath: '/chore-icons/clean_toilet.png' },
  {
    id: 'clean_mirror_sink',
    label: 'Sink/Mirror',
    assetPath: '/chore-icons/clean_mirror_sink.png',
  },
  { id: 'wipe_counter', label: 'Counter', assetPath: '/chore-icons/wipe_counter.png' },
  { id: 'dishwasher', label: 'Dishwasher', assetPath: '/chore-icons/dishwasher.png' },
  { id: 'grocery_shopping', label: 'Groceries', assetPath: '/chore-icons/grocery_shopping.png' },
  { id: 'sort_mail', label: 'Mail', assetPath: '/chore-icons/sort_mail.png' },
] as const;
type ChoreIconId = (typeof choreIconPresets)[number]['id'];
const choreIconById = new Map<ChoreIconId, (typeof choreIconPresets)[number]>(
  choreIconPresets.map((preset) => [preset.id, preset]),
);

function detectLeadingQuickLogIcon(value: string) {
  const token = value.trim().split(/\s+/)[0] ?? '';
  if (quickLogIconOptions.includes(token as (typeof quickLogIconOptions)[number])) {
    return token;
  }
  if (legacyQuickLogMojibakePrefix.test(token)) {
    return quickLogIcons.check;
  }
  return null;
}

function stripLeadingQuickLogIcon(value: string) {
  const trimmed = value.trim();
  const token = detectLeadingQuickLogIcon(trimmed);
  if (!token) {
    return trimmed;
  }

  return trimmed.slice(token.length).trimStart();
}

function applyQuickLogIconToTitle(value: string, icon: string) {
  const stripped = stripLeadingQuickLogIcon(value);
  if (!stripped) {
    return '';
  }
  return `${icon} ${stripped}`;
}

function detectLeadingChoreIconToken(value: string) {
  const match = value.trim().match(/^\[\[icon:([a-z0-9_]+)\]\]/i);
  const iconId = (match?.[1] ?? '').toLowerCase() as ChoreIconId;
  return choreIconById.has(iconId) ? iconId : null;
}

function stripLeadingChoreIconToken(value: string) {
  return value.trim().replace(/^\[\[icon:[a-z0-9_]+\]\]\s*/i, '');
}

function applyChoreIconToken(value: string, iconId: ChoreIconId | '') {
  const stripped = stripLeadingChoreIconToken(value);
  if (!stripped) {
    return '';
  }
  if (!iconId) {
    return stripped;
  }
  return `[[icon:${iconId}]] ${stripped}`;
}

function resolveChoreIconIdFromText(
  title: string,
  context = '',
  subtypeLabel = '',
): ChoreIconId | null {
  const explicit = detectLeadingChoreIconToken(title);
  if (explicit) {
    return explicit;
  }
  const searchable =
    `${stripLeadingChoreIconToken(stripLeadingQuickLogIcon(title))} ${context} ${subtypeLabel}`.toLowerCase();
  if (/(trash|garbage|bin|waste)/.test(searchable)) return 'take_out_trash';
  if (/(recycl)/.test(searchable)) return 'recycle_sorting';
  if (/(pet|cat|dog|litter)/.test(searchable)) return 'feed_pets';
  if (/(dish|kitchen|plate|sink)/.test(searchable)) return 'wash_dishes_sink';
  if (/(bed|sheet|blanket)/.test(searchable)) return 'make_bed';
  if (/(laundry|clothes|linen|towel|wash)/.test(searchable)) return 'do_laundry';
  if (/(vacuum)/.test(searchable)) return 'vacuum_floor';
  if (/(plant|garden|water)/.test(searchable)) return 'water_plants';
  if (/(bathroom|toilet)/.test(searchable)) return 'clean_toilet';
  if (/(grocery|shop|market)/.test(searchable)) return 'grocery_shopping';
  return null;
}

function resolveChoreIconAssetFromText(title: string, context = '', subtypeLabel = '') {
  const iconId = resolveChoreIconIdFromText(title, context, subtypeLabel);
  return iconId ? (choreIconById.get(iconId)?.assetPath ?? null) : null;
}

function resolveChoreIconFromText(title: string, context = '', subtypeLabel = '') {
  const explicitIcon = detectLeadingQuickLogIcon(title);
  if (explicitIcon) {
    return explicitIcon;
  }

  const searchable = [title, context, subtypeLabel].filter(Boolean).join(' ').toLowerCase();

  if (/(dish|kitchen|plate|cook|meal|fridge|oven)/.test(searchable)) return quickLogIcons.plate;
  if (/(laundry|wash|clothes|linen|fold)/.test(searchable)) return quickLogIcons.basket;
  if (/(trash|garbage|recycl|waste|bin)/.test(searchable)) return quickLogIcons.trash;
  if (/(clean|vacuum|mop|dust|bathroom|toilet)/.test(searchable)) return quickLogIcons.broom;
  if (/(toy|kid|child|play|nursery)/.test(searchable)) return quickLogIcons.teddy;
  if (/(shop|grocery|buy|market)/.test(searchable)) return quickLogIcons.cart;
  return quickLogIcons.check;
}

function resolveChoreIcon(instance: ChoreInstance) {
  const explicitIcon =
    detectLeadingQuickLogIcon(instance.title) ?? detectLeadingQuickLogIcon(instance.typeTitle);
  if (explicitIcon) {
    return explicitIcon;
  }
  return resolveChoreIconFromText(
    instance.typeTitle || instance.title,
    instance.groupTitle,
    instance.subtypeLabel ?? '',
  );
}

function resolveChoreIconAsset(instance: ChoreInstance) {
  return resolveChoreIconAssetFromText(
    instance.typeTitle || instance.title,
    instance.groupTitle,
    instance.subtypeLabel ?? '',
  );
}

const currentWebReleaseInfo: ReleaseInfo = {
  releaseVersion: import.meta.env.VITE_TASKBANDIT_RELEASE_VERSION ?? '0.0.0-dev',
  buildNumber: import.meta.env.VITE_TASKBANDIT_BUILD_NUMBER ?? 'local',
  commitSha: import.meta.env.VITE_TASKBANDIT_COMMIT_SHA ?? 'local',
  imageTag: import.meta.env.VITE_TASKBANDIT_WEB_IMAGE_TAG ?? null,
};
const releaseInfoRefreshIntervalMs = 60 * 60 * 1000;

// ── Holiday Blocks admin section ───────────────────────────────────────────────

function HolidayBlocksSection({
  blocks,
  onRefresh,
  token,
  language,
  t,
}: {
  blocks: HolidayBlock[];
  onRefresh: () => Promise<void>;
  token: string;
  language: AppLanguage;
  t: (key: string) => string;
}) {
  const [isCreating, setIsCreating] = React.useState(false);
  const [name, setName] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [existingMode, setExistingMode] = React.useState<'DEFER' | 'LEAVE'>('DEFER');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function handleCreate() {
    if (!name.trim() || !startDate || !endDate) return;
    setBusy(true);
    setError(null);
    try {
      await taskBanditApi.createHolidayBlock(token, language, {
        name: name.trim(),
        startDate,
        endDate,
        existingMode,
      });
      setIsCreating(false);
      setName('');
      setStartDate('');
      setEndDate('');
      setExistingMode('DEFER');
      await onRefresh();
    } catch (err) {
      setError(err instanceof TaskBanditApiError ? err.message : t('holiday.error.overlap'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    setError(null);
    try {
      await taskBanditApi.deleteHolidayBlock(token, language, id);
      await onRefresh();
    } catch (err) {
      setError(err instanceof TaskBanditApiError ? err.message : 'Could not delete block.');
    } finally {
      setBusy(false);
    }
  }

  async function handleEndEarly(id: string) {
    setBusy(true);
    setError(null);
    try {
      await taskBanditApi.endHolidayBlockEarly(token, language, id);
      await onRefresh();
    } catch (err) {
      setError(err instanceof TaskBanditApiError ? err.message : 'Could not end block early.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="settings-section settings-section-holiday-blocks">
      <div className="section-heading section-heading-compact">
        <h3>{t('holiday.section_title')}</h3>
      </div>
      <div className="settings-list">
        <p className="inline-message">{t('holiday.section_hint')}</p>
        {error ? <p className="inline-message inline-message-error">{error}</p> : null}
        {blocks.map((block) => (
          <div key={block.id} className="task-row compact">
            <span>
              <strong>{block.name}</strong>{' '}
              <span className={`status-badge status-badge-${block.status}`}>
                {t(`holiday.status.${block.status}`)}
              </span>
              <br />
              <small>
                {block.startDate} – {block.endDate}
              </small>
            </span>
            <span className="row-actions">
              {block.status === 'active' ? (
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleEndEarly(block.id)}
                  disabled={busy}
                >
                  {t('holiday.action.end_early')}
                </button>
              ) : block.status === 'upcoming' ? (
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(block.id)}
                  disabled={busy}
                >
                  {t('holiday.action.delete')}
                </button>
              ) : null}
            </span>
          </div>
        ))}
        {!isCreating ? (
          <button className="btn btn-secondary" onClick={() => setIsCreating(true)} disabled={busy}>
            {t('holiday.create_block')}
          </button>
        ) : (
          <div className="stack-list">
            <label>
              <span>{t('holiday.field.name')}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('holiday.field.name_placeholder')}
                maxLength={200}
              />
            </label>
            <label>
              <span>{t('holiday.field.start_date')}</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label>
              <span>{t('holiday.field.end_date')}</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
            <fieldset>
              <legend>{t('holiday.field.existing_mode')}</legend>
              <label className="toggle-row">
                <input
                  type="radio"
                  name="existingMode"
                  value="DEFER"
                  checked={existingMode === 'DEFER'}
                  onChange={() => setExistingMode('DEFER')}
                />
                <span>{t('holiday.mode.defer')}</span>
              </label>
              <label className="toggle-row">
                <input
                  type="radio"
                  name="existingMode"
                  value="LEAVE"
                  checked={existingMode === 'LEAVE'}
                  onChange={() => setExistingMode('LEAVE')}
                />
                <span>{t('holiday.mode.leave')}</span>
              </label>
            </fieldset>
            <div className="row-actions">
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={busy || !name.trim() || !startDate || !endDate}
              >
                {t('holiday.action.create')}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setIsCreating(false);
                  setError(null);
                }}
              >
                {t('holiday.action.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function BetaEndBanner({
  betaStatus,
  migrationUrl,
}: {
  betaStatus:
    | { isBeta: boolean; endDate: string | null; tenantBetaEndsAt: string | null }
    | null
    | undefined;
  migrationUrl: string | null;
}) {
  const endDate = betaStatus?.isBeta ? (betaStatus.tenantBetaEndsAt ?? betaStatus.endDate) : null;
  const daysLeft = useMemo(() => {
    if (!endDate) return null;
    // eslint-disable-next-line react-hooks/purity -- Date.now() is a valid single-render read for days-until-date
    return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400_000);
  }, [endDate]);
  if (!betaStatus?.isBeta || !endDate || daysLeft === null) return null;
  const isUrgent = daysLeft <= 7;
  const migrationHref = migrationUrl ? `${migrationUrl.replace(/\/+$/, '')}/beta-migration` : null;
  return (
    <div
      className={`beta-end-banner ${isUrgent ? 'beta-end-banner--urgent' : 'beta-end-banner--warning'}`}
      role="alert"
    >
      <span className="beta-end-banner__message">
        {isUrgent
          ? `⚠️ The TaskBandit beta ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — action required.`
          : `The TaskBandit beta ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`}
      </span>
      {migrationHref ? (
        <a
          className="beta-end-banner__cta"
          href={migrationHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          Choose what happens to your household →
        </a>
      ) : null}
    </div>
  );
}

export function App({ workspaceVariant }: { workspaceVariant: WorkspaceVariant }) {
  const { language, setLanguage, t } = useI18n();
  const brandIconAssetPath = '/brand/logo-dark.png';
  const mascotLoginAssetPath = '/brand/mascot-login.png';
  const mascotCelebrationAssetPath = '/brand/mascot-success.png';
  const {
    token,
    bootstrapStatus,
    bootstrapStarterTemplates,
    logout: authLogout,
    setBootstrapStatus: authSetBootstrapStatus,
    setProviders: authSetProviders,
    initToken: authInitToken,
    login: authLogin,
  } = useAuthStore();
  // Hydrate token from storage once on mount
  useState(() => authInitToken(workspaceVariant));
  const {
    activePage,
    setActivePage,
    isMobileProfileOpen,
    setIsMobileProfileOpen,
    isMobileMoreSheetOpen,
    setIsMobileMoreSheetOpen,
    isClientMobileViewport,
    setIsClientMobileViewport,
    mobileProfileAvatar,
    setMobileProfileAvatar,
    pageError,
    setPageError,
    notice,
    setNotice,
    busyAction,
    setBusyAction,
    completionCelebration,
    setCompletionCelebration,
    lastCompletionCelebrationPhraseKey,
    setLastCompletionCelebrationPhraseKey,
    serverReleaseInfo,
    setServerReleaseInfo,
    dismissedUpdateKey,
    setDismissedUpdateKey,
    installPromptEvent,
    setInstallPromptEvent,
    setInstallPromptDismissed,
    clientWebPushStatus,
    setClientWebPushStatus,
    bootstrapForm,
    setBootstrapForm,
    bootstrapSetupStep,
    setBootstrapSetupStep,
    selectedBootstrapStarterGroup,
    setSelectedBootstrapStarterGroup,
    onboardingStep,
    setOnboardingStep,
    onboardingDismissed,
    setOnboardingDismissed,
    onboardingManuallyOpened,
    setOnboardingManuallyOpened,
    onboardingTourCompleted,
    setOnboardingTourCompleted,
  } = useUiStore();
  const [setupWizardStep, setSetupWizardStep] = useState(0);
  const [setupWizardAnswers, setSetupWizardAnswers] = useState<Partial<OnboardingAnswers>>(() => {
    // Pre-fill from server draft if present (survives page reloads / app restarts)
    const draft = payload?.household?.settings?.onboardingAnswers;
    if (draft && typeof draft === 'object') {
      return { appliances: [], pets: [], ...(draft as Partial<OnboardingAnswers>) };
    }
    return { appliances: [], pets: [] };
  });
  const {
    payload,
    runtimeLogs,
    isLoading,
    setPayload,
    updatePayload,
    setRuntimeLogs,
    setIsLoading,
    clearDashboard,
  } = useDashboardStore();
  const {
    settingsDraft,
    setSettingsDraft,
    smtpVerifiedFingerprint,
    setSmtpVerifiedFingerprint,
    notificationPreferencesDraft,
    setNotificationPreferencesDraft,
    memberForm,
    setMemberForm,
    memberEditForm,
    setMemberEditForm,
    editingMemberId,
    setEditingMemberId,
    expandedDeviceDetailsById,
    setExpandedDeviceDetailsById,
  } = useSettingsStore();
  const {
    submitSelections,
    setSubmitSelections,
    selectedProofFiles,
    setSelectedProofFiles,
    submitNotes,
    setSubmitNotes,
    reviewNotes,
    setReviewNotes,
    instanceForm,
    setInstanceForm,
    editingInstanceId,
    setEditingInstanceId,
    householdViewMode,
    setHouseholdViewMode,
    householdStateFilter,
    setHouseholdStateFilter,
    householdAssigneeFilter,
    setHouseholdAssigneeFilter,
    historyPage,
    setHistoryPage,
    exportAssigneeFilter,
    setExportAssigneeFilter,
    exportStatusFilter,
    setExportStatusFilter,
    exportDateFrom,
    setExportDateFrom,
    exportDateTo,
    setExportDateTo,
    isClientComposerOpen,
    setIsClientComposerOpen,
    mobileDueEditorInstanceId,
    setMobileDueEditorInstanceId,
    mobileDueEditorValue,
    setMobileDueEditorValue,
    mobileDueEditorTitle,
    setMobileDueEditorTitle,
    mobileDueEditorIconId,
    setMobileDueEditorIconId,
    mobileDueEditorVariantId,
    setMobileDueEditorVariantId,
    mobileCardMenuInstanceId,
    setMobileCardMenuInstanceId,
    mobileChoreDialogInstanceId,
    setMobileChoreDialogInstanceId,
    isQuickLogComposerOpen,
    setIsQuickLogComposerOpen,
    quickLogQuery,
    setQuickLogQuery,
    quickLogNote,
    setQuickLogNote,
    quickLogSelectedInstanceId,
    setQuickLogSelectedInstanceId,
    quickLogSelectedTemplateId,
    setQuickLogSelectedTemplateId,
    quickLogCreateTemplateFromEntry,
    setQuickLogCreateTemplateFromEntry,
    quickLogUsePointsOverride,
    setQuickLogUsePointsOverride,
    quickLogPointsOverride,
    setQuickLogPointsOverride,
    quickLogIcon,
    setQuickLogIcon,
    takeoverRequestInstanceId,
    setTakeoverRequestInstanceId,
    takeoverRequestMemberId,
    setTakeoverRequestMemberId,
    takeoverRequestNote,
    setTakeoverRequestNote,
    showMobileCompletedChores,
    setShowMobileCompletedChores,
    showDesktopChoreHistory,
    setShowDesktopChoreHistory,
    clearSubmitState,
    closeMobileDueEditor: choreCloseMobileDueEditor,
    closeQuickLog,
  } = useChoreStore();
  const {
    templateForm,
    setTemplateForm,
    editingTemplateId,
    setEditingTemplateId,
    templateSearch,
    setTemplateSearch,
    templateEditorLocale,
    setTemplateEditorLocale,
    selectedTemplateGroup,
    setSelectedTemplateGroup,
    selectedTemplateBrowserGroup,
    setSelectedTemplateBrowserGroup,
  } = useTemplateStore();
  const {
    rewardsTab,
    setRewardsTab,
    rewardsManagerTab,
    setRewardsManagerTab,
    selectedRewardId,
    setSelectedRewardId,
    isCreatingNewReward,
    setIsCreatingNewReward,
    rewardForm,
    setRewardForm,
    redeemDialogRewardId,
    setRedeemDialogRewardId,
    redeemTargetDate,
    setRedeemTargetDate,
    rejectDialogRedemptionId,
    setRejectDialogRedemptionId,
    rejectDialogNote,
    setRejectDialogNote,
    showAllPointsLedger,
    setShowAllPointsLedger,
    rescheduleRedemptionId,
    setRescheduleRedemptionId,
    rescheduleTargetDate,
    setRescheduleTargetDate,
  } = useRewardStore();
  const mobileDueEditorInstance =
    payload?.instances.find((instance) => instance.id === mobileDueEditorInstanceId) ?? null;
  const mobileChoreDialogInstance =
    payload?.instances.find((instance) => instance.id === mobileChoreDialogInstanceId) ?? null;
  const mobileChoreDialogIsMine = Boolean(
    payload?.currentUser.id &&
    mobileChoreDialogInstance?.assigneeId &&
    payload.currentUser.id === mobileChoreDialogInstance.assigneeId,
  );
  const mobileDueEditorTemplateVariants = useMemo(() => {
    if (!payload || !mobileDueEditorInstance) {
      return [];
    }

    const editorTemplate = payload.templates.find(
      (template) => template.id === mobileDueEditorInstance.templateId,
    );
    return editorTemplate?.variants ?? [];
  }, [mobileDueEditorInstance, payload]);
  const quickLogMatches = useMemo(() => {
    if (!payload || !quickLogQuery.trim()) {
      return [];
    }

    const query = quickLogQuery.trim().toLowerCase();
    const activeStates = new Set([
      'open',
      'assigned',
      'in_progress',
      'needs_fixes',
      'overdue',
      'deferred',
    ]);
    const instanceMatches = payload.instances
      .filter((instance) => activeStates.has(instance.state))
      .filter((instance) =>
        [instance.title, instance.typeTitle, instance.groupTitle, instance.subtypeLabel]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 6)
      .map((instance) => ({
        kind: 'instance' as const,
        id: instance.id,
        label: instance.typeTitle || instance.title,
        detail: `${instance.groupTitle} - ${formatDate(instance.dueAt)}`,
      }));

    const templateMatches = payload.templates
      .filter((template) =>
        [template.title, template.groupTitle, template.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 6)
      .map((template) => ({
        kind: 'template' as const,
        id: template.id,
        label: template.title,
        detail: template.groupTitle,
      }));

    return [...instanceMatches, ...templateMatches].slice(0, 8);
  }, [formatDate, payload, quickLogQuery]);
  const onboardingTourMode = getOnboardingTourMode(workspaceVariant, isClientMobileViewport);
  const householdSettingsRef = useRef<HTMLElement | null>(null);
  const membersRef = useRef<HTMLElement | null>(null);
  const memberCreateRef = useRef<HTMLElement | null>(null);
  const templatesRef = useRef<HTMLElement | null>(null);
  const scheduleRef = useRef<HTMLElement | null>(null);
  const approvalQueueRef = useRef<HTMLElement | null>(null);
  const takeoverRequestsRef = useRef<HTMLElement | null>(null);
  const mobileSummaryRef = useRef<HTMLElement | null>(null);
  const mobileChoresRailRef = useRef<HTMLElement | null>(null);
  const mobileBottomNavRef = useRef<HTMLElement | null>(null);
  const myChoresRef = useRef<HTMLElement | null>(null);
  const leaderboardRef = useRef<HTMLElement | null>(null);
  const householdChoresRef = useRef<HTMLElement | null>(null);
  const choreHistoryRef = useRef<HTMLElement | null>(null);
  const notificationsRef = useRef<HTMLElement | null>(null);
  const notificationPreferencesRef = useRef<HTMLElement | null>(null);
  const notificationDevicesRef = useRef<HTMLElement | null>(null);
  const notificationHealthRef = useRef<HTMLElement | null>(null);
  const backupReadinessRef = useRef<HTMLElement | null>(null);
  const systemStatusRef = useRef<HTMLElement | null>(null);
  const auditLogRef = useRef<HTMLElement | null>(null);
  const runtimeLogsRef = useRef<HTMLElement | null>(null);
  const notificationRecoveryRef = useRef<HTMLElement | null>(null);
  const generalSettingsRef = useRef<HTMLElement | null>(null);
  const oidcSettingsRef = useRef<HTMLElement | null>(null);
  const smtpSettingsRef = useRef<HTMLElement | null>(null);
  const mobileAvatarUploadInputRef = useRef<HTMLInputElement | null>(null);
  const smtpDraftSettings = settingsDraft ? getSmtpTestSettings(settingsDraft) : null;
  const smtpDraftFingerprint = smtpDraftSettings
    ? getSmtpSettingsFingerprint(smtpDraftSettings)
    : null;
  const smtpTestRequiredToEnable = Boolean(
    payload &&
    settingsDraft &&
    !payload.hostedSubscription.hostedMode &&
    !payload.household.settings.smtpEnabled &&
    settingsDraft.smtpEnabled &&
    smtpDraftFingerprint !== smtpVerifiedFingerprint,
  );

  const languageOptions: Array<{ code: AppLanguage; label: string }> = [
    { code: 'en', label: t('language.english') },
    { code: 'de', label: t('language.german') },
    { code: 'hu', label: t('language.hungarian') },
  ];

  useEffect(() => {
    if (!token) {
      clearDashboard();
      setSettingsDraft(null);
      setNotificationPreferencesDraft(null);
      setSelectedTemplateGroup('');
      return;
    }

    void refreshDashboard(token, { silent: false });
  }, [token, language]);

  useEffect(() => {
    if (
      token ||
      bootstrapStatus?.isBootstrapped !== false ||
      bootstrapStarterTemplates.length === 0
    ) {
      return;
    }

    setBootstrapForm((current) => {
      if ((current.starterTemplateKeys?.length ?? 0) > 0) {
        return current;
      }

      return {
        ...current,
        starterTemplateKeys: bootstrapStarterTemplates
          .filter((template) => template.recommended)
          .map((template) => template.key),
      };
    });
  }, [token, bootstrapStatus?.isBootstrapped, bootstrapStarterTemplates]);

  useEffect(() => {
    if (token || bootstrapStatus?.isBootstrapped !== false) {
      setBootstrapSetupStep('account');
    }
  }, [token, bootstrapStatus?.isBootstrapped]);

  useEffect(() => {
    if (!token || workspaceVariant !== 'client') {
      setClientWebPushStatus(getInitialClientWebPushStatus());
      return;
    }

    let cancelled = false;
    void syncClientWebPushRegistration({
      token,
      language,
      appVersion: `${currentWebReleaseInfo.releaseVersion}+${currentWebReleaseInfo.buildNumber}`,
    })
      .then((status) => {
        if (!cancelled) {
          setClientWebPushStatus(status);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setClientWebPushStatus(getInitialClientWebPushStatus());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [language, token, workspaceVariant]);

  useEffect(() => {
    if (!token || workspaceVariant !== 'client') {
      return;
    }

    let cancelled = false;
    let eventSource: EventSource | null = null;

    const connect = async () => {
      try {
        const syncToken = await taskBanditApi.getDashboardSyncToken(token, language);
        if (cancelled) {
          return;
        }

        const streamUrl = new URL(`${resolveApiBaseUrl()}/api/dashboard/sync/client-stream`);
        streamUrl.searchParams.set('token', syncToken.token);
        eventSource = new EventSource(streamUrl.toString());
        eventSource.addEventListener('chore-sync', () => {
          void refreshDashboard(token, { silent: true });
        });
        eventSource.addEventListener('heartbeat', () => {
          // keepalive only
        });
        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;
          if (!cancelled) {
            window.setTimeout(() => {
              if (!cancelled) {
                void connect();
              }
            }, 3000);
          }
        };
      } catch {
        if (!cancelled) {
          window.setTimeout(() => {
            if (!cancelled) {
              void connect();
            }
          }, 3000);
        }
      }
    };

    void connect();

    return () => {
      cancelled = true;
      eventSource?.close();
    };
  }, [language, token, workspaceVariant]);

  useEffect(() => {
    if (workspaceVariant !== 'client' || !('serviceWorker' in navigator)) {
      return;
    }

    const onServiceWorkerMessage = (
      event: MessageEvent<{ type?: string; payload?: { path?: string } }>,
    ) => {
      if (event.data?.type === 'taskbandit-push') {
        setNotice(t('pwa.foreground_notification_received'));
        if (token) {
          void refreshDashboard(token, { silent: true });
        }
      }

      if (event.data?.type === 'taskbandit-notification-click' && event.data.payload?.path) {
        const currentUrl = new URL(window.location.href);
        currentUrl.pathname = getPathnameForWorkspacePage('overview');
        window.history.replaceState({}, document.title, currentUrl.toString());
        setActivePage('overview');
        if (token) {
          void refreshDashboard(token, { silent: true });
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', onServiceWorkerMessage);
    };
  }, [t, token, workspaceVariant]);

  useEffect(() => {
    if (payload) {
      setSettingsDraft({
        ...payload.household.settings,
        enablePushNotifications: payload.hostedSubscription.hostedMode
          ? true
          : payload.household.settings.enablePushNotifications,
      });
      setNotificationPreferencesDraft(payload.notificationPreferences);
      if (
        workspaceVariant === 'admin' &&
        payload.household.settings.onboardingCompleted &&
        !onboardingTourCompleted
      ) {
        writeStoredOnboardingTourCompletion('admin', true);
        setOnboardingTourCompleted(true);
      }
    }
  }, [onboardingTourCompleted, payload, workspaceVariant]);

  useEffect(() => {
    if (!payload || payload.templates.length === 0) {
      return;
    }

    const firstGroupTitle = payload.templates[0].groupTitle;
    setSelectedTemplateGroup(selectedTemplateGroup || firstGroupTitle);

    setInstanceForm((current) =>
      current.templateId
        ? current
        : {
            ...current,
            templateId: payload.templates[0].id,
            templateGroupTitle: firstGroupTitle,
          },
    );
  }, [payload]);

  useEffect(() => {
    if (!payload) {
      return;
    }

    const activeGroupTitle =
      selectedTemplateGroup ||
      payload.templates.find((template) => template.id === instanceForm.templateId)?.groupTitle ||
      payload.templates[0]?.groupTitle ||
      '';
    const matchingTemplates = payload.templates.filter(
      (template) => !activeGroupTitle || template.groupTitle === activeGroupTitle,
    );
    if (matchingTemplates.length === 0) {
      return;
    }

    const templateStillVisible = matchingTemplates.some(
      (template) => template.id === instanceForm.templateId,
    );
    if (templateStillVisible) {
      return;
    }

    setInstanceForm((current) => ({
      ...current,
      templateId: matchingTemplates[0].id,
      templateGroupTitle: activeGroupTitle,
      variantId: undefined,
    }));
  }, [instanceForm.templateId, payload, selectedTemplateGroup]);

  useEffect(() => {
    if (!token || payload?.currentUser.role !== 'admin') {
      return;
    }

    if (activePage !== 'admin') {
      return;
    }

    void refreshRuntimeLogs(token, { reportErrors: false });

    const intervalId = window.setInterval(() => {
      void refreshRuntimeLogs(token, { reportErrors: false });
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [activePage, language, payload?.currentUser.role, token]);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);

    if (!payload) {
      const routeValue = getWorkspaceRouteFromPathname(currentUrl.pathname);
      if (routeValue) {
        currentUrl.pathname = '/';
        window.history.replaceState({}, document.title, currentUrl.toString());
      }
      return;
    }

    window.localStorage.setItem(getWorkspacePageStorageKey(workspaceVariant), activePage);
    const targetPathname = getPathnameForWorkspacePage(activePage);
    if (currentUrl.pathname !== targetPathname) {
      currentUrl.pathname = targetPathname;
      window.history.replaceState({}, document.title, currentUrl.toString());
    }
  }, [activePage, payload, workspaceVariant]);

  useEffect(() => {
    const onLocationChange = () => {
      if (!payload) {
        return;
      }

      const routeFromPath = getWorkspaceRouteFromPathname(window.location.pathname);
      if (routeFromPath) {
        setActivePage(workspacePageByRoute[routeFromPath]);
      }
    };

    window.addEventListener('popstate', onLocationChange);
    return () => window.removeEventListener('popstate', onLocationChange);
  }, [payload]);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.searchParams.has('loginEmail')) {
      return;
    }

    currentUrl.searchParams.delete('loginEmail');
    currentUrl.searchParams.delete('source');
    window.history.replaceState({}, document.title, currentUrl.toString());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refreshReleaseInfo = () =>
      taskBanditApi
        .getReleaseInfo(language)
        .then((releaseInfo) => {
          if (!cancelled) {
            setServerReleaseInfo(releaseInfo);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setServerReleaseInfo(null);
          }
        });

    void refreshReleaseInfo();
    const intervalId = window.setInterval(() => {
      void refreshReleaseInfo();
    }, releaseInfoRefreshIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [language]);

  const memberLookup = useMemo(() => {
    const members = payload?.household.members ?? [];
    return new Map(members.map((member) => [member.id, member]));
  }, [payload]);

  const starterTemplatesByGroup = useMemo(() => {
    const grouped = new Map<string, BootstrapStarterTemplateOption[]>();
    for (const template of bootstrapStarterTemplates) {
      const currentTemplates = grouped.get(template.groupTitle) ?? [];
      currentTemplates.push(template);
      grouped.set(template.groupTitle, currentTemplates);
    }

    return sortByLabel(
      [...grouped.entries()].map(([groupTitle, templates]) => ({
        groupTitle,
        templates: sortByLabel(templates, (template) => template.title),
      })),
      (entry) => entry.groupTitle,
    );
  }, [bootstrapStarterTemplates]);

  useEffect(() => {
    if (starterTemplatesByGroup.length === 0) {
      setSelectedBootstrapStarterGroup('');
      return;
    }

    setSelectedBootstrapStarterGroup(
      starterTemplatesByGroup.some((group) => group.groupTitle === selectedBootstrapStarterGroup)
        ? selectedBootstrapStarterGroup
        : starterTemplatesByGroup[0].groupTitle,
    );
  }, [starterTemplatesByGroup]);

  const activeBootstrapStarterGroup =
    starterTemplatesByGroup.find((group) => group.groupTitle === selectedBootstrapStarterGroup) ??
    starterTemplatesByGroup[0] ??
    null;
  const selectedStarterTemplateCount = bootstrapForm.starterTemplateKeys?.length ?? 0;
  const selectedStarterGroupCount = starterTemplatesByGroup.filter((group) =>
    group.templates.some((template) =>
      (bootstrapForm.starterTemplateKeys ?? []).includes(template.key),
    ),
  ).length;
  const bootstrapAccountComplete = Boolean(
    bootstrapForm.householdName.trim() &&
    bootstrapForm.ownerDisplayName.trim() &&
    bootstrapForm.ownerEmail.trim() &&
    bootstrapForm.ownerPassword.trim(),
  );
  const bootstrapStepItems: Array<{
    key: typeof bootstrapSetupStep;
    label: string;
    helper: string;
  }> = [
    {
      key: 'account',
      label: t('bootstrap.step_account'),
      helper: t('bootstrap.step_account_helper'),
    },
    {
      key: 'templates',
      label: t('bootstrap.step_templates'),
      helper: t('bootstrap.step_templates_helper'),
    },
    {
      key: 'review',
      label: t('bootstrap.step_review'),
      helper: t('bootstrap.step_review_helper'),
    },
  ];
  const activeBootstrapStepIndex = bootstrapStepItems.findIndex(
    (step) => step.key === bootstrapSetupStep,
  );

  const templateGroups = useMemo(() => {
    const grouped = new Map<string, ChoreTemplate[]>();
    for (const template of payload?.templates ?? []) {
      const currentTemplates = grouped.get(template.groupTitle) ?? [];
      currentTemplates.push(template);
      grouped.set(template.groupTitle, currentTemplates);
    }

    return sortByLabel(
      [...grouped.entries()].map(([groupTitle, templates]) => ({
        groupTitle,
        templates: sortByLabel(templates, (template) => template.title),
      })),
      (entry) => entry.groupTitle,
    );
  }, [payload?.templates]);

  const templateGroupOptions = useMemo(
    () => templateGroups.map((entry) => entry.groupTitle),
    [templateGroups],
  );

  const normalizedTemplateSearch = templateSearch.trim().toLocaleLowerCase();
  const filteredTemplateGroups = useMemo(() => {
    if (!normalizedTemplateSearch) {
      return templateGroups;
    }

    return templateGroups
      .map((entry) => ({
        ...entry,
        templates: entry.templates.filter((template) =>
          [entry.groupTitle, template.title, template.description]
            .join(' ')
            .toLocaleLowerCase()
            .includes(normalizedTemplateSearch),
        ),
      }))
      .filter((entry) => entry.templates.length > 0);
  }, [normalizedTemplateSearch, templateGroups]);

  const templateBrowserGroupOptions = useMemo(
    () => filteredTemplateGroups.map((entry) => entry.groupTitle),
    [filteredTemplateGroups],
  );

  useEffect(() => {
    if (templateBrowserGroupOptions.length === 0) {
      if (selectedTemplateBrowserGroup) {
        setSelectedTemplateBrowserGroup('');
      }
      return;
    }

    if (!templateBrowserGroupOptions.includes(selectedTemplateBrowserGroup)) {
      setSelectedTemplateBrowserGroup(templateBrowserGroupOptions[0]);
    }
  }, [selectedTemplateBrowserGroup, templateBrowserGroupOptions]);

  const visibleTemplateBrowserGroup =
    selectedTemplateBrowserGroup || templateBrowserGroupOptions[0] || '';

  const visibleTemplateBrowserTemplates = useMemo(
    () =>
      filteredTemplateGroups.find((entry) => entry.groupTitle === visibleTemplateBrowserGroup)
        ?.templates ?? [],
    [filteredTemplateGroups, visibleTemplateBrowserGroup],
  );

  const visibleScheduleTemplateGroup =
    selectedTemplateGroup ||
    payload?.templates.find((template) => template.id === instanceForm.templateId)?.groupTitle ||
    templateGroupOptions[0] ||
    '';

  const visibleScheduleTemplates = useMemo(() => {
    if (!payload) {
      return [];
    }

    if (!visibleScheduleTemplateGroup) {
      return payload.templates;
    }

    return payload.templates.filter(
      (template) => template.groupTitle === visibleScheduleTemplateGroup,
    );
  }, [payload, visibleScheduleTemplateGroup]);

  const selectedTemplateDependencyRules = useMemo(
    () =>
      normalizeTemplateDependencyRules(
        templateForm.dependencyRules,
        templateForm.dependencyTemplateIds,
      ).sort((left, right) => {
        const leftTemplate = payload?.templates.find((template) => template.id === left.templateId);
        const rightTemplate = payload?.templates.find(
          (template) => template.id === right.templateId,
        );
        return (leftTemplate?.title ?? '').localeCompare(rightTemplate?.title ?? '', language);
      }),
    [
      language,
      payload?.templates,
      templateForm.dependencyRules,
      templateForm.dependencyTemplateIds,
    ],
  );

  const templateEditorBaseLocale = templateForm.defaultLocale ?? 'en';
  const isEditingTemplateBaseLocale = templateEditorLocale === templateEditorBaseLocale;
  const activeTemplateTranslation = isEditingTemplateBaseLocale
    ? null
    : getTemplateTranslation(templateEditorLocale);
  const trimmedTemplateGroupTitle = templateForm.groupTitle.trim();
  const templateGroupPickerValue = templateGroupOptions.includes(trimmedTemplateGroupTitle)
    ? trimmedTemplateGroupTitle
    : '__new__';

  const sameGroupFollowUpCandidates = useMemo(() => {
    if (!payload) {
      return [];
    }

    const activeGroupTitle = templateForm.groupTitle.trim();
    if (!activeGroupTitle) {
      return [];
    }

    const normalizedGroupTitle = normalizeLabelToken(activeGroupTitle);
    return payload.templates
      .filter(
        (template) =>
          template.id !== editingTemplateId &&
          normalizeLabelToken(template.groupTitle) === normalizedGroupTitle,
      )
      .sort((left, right) => left.title.localeCompare(right.title, language));
  }, [editingTemplateId, language, payload, templateForm.groupTitle]);

  useEffect(() => {
    const allowedDependencyIds = new Set(
      sameGroupFollowUpCandidates.map((template) => template.id),
    );
    setTemplateForm((current) => {
      const currentRules = normalizeTemplateDependencyRules(
        current.dependencyRules,
        current.dependencyTemplateIds,
      );
      const nextRules = currentRules.filter((rule) => allowedDependencyIds.has(rule.templateId));
      if (nextRules.length === currentRules.length) {
        return current;
      }

      return {
        ...current,
        dependencyRules: nextRules,
        dependencyTemplateIds: nextRules.map((rule) => rule.templateId),
      };
    });
  }, [sameGroupFollowUpCandidates]);

  const pendingApprovals = useMemo(
    () => payload?.instances.filter((instance) => instance.state === 'pending_approval') ?? [],
    [payload],
  );

  const unreadNotifications = useMemo(
    () => payload?.notifications.filter((notification) => !notification.isRead) ?? [],
    [payload],
  );

  const featureAccess = {
    ...fullFeatureAccess,
    ...(payload?.currentUser.featureAccess ?? {}),
  };
  const hasFeature = (featureId: PackageFeatureId) => featureAccess[featureId];
  const showTemplateManager = Boolean(
    payload?.currentUser.role !== 'child' && hasFeature('templates_manage'),
  );

  const isParentOrAdmin = payload?.currentUser.role !== 'child';
  const isAdmin = payload?.currentUser.role === 'admin';
  const canUseRewards = hasFeature('rewards_manage');

  const enabledRewards = useMemo(() => {
    const all = payload?.rewards ?? [];
    if (isParentOrAdmin) {
      return all.filter((r) => {
        const elig = r.eligibility ?? 'ALL';
        return r.isEnabled && (elig === 'ALL' || elig === 'ADULT_ONLY');
      });
    }
    return all.filter((r) => {
      const elig = r.eligibility ?? 'ALL';
      return r.isEnabled && (elig === 'ALL' || elig === 'CHILD_ONLY');
    });
  }, [payload?.rewards, isParentOrAdmin]);
  const pendingRedemptions = useMemo(
    () => payload?.redemptions.filter((r) => r.status === 'PENDING') ?? [],
    [payload?.redemptions],
  );
  const myRedemptions = useMemo(
    () => payload?.redemptions.filter((r) => r.requestedBy.id === payload.currentUser.id) ?? [],
    [payload],
  );
  const selectedReward = useMemo(
    () => payload?.rewards.find((r) => r.id === selectedRewardId) ?? null,
    [payload?.rewards, selectedRewardId],
  );

  // Redirect parent off the catalogue tab — they have no access to it
  useEffect(() => {
    if (!isAdmin && rewardsManagerTab === 'catalogue') {
      setRewardsManagerTab('my_shop');
    }
  }, [isAdmin, rewardsManagerTab, setRewardsManagerTab]);
  const redeemDialogReward = useMemo(
    () => payload?.rewards.find((r) => r.id === redeemDialogRewardId) ?? null,
    [payload?.rewards, redeemDialogRewardId],
  );
  const rescheduleRedemption = useMemo(
    () => payload?.redemptions.find((r) => r.id === rescheduleRedemptionId) ?? null,
    [payload?.redemptions, rescheduleRedemptionId],
  );
  const todayIso = new Date().toISOString().slice(0, 10);
  const maxBookingDate = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);

  function formatBookingDate(dateStr: string): string {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    if (dateStr === todayIso) return t('common.today');
    if (dateStr === tomorrow) return t('common.tomorrow');
    const d = new Date(`${dateStr}T00:00:00.000Z`);
    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    });
  }

  const rewardsByCategory = useMemo(() => {
    const categories: RewardCategory[] = [
      'SCREEN_TIME',
      'ALLOWANCE',
      'TREAT',
      'ACTIVITY',
      'PRIVILEGE',
      'CUSTOM',
    ];
    const map: Record<RewardCategory, Reward[]> = {
      SCREEN_TIME: [],
      ALLOWANCE: [],
      TREAT: [],
      ACTIVITY: [],
      PRIVILEGE: [],
      CUSTOM: [],
    };
    for (const r of payload?.rewards ?? []) {
      map[r.category].push(r);
    }
    return { categories, map };
  }, [payload?.rewards]);

  function categoryEmoji(category: RewardCategory): string {
    switch (category) {
      case 'SCREEN_TIME':
        return '📱';
      case 'ALLOWANCE':
        return '💰';
      case 'TREAT':
        return '🍬';
      case 'ACTIVITY':
        return '🎉';
      case 'PRIVILEGE':
        return '⭐';
      case 'CUSTOM':
        return '🎁';
    }
  }

  function categoryLabel(category: RewardCategory): string {
    switch (category) {
      case 'SCREEN_TIME':
        return t('reward.category.screen_time');
      case 'ALLOWANCE':
        return t('reward.category.allowance');
      case 'TREAT':
        return t('reward.category.treat');
      case 'ACTIVITY':
        return t('reward.category.activity');
      case 'PRIVILEGE':
        return t('reward.category.privilege');
      case 'CUSTOM':
        return t('reward.category.custom');
    }
  }

  function openNewRewardForm() {
    setSelectedRewardId(null);
    setIsCreatingNewReward(true);
    setRewardForm({
      title: '',
      description: '',
      category: 'CUSTOM',
      eligibility: 'ALL',
      pointCost: 50,
      maxRedemptionsPerChild: '',
      cooldownDays: '',
      workflowType: 'STANDARD',
    });
  }

  function selectRewardForEdit(reward: Reward) {
    setIsCreatingNewReward(false);
    setSelectedRewardId(reward.id);
    setRewardForm({
      title: reward.title,
      description: reward.description ?? '',
      category: reward.category,
      eligibility: reward.eligibility ?? 'ALL',
      pointCost: reward.pointCost,
      maxRedemptionsPerChild:
        reward.maxRedemptionsPerChild != null ? String(reward.maxRedemptionsPerChild) : '',
      cooldownDays: reward.cooldownDays != null ? String(reward.cooldownDays) : '',
      workflowType: reward.workflowType ?? 'STANDARD',
    });
  }

  async function handleSaveReward(event: FormEvent) {
    event.preventDefault();
    if (!token || !payload) return;
    const body = {
      title: rewardForm.title.trim(),
      description: rewardForm.description.trim() || undefined,
      category: rewardForm.category,
      eligibility: rewardForm.eligibility,
      pointCost: rewardForm.pointCost,
      maxRedemptionsPerChild: rewardForm.maxRedemptionsPerChild
        ? Number(rewardForm.maxRedemptionsPerChild)
        : undefined,
      cooldownDays: rewardForm.cooldownDays ? Number(rewardForm.cooldownDays) : undefined,
      workflowType: rewardForm.workflowType,
    };
    try {
      let updated: Reward;
      if (isCreatingNewReward) {
        updated = await taskBanditApi.createReward(token, language, body);
        updatePayload((c) => ({ ...c, rewards: [...c.rewards, updated] }));
        setIsCreatingNewReward(false);
        setSelectedRewardId(updated.id);
      } else if (selectedRewardId) {
        updated = await taskBanditApi.updateReward(token, language, selectedRewardId, body);
        updatePayload((c) => ({
          ...c,
          rewards: c.rewards.map((r) => (r.id === updated.id ? updated : r)),
        }));
      }
    } catch (err) {
      setPageError(readErrorMessage(err, t('error.generic')));
    }
  }

  async function handleToggleReward(rewardId: string) {
    if (!token) return;
    try {
      const updated = await taskBanditApi.toggleReward(token, language, rewardId);
      updatePayload((c) => ({
        ...c,
        rewards: c.rewards.map((r) => (r.id === updated.id ? updated : r)),
      }));
    } catch (err) {
      setPageError(readErrorMessage(err, t('error.generic')));
    }
  }

  async function handleDeleteReward() {
    if (!token || !selectedRewardId) return;
    try {
      await taskBanditApi.deleteReward(token, language, selectedRewardId);
      updatePayload((c) => ({ ...c, rewards: c.rewards.filter((r) => r.id !== selectedRewardId) }));
      setSelectedRewardId(null);
    } catch (err) {
      setPageError(readErrorMessage(err, t('error.generic')));
    }
  }

  async function handleRedeemReward() {
    if (!token || !redeemDialogRewardId) return;
    const isExclusive = redeemDialogReward?.workflowType === 'DAILY_EXCLUSIVE';
    if (isExclusive && !redeemTargetDate) return;
    try {
      const redemption = await taskBanditApi.redeemReward(
        token,
        language,
        redeemDialogRewardId,
        undefined,
        isExclusive ? redeemTargetDate : undefined,
      );
      updatePayload((c) => ({ ...c, redemptions: [...c.redemptions, redemption] }));
      if (redemption.status === 'APPROVED') {
        updatePayload((c) => ({
          ...c,
          currentUser: {
            ...c.currentUser,
            points: c.currentUser.points - redemption.pointsDeducted,
          },
        }));
      }
      setRedeemDialogRewardId(null);
      setRedeemTargetDate('');
    } catch (err) {
      setPageError(readErrorMessage(err, t('error.generic')));
    }
  }

  async function handleApproveRedemption(redemptionId: string) {
    if (!token) return;
    try {
      const updated = await taskBanditApi.resolveRedemption(token, language, redemptionId, true);
      updatePayload((c) => ({
        ...c,
        redemptions: c.redemptions.map((r) => (r.id === updated.id ? updated : r)),
      }));
    } catch (err) {
      setPageError(readErrorMessage(err, t('error.generic')));
    }
  }

  async function handleRejectRedemption() {
    if (!token || !rejectDialogRedemptionId) return;
    try {
      const updated = await taskBanditApi.resolveRedemption(
        token,
        language,
        rejectDialogRedemptionId,
        false,
        rejectDialogNote.trim() || undefined,
      );
      updatePayload((c) => ({
        ...c,
        redemptions: c.redemptions.map((r) => (r.id === updated.id ? updated : r)),
      }));
      setRejectDialogRedemptionId(null);
      setRejectDialogNote('');
    } catch (err) {
      setPageError(readErrorMessage(err, t('error.generic')));
    }
  }

  async function handleRescheduleRedemption() {
    if (!token || !rescheduleRedemptionId || !rescheduleTargetDate) return;
    try {
      const result = await taskBanditApi.rescheduleRedemption(
        token,
        language,
        rescheduleRedemptionId,
        rescheduleTargetDate,
      );
      updatePayload((c) => {
        const updatedRedemptions = c.redemptions.map((r) => {
          if (r.id === rescheduleRedemptionId) {
            // If same ID returned: PENDING→PENDING (date updated in-place)
            // If different ID returned: APPROVED→CANCELLED (old gets cancelled)
            return result && result.id === rescheduleRedemptionId
              ? result
              : { ...r, status: 'CANCELLED' as const };
          }
          return r;
        });
        // If the returned redemption is a newly created PENDING (different ID), add it
        if (result && result.id !== rescheduleRedemptionId) {
          updatedRedemptions.push(result);
        }
        return { ...c, redemptions: updatedRedemptions };
      });
      setRescheduleRedemptionId(null);
      setRescheduleTargetDate('');
    } catch (err) {
      setPageError(readErrorMessage(err, t('error.generic')));
    }
  }

  const pendingTakeoverRequests = useMemo(
    () =>
      payload?.compatibility.takeoverRequests
        ? payload.takeoverRequests.filter(
            (request) =>
              request.status === 'PENDING' && request.requested.id === payload.currentUser.id,
          )
        : [],
    [payload],
  );

  const pushReadyDeviceCount = useMemo(
    () =>
      payload?.notificationDevices.filter(
        (device) => device.notificationsEnabled && device.pushTokenConfigured,
      ).length ?? 0,
    [payload],
  );

  const householdPushReadyCount = useMemo(
    () =>
      payload?.householdNotificationHealth.filter((entry) => entry.deliveryMode === 'push')
        .length ?? 0,
    [payload],
  );

  const effectiveHouseholdSettings = settingsDraft ?? payload?.household.settings ?? null;

  const adminMembers = useMemo(
    () => payload?.household.members.filter((member) => member.role === 'admin') ?? [],
    [payload],
  );

  const adminLocalRecoveryCount = useMemo(
    () => adminMembers.filter((member) => member.localAuthConfigured).length,
    [adminMembers],
  );

  const adminLocalRecoveryEmailCount = useMemo(
    () => adminMembers.filter((member) => member.localAuthConfigured && member.email).length,
    [adminMembers],
  );

  const smtpRecoveryReady = Boolean(
    effectiveHouseholdSettings &&
    effectiveHouseholdSettings.smtpEnabled &&
    effectiveHouseholdSettings.smtpHost &&
    effectiveHouseholdSettings.smtpPort &&
    effectiveHouseholdSettings.smtpFromEmail &&
    (!effectiveHouseholdSettings.smtpUsername ||
      effectiveHouseholdSettings.smtpPasswordConfigured ||
      effectiveHouseholdSettings.smtpPassword),
  );

  const backupMigrationChecklist = useMemo<ReadinessChecklistItem[]>(() => {
    if (!payload?.backupReadiness) {
      return [];
    }

    const hostPathsReady = Boolean(
      payload.backupReadiness.hostPaths.dataRootHint &&
      payload.backupReadiness.hostPaths.composeFileHint &&
      payload.backupReadiness.hostPaths.envFileHint,
    );
    const exportsReady =
      payload.backupReadiness.exports.householdSnapshotReady &&
      payload.backupReadiness.exports.runtimeLogsReady;
    const recoveryReady =
      adminLocalRecoveryCount > 0 || payload.backupReadiness.recovery.localAuthForcedByConfig;
    const cutoverReady = Boolean(
      payload.systemStatus &&
      payload.systemStatus.application.status === 'ready' &&
      payload.systemStatus.database.status === 'ready' &&
      payload.systemStatus.storage.status === 'ready',
    );

    return [
      {
        key: 'paths',
        status: hostPathsReady ? 'ready' : 'warning',
        title: t('backup.checklist_paths_title'),
        detail: t('backup.checklist_paths_body'),
      },
      {
        key: 'exports',
        status: exportsReady ? 'ready' : 'warning',
        title: t('backup.checklist_exports_title'),
        detail: t('backup.checklist_exports_body'),
      },
      {
        key: 'recovery',
        status: recoveryReady ? 'ready' : 'warning',
        title: t('backup.checklist_recovery_title'),
        detail: t('backup.checklist_recovery_body')
          .replace('{localAdmins}', String(adminLocalRecoveryCount))
          .replace('{resetEmails}', String(adminLocalRecoveryEmailCount)),
      },
      {
        key: 'cutover',
        status: cutoverReady ? 'ready' : 'warning',
        title: t('backup.checklist_cutover_title'),
        detail: t('backup.checklist_cutover_body'),
      },
    ];
  }, [adminLocalRecoveryCount, adminLocalRecoveryEmailCount, payload, t]);

  const pushReadinessChecklist = useMemo<ReadinessChecklistItem[]>(() => {
    if (!payload?.systemStatus) {
      return [];
    }

    const { push } = payload.systemStatus;
    const fcmReady = push.serverFcmEnabled && push.serviceAccountConfigured;
    const providerReady = fcmReady || push.serverWebPushEnabled;

    return [
      {
        key: 'household',
        status: push.householdPushEnabled ? 'ready' : 'warning',
        title: t('system_status.push_check_household_title'),
        detail: t('system_status.push_check_household_body'),
      },
      {
        key: 'provider',
        status: providerReady ? 'ready' : 'warning',
        title: t('system_status.push_check_provider_title'),
        detail: t('system_status.push_check_provider_body')
          .replace('{fcm}', fcmReady ? t('common.enabled') : t('common.disabled'))
          .replace(
            '{webPush}',
            push.serverWebPushEnabled ? t('common.enabled') : t('common.disabled'),
          ),
      },
      {
        key: 'devices',
        status: push.pushReadyDeviceCount > 0 ? 'ready' : 'warning',
        title: t('system_status.push_check_devices_title'),
        detail: t('system_status.push_check_devices_body')
          .replace('{ready}', String(push.pushReadyDeviceCount))
          .replace('{registered}', String(push.registeredDeviceCount)),
      },
      {
        key: 'members',
        status: push.membersWithoutDeliveryPath === 0 ? 'ready' : 'warning',
        title: t('system_status.push_check_members_title'),
        detail: t('system_status.push_check_members_body')
          .replace('{push}', String(push.membersWithPushReadyDevices))
          .replace('{fallback}', String(push.membersUsingEmailFallback))
          .replace('{none}', String(push.membersWithoutDeliveryPath)),
      },
    ];
  }, [payload, t]);

  const restrictHouseholdDetails = Boolean(
    payload &&
    !payload.household.settings.membersCanSeeFullHouseholdChoreDetails &&
    payload.currentUser.role === 'child',
  );

  const activeInstances = useMemo(
    () => payload?.instances.filter((instance) => activeChoreStates.includes(instance.state)) ?? [],
    [payload],
  );

  const myChores = useMemo(() => {
    if (!payload) {
      return [];
    }

    return activeInstances.filter(
      (instance) =>
        instance.assigneeId === payload.currentUser.id &&
        ['open', 'assigned', 'in_progress', 'needs_fixes', 'overdue'].includes(instance.state),
    );
  }, [activeInstances, payload]);

  const myNeedsFixesChores = useMemo(
    () => myChores.filter((instance) => instance.state === 'needs_fixes'),
    [myChores],
  );

  const myInProgressChores = useMemo(
    () => myChores.filter((instance) => instance.state === 'in_progress'),
    [myChores],
  );

  const myDeferredChores = useMemo(
    () =>
      activeInstances.filter(
        (instance) =>
          instance.assigneeId === payload?.currentUser.id && instance.state === 'deferred',
      ),
    [activeInstances, payload],
  );

  const myReadyToStartChores = useMemo(
    () => myChores.filter((instance) => ['open', 'assigned', 'overdue'].includes(instance.state)),
    [myChores],
  );
  const myActionableChoreCount =
    myNeedsFixesChores.length + myInProgressChores.length + myReadyToStartChores.length;
  const clientMobileSortedChores = useMemo(
    () =>
      payload
        ? [...activeInstances].sort((left, right) =>
            compareClientMobileChoreOrder(left, right, payload.currentUser.id),
          )
        : [],
    [activeInstances, payload],
  );
  const clientMobileMyChores = useMemo(
    () =>
      clientMobileSortedChores.filter(
        (instance) => resolveClientMobileChoreSection(instance, payload?.currentUser.id) === 'mine',
      ),
    [clientMobileSortedChores, payload],
  );
  const clientMobileMyChoresDueToday = useMemo(
    () =>
      clientMobileMyChores.filter(
        (instance) => resolveClientMobileDueBucket(instance, language) === 'today',
      ),
    [clientMobileMyChores, language],
  );
  const clientMobileMyChoresDueThisWeek = useMemo(
    () =>
      clientMobileMyChores.filter(
        (instance) => resolveClientMobileDueBucket(instance, language) === 'this_week',
      ),
    [clientMobileMyChores, language],
  );
  const clientMobileMyChoresDueLater = useMemo(
    () =>
      clientMobileMyChores.filter(
        (instance) => resolveClientMobileDueBucket(instance, language) === 'later',
      ),
    [clientMobileMyChores, language],
  );
  const clientMobileDueTodayChores = useMemo(
    () =>
      clientMobileSortedChores.filter(
        (instance) => resolveClientMobileDueBucket(instance, language) === 'today',
      ),
    [clientMobileSortedChores, language],
  );
  const clientMobileDueThisWeekChores = useMemo(
    () =>
      clientMobileSortedChores.filter(
        (instance) => resolveClientMobileDueBucket(instance, language) === 'this_week',
      ),
    [clientMobileSortedChores, language],
  );
  const clientMobileDueLaterChores = useMemo(
    () =>
      clientMobileSortedChores.filter(
        (instance) => resolveClientMobileDueBucket(instance, language) === 'later',
      ),
    [clientMobileSortedChores, language],
  );
  const clientMobileUnassignedChores = useMemo(
    () =>
      clientMobileSortedChores.filter(
        (instance) =>
          resolveClientMobileChoreSection(instance, payload?.currentUser.id) === 'unassigned',
      ),
    [clientMobileSortedChores, payload],
  );
  const clientMobileOtherChores = useMemo(
    () =>
      clientMobileSortedChores.filter(
        (instance) =>
          resolveClientMobileChoreSection(instance, payload?.currentUser.id) === 'others',
      ),
    [clientMobileSortedChores, payload],
  );

  const featuredMetrics = useMemo(
    () => [
      {
        label: t('metric.approvals_waiting'),
        value: payload?.dashboard.pendingApprovals ?? 0,
      },
      {
        label: t('metric.active_chores'),
        value: payload?.dashboard.activeChores ?? 0,
      },
      {
        label: t('metric.streak_leader'),
        value: payload?.dashboard.streakLeader ?? t('common.none'),
      },
    ],
    [payload, t],
  );

  const isAdminVariantAccessDenied = false;
  const showAdminOps = Boolean(
    payload && payload.currentUser.role === 'admin' && !payload.hostedSubscription.hostedMode,
  );

  const showSetupWizard = Boolean(
    payload &&
    !payload.household.settings.onboardingCompleted &&
    (payload.currentUser.role === 'admin' || payload.currentUser.role === 'parent') &&
    workspaceVariant === 'client',
  );

  async function advanceWizardStep(newAnswers: Partial<OnboardingAnswers>) {
    setSetupWizardAnswers(newAnswers);
    setSetupWizardStep((s) => s + 1);
    // Fire-and-forget draft save — if the user closes now, answers are preserved
    if (token) {
      void taskBanditApi.saveOnboardingDraft(token, language, newAnswers).catch(() => {});
    }
  }

  async function handleSubmitSetupWizard(finalAnswers?: Partial<OnboardingAnswers>) {
    if (!token) return;
    const merged = finalAnswers ?? setupWizardAnswers;
    const answers: OnboardingAnswers = {
      householdType: (merged.householdType ?? 'family') as OnboardingAnswers['householdType'],
      homeType: (merged.homeType ?? 'house') as OnboardingAnswers['homeType'],
      appliances: merged.appliances ?? [],
      pets: merged.pets ?? [],
      cookingStyle: (merged.cookingStyle ?? 'mixed') as OnboardingAnswers['cookingStyle'],
      gamificationStyle: (merged.gamificationStyle ??
        'default') as OnboardingAnswers['gamificationStyle'],
    };
    try {
      await taskBanditApi.submitOnboarding(token, language, answers);
      await refreshDashboard(token, { silent: false });
    } catch {
      // wizard is skippable — silently dismiss and let the user reach the dashboard
    }
  }

  const showOnboarding = Boolean(
    payload &&
    !isAdminVariantAccessDenied &&
    (onboardingManuallyOpened ||
      (!onboardingDismissed &&
        ((workspaceVariant === 'admin' &&
          payload.currentUser.role === 'admin' &&
          !payload.household.settings.onboardingCompleted) ||
          (workspaceVariant === 'client' && !onboardingTourCompleted)))),
  );

  const availablePages = useMemo<Array<{ key: WorkspacePage; label: string }>>(() => {
    if (!payload) {
      return [];
    }

    if (isClientMobileViewport) {
      const pages: Array<{ key: WorkspacePage; label: string }> = [
        { key: 'chores', label: t('nav.chores') },
        { key: 'leaderboard', label: t('nav.leaderboard') },
        ...(canUseRewards ? [{ key: 'rewards' as WorkspacePage, label: t('nav.rewards') }] : []),
        { key: 'settings', label: t('nav.settings') },
      ];
      if (showTemplateManager) {
        pages.splice(1, 0, { key: 'templates', label: t('nav.templates') });
      }
      return pages;
    }

    const pages: Array<{ key: WorkspacePage; label: string }> = [
      { key: 'overview', label: t('nav.home') },
      { key: 'chores', label: t('nav.plan') },
      { key: 'household', label: t('nav.household') },
      { key: 'leaderboard', label: t('nav.leaderboard') },
      ...(canUseRewards ? [{ key: 'rewards' as WorkspacePage, label: t('nav.rewards') }] : []),
      ...(!payload.hostedSubscription.hostedMode
        ? [{ key: 'notifications' as WorkspacePage, label: t('nav.notifications') }]
        : []),
      { key: 'settings', label: t('nav.settings') },
    ];
    if (showTemplateManager) {
      pages.splice(2, 0, { key: 'templates', label: t('nav.templates') });
    }
    if (showAdminOps) {
      pages.push({ key: 'admin', label: t('nav.ops') });
    }
    return pages;
  }, [canUseRewards, isClientMobileViewport, payload, showAdminOps, showTemplateManager, t]);
  const mobileBottomNavPages = useMemo<Array<{ key: string; label: string }>>(
    () => [
      { key: 'chores', label: t('nav.chores') },
      { key: 'leaderboard', label: t('nav.leaderboard') },
      ...(canUseRewards ? [{ key: 'rewards', label: t('nav.rewards') }] : []),
      { key: 'more', label: t('nav.more') },
    ],
    [canUseRewards, t],
  );

  useEffect(() => {
    if (!availablePages.length) {
      return;
    }

    if (!availablePages.some((page) => page.key === activePage)) {
      setActivePage(availablePages[0].key);
    }
  }, [activePage, availablePages]);

  const workspaceVariantLabel =
    workspaceVariant === 'admin' ? t('workspace.variant_admin') : t('workspace.variant_client');
  const activePageLabel = isAdminVariantAccessDenied
    ? t('workspace.admin_only_title')
    : (availablePages.find((page) => page.key === activePage)?.label ?? t('nav.home'));
  const availableUpdate = useMemo(() => {
    if (!serverReleaseInfo) {
      return null;
    }

    return compareReleaseInfo(currentWebReleaseInfo, serverReleaseInfo) < 0
      ? serverReleaseInfo
      : null;
  }, [serverReleaseInfo]);
  const availableUpdateKey = availableUpdate ? createReleaseKey(availableUpdate) : null;
  const showAvailableUpdateNotice = Boolean(
    availableUpdate && availableUpdateKey && dismissedUpdateKey !== availableUpdateKey,
  );

  const pageDescriptions: Record<WorkspacePage, string> = {
    overview: t('page.home_description'),
    chores: t('page.plan_description'),
    leaderboard: t('page.household_description'),
    rewards: t('page.rewards_description'),
    templates: t('page.plan_description'),
    household: t('page.household_description'),
    notifications: t('page.home_description'),
    settings: t('page.settings_description'),
    admin: t('page.ops_description'),
    logs: t('page.ops_description'),
  };
  const activePageDescription = isAdminVariantAccessDenied
    ? t('workspace.admin_only_body')
    : pageDescriptions[activePage];
  const isHostedSaas = Boolean(payload?.hostedSubscription.hostedMode);
  const isClientVariant = workspaceVariant === 'client';
  const showClientMobileShell = isClientVariant && Boolean(payload) && isClientMobileViewport;
  const showNewClientMobileShell = showClientMobileShell;
  const isStandaloneDisplayMode =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  useEffect(() => {
    if (!isClientVariant) {
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      // Do NOT call event.preventDefault() — this lets the browser show its own
      // native install prompt (address bar icon / bottom sheet on Android).
      // We still store the event so it can be triggered programmatically if needed.
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstallPromptEvent(null);
      window.localStorage.setItem(getDismissedPwaInstallStorageKey(workspaceVariant), 'true');
      setInstallPromptDismissed(true);
      setNotice(t('pwa.install_success'));
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [isClientVariant, t]);

  useEffect(() => {
    authInitToken(workspaceVariant);
    setActivePage(readStoredWorkspacePage(workspaceVariant));
    setDismissedUpdateKey(
      window.localStorage.getItem(getDismissedUpdateStorageKey(workspaceVariant)),
    );
    setInstallPromptDismissed(
      window.localStorage.getItem(getDismissedPwaInstallStorageKey(workspaceVariant)) === 'true',
    );
    setMobileProfileAvatar(readStoredMobileAvatar(workspaceVariant) ?? defaultMobileAvatarAsset);
    setOnboardingTourCompleted(readStoredOnboardingTourCompletion(workspaceVariant));
    setOnboardingDismissed(false);
    setOnboardingManuallyOpened(false);
    setOnboardingStep('welcome');
  }, [workspaceVariant]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${clientMobileBreakpointPx}px)`);
    const updateViewportState = (event?: MediaQueryListEvent) => {
      setIsClientMobileViewport(event ? event.matches : mediaQuery.matches);
    };

    updateViewportState();
    mediaQuery.addEventListener('change', updateViewportState);
    return () => mediaQuery.removeEventListener('change', updateViewportState);
  }, []);

  useEffect(() => {
    if (!isClientMobileViewport) {
      setIsClientComposerOpen(false);
    }
  }, [isClientMobileViewport]);

  useEffect(() => {
    if (workspaceVariant !== 'client') {
      return;
    }

    setOnboardingTourCompleted(readStoredOnboardingTourCompletion(onboardingTourMode));
    setOnboardingDismissed(false);
    setOnboardingStep(
      getClientOnboardingStepForMode(
        onboardingStep,
        onboardingTourMode,
        payload?.currentUser.role === 'child',
      ),
    );
  }, [onboardingTourMode, payload?.currentUser.role, workspaceVariant]);

  const onboardingSteps = useMemo<Array<OnboardingStepDefinition>>(() => {
    if (workspaceVariant === 'admin') {
      return [
        {
          key: 'welcome',
          title: t('onboarding.welcome_title'),
          description: t('onboarding.welcome_body'),
          page: 'overview',
        },
        {
          key: 'rules',
          title: t('onboarding.settings_title'),
          description: t('onboarding.settings_body'),
          page: 'settings',
          targetRef: generalSettingsRef,
        },
        {
          key: 'services',
          title: t('onboarding.services_title'),
          description: t('onboarding.services_body'),
          page: 'settings',
          targetRef: oidcSettingsRef,
        },
        {
          key: 'members',
          title: t('onboarding.members_title'),
          description: t('onboarding.members_body'),
          page: 'household',
          targetRef: membersRef,
        },
        {
          key: 'templates',
          title: t('onboarding.chores_title'),
          description: t('onboarding.chores_body'),
          page: 'templates',
          targetRef: templatesRef,
        },
        {
          key: 'readiness',
          title: t('onboarding.readiness_title'),
          description: t('onboarding.readiness_body'),
          page: 'admin',
          targetRef: systemStatusRef,
        },
      ];
    }

    if (onboardingTourMode === 'client-mobile') {
      const actionStep =
        payload?.currentUser.role === 'child'
          ? {
              key: 'mobile-sections',
              title: t('onboarding.mobile_sections_title'),
              description: t('onboarding.mobile_sections_body'),
              page: 'chores' as WorkspacePage,
              targetRef: mobileChoresRailRef,
            }
          : {
              key: 'mobile-add',
              title: t('onboarding.mobile_add_title'),
              description: t('onboarding.mobile_add_body'),
              page: 'chores' as WorkspacePage,
              targetRef: mobileChoresRailRef,
            };

      return [
        {
          key: 'welcome',
          title: t('onboarding.mobile_welcome_title'),
          description: t('onboarding.mobile_welcome_body'),
          page: 'chores',
        },
        {
          key: 'mobile-nav',
          title: t('onboarding.mobile_nav_title'),
          description: t('onboarding.mobile_nav_body'),
          page: 'chores',
          targetRef: mobileBottomNavRef,
        },
        {
          key: 'mobile-summary',
          title: t('onboarding.mobile_summary_title'),
          description: t('onboarding.mobile_summary_body'),
          page: 'chores',
          targetRef: mobileSummaryRef,
        },
        actionStep,
        {
          key: 'mobile-my-chores',
          title: t('onboarding.mobile_my_chores_title'),
          description: t('onboarding.mobile_my_chores_body'),
          page: 'chores',
          targetRef: myChoresRef,
        },
      ];
    }

    return [
      {
        key: 'welcome',
        title: t('onboarding.welcome_title'),
        description: t('onboarding.welcome_body'),
        page: 'overview',
      },
      {
        key: 'chores',
        title: t('onboarding.client_chores_title'),
        description: t('onboarding.client_chores_body'),
        page: 'chores',
        targetRef: myChoresRef,
      },
      {
        key: 'schedule',
        title: t('onboarding.client_schedule_title'),
        description: t('onboarding.client_schedule_body'),
        page: 'chores',
        targetRef: scheduleRef,
      },
      {
        key: 'notifications',
        title: t('onboarding.client_notifications_title'),
        description: t('onboarding.client_notifications_body'),
        page: 'notifications',
        targetRef: notificationsRef,
      },
      {
        key: 'devices',
        title: t('onboarding.client_devices_title'),
        description: t('onboarding.client_devices_body'),
        page: 'settings',
        targetRef: notificationDevicesRef,
      },
    ];
  }, [
    generalSettingsRef,
    membersRef,
    mobileBottomNavRef,
    mobileChoresRailRef,
    mobileSummaryRef,
    myChoresRef,
    notificationDevicesRef,
    notificationsRef,
    oidcSettingsRef,
    onboardingTourMode,
    payload?.currentUser.role,
    scheduleRef,
    systemStatusRef,
    t,
    templatesRef,
    workspaceVariant,
  ]);

  const onboardingIndex = onboardingSteps.findIndex((step) => step.key === onboardingStep);
  const currentOnboardingStep = onboardingSteps[Math.max(onboardingIndex, 0)];

  useEffect(() => {
    const targetRef = currentOnboardingStep?.targetRef;

    if (!showOnboarding || !targetRef) {
      return;
    }

    if (currentOnboardingStep.page !== activePage) {
      openWorkspacePage(currentOnboardingStep.page, targetRef);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const element = targetRef.current;
      if (!element) {
        return;
      }

      scrollToSection(targetRef);
      element.classList.add('onboarding-target-active');
    }, 80);

    return () => {
      window.clearTimeout(timeoutId);
      targetRef.current?.classList.remove('onboarding-target-active');
    };
  }, [activePage, currentOnboardingStep, showOnboarding]);

  const visibleHouseholdChores = useMemo(() => {
    const currentUserId = payload?.currentUser.id;
    return [...activeInstances]
      .filter((instance) => instance.assigneeId !== currentUserId)
      .filter((instance) => {
        if (householdStateFilter !== 'all' && instance.state !== householdStateFilter) {
          return false;
        }

        if (householdAssigneeFilter === 'all') {
          return true;
        }

        if (householdAssigneeFilter === 'unassigned') {
          return !instance.assigneeId;
        }

        return instance.assigneeId === householdAssigneeFilter;
      })
      .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime());
  }, [activeInstances, householdAssigneeFilter, householdStateFilter, payload]);

  const visibleUnassignedHouseholdChores = useMemo(
    () => visibleHouseholdChores.filter((instance) => !instance.assigneeId),
    [visibleHouseholdChores],
  );

  const visibleAssignedElsewhereChores = useMemo(
    () => visibleHouseholdChores.filter((instance) => Boolean(instance.assigneeId)),
    [visibleHouseholdChores],
  );

  const householdBoardColumns = useMemo(
    () =>
      householdBoardStateOrder
        .map((state) => ({
          state,
          chores: visibleHouseholdChores.filter((instance) => instance.state === state),
        }))
        .filter((column) => column.chores.length > 0 || householdStateFilter !== 'all'),
    [visibleHouseholdChores, householdStateFilter],
  );

  const householdCalendarGroups = useMemo(() => {
    const groups = new Map<string, ChoreInstance[]>();

    for (const instance of visibleHouseholdChores) {
      const dateKey = instance.dueAt.slice(0, 10);
      const currentGroup = groups.get(dateKey) ?? [];
      currentGroup.push(instance);
      groups.set(dateKey, currentGroup);
    }

    return [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([dateKey, chores]) => ({
        dateKey,
        chores,
      }));
  }, [visibleHouseholdChores]);

  const historicChores = useMemo(
    () =>
      [
        ...(payload?.instances.filter((instance) => historicChoreStates.includes(instance.state)) ??
          []),
      ].sort(
        (left, right) =>
          new Date(getHistoricChoreDate(right)).getTime() -
          new Date(getHistoricChoreDate(left)).getTime(),
      ),
    [payload],
  );

  const historyPageCount = Math.max(1, Math.ceil(historicChores.length / choreHistoryPageSize));
  const paginatedHistoricChores = useMemo(
    () =>
      historicChores.slice(
        (historyPage - 1) * choreHistoryPageSize,
        historyPage * choreHistoryPageSize,
      ),
    [historicChores, historyPage],
  );

  useEffect(() => {
    setHistoryPage(Math.min(historyPage, historyPageCount));
  }, [historyPageCount]);

  const exportableChores = useMemo(() => {
    if (!payload) {
      return [];
    }

    return payload.instances.filter((instance) => {
      if (exportStatusFilter !== 'all') {
        if (exportStatusFilter === 'active' && !activeChoreStates.includes(instance.state)) {
          return false;
        }

        if (exportStatusFilter === 'historic' && !historicChoreStates.includes(instance.state)) {
          return false;
        }

        if (
          exportStatusFilter !== 'active' &&
          exportStatusFilter !== 'historic' &&
          instance.state !== exportStatusFilter
        ) {
          return false;
        }
      }

      if (exportAssigneeFilter === 'mine' && instance.assigneeId !== payload.currentUser.id) {
        return false;
      }

      if (
        exportAssigneeFilter === 'assigned_elsewhere' &&
        (!instance.assigneeId || instance.assigneeId === payload.currentUser.id)
      ) {
        return false;
      }

      if (exportAssigneeFilter === 'unassigned' && instance.assigneeId) {
        return false;
      }

      if (
        !['all', 'mine', 'assigned_elsewhere', 'unassigned'].includes(exportAssigneeFilter) &&
        instance.assigneeId !== exportAssigneeFilter
      ) {
        return false;
      }

      const relevantDateValue = new Date(getExportRelevantDate(instance)).getTime();
      if (exportDateFrom) {
        const fromValue = new Date(`${exportDateFrom}T00:00:00`).getTime();
        if (relevantDateValue < fromValue) {
          return false;
        }
      }

      if (exportDateTo) {
        const toValue = new Date(`${exportDateTo}T23:59:59.999`).getTime();
        if (relevantDateValue > toValue) {
          return false;
        }
      }

      return true;
    });
  }, [exportAssigneeFilter, exportDateFrom, exportDateTo, exportStatusFilter, payload]);

  const assignmentStrategyOptions: Array<{
    value: TemplateFormState['assignmentStrategy'];
    label: string;
  }> = [
    { value: 'round_robin', label: t('assignment.round_robin') },
    { value: 'least_completed_recently', label: t('assignment.least_completed_recently') },
    { value: 'highest_streak', label: t('assignment.highest_streak') },
  ];

  const recurrenceOptions: Array<{ value: RecurrenceType; label: string }> = [
    { value: 'none', label: t('recurrence.none') },
    { value: 'daily', label: t('recurrence.daily') },
    { value: 'weekly', label: t('recurrence.weekly') },
    { value: 'every_x_days', label: t('recurrence.every_x_days') },
    { value: 'custom_weekly', label: t('recurrence.custom_weekly') },
  ];

  const recurrenceWeekdayOptions = recurrenceWeekdayOrder.map((weekday) => ({
    value: weekday,
    label: t(`weekday.${weekday.toLowerCase()}`),
  }));

  async function refreshDashboard(accessToken: string, options: { silent: boolean }) {
    if (!options.silent) {
      setIsLoading(true);
    }

    try {
      const currentUser = await taskBanditApi.getCurrentUser(accessToken, language);
      const [
        dashboard,
        household,
        auditLog,
        notifications,
        notificationDevicesResult,
        householdNotificationHealthResult,
        notificationRecoveryResult,
        systemStatusResult,
        backupReadinessResult,
        notificationPreferences,
        pointsLedger,
        achievementsResult,
        masteryStatsResult,
        templates,
        instances,
        takeoverRequestsResult,
        hostedSubscriptionResult,
        nextRuntimeLogs,
        rewardsResult,
        redemptionsResult,
        holidayBlocksResult,
      ] = await Promise.all([
        taskBanditApi.getDashboardSummary(accessToken, language),
        taskBanditApi.getHousehold(accessToken, language),
        currentUser.role === 'admin'
          ? taskBanditApi.getAuditLog(accessToken, language)
          : Promise.resolve([]),
        taskBanditApi.getNotifications(accessToken, language),
        loadOptionalFeature(
          () => taskBanditApi.getNotificationDevices(accessToken, language),
          [] as NotificationDevice[],
        ),
        currentUser.role === 'admin'
          ? loadOptionalFeature(
              () => taskBanditApi.getHouseholdNotificationHealth(accessToken, language),
              [] as HouseholdNotificationHealthEntry[],
            )
          : Promise.resolve({ value: [] as HouseholdNotificationHealthEntry[], supported: false }),
        currentUser.role === 'admin'
          ? loadOptionalFeature(
              () => taskBanditApi.getNotificationRecovery(accessToken, language),
              null as NotificationRecovery | null,
            )
          : Promise.resolve({ value: null, supported: false }),
        currentUser.role === 'admin'
          ? loadOptionalFeature(
              () => taskBanditApi.getSystemStatus(accessToken, language),
              null as AdminSystemStatus | null,
            )
          : Promise.resolve({ value: null, supported: false }),
        currentUser.role === 'admin'
          ? loadOptionalFeature(
              () => taskBanditApi.getBackupReadiness(accessToken, language),
              null as BackupReadiness | null,
            )
          : Promise.resolve({ value: null, supported: false }),
        taskBanditApi.getNotificationPreferences(accessToken, language),
        taskBanditApi.getPointsLedger(accessToken, language),
        loadOptionalFeature(
          () => taskBanditApi.getAchievements(accessToken, language),
          [] as Achievement[],
        ),
        loadOptionalFeature(
          () => taskBanditApi.getMasteryStats(accessToken, language),
          [] as MasteryStats[],
        ),
        currentUser.role === 'child'
          ? Promise.resolve([])
          : taskBanditApi.getTemplates(accessToken, language),
        taskBanditApi.getInstances(accessToken, language),
        loadOptionalFeature(
          () => taskBanditApi.getTakeoverRequests(accessToken, language),
          [] as TakeoverRequestEntry[],
        ),
        loadOptionalFeature(
          () => taskBanditApi.getHostedSubscriptionOverview(accessToken, language),
          { hostedMode: false } as HostedSubscriptionOverview,
        ),
        currentUser.role === 'admin' && activePage === 'admin'
          ? taskBanditApi.getRuntimeLogs(accessToken, language, 250)
          : Promise.resolve(runtimeLogs),
        loadOptionalFeature(() => taskBanditApi.getRewards(accessToken, language), []),
        loadOptionalFeature(() => taskBanditApi.getRedemptions(accessToken, language), []),
        currentUser.role === 'admin'
          ? loadOptionalFeature(() => taskBanditApi.getHolidayBlocks(accessToken, language), [])
          : Promise.resolve({ value: [], supported: true }),
      ]);

      if (
        hostedSubscriptionResult.value.hostedMode &&
        hostedSubscriptionResult.value.canonicalApiBaseUrl
      ) {
        setApiBaseUrlOverride(hostedSubscriptionResult.value.canonicalApiBaseUrl);
      } else {
        setApiBaseUrlOverride(null);
      }

      setPayload({
        currentUser,
        dashboard,
        household,
        auditLog,
        notifications,
        notificationDevices: notificationDevicesResult.value,
        householdNotificationHealth: householdNotificationHealthResult.value,
        notificationRecovery: notificationRecoveryResult.value,
        systemStatus: systemStatusResult.value,
        backupReadiness: backupReadinessResult.value,
        notificationPreferences,
        pointsLedger,
        achievements: achievementsResult.value,
        masteryStats: masteryStatsResult.value,
        templates,
        instances,
        takeoverRequests: takeoverRequestsResult.value,
        hostedSubscription: hostedSubscriptionResult.value,
        rewards: rewardsResult.value,
        redemptions: redemptionsResult.value,
        holidayBlocks: holidayBlocksResult.value,
        compatibility: {
          notificationDevices: notificationDevicesResult.supported,
          notificationHealth: householdNotificationHealthResult.supported,
          takeoverRequests: takeoverRequestsResult.supported,
          systemStatus: systemStatusResult.supported,
          backupReadiness: backupReadinessResult.supported,
          notificationRecovery: notificationRecoveryResult.supported,
        },
      });
      setRuntimeLogs(nextRuntimeLogs);
      setPageError(null);
    } catch (error) {
      if (error instanceof TaskBanditApiError && error.status === 401) {
        handleLogout(t('auth.session_expired'));
        return;
      }

      setPageError(readErrorMessage(error, t('error.load_dashboard')));
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshRuntimeLogs(accessToken: string, options: { reportErrors: boolean }) {
    try {
      const nextRuntimeLogs = await taskBanditApi.getRuntimeLogs(accessToken, language, 250);
      setRuntimeLogs(nextRuntimeLogs);
    } catch (error) {
      if (error instanceof TaskBanditApiError && error.status === 401) {
        handleLogout(t('auth.session_expired'));
        return;
      }

      if (options.reportErrors) {
        setPageError(readErrorMessage(error, t('logs.load_failed')));
      }
    }
  }

  async function refreshSystemStatus(accessToken: string, options: { reportErrors: boolean }) {
    try {
      const nextSystemStatus = await taskBanditApi.getSystemStatus(accessToken, language);
      updatePayload((current) => ({
        ...current,
        systemStatus: nextSystemStatus,
        compatibility: { ...current.compatibility, systemStatus: true },
      }));
    } catch (error) {
      if (error instanceof TaskBanditApiError && error.status === 401) {
        handleLogout(t('auth.session_expired'));
        return;
      }

      if (isOptionalFeatureUnavailable(error)) {
        updatePayload((current) => ({
          ...current,
          systemStatus: null,
          compatibility: { ...current.compatibility, systemStatus: false },
        }));
        return;
      }

      if (options.reportErrors) {
        setPageError(readErrorMessage(error, t('system_status.load_failed')));
      }
    }
  }

  async function refreshBackupReadiness(accessToken: string, options: { reportErrors: boolean }) {
    try {
      const nextBackupReadiness = await taskBanditApi.getBackupReadiness(accessToken, language);
      updatePayload((current) => ({
        ...current,
        backupReadiness: nextBackupReadiness,
        compatibility: { ...current.compatibility, backupReadiness: true },
      }));
    } catch (error) {
      if (error instanceof TaskBanditApiError && error.status === 401) {
        handleLogout(t('auth.session_expired'));
        return;
      }

      if (isOptionalFeatureUnavailable(error)) {
        updatePayload((current) => ({
          ...current,
          backupReadiness: null,
          compatibility: { ...current.compatibility, backupReadiness: false },
        }));
        return;
      }

      if (options.reportErrors) {
        setPageError(readErrorMessage(error, t('backup.load_failed')));
      }
    }
  }

  function renderHouseholdChoreCard(
    instance: ChoreInstance,
    options?: { historic?: boolean; forceLegacy?: boolean },
  ) {
    const canManageChores = hasFeature('chores_manage');
    const canUseExternalCompletion = hasFeature('external_completion');
    const canManageDeferredFollowUps = hasFeature('deferred_follow_up_control');
    const canEditHouseholdChore =
      instance.state !== 'pending_approval' &&
      instance.state !== 'completed' &&
      instance.state !== 'cancelled' &&
      canManageChores &&
      payload?.currentUser.role !== 'child';
    const showMobileActionMenu =
      workspaceVariant === 'client' && isClientMobileViewport && !options?.historic;
    const isMobileMenuOpen = mobileCardMenuInstanceId === instance.id;
    const compactMetaLine = `${options?.historic ? formatDate(getHistoricChoreDate(instance)) : formatDate(instance.dueAt)} - ${
      instance.assigneeId
        ? (memberLookup.get(instance.assigneeId)?.displayName ?? t('common.unknown'))
        : t('common.unassigned')
    }`;
    const choreIcon = resolveChoreIcon(instance);
    const choreIconAsset = resolveChoreIconAsset(instance);
    const choreTitleText = stripLeadingChoreIconToken(
      stripLeadingQuickLogIcon(instance.typeTitle || instance.title),
    );
    const masteryLevel = instance.userMasteryLevel ?? 0;
    const masteryBadge =
      masteryLevel >= 2 ? (
        <span className="mastery-badge mastery-badge--level2" title="Mastery level 2">
          🏆
        </span>
      ) : masteryLevel === 1 ? (
        <span className="mastery-badge mastery-badge--level1" title="Mastery level 1">
          ⭐
        </span>
      ) : null;

    const choreHeading = (
      <div>
        <p className="inline-message task-row-group-title">{instance.groupTitle}</p>
        <strong className="task-row-title">
          <span className="task-row-title-icon" aria-hidden="true">
            {choreIcon}
          </span>{' '}
          {choreTitleText}
          {masteryBadge}
        </strong>
        {instance.subtypeLabel ? (
          <p className="inline-message task-row-subtype-label">{instance.subtypeLabel}</p>
        ) : null}
      </div>
    );

    if (showNewClientMobileShell && !options?.forceLegacy) {
      const compactMeta = `${options?.historic ? formatMobileDueLabel(getHistoricChoreDate(instance)) : formatMobileDueLabel(instance.dueAt)} - ${
        instance.groupTitle || 'Home'
      }`;
      const mockStatus = getMobileCardStatus(instance);
      const isMine = Boolean(
        payload?.currentUser.id && instance.assigneeId === payload.currentUser.id,
      );
      return (
        <button
          className={`task-row compact mock-mobile-card mock-mobile-card-button ${isMine ? 'mock-mobile-card-mine' : ''}`}
          key={instance.id}
          type="button"
          onClick={() => setMobileChoreDialogInstanceId(instance.id)}
        >
          <div className="mock-mobile-card-icon" aria-hidden="true">
            {choreIconAsset ? <img src={choreIconAsset} alt="" aria-hidden="true" /> : choreIcon}
          </div>
          <div className="mock-mobile-card-body">
            <strong className="task-row-title">{choreTitleText}</strong>
            {instance.subtypeLabel ? (
              <span className="task-row-card-subtype">{instance.subtypeLabel}</span>
            ) : null}
            <p className="task-row-compact-meta">{compactMeta}</p>
          </div>
          <span className={`status-pill ${mockStatus.className}`}>{mockStatus.label}</span>
        </button>
      );
    }
    return (
      <div className="task-row compact" key={instance.id}>
        <div className="task-row-header">
          {choreHeading}
          <div className="task-row-header-controls">
            <span className={`status-pill state-${instance.state}`}>
              {t(`state.${instance.state}`)}
            </span>
            {showMobileActionMenu && canEditHouseholdChore ? (
              <div className="mobile-card-menu">
                <button
                  className="ghost-button mobile-card-menu-toggle"
                  type="button"
                  aria-expanded={isMobileMenuOpen}
                  aria-haspopup="menu"
                  aria-label={t('panel.quick_actions')}
                  onClick={() =>
                    setMobileCardMenuInstanceId(
                      mobileCardMenuInstanceId === instance.id ? null : instance.id,
                    )
                  }
                >
                  ...
                </button>
                {isMobileMenuOpen ? (
                  <div className="mobile-card-menu-items" role="menu">
                    <button
                      className="ghost-button"
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMobileCardMenuInstanceId(null);
                        openMobileDueEditor(instance);
                      }}
                    >
                      {t('common.edit')}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <p className="task-row-compact-meta">{compactMetaLine}</p>
        <div className="task-row-meta-grid">
          <div className="task-row-meta-item">
            <span>{t('task.assignee')}</span>
            <strong>
              {restrictHouseholdDetails
                ? t('task.visible_limited')
                : instance.assigneeId
                  ? (memberLookup.get(instance.assigneeId)?.displayName ?? t('common.unknown'))
                  : t('common.unassigned')}
            </strong>
          </div>
          <div className="task-row-meta-item">
            <span>
              {options?.historic ? t(getHistoricChoreDateLabelKey(instance)) : t('task.due')}
            </span>
            <strong>
              {formatDate(options?.historic ? getHistoricChoreDate(instance) : instance.dueAt)}
            </strong>
          </div>
          {!restrictHouseholdDetails ? (
            <div className="task-row-meta-item">
              <span>{t('task.difficulty')}</span>
              <strong>{t(`difficulty.${instance.difficulty}`)}</strong>
            </div>
          ) : null}
          {instance.assignmentReason ? (
            <div className="task-row-meta-item">
              <span>{t('templates.strategy')}</span>
              <strong>{t(`assignment_reason.${instance.assignmentReason}`)}</strong>
            </div>
          ) : null}
          {instance.triggerInfo ? (
            <div className="task-row-meta-item">
              <span>Triggered after</span>
              <strong>
                {instance.triggerInfo.title}
                {instance.triggerInfo.completedAt
                  ? ` · ${formatDate(instance.triggerInfo.completedAt)}`
                  : ''}
                {' by '}
                {instance.triggerInfo.completedByExternal
                  ? (instance.triggerInfo.externalCompleterName ?? 'outside helper')
                  : (instance.triggerInfo.completedByDisplayName ?? 'unknown')}
              </strong>
            </div>
          ) : null}
          {instance.state === 'deferred' && instance.notBeforeAt ? (
            <div className="task-row-meta-item">
              <span>{t('task.not_before')}</span>
              <strong>{formatDate(instance.notBeforeAt)}</strong>
            </div>
          ) : null}
          {instance.completedByExternal && instance.externalCompleterName ? (
            <div className="task-row-meta-item">
              <span>{t('task.completed_by')}</span>
              <strong>{instance.externalCompleterName}</strong>
            </div>
          ) : null}
        </div>
        {instance.deferredReason ? (
          <p className="inline-message">{instance.deferredReason}</p>
        ) : null}
        {instance.completedByExternal && instance.externalCompleterName ? (
          <p className="inline-message">
            {t('submission.external_completed_by').replace(
              '{name}',
              instance.externalCompleterName,
            )}
          </p>
        ) : null}
        {!options?.historic &&
        payload?.currentUser.role !== 'child' &&
        instance.state !== 'completed' &&
        instance.state !== 'cancelled' ? (
          <div className="button-row task-row-actions">
            {instance.state !== 'pending_approval' &&
            instance.state !== 'deferred' &&
            instance.assigneeId !== payload?.currentUser.id &&
            canManageChores &&
            (instance.assigneeId == null || hasFeature('takeover_direct')) ? (
              <button
                className="secondary-button"
                type="button"
                disabled={busyAction === `start:${instance.id}`}
                onClick={() => void handleStartInstance(instance.id)}
              >
                {t('instances.claim')}
              </button>
            ) : null}
            {instance.state === 'deferred' && canManageDeferredFollowUps ? (
              <>
                <button
                  className="primary-button"
                  type="button"
                  disabled={busyAction === `release:${instance.id}`}
                  onClick={() => void handleReleaseDeferredChore(instance.id)}
                >
                  {t('instances.release_now')}
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  disabled={busyAction === `snooze:${instance.id}`}
                  onClick={() => void handleSnoozeDeferredChore(instance.id, instance.notBeforeAt)}
                >
                  {t('instances.snooze')}
                </button>
              </>
            ) : null}
            {hasFeature('takeover_requests') &&
            instance.assigneeId === payload?.currentUser.id &&
            instance.state !== 'pending_approval' &&
            instance.state !== 'deferred' ? (
              <button
                className="ghost-button"
                type="button"
                disabled={busyAction === `takeover-request:${instance.id}`}
                onClick={() => {
                  setTakeoverRequestInstanceId(instance.id);
                  setTakeoverRequestMemberId('');
                  setTakeoverRequestNote('');
                }}
              >
                {t('takeover.request_action')}
              </button>
            ) : null}
            {instance.state !== 'pending_approval' &&
            canManageChores &&
            !(workspaceVariant === 'client' && isClientMobileViewport) ? (
              <button
                className="ghost-button"
                type="button"
                onClick={() =>
                  workspaceVariant === 'client' && isClientMobileViewport
                    ? openMobileDueEditor(instance)
                    : startEditingInstance(instance)
                }
              >
                {t('common.edit')}
              </button>
            ) : null}
            {canUseExternalCompletion && instance.state !== 'pending_approval' ? (
              <button
                className="secondary-button"
                type="button"
                disabled={busyAction === `complete-external:${instance.id}`}
                onClick={() => void handleCompleteExternalChore(instance.id)}
              >
                {t('submission.mark_external_complete')}
              </button>
            ) : null}
            {canManageChores ? (
              !instance.supportsOccurrenceCancellation ? (
                <button
                  className="secondary-button"
                  type="button"
                  disabled={busyAction === `cancel:${instance.id}`}
                  onClick={() => void handleCancelInstance(instance.id)}
                >
                  {t('instances.cancel')}
                </button>
              ) : (
                <>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={busyAction === `cancel-occurrence:${instance.id}`}
                    onClick={() => void handleCancelOccurrence(instance.id)}
                  >
                    {busyAction === `cancel-occurrence:${instance.id}`
                      ? t('instances.cancelling_occurrence')
                      : t('instances.cancel_occurrence')}
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    disabled={busyAction === `cancel-series:${instance.id}`}
                    onClick={() => void handleCancelSeries(instance.id)}
                  >
                    {busyAction === `cancel-series:${instance.id}`
                      ? t('instances.cancelling_series')
                      : t('instances.cancel_series')}
                  </button>
                </>
              )
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  function renderMyChoreCard(instance: ChoreInstance, options?: { forceLegacy?: boolean }) {
    const canUploadProofs = hasFeature('proof_uploads');
    const canSubmitAsCurrentUser = payload?.currentUser.id === instance.assigneeId;
    const selectedChecklistIds = getSelectedChecklistIds(instance);
    const selectedFiles = selectedProofFiles[instance.id] ?? [];
    const choreIcon = resolveChoreIcon(instance);
    const choreIconAsset = resolveChoreIconAsset(instance);
    const choreTitleText = stripLeadingChoreIconToken(
      stripLeadingQuickLogIcon(instance.typeTitle || instance.title),
    );
    const choreHeading = (
      <div>
        <p className="inline-message task-row-group-title">{instance.groupTitle}</p>
        <strong className="task-row-title">
          <span className="task-row-title-icon" aria-hidden="true">
            {choreIcon}
          </span>{' '}
          {choreTitleText}
        </strong>
        {instance.subtypeLabel ? (
          <p className="inline-message task-row-subtype-label">{instance.subtypeLabel}</p>
        ) : null}
      </div>
    );
    const compactMetaLine = `${formatDate(instance.dueAt)} - ${t('task.points')}: ${
      instance.awardedPoints > 0 ? instance.awardedPoints : instance.basePoints
    }`;

    if (showNewClientMobileShell && !options?.forceLegacy) {
      const compactMeta = `${formatMobileDueLabel(instance.dueAt)} - ${instance.groupTitle || 'Home'}`;
      const mockStatus = getMobileCardStatus(instance);
      return (
        <button
          className="task-row mock-mobile-card mock-mobile-card-button mock-mobile-card-mine"
          key={instance.id}
          type="button"
          onClick={() => setMobileChoreDialogInstanceId(instance.id)}
        >
          <div className="mock-mobile-card-icon" aria-hidden="true">
            {choreIconAsset ? <img src={choreIconAsset} alt="" aria-hidden="true" /> : choreIcon}
          </div>
          <div className="mock-mobile-card-body">
            <strong className="task-row-title">{choreTitleText}</strong>
            {instance.subtypeLabel ? (
              <span className="task-row-card-subtype">{instance.subtypeLabel}</span>
            ) : null}
            <p className="task-row-compact-meta">{compactMeta}</p>
          </div>
          <span className={`status-pill ${mockStatus.className}`}>{mockStatus.label}</span>
        </button>
      );
    }
    return (
      <div className="task-row" key={instance.id}>
        <div className="task-row-header">
          {choreHeading}
          <span className={`status-pill state-${instance.state}`}>
            {t(`state.${instance.state}`)}
          </span>
        </div>
        <p className="task-row-compact-meta">{compactMetaLine}</p>
        <div className="task-row-meta-grid">
          <div className="task-row-meta-item">
            <span>{t('task.due')}</span>
            <strong>{formatDate(instance.dueAt)}</strong>
          </div>
          <div className="task-row-meta-item">
            <span>{t('task.points')}</span>
            <strong>
              {instance.awardedPoints > 0 ? instance.awardedPoints : instance.basePoints}
            </strong>
          </div>
          {instance.assignmentReason ? (
            <div className="task-row-meta-item">
              <span>{t('templates.strategy')}</span>
              <strong>{t(`assignment_reason.${instance.assignmentReason}`)}</strong>
            </div>
          ) : null}
          {instance.triggerInfo ? (
            <div className="task-row-meta-item">
              <span>Triggered after</span>
              <strong>
                {instance.triggerInfo.title}
                {instance.triggerInfo.completedAt
                  ? ` · ${formatDate(instance.triggerInfo.completedAt)}`
                  : ''}
                {' by '}
                {instance.triggerInfo.completedByExternal
                  ? (instance.triggerInfo.externalCompleterName ?? 'outside helper')
                  : (instance.triggerInfo.completedByDisplayName ?? 'unknown')}
              </strong>
            </div>
          ) : null}
        </div>
        {instance.requirePhotoProof && canUploadProofs ? (
          <p className="inline-message">{t('submission.photo_hint_required')}</p>
        ) : null}
        {instance.requirePhotoProof && instance.attachments.length > 0
          ? renderAttachmentList(t('submission.previous_uploads'), instance.attachments)
          : null}
        {instance.checklist.length ? (
          <div className="checklist">
            {instance.checklist.map((item) => (
              <label key={item.id} className="checklist-item">
                <input
                  type="checkbox"
                  checked={selectedChecklistIds.includes(item.id)}
                  onChange={() =>
                    toggleChecklistItem(instance.id, item.id, instance.checklistCompletionIds)
                  }
                />
                <span>
                  {item.title}
                  {item.required ? ` - ${t('task.required')}` : ''}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="inline-message">{t('submission.one_tap')}</p>
        )}
        {instance.requirePhotoProof && canUploadProofs ? (
          <label className="inline-field">
            <span>{t('task.attachments')}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => handleProofFilesSelected(instance.id, event.target.files)}
            />
          </label>
        ) : null}
        {instance.requirePhotoProof && canUploadProofs && selectedFiles.length > 0 ? (
          <p className="inline-message">
            {t('submission.selected_files')}: {selectedFiles.length}
          </p>
        ) : null}
        <label className="inline-field">
          <span>{t('task.note')}</span>
          <textarea
            value={submitNotes[instance.id] ?? ''}
            onChange={(event) =>
              setSubmitNotes((current) => ({
                ...current,
                [instance.id]: event.target.value,
              }))
            }
            rows={3}
          />
        </label>
        {canSubmitAsCurrentUser ? (
          <div className="button-row task-row-actions">
            <button
              className="primary-button"
              type="button"
              disabled={busyAction === `submit:${instance.id}`}
              onClick={() => void handleSubmitChore(instance.id)}
            >
              {t('submission.submit')}
            </button>
          </div>
        ) : null}
        {payload?.currentUser.role !== 'child' && instance.supportsOccurrenceCancellation ? (
          <div className="button-row task-row-actions task-row-actions-secondary">
            <>
              <button
                className="ghost-button"
                type="button"
                disabled={busyAction === `cancel-occurrence:${instance.id}`}
                onClick={() => void handleCancelOccurrence(instance.id)}
              >
                {busyAction === `cancel-occurrence:${instance.id}`
                  ? t('instances.cancelling_occurrence')
                  : t('instances.cancel_occurrence')}
              </button>
              <button
                className="ghost-button"
                type="button"
                disabled={busyAction === `cancel-series:${instance.id}`}
                onClick={() => void handleCancelSeries(instance.id)}
              >
                {busyAction === `cancel-series:${instance.id}`
                  ? t('instances.cancelling_series')
                  : t('instances.cancel_series')}
              </button>
            </>
          </div>
        ) : null}
      </div>
    );
  }

  function renderMyChoreSection(title: string, items: ChoreInstance[], emptyMessage: string) {
    return (
      <section className="my-chore-section">
        <div className="section-heading section-heading-compact">
          <h3>{title}</h3>
          <span className="section-kicker">{items.length}</span>
        </div>
        {items.length === 0 ? (
          <p className="empty-state">{emptyMessage}</p>
        ) : (
          <div className="stack-list">{items.map((instance) => renderMyChoreCard(instance))}</div>
        )}
      </section>
    );
  }

  function renderCompactChoreSection(title: string, items: ChoreInstance[], emptyMessage: string) {
    return (
      <section className="my-chore-section">
        <div className="section-heading section-heading-compact">
          <h3>{title}</h3>
          <span className="section-kicker">{items.length}</span>
        </div>
        {items.length === 0 ? (
          <p className="empty-state">{emptyMessage}</p>
        ) : (
          <div className="stack-list">
            {items.map((instance) => renderHouseholdChoreCard(instance))}
          </div>
        )}
      </section>
    );
  }

  function renderVisibleMyChoreSection(
    title: string,
    items: ChoreInstance[],
    emptyMessage: string,
  ) {
    if (items.length === 0) {
      return null;
    }

    return renderMyChoreSection(title, items, emptyMessage);
  }

  function renderVisibleCompactChoreSection(
    title: string,
    items: ChoreInstance[],
    emptyMessage: string,
  ) {
    if (items.length === 0) {
      return null;
    }

    return renderCompactChoreSection(title, items, emptyMessage);
  }

  function renderMockMobileChoreList(
    items: ChoreInstance[],
    renderCard: (instance: ChoreInstance) => ReactNode,
    emptyMessage: string,
  ) {
    return items.length === 0 ? (
      <p className="empty-state mock-mobile-empty-state">{emptyMessage}</p>
    ) : (
      <div className="stack-list mock-mobile-card-list">
        {items.map((instance) => renderCard(instance))}
      </div>
    );
  }

  function renderClientMobileDueBucketCard(instance: ChoreInstance) {
    const isMine = Boolean(
      payload?.currentUser.id && instance.assigneeId === payload.currentUser.id,
    );
    return isMine ? renderMyChoreCard(instance) : renderHouseholdChoreCard(instance);
  }

  function firstNameFromDisplayName(value: string) {
    return value.trim().split(/\s+/)[0] || value;
  }

  function initialsFromDisplayName(value: string) {
    const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'U';
  }

  function renderTakeoverRequestCard(request: TakeoverRequestEntry) {
    return (
      <div className="task-row compact takeover-request-card" key={request.id}>
        <div className="task-row-header">
          <strong>{request.choreTitle}</strong>
          <span className="inline-message">
            {firstNameFromDisplayName(request.requester.displayName)} ·{' '}
            {formatDate(request.createdAt)}
          </span>
        </div>
        {request.note ? (
          <p>
            {t('task.note')}: {request.note}
          </p>
        ) : null}
        <div className="button-row">
          <button
            className="primary-button"
            type="button"
            disabled={busyAction === `takeover-approve:${request.id}`}
            onClick={() => void handleTakeoverApproval(request.id, 'approve')}
          >
            {t('takeover.approve')}
          </button>
          <button
            className="ghost-button"
            type="button"
            disabled={busyAction === `takeover-decline:${request.id}`}
            onClick={() => void handleTakeoverApproval(request.id, 'decline')}
          >
            {t('takeover.decline')}
          </button>
        </div>
      </div>
    );
  }

  function formatTemplateRecurrence(template: ChoreTemplate) {
    switch (template.recurrence.type) {
      case 'daily':
        return t('recurrence.daily');
      case 'weekly':
        return t('recurrence.weekly');
      case 'every_x_days':
        return `${t('recurrence.every_x_days')} (${template.recurrence.intervalDays ?? 1})`;
      case 'custom_weekly':
        return `${t('recurrence.custom_weekly')}: ${template.recurrence.weekdays
          .map((weekday) => t(`weekday.${weekday.toLowerCase()}`))
          .join(', ')}`;
      case 'none':
      default:
        return t('recurrence.none');
    }
  }

  function formatFollowUpDelayLabel(rule: ChoreTemplateDependencyRule) {
    const unitLabel =
      rule.delayUnit === 'days'
        ? rule.delayValue === 1
          ? t('templates.delay_day')
          : t('templates.delay_days')
        : rule.delayValue === 1
          ? t('templates.delay_hour')
          : t('templates.delay_hours');

    return `${rule.delayValue} ${unitLabel}`;
  }

  function handleLogout(message?: string) {
    authLogout(workspaceVariant, message);
    clearDashboard();
    setSettingsDraft(null);
    setNotificationPreferencesDraft(null);
    setNotice(null);
    setCompletionCelebration(null);
    setIsClientComposerOpen(false);
  }

  async function handleBootstrapSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction('bootstrap');
    setPageError(null);

    try {
      await taskBanditApi.bootstrapHousehold(language, bootstrapForm);
      await authLogin(
        bootstrapForm.ownerEmail,
        bootstrapForm.ownerPassword,
        language,
        workspaceVariant,
      );
      authSetBootstrapStatus({ isBootstrapped: true, householdCount: 1 });
      setNotice(t('bootstrap.created'));
    } catch (error) {
      setPageError(readErrorMessage(error, t('bootstrap.create_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSubmitChore(instanceId: string) {
    if (!token || !payload) {
      return;
    }

    const targetInstance = payload.instances.find((item) => item.id === instanceId);
    if (!targetInstance) {
      setPageError(t('error.missing_template'));
      return;
    }

    const selectedChecklistIds =
      submitSelections[instanceId] ?? targetInstance.checklistCompletionIds;
    const selectedFiles = selectedProofFiles[instanceId] ?? [];

    if (targetInstance.requirePhotoProof && selectedFiles.length < 1) {
      setPageError(t('submission.photo_required_missing'));
      return;
    }
    if (targetInstance.requirePhotoProof && !hasFeature('proof_uploads')) {
      setPageError(t('feature.proof_uploads_disabled'));
      return;
    }

    setBusyAction(`submit:${instanceId}`);
    try {
      const attachments =
        selectedFiles.length > 0
          ? await Promise.all(
              selectedFiles.map((file) => taskBanditApi.uploadProof(token, language, file)),
            )
          : [];

      const submittedChore = await taskBanditApi.submitChore(token, language, instanceId, {
        completedChecklistItemIds: selectedChecklistIds,
        attachments,
        note: submitNotes[instanceId],
      });
      if (submittedChore.state === 'completed') {
        const unlockedAchievement = submittedChore.newlyUnlockedAchievements?.[0] ?? null;
        if (unlockedAchievement) {
          setCompletionCelebration({
            points: unlockedAchievement.bonusPoints,
            choreTitle: unlockedAchievement.name,
            titleKey: 'celebration.achievement_title',
            eyebrowKey: 'celebration.achievement_eyebrow',
            phraseKey: 'celebration.achievement_phrase',
            variant: 'achievement',
            unlockedAchievement,
          });
        } else {
          const celebration = buildCompletionCelebration(
            submittedChore,
            lastCompletionCelebrationPhraseKey,
          );
          setCompletionCelebration(celebration);
          setLastCompletionCelebrationPhraseKey(celebration.phraseKey);
        }
      }
      setNotice(t('submission.success'));
      clearSubmitState(instanceId);
      await refreshDashboard(token, { silent: true });
    } catch (error) {
      setPageError(readErrorMessage(error, t('submission.failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCompleteExternalChore(instanceId: string) {
    if (!token || !payload) {
      return;
    }

    const targetInstance = payload.instances.find((item) => item.id === instanceId);
    if (!targetInstance) {
      setPageError(t('error.missing_template'));
      return;
    }

    const externalCompleterName = window.prompt(
      t('submission.external_name_prompt'),
      targetInstance.externalCompleterName ?? '',
    );
    if (externalCompleterName === null) {
      return;
    }

    const trimmedExternalCompleterName = externalCompleterName.trim();
    if (!trimmedExternalCompleterName) {
      setPageError(t('submission.external_name_required'));
      return;
    }

    const selectedChecklistIds =
      submitSelections[instanceId] ?? targetInstance.checklistCompletionIds;
    const selectedFiles = selectedProofFiles[instanceId] ?? [];

    if (targetInstance.requirePhotoProof && selectedFiles.length < 1) {
      setPageError(t('submission.photo_required_missing'));
      return;
    }
    if (targetInstance.requirePhotoProof && !hasFeature('proof_uploads')) {
      setPageError(t('feature.proof_uploads_disabled'));
      return;
    }

    setBusyAction(`complete-external:${instanceId}`);
    try {
      const attachments =
        selectedFiles.length > 0
          ? await Promise.all(
              selectedFiles.map((file) => taskBanditApi.uploadProof(token, language, file)),
            )
          : [];

      await taskBanditApi.completeChoreExternal(token, language, instanceId, {
        externalCompleterName: trimmedExternalCompleterName,
        completedChecklistItemIds: selectedChecklistIds,
        attachments,
        note: submitNotes[instanceId],
      });
      setNotice(t('submission.external_success').replace('{name}', trimmedExternalCompleterName));
      clearSubmitState(instanceId);
      await refreshDashboard(token, { silent: true });
    } catch (error) {
      setPageError(readErrorMessage(error, t('submission.external_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReleaseDeferredChore(instanceId: string) {
    if (!token) {
      return;
    }

    const note = window.prompt(t('instances.release_note_prompt'), '') ?? undefined;
    setBusyAction(`release:${instanceId}`);
    try {
      await taskBanditApi.releaseDeferredChore(
        token,
        language,
        instanceId,
        note?.trim() || undefined,
      );
      setNotice(t('instances.released'));
      await refreshDashboard(token, { silent: true });
    } catch (error) {
      setPageError(readErrorMessage(error, t('instances.release_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSnoozeDeferredChore(instanceId: string, currentNotBeforeAt?: string | null) {
    if (!token) {
      return;
    }

    const defaultValue = currentNotBeforeAt ? currentNotBeforeAt.slice(0, 16) : '';
    const notBeforeAtInput = window.prompt(t('instances.snooze_until_prompt'), defaultValue);
    if (notBeforeAtInput === null) {
      return;
    }

    const notBeforeAt = new Date(notBeforeAtInput);
    if (Number.isNaN(notBeforeAt.getTime())) {
      setPageError(t('instances.snooze_invalid_datetime'));
      return;
    }

    const note = window.prompt(t('instances.snooze_note_prompt'), '') ?? undefined;
    setBusyAction(`snooze:${instanceId}`);
    try {
      await taskBanditApi.snoozeDeferredChore(token, language, instanceId, {
        notBeforeAt: notBeforeAt.toISOString(),
        note: note?.trim() || undefined,
      });
      setNotice(t('instances.snoozed'));
      await refreshDashboard(token, { silent: true });
    } catch (error) {
      setPageError(readErrorMessage(error, t('instances.snooze_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSubmitQuickLog() {
    if (!token || !payload) {
      return;
    }

    const normalizedQuery = quickLogQuery.trim();
    if (!quickLogSelectedInstanceId && !quickLogSelectedTemplateId && !normalizedQuery) {
      setPageError('Quick log needs a chore selection or free-text title.');
      return;
    }

    const parsedPointsOverride = Number.parseInt(quickLogPointsOverride, 10);
    const pointsOverride =
      quickLogUsePointsOverride && Number.isFinite(parsedPointsOverride)
        ? Math.max(0, parsedPointsOverride)
        : undefined;

    setBusyAction('quick-log');
    try {
      const decoratedTitle = quickLogSelectedInstanceId
        ? undefined
        : applyChoreIconToken(
            stripLeadingQuickLogIcon(normalizedQuery),
            (quickLogIcon ?? '') as ChoreIconId | '',
          ) || undefined;
      await taskBanditApi.quickLog(token, language, {
        instanceId: quickLogSelectedInstanceId ?? undefined,
        templateId: quickLogSelectedTemplateId ?? undefined,
        title: decoratedTitle,
        note: quickLogNote.trim() || undefined,
        createTemplateFromEntry:
          !quickLogSelectedInstanceId &&
          !quickLogSelectedTemplateId &&
          Boolean(quickLogCreateTemplateFromEntry),
        pointsOverride,
      });
      closeQuickLog();
      setNotice('Quick log saved.');
      await refreshDashboard(token, { silent: true });
    } catch (error) {
      setPageError(readErrorMessage(error, 'Quick log failed.'));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReview(instanceId: string, action: 'approve' | 'reject') {
    if (!token) {
      return;
    }

    setBusyAction(`${action}:${instanceId}`);
    try {
      if (action === 'approve') {
        const reviewedChore = await taskBanditApi.approveChore(
          token,
          language,
          instanceId,
          reviewNotes[instanceId],
        );
        const unlockedAchievement = reviewedChore.newlyUnlockedAchievements?.[0] ?? null;
        if (unlockedAchievement) {
          setCompletionCelebration({
            points: unlockedAchievement.bonusPoints,
            choreTitle: unlockedAchievement.name,
            titleKey: 'celebration.achievement_title',
            eyebrowKey: 'celebration.achievement_eyebrow',
            phraseKey: 'celebration.achievement_phrase',
            variant: 'achievement',
            unlockedAchievement,
          });
        } else if (reviewedChore.completionMilestone?.type === 'perfect_day') {
          const celebration = buildCompletionCelebration(
            reviewedChore,
            lastCompletionCelebrationPhraseKey,
          );
          setCompletionCelebration(celebration);
          setLastCompletionCelebrationPhraseKey(celebration.phraseKey);
        }
        setNotice(t('approval.approved_notice'));
      } else {
        await taskBanditApi.rejectChore(token, language, instanceId, reviewNotes[instanceId]);
        setNotice(t('approval.rejected_notice'));
      }

      await refreshDashboard(token, { silent: true });
    } catch (error) {
      setPageError(readErrorMessage(error, t('approval.failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleTakeoverApproval(requestId: string, action: 'approve' | 'decline') {
    if (!token) {
      return;
    }

    setBusyAction(`takeover-${action}:${requestId}`);
    try {
      if (action === 'approve') {
        await taskBanditApi.approveTakeoverRequest(token, language, requestId);
        setNotice(t('takeover.approved_notice'));
      } else {
        await taskBanditApi.declineTakeoverRequest(token, language, requestId);
        setNotice(t('takeover.declined_notice'));
      }

      await refreshDashboard(token, { silent: true });
    } catch (error) {
      setPageError(readErrorMessage(error, t('takeover.action_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRequestTakeover() {
    if (!token || !takeoverRequestInstanceId || !takeoverRequestMemberId) return;
    setBusyAction(`takeover-request:${takeoverRequestInstanceId}`);
    try {
      await taskBanditApi.requestTakeover(token, language, takeoverRequestInstanceId, {
        requestedUserId: takeoverRequestMemberId,
        note: takeoverRequestNote.trim() || undefined,
      });
      setNotice(t('takeover.request_sent_notice'));
      setTakeoverRequestInstanceId(null);
      setTakeoverRequestMemberId('');
      setTakeoverRequestNote('');
      await refreshDashboard(token, { silent: true });
    } catch (error) {
      setPageError(readErrorMessage(error, t('takeover.request_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSaveSettings() {
    if (!token || !settingsDraft) {
      return;
    }

    if (smtpTestRequiredToEnable) {
      setPageError('SMTP_TEST_REQUIRED: Test the SMTP settings successfully before enabling SMTP.');
      return;
    }

    setBusyAction('save-settings');
    try {
      const household = await taskBanditApi.updateHousehold(token, language, settingsDraft);
      const nextProviders = await taskBanditApi.getProviders(language);
      updatePayload((current) => ({ ...current, household }));
      authSetProviders(nextProviders);
      setNotice(t('settings.saved'));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t('settings.save_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSaveNotificationPreferences() {
    if (!token || !notificationPreferencesDraft) {
      return;
    }

    setBusyAction('save-notification-preferences');
    try {
      const nextPreferences = await taskBanditApi.updateNotificationPreferences(
        token,
        language,
        notificationPreferencesDraft,
      );
      updatePayload((current) => ({ ...current, notificationPreferences: nextPreferences }));
      setNotificationPreferencesDraft(nextPreferences);
      setNotice(t('settings.notification_preferences_saved'));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t('settings.notification_preferences_save_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCompleteOnboarding() {
    if (!payload) {
      return;
    }

    setBusyAction('complete-onboarding');
    try {
      const shouldPersistHouseholdCompletion =
        workspaceVariant === 'admin' &&
        payload.currentUser.role === 'admin' &&
        !payload.household.settings.onboardingCompleted;

      if (shouldPersistHouseholdCompletion) {
        if (!token) {
          return;
        }

        const household = await taskBanditApi.updateHousehold(token, language, {
          onboardingCompleted: true,
        });
        updatePayload((current) => ({ ...current, household }));
        setSettingsDraft(household.settings);
      }

      writeStoredOnboardingTourCompletion(onboardingTourMode, true);
      setOnboardingTourCompleted(true);
      setOnboardingDismissed(false);
      setOnboardingManuallyOpened(false);
      setOnboardingStep('welcome');
      setNotice(
        shouldPersistHouseholdCompletion
          ? t('onboarding.completed')
          : t('onboarding.tour_completed'),
      );
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t('onboarding.complete_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  function handleNextOnboardingStep() {
    if (onboardingIndex < onboardingSteps.length - 1) {
      setOnboardingStep(onboardingSteps[onboardingIndex + 1].key);
    }
  }

  function handlePreviousOnboardingStep() {
    if (onboardingIndex > 0) {
      setOnboardingStep(onboardingSteps[onboardingIndex - 1].key);
    }
  }

  function handleOpenOnboarding() {
    setOnboardingDismissed(false);
    setOnboardingManuallyOpened(true);
    setOnboardingStep('welcome');
  }

  function handleDismissOnboarding() {
    writeStoredOnboardingTourCompletion(onboardingTourMode, true);
    // Also dismiss for the other client mode so viewport resize won't re-trigger the tour
    if (onboardingTourMode === 'client') {
      writeStoredOnboardingTourCompletion('client-mobile', true);
    } else if (onboardingTourMode === 'client-mobile') {
      writeStoredOnboardingTourCompletion('client', true);
    }
    setOnboardingTourCompleted(true);
    setOnboardingDismissed(true);
    setOnboardingManuallyOpened(false);
    setOnboardingStep('welcome');
  }

  function handleFocusOnboardingStep(step: OnboardingStepDefinition) {
    setOnboardingStep(step.key);
    if (step.targetRef) {
      openWorkspacePage(step.page, step.targetRef);
      return;
    }

    openWorkspacePage(step.page);
  }

  async function handleProcessOverduePenalties() {
    if (!token) {
      return;
    }

    setBusyAction('process-overdue-penalties');
    try {
      const result = await taskBanditApi.processOverduePenalties(token, language);
      await refreshDashboard(token, { silent: true });
      setNotice(
        result.processedCount > 0
          ? t('settings.overdue_processed')
              .replace('{count}', String(result.processedCount))
              .replace('{points}', String(result.totalPenaltyPoints))
          : t('settings.overdue_none'),
      );
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t('settings.overdue_process_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleProcessNotificationMaintenance() {
    if (!token) {
      return;
    }

    setBusyAction('process-notification-maintenance');
    try {
      const result = await taskBanditApi.processNotificationMaintenance(token, language);
      await refreshDashboard(token, { silent: true });
      setNotice(
        t('settings.notifications_processed')
          .replace('{reminders}', String(result.reminderCount))
          .replace('{summaries}', String(result.dailySummaryCount))
          .replace('{pushSent}', String(result.pushSentCount))
          .replace('{pushFailed}', String(result.pushFailedCount))
          .replace('{emailSent}', String(result.emailSentCount))
          .replace('{emailFailed}', String(result.emailFailedCount))
          .replace('{emailSkipped}', String(result.emailSkippedCount)),
      );
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t('settings.notifications_process_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSendTestNotification(recipientUserId: string) {
    if (!token) {
      return;
    }

    setBusyAction(`test-notification:${recipientUserId}`);
    try {
      const result = await taskBanditApi.sendTestNotification(token, language, recipientUserId);
      await refreshDashboard(token, { silent: true });
      setNotice(
        t('settings.test_notification_sent')
          .replace('{name}', result.recipientDisplayName)
          .replace('{pushSent}', String(result.pushSentCount))
          .replace('{pushFailed}', String(result.pushFailedCount))
          .replace('{emailSent}', String(result.emailSentCount))
          .replace('{emailFailed}', String(result.emailFailedCount))
          .replace('{emailSkipped}', String(result.emailSkippedCount)),
      );
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t('settings.test_notification_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleTestSmtp() {
    if (!token || !settingsDraft || !smtpDraftSettings || !smtpDraftFingerprint) {
      return;
    }

    setBusyAction('test-smtp');
    try {
      await taskBanditApi.testSmtp(token, language, {
        smtpEnabled: settingsDraft.smtpEnabled,
        ...smtpDraftSettings,
      });
      setSmtpVerifiedFingerprint(smtpDraftFingerprint);
      setNotice(t('settings.smtp_test_success'));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t('settings.smtp_test_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteNotificationDevice(deviceId: string) {
    if (!token || !payload) {
      return;
    }

    setBusyAction(`delete-device:${deviceId}`);
    try {
      const nextDevices = await taskBanditApi.deleteNotificationDevice(token, language, deviceId);
      updatePayload((current) => ({ ...current, notificationDevices: nextDevices }));
      setNotice(t('settings.notification_device_removed'));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t('settings.notification_device_remove_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleMarkNotificationRead(notificationId: string) {
    if (!token || !payload) {
      return;
    }

    setBusyAction(`notification-read:${notificationId}`);
    try {
      const notifications = await taskBanditApi.markNotificationRead(
        token,
        language,
        notificationId,
      );
      updatePayload((current) => ({ ...current, notifications }));
    } catch (error) {
      setPageError(readErrorMessage(error, t('notifications.mark_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleMarkAllNotificationsRead() {
    if (!token || !payload || unreadNotifications.length === 0) {
      return;
    }

    setBusyAction('notification-read-all');
    try {
      const notifications = await taskBanditApi.markAllNotificationsRead(token, language);
      updatePayload((current) => ({ ...current, notifications }));
    } catch (error) {
      setPageError(readErrorMessage(error, t('notifications.mark_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateHouseholdMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setBusyAction('create-member');
    try {
      const result = await taskBanditApi.createHouseholdMember(token, language, memberForm);
      updatePayload((current) => ({ ...current, household: result.household }));
      setMemberForm(createEmptyMemberForm());
      setNotice(result.inviteEmailSent ? t('members.created_invited') : t('members.created'));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t('members.create_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  function beginEditingMember(member: Household['members'][number]) {
    setEditingMemberId(member.id);
    setMemberEditForm({
      displayName: member.displayName,
      role: member.role === 'admin' ? 'parent' : member.role,
      email: member.email ?? '',
      password: '',
    });
    setNotice(null);
    setPageError(null);
  }

  function cancelEditingMember() {
    setEditingMemberId(null);
    setMemberEditForm(createEmptyMemberEditForm());
  }

  async function handleUpdateHouseholdMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !editingMemberId) {
      return;
    }

    setBusyAction(`update-member:${editingMemberId}`);
    try {
      await taskBanditApi.updateHouseholdMember(token, language, editingMemberId, {
        displayName: memberEditForm.displayName,
        role: memberEditForm.role,
        email: memberEditForm.email,
        password: memberEditForm.password?.trim() ? memberEditForm.password : undefined,
      });
      await refreshDashboard(token, { silent: true });
      cancelEditingMember();
      setNotice(t('members.updated'));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t('members.update_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !payload) {
      return;
    }

    const sanitizedChecklist = (templateForm.checklist ?? [])
      .map((item) => ({
        title: item.title.trim(),
        required: item.required,
      }))
      .filter((item) => item.title.length > 0);
    const sanitizedDependencyRules = normalizeTemplateDependencyRules(
      templateForm.dependencyRules,
      templateForm.dependencyTemplateIds,
    );
    const sanitizedDependencyIds = sanitizedDependencyRules.map(
      (dependencyRule) => dependencyRule.templateId,
    );
    const sanitizedRecurrenceWeekdays =
      templateForm.recurrenceType === 'custom_weekly'
        ? [...new Set(templateForm.recurrenceWeekdays ?? [])]
        : [];
    const sanitizedIntervalDays =
      templateForm.recurrenceType === 'every_x_days'
        ? Math.max(1, Number(templateForm.recurrenceIntervalDays ?? 1))
        : undefined;
    const sanitizedTranslations = (templateForm.translations ?? [])
      .map((entry) => ({
        locale: entry.locale,
        groupTitle: entry.groupTitle?.trim() || undefined,
        title: entry.title?.trim() || undefined,
        description: entry.description?.trim() || undefined,
      }))
      .filter((entry) => entry.locale !== templateForm.defaultLocale)
      .filter((entry) => Boolean(entry.groupTitle || entry.title || entry.description));
    const sanitizedVariants = (templateForm.variants ?? [])
      .map((variant) => ({
        id: variant.id,
        label: variant.label.trim(),
        translations: (variant.translations ?? [])
          .map((entry) => ({
            locale: entry.locale,
            label: entry.label?.trim() || undefined,
          }))
          .filter((entry) => entry.locale !== templateForm.defaultLocale)
          .filter((entry) => Boolean(entry.label)),
      }))
      .filter((variant) => variant.label.length > 0);

    setBusyAction('create-template');
    try {
      const templatePayload = {
        ...templateForm,
        defaultLocale: templateForm.defaultLocale ?? 'en',
        groupTitle: templateForm.groupTitle.trim(),
        title: templateForm.title.trim(),
        description: templateForm.description.trim(),
        translations: sanitizedTranslations,
        variants: sanitizedVariants,
        dependencyTemplateIds: sanitizedDependencyIds,
        dependencyRules: sanitizedDependencyRules,
        recurrenceWeekdays: sanitizedRecurrenceWeekdays,
        recurrenceIntervalDays: sanitizedIntervalDays,
        checklist: sanitizedChecklist,
      };
      const savedTemplate = editingTemplateId
        ? await taskBanditApi.updateTemplate(token, language, editingTemplateId, templatePayload)
        : await taskBanditApi.createTemplate(token, language, templatePayload);
      updatePayload((current) => ({
        ...current,
        templates: editingTemplateId
          ? current.templates
              .map((template) => (template.id === editingTemplateId ? savedTemplate : template))
              .sort(
                (left, right) =>
                  left.groupTitle.localeCompare(right.groupTitle) ||
                  left.title.localeCompare(right.title),
              )
          : [...current.templates, savedTemplate].sort(
              (left, right) =>
                left.groupTitle.localeCompare(right.groupTitle) ||
                left.title.localeCompare(right.title),
            ),
      }));
      resetTemplateForm();
      setNotice(editingTemplateId ? t('templates.updated') : t('templates.created'));
      setPageError(null);
    } catch (error) {
      setPageError(
        readErrorMessage(
          error,
          editingTemplateId ? t('templates.update_failed') : t('templates.create_failed'),
        ),
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateInstance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !payload) {
      return;
    }

    const selectedTemplate = payload.templates.find(
      (template) => template.id === instanceForm.templateId,
    );
    const supportsRecurrenceEnd = Boolean(
      selectedTemplate && selectedTemplate.recurrence.type !== 'none',
    );
    if ((selectedTemplate?.variants?.length ?? 0) > 0 && !instanceForm.variantId) {
      setPageError(t('instances.subtype_required'));
      return;
    }

    if (
      supportsRecurrenceEnd &&
      instanceForm.recurrenceEndMode === 'after_occurrences' &&
      (!instanceForm.recurrenceOccurrences || instanceForm.recurrenceOccurrences <= 0)
    ) {
      setPageError(t('instances.repeat_occurrences_required'));
      return;
    }

    if (
      supportsRecurrenceEnd &&
      instanceForm.recurrenceEndMode === 'on_date' &&
      !instanceForm.recurrenceEndsAt
    ) {
      setPageError(t('instances.repeat_end_date_required'));
      return;
    }

    setBusyAction('create-instance');
    try {
      const instancePayload = {
        templateId: instanceForm.templateId,
        assigneeId: instanceForm.assigneeId || undefined,
        title: instanceForm.title?.trim() || undefined,
        dueAt: new Date(instanceForm.dueAt).toISOString(),
        variantId: instanceForm.variantId || undefined,
        reassignAutomatically: editingInstanceId
          ? Boolean(instanceForm.reassignAutomatically)
          : undefined,
        recurrenceEndMode: supportsRecurrenceEnd ? instanceForm.recurrenceEndMode : undefined,
        recurrenceOccurrences:
          supportsRecurrenceEnd && instanceForm.recurrenceEndMode === 'after_occurrences'
            ? instanceForm.recurrenceOccurrences
            : undefined,
        recurrenceEndsAt:
          supportsRecurrenceEnd &&
          instanceForm.recurrenceEndMode === 'on_date' &&
          instanceForm.recurrenceEndsAt
            ? new Date(instanceForm.recurrenceEndsAt).toISOString()
            : undefined,
      };
      const savedInstance = editingInstanceId
        ? await taskBanditApi.updateInstance(token, language, editingInstanceId, instancePayload)
        : await taskBanditApi.createInstance(token, language, instancePayload);
      updatePayload((current) => ({
        ...current,
        instances: editingInstanceId
          ? current.instances
              .map((instance) => (instance.id === editingInstanceId ? savedInstance : instance))
              .sort(
                (left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime(),
              )
          : [...current.instances, savedInstance].sort(
              (left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime(),
            ),
      }));
      resetInstanceForm();
      setIsClientComposerOpen(false);
      setNotice(editingInstanceId ? t('instances.updated') : t('instances.created'));
      setPageError(null);
    } catch (error) {
      setPageError(
        readErrorMessage(
          error,
          editingInstanceId ? t('instances.update_failed') : t('instances.create_failed'),
        ),
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCancelOccurrence(instanceId: string) {
    if (!token) {
      return;
    }

    if (!window.confirm(t('instances.cancel_occurrence_confirm'))) {
      return;
    }

    setBusyAction(`cancel-occurrence:${instanceId}`);
    try {
      await taskBanditApi.cancelOccurrence(token, language, instanceId);
      await refreshDashboard(token, { silent: true });
      setNotice(t('instances.occurrence_cancelled'));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t('instances.cancel_occurrence_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCancelSeries(instanceId: string) {
    if (!token) {
      return;
    }

    if (!window.confirm(t('instances.cancel_series_confirm'))) {
      return;
    }

    setBusyAction(`cancel-series:${instanceId}`);
    try {
      await taskBanditApi.cancelSeries(token, language, instanceId);
      await refreshDashboard(token, { silent: true });
      setNotice(t('instances.series_cancelled'));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t('instances.cancel_series_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDownloadChoresExport() {
    if (!payload) {
      return;
    }

    setBusyAction('download-chores-export');
    try {
      const header = [
        'id',
        'group',
        'type',
        'subtype',
        'title',
        'state',
        'assignee',
        'dueAt',
        'completedAt',
        'cancelledAt',
        'difficulty',
        'basePoints',
        'awardedPoints',
        'requirePhotoProof',
        'attachmentCount',
        'submittedAt',
        'reviewedAt',
      ];
      const rows = exportableChores.map((instance) => [
        instance.id,
        instance.groupTitle || '',
        instance.typeTitle || '',
        instance.subtypeLabel ?? '',
        instance.title,
        instance.state,
        instance.assigneeId ? (memberLookup.get(instance.assigneeId) ?? '') : '',
        instance.dueAt,
        instance.completedAt ?? '',
        instance.cancelledAt ?? '',
        instance.difficulty,
        String(instance.basePoints),
        String(instance.awardedPoints),
        instance.requirePhotoProof ? 'true' : 'false',
        String(instance.attachmentCount),
        instance.submittedAt ?? '',
        instance.reviewedAt ?? '',
      ]);
      const csv = [header, ...rows]
        .map((row) => row.map((value) => escapeCsvValue(String(value))).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      downloadBlob(blob, 'taskbandit-chores.csv');
      setNotice(t('exports.chores_downloaded'));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t('exports.chores_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRefreshRuntimeLogs() {
    if (!token) {
      return;
    }

    setBusyAction('refresh-runtime-logs');
    try {
      await refreshRuntimeLogs(token, { reportErrors: true });
      setNotice(t('logs.refreshed'));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDownloadRuntimeLogs(format: 'txt' | 'json') {
    if (!token) {
      return;
    }

    setBusyAction(`download-runtime-logs-${format}`);
    try {
      const blob =
        format === 'txt'
          ? await taskBanditApi.downloadRuntimeLogsText(token, language)
          : await taskBanditApi.downloadRuntimeLogsJson(token, language);
      downloadBlob(
        blob,
        format === 'txt' ? 'taskbandit-runtime.log' : 'taskbandit-runtime-logs.json',
      );
      setNotice(format === 'txt' ? t('logs.exported_text') : t('logs.exported_json'));
    } catch (error) {
      setPageError(readErrorMessage(error, t('logs.export_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDownloadHouseholdSnapshot() {
    if (!token) {
      return;
    }

    setBusyAction('download-household-snapshot');
    try {
      const blob = await taskBanditApi.downloadHouseholdSnapshot(token, language);
      downloadBlob(blob, 'taskbandit-household-snapshot.json');
      setNotice(t('exports.household_snapshot_downloaded'));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t('exports.household_snapshot_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRefreshSystemStatus() {
    if (!token) {
      return;
    }

    setBusyAction('refresh-system-status');
    try {
      await refreshSystemStatus(token, { reportErrors: true });
      setNotice(t('system_status.refreshed'));
      setPageError(null);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRefreshBackupReadiness() {
    if (!token) {
      return;
    }

    setBusyAction('refresh-backup-readiness');
    try {
      await refreshBackupReadiness(token, { reportErrors: true });
      setNotice(t('backup.refreshed'));
      setPageError(null);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRetryPushDelivery(deliveryId: string) {
    if (!token) {
      return;
    }

    setBusyAction(`retry-push:${deliveryId}`);
    try {
      await taskBanditApi.retryPushDelivery(token, language, deliveryId);
      await refreshDashboard(token, { silent: true });
      setNotice(t('notification_recovery.push_retry_success'));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t('notification_recovery.push_retry_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRetryEmailDelivery(notificationId: string) {
    if (!token) {
      return;
    }

    setBusyAction(`retry-email:${notificationId}`);
    try {
      await taskBanditApi.retryEmailDelivery(token, language, notificationId);
      await refreshDashboard(token, { silent: true });
      setNotice(t('notification_recovery.email_retry_success'));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t('notification_recovery.email_retry_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCancelInstance(instanceId: string) {
    if (!token) {
      return;
    }

    setBusyAction(`cancel:${instanceId}`);
    try {
      const cancelledInstance = await taskBanditApi.cancelInstance(token, language, instanceId);
      updatePayload((current) => ({
        ...current,
        instances: current.instances.map((instance) =>
          instance.id === instanceId ? cancelledInstance : instance,
        ),
      }));
      setNotice(t('instances.cancelled'));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t('instances.cancel_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleStartInstance(instanceId: string) {
    if (!token) {
      return;
    }

    setBusyAction(`start:${instanceId}`);
    try {
      const startedInstance = await taskBanditApi.startInstance(token, language, instanceId);
      updatePayload((current) => ({
        ...current,
        instances: current.instances.map((instance) =>
          instance.id === instanceId ? startedInstance : instance,
        ),
      }));
      setNotice(t('instances.started'));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t('instances.start_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  function toggleChecklistItem(instanceId: string, checklistItemId: string, fallbackIds: string[]) {
    setSubmitSelections((current) => {
      const selected = new Set(current[instanceId] ?? fallbackIds);
      if (selected.has(checklistItemId)) {
        selected.delete(checklistItemId);
      } else {
        selected.add(checklistItemId);
      }

      return {
        ...current,
        [instanceId]: [...selected],
      };
    });
  }

  function getSelectedChecklistIds(instance: ChoreInstance) {
    return submitSelections[instance.id] ?? instance.checklistCompletionIds;
  }

  function handleProofFilesSelected(instanceId: string, files: FileList | null) {
    setSelectedProofFiles((current) => ({
      ...current,
      [instanceId]: files ? Array.from(files) : [],
    }));
  }

  async function handleOpenAttachment(attachment: ChoreAttachment) {
    if (!token) {
      return;
    }

    setBusyAction(`attachment:${attachment.id}`);

    try {
      const result = await taskBanditApi.downloadProofAttachment(token, language, attachment.id);
      const objectUrl = window.URL.createObjectURL(result.blob);
      const popup = window.open(objectUrl, '_blank', 'noopener,noreferrer');

      if (!popup) {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = result.filename ?? attachment.clientFilename;
        document.body.append(link);
        link.click();
        link.remove();
      }

      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 60_000);
    } catch (error) {
      setPageError(readErrorMessage(error, t('attachments.open_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  function renderAttachmentList(label: string, attachments: ChoreAttachment[]) {
    return (
      <div className="attachment-list">
        <strong>{label}:</strong>
        <ul className="simple-list compact-list">
          {attachments.map((attachment) => (
            <li key={attachment.id}>
              <button
                className="ghost-button"
                type="button"
                disabled={busyAction === `attachment:${attachment.id}`}
                onClick={() => void handleOpenAttachment(attachment)}
              >
                {busyAction === `attachment:${attachment.id}`
                  ? t('attachments.opening')
                  : `${t('attachments.open')}: ${attachment.clientFilename}`}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function getLanguageLabel(locale: AppLanguage) {
    if (locale === 'de') {
      return t('language.german');
    }
    if (locale === 'hu') {
      return t('language.hungarian');
    }
    return t('language.english');
  }

  function getTemplateTranslation(locale: TemplateTranslationLocale) {
    return (templateForm.translations ?? []).find((entry) => entry.locale === locale);
  }

  function toggleBootstrapStarterTemplate(key: string, enabled: boolean) {
    setBootstrapForm((current) => {
      const selectedKeys = new Set(current.starterTemplateKeys ?? []);
      if (enabled) {
        selectedKeys.add(key);
      } else {
        selectedKeys.delete(key);
      }

      return {
        ...current,
        starterTemplateKeys: [...selectedKeys],
      };
    });
  }

  function setBootstrapStarterGroupSelection(keys: string[], enabled: boolean) {
    setBootstrapForm((current) => {
      const selectedKeys = new Set(current.starterTemplateKeys ?? []);
      for (const key of keys) {
        if (enabled) {
          selectedKeys.add(key);
        } else {
          selectedKeys.delete(key);
        }
      }

      return {
        ...current,
        starterTemplateKeys: [...selectedKeys],
      };
    });
  }

  function goToBootstrapStep(step: typeof bootstrapSetupStep) {
    if (step !== 'account' && !bootstrapAccountComplete) {
      setBootstrapSetupStep('account');
      return;
    }

    setBootstrapSetupStep(step);
  }

  function handleBootstrapNext() {
    if (bootstrapSetupStep === 'account') {
      goToBootstrapStep('templates');
      return;
    }

    if (bootstrapSetupStep === 'templates') {
      goToBootstrapStep('review');
    }
  }

  function handleBootstrapBack() {
    if (bootstrapSetupStep === 'review') {
      setBootstrapSetupStep('templates');
      return;
    }

    if (bootstrapSetupStep === 'templates') {
      setBootstrapSetupStep('account');
    }
  }

  function updateTemplateTranslation(
    locale: AppLanguage,
    nextValue: Partial<Pick<LocalizedTemplateTranslation, 'groupTitle' | 'title' | 'description'>>,
  ) {
    setTemplateForm((current) => {
      const existingEntries = current.translations ?? [];
      const existingEntry = existingEntries.find((entry) => entry.locale === locale);
      const mergedEntry: LocalizedTemplateTranslation = {
        locale,
        groupTitle: nextValue.groupTitle ?? existingEntry?.groupTitle,
        title: nextValue.title ?? existingEntry?.title,
        description: nextValue.description ?? existingEntry?.description,
      };
      const hasContent = Boolean(
        mergedEntry.groupTitle?.trim() ||
        mergedEntry.title?.trim() ||
        mergedEntry.description?.trim(),
      );
      const filteredEntries = existingEntries.filter((entry) => entry.locale !== locale);

      return {
        ...current,
        translations: hasContent ? [...filteredEntries, mergedEntry] : filteredEntries,
      };
    });
  }

  function addVariantDraftItem() {
    setTemplateForm((current) => ({
      ...current,
      variants: [...(current.variants ?? []), { label: '', translations: [] }],
    }));
  }

  function updateVariantDraftItem(
    index: number,
    nextValue: Partial<NonNullable<TemplateFormState['variants']>[number]>,
  ) {
    setTemplateForm((current) => ({
      ...current,
      variants: (current.variants ?? []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...nextValue } : item,
      ),
    }));
  }

  function updateVariantTranslation(index: number, locale: AppLanguage, label: string) {
    setTemplateForm((current) => ({
      ...current,
      variants: (current.variants ?? []).map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const existingEntries = item.translations ?? [];
        const filteredEntries = existingEntries.filter((entry) => entry.locale !== locale);
        const nextEntries = label.trim()
          ? [...filteredEntries, { locale, label }]
          : filteredEntries;

        return {
          ...item,
          translations: nextEntries,
        };
      }),
    }));
  }

  function removeVariantDraftItem(index: number) {
    setTemplateForm((current) => ({
      ...current,
      variants: (current.variants ?? []).filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function addChecklistDraftItem() {
    setTemplateForm((current) => ({
      ...current,
      checklist: [...(current.checklist ?? []), { title: '', required: true }],
    }));
  }

  function updateChecklistDraftItem(
    index: number,
    nextValue: { title?: string; required?: boolean },
  ) {
    setTemplateForm((current) => ({
      ...current,
      checklist: (current.checklist ?? []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...nextValue } : item,
      ),
    }));
  }

  function removeChecklistDraftItem(index: number) {
    setTemplateForm((current) => ({
      ...current,
      checklist: (current.checklist ?? []).filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function setTemplateDependencySelection(nextTemplateIds: string[]) {
    setTemplateForm((current) => {
      const currentRules = normalizeTemplateDependencyRules(
        current.dependencyRules,
        current.dependencyTemplateIds,
      );
      const uniqueTemplateIds = [...new Set(nextTemplateIds)];
      const nextRules = uniqueTemplateIds.map(
        (templateId) =>
          currentRules.find((dependencyRule) => dependencyRule.templateId === templateId) ?? {
            templateId,
            delayValue: defaultDependencyDelayValue,
            delayUnit: defaultDependencyDelayUnit,
          },
      );

      return {
        ...current,
        dependencyRules: nextRules,
        dependencyTemplateIds: nextRules.map((dependencyRule) => dependencyRule.templateId),
      };
    });
  }

  function toggleTemplateDependencyRule(templateId: string, enabled: boolean) {
    const nextSelectedIds = enabled
      ? [
          ...selectedTemplateDependencyRules.map((dependencyRule) => dependencyRule.templateId),
          templateId,
        ]
      : selectedTemplateDependencyRules
          .map((dependencyRule) => dependencyRule.templateId)
          .filter((dependencyId) => dependencyId !== templateId);
    setTemplateDependencySelection(nextSelectedIds);
  }

  function updateTemplateDependencyRule(
    templateId: string,
    nextValue: Partial<Pick<ChoreTemplateDependencyRule, 'delayValue' | 'delayUnit'>>,
  ) {
    setTemplateForm((current) => {
      const currentRules = normalizeTemplateDependencyRules(
        current.dependencyRules,
        current.dependencyTemplateIds,
      );
      const existingRule = currentRules.find(
        (dependencyRule) => dependencyRule.templateId === templateId,
      );
      if (!existingRule) {
        return current;
      }

      const updatedRule: ChoreTemplateDependencyRule = {
        ...existingRule,
        ...nextValue,
        delayValue: Math.max(
          1,
          Math.floor(
            Number(nextValue.delayValue ?? existingRule.delayValue ?? defaultDependencyDelayValue),
          ),
        ),
        delayUnit: nextValue.delayUnit ?? existingRule.delayUnit ?? defaultDependencyDelayUnit,
      };

      const nextRules = currentRules.map((dependencyRule) =>
        dependencyRule.templateId === templateId ? updatedRule : dependencyRule,
      );

      return {
        ...current,
        dependencyRules: nextRules,
        dependencyTemplateIds: nextRules.map((dependencyRule) => dependencyRule.templateId),
      };
    });
  }

  function resetTemplateForm() {
    setEditingTemplateId(null);
    setTemplateEditorLocale('en');
    setTemplateForm(createEmptyTemplateForm('en'));
  }

  function resetInstanceForm() {
    setEditingInstanceId(null);
    setInstanceForm((current) => ({
      ...current,
      templateGroupTitle: visibleScheduleTemplateGroup,
      assigneeId: '',
      title: '',
      dueAt: '',
      reassignAutomatically: false,
      recurrenceEndMode: 'never',
      recurrenceOccurrences: 3,
      recurrenceEndsAt: '',
    }));
  }

  function startEditingTemplate(template: ChoreTemplate) {
    setEditingTemplateId(template.id);
    setTemplateSearch(template.title);
    setTemplateEditorLocale(template.defaultLocale);
    setSelectedTemplateBrowserGroup(template.groupTitle);
    setTemplateForm({
      defaultLocale: template.defaultLocale,
      groupTitle: template.groupTitle,
      title: template.title,
      description: template.description,
      translations: template.translations?.map((entry) => ({ ...entry })) ?? [],
      difficulty: template.difficulty,
      assignmentStrategy: template.assignmentStrategy,
      recurrenceType: template.recurrence.type,
      recurrenceIntervalDays: template.recurrence.intervalDays ?? 2,
      recurrenceWeekdays: template.recurrence.weekdays,
      requirePhotoProof: template.requirePhotoProof,
      stickyFollowUpAssignee: template.stickyFollowUpAssignee,
      recurrenceStartStrategy: template.recurrenceStartStrategy ?? 'due_at',
      variants:
        template.variants?.map((variant) => ({
          id: variant.id,
          label: variant.label,
          translations: variant.translations?.map((entry) => ({ ...entry })) ?? [],
        })) ?? [],
      dependencyTemplateIds: template.dependencyTemplateIds,
      dependencyRules: normalizeTemplateDependencyRules(
        template.dependencyRules,
        template.dependencyTemplateIds,
      ),
      checklist: template.checklist.map((item) => ({
        title: item.title,
        required: item.required,
      })),
      masteryDisabled: template.mastery?.disabled ?? false,
      masteryLevel1Threshold: template.mastery?.level1Threshold ?? 5,
      masteryLevel2Threshold: template.mastery?.level2Threshold ?? 10,
      masteryLevel2BonusPercentage: template.mastery?.level2BonusPercentage ?? 10,
    });
  }

  async function handleDeleteTemplate(templateId: string) {
    if (!token || !payload) {
      return;
    }

    if (!window.confirm(t('templates.delete_confirm'))) {
      return;
    }

    setBusyAction(`delete-template:${templateId}`);
    try {
      await taskBanditApi.deleteTemplate(token, language, templateId);
      updatePayload((current) => ({
        ...current,
        templates: current.templates.filter((template) => template.id !== templateId),
      }));

      if (editingTemplateId === templateId) {
        resetTemplateForm();
      }

      setInstanceForm((current) =>
        current.templateId === templateId
          ? {
              ...current,
              templateId: '',
              variantId: undefined,
            }
          : current,
      );
      setNotice(t('templates.deleted'));
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t('templates.delete_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleResetTemplatesToDefaults() {
    if (!token || !payload) return;
    if (!window.confirm(t('templates.reset_to_defaults_confirm'))) return;
    setBusyAction('reset-templates');
    try {
      const result = await taskBanditApi.resetTemplatesToDefaults(token, language);
      const freshTemplates = await taskBanditApi.getTemplates(token, language);
      updatePayload((current) => ({ ...current, templates: freshTemplates }));
      resetTemplateForm();
      setNotice(
        t('templates.reset_to_defaults_done').replace('{count}', String(result.templateCount)),
      );
      setPageError(null);
    } catch (error) {
      setPageError(readErrorMessage(error, t('templates.reset_to_defaults_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  function startEditingInstance(instance: ChoreInstance) {
    setEditingInstanceId(instance.id);
    setInstanceForm({
      templateId: instance.templateId ?? '',
      assigneeId: instance.assigneeId ?? '',
      title: instance.title,
      dueAt: formatDateTimeLocal(instance.dueAt),
      variantId: instance.variantId ?? undefined,
      reassignAutomatically: false,
      recurrenceEndMode: instance.recurrenceEndMode ?? 'never',
      recurrenceOccurrences: instance.recurrenceOccurrences ?? 3,
      recurrenceEndsAt: instance.recurrenceEndsAt
        ? formatDateTimeLocal(instance.recurrenceEndsAt)
        : '',
    });
    if (workspaceVariant === 'client' && isClientMobileViewport) {
      setActivePage('chores');
      setIsClientComposerOpen(true);
    }
  }

  function openMobileDueEditor(instance: ChoreInstance) {
    setMobileDueEditorInstanceId(instance.id);
    setMobileDueEditorValue(formatDateTimeLocal(instance.dueAt));
    setMobileDueEditorTitle(stripLeadingChoreIconToken(instance.title ?? ''));
    setMobileDueEditorIconId(
      resolveChoreIconIdFromText(
        instance.title ?? '',
        instance.groupTitle,
        instance.subtypeLabel ?? '',
      ) ?? '',
    );
    setMobileDueEditorVariantId(instance.variantId ?? '');
    setPageError(null);
  }

  const closeMobileDueEditor = choreCloseMobileDueEditor;

  async function handleSaveMobileDueEditor() {
    if (!token || !mobileDueEditorInstance || !mobileDueEditorValue) {
      return;
    }
    if (!mobileDueEditorInstance.templateId) {
      setPageError(t('instances.update_failed'));
      return;
    }

    const dueAtDate = new Date(mobileDueEditorValue);
    if (Number.isNaN(dueAtDate.getTime())) {
      setPageError(t('instances.update_failed'));
      return;
    }

    setBusyAction(`update-due:${mobileDueEditorInstance.id}`);
    try {
      const updatedInstance = await taskBanditApi.updateInstance(
        token,
        language,
        mobileDueEditorInstance.id,
        {
          templateId: mobileDueEditorInstance.templateId,
          assigneeId: mobileDueEditorInstance.assigneeId ?? undefined,
          title:
            applyChoreIconToken(mobileDueEditorTitle, mobileDueEditorIconId as ChoreIconId | '') ||
            undefined,
          dueAt: dueAtDate.toISOString(),
          variantId: mobileDueEditorVariantId || undefined,
          recurrenceEndMode: mobileDueEditorInstance.recurrenceEndMode ?? undefined,
          recurrenceOccurrences:
            mobileDueEditorInstance.recurrenceEndMode === 'after_occurrences'
              ? (mobileDueEditorInstance.recurrenceOccurrences ?? undefined)
              : undefined,
          recurrenceEndsAt:
            mobileDueEditorInstance.recurrenceEndMode === 'on_date' &&
            mobileDueEditorInstance.recurrenceEndsAt
              ? mobileDueEditorInstance.recurrenceEndsAt
              : undefined,
        },
      );
      updatePayload((current) => ({
        ...current,
        instances: current.instances
          .map((instance) =>
            instance.id === mobileDueEditorInstance.id ? updatedInstance : instance,
          )
          .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()),
      }));
      setNotice(t('instances.updated'));
      setPageError(null);
      closeMobileDueEditor();
    } catch (error) {
      setPageError(readErrorMessage(error, t('instances.update_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  function formatDate(value: string | null) {
    if (!value) {
      return t('common.none');
    }

    return new Intl.DateTimeFormat(language, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  function formatMobileDueLabel(value: string | null) {
    if (!value) {
      return 'Due later';
    }

    const dueDate = new Date(value);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const isSameCalendarDay = (left: Date, right: Date) =>
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate();

    if (isSameCalendarDay(dueDate, today)) {
      return 'Due today';
    }

    if (isSameCalendarDay(dueDate, tomorrow)) {
      return 'Due tomorrow';
    }

    return `Due ${new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric' }).format(dueDate)}`;
  }

  function getMobileCardStatus(instance: ChoreInstance) {
    if (instance.state === 'completed') {
      return { label: 'Done', className: 'mock-status-done' };
    }

    const dueTime = instance.dueAt ? new Date(instance.dueAt).getTime() : Number.NaN;
    const dueSoon = Number.isFinite(dueTime) && dueTime <= Date.now() + 36 * 60 * 60 * 1000;

    if (instance.state === 'overdue' || dueSoon) {
      return { label: 'Due soon', className: 'mock-status-due-soon' };
    }

    return { label: 'To do', className: 'mock-status-todo' };
  }

  function formatCalendarDate(value: string) {
    return new Intl.DateTimeFormat(language, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
  }

  function formatDateTimeLocal(value: string) {
    const date = new Date(value);
    const pad = (part: number) => part.toString().padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function formatStatusChip(status: 'ready' | 'warning' | 'error') {
    return t(`system_status.status_${status}`);
  }

  const roadmap = [
    t('roadmap.bootstrap'),
    t('roadmap.templates'),
    t('roadmap.approvals'),
    t('roadmap.leaderboard'),
  ];

  const pageSectionLinks = useMemo<WorkspaceSectionLink[]>(() => {
    switch (activePage) {
      case 'overview':
        return [
          ...(payload?.currentUser.role !== 'child'
            ? [
                {
                  key: 'overview-approvals',
                  label: t('panel.approval_queue'),
                  ref: approvalQueueRef,
                },
              ]
            : []),
          { key: 'overview-notifications', label: t('panel.notifications'), ref: notificationsRef },
        ];
      case 'chores':
        return [
          ...(workspaceVariant === 'client' && payload?.currentUser.role !== 'child'
            ? [{ key: 'chores-schedule', label: t('panel.schedule_chore'), ref: scheduleRef }]
            : []),
          ...(payload?.compatibility.takeoverRequests && pendingTakeoverRequests.length > 0
            ? [
                {
                  key: 'chores-takeovers',
                  label: t('panel.takeover_approvals'),
                  ref: takeoverRequestsRef,
                },
              ]
            : []),
          { key: 'chores-mine', label: t('panel.my_chores'), ref: myChoresRef },
          { key: 'chores-history', label: t('panel.chore_history'), ref: choreHistoryRef },
        ];
      case 'leaderboard':
        return [{ key: 'leaderboard-main', label: t('panel.leaderboard'), ref: leaderboardRef }];
      case 'templates':
        return [{ key: 'templates-list', label: t('panel.chore_templates'), ref: templatesRef }];
      case 'household':
        return [
          { key: 'household-members', label: t('members.manage_section'), ref: membersRef },
          {
            key: 'household-members-create',
            label: t('members.create_section'),
            ref: memberCreateRef,
          },
          { key: 'household-chores', label: t('panel.household_chores'), ref: householdChoresRef },
        ];
      case 'notifications':
        return [
          { key: 'notifications-inbox', label: t('panel.notifications'), ref: notificationsRef },
          {
            key: 'notifications-preferences',
            label: t('panel.notification_preferences'),
            ref: notificationPreferencesRef,
          },
          ...(payload?.compatibility.notificationDevices
            ? [
                {
                  key: 'notifications-devices',
                  label: t('panel.mobile_push_devices'),
                  ref: notificationDevicesRef,
                },
              ]
            : []),
        ];
      case 'settings':
        return workspaceVariant === 'client'
          ? [
              ...(isClientMobileViewport
                ? [
                    {
                      key: 'settings-notifications',
                      label: t('panel.notifications'),
                      ref: notificationsRef,
                    },
                  ]
                : []),
              {
                key: 'settings-preferences',
                label: t('panel.notification_preferences'),
                ref: notificationPreferencesRef,
              },
              ...(payload?.compatibility.notificationDevices
                ? [
                    {
                      key: 'settings-devices',
                      label: t('panel.mobile_push_devices'),
                      ref: notificationDevicesRef,
                    },
                  ]
                : []),
            ]
          : [
              {
                key: 'settings-general',
                label: t('settings.section_general'),
                ref: generalSettingsRef,
              },
              { key: 'settings-oidc', label: t('settings.section_oidc'), ref: oidcSettingsRef },
              { key: 'settings-smtp', label: t('settings.section_smtp'), ref: smtpSettingsRef },
            ];
      case 'admin':
        return [
          ...(payload?.compatibility.notificationHealth
            ? [
                {
                  key: 'admin-notification-health',
                  label: t('panel.household_notification_health'),
                  ref: notificationHealthRef,
                },
              ]
            : []),
          ...(payload?.compatibility.backupReadiness
            ? [{ key: 'admin-backup', label: t('panel.backup_readiness'), ref: backupReadinessRef }]
            : []),
          ...(payload?.compatibility.systemStatus
            ? [{ key: 'admin-system', label: t('panel.system_status'), ref: systemStatusRef }]
            : []),
          ...(payload?.compatibility.notificationRecovery
            ? [
                {
                  key: 'admin-recovery',
                  label: t('panel.notification_recovery'),
                  ref: notificationRecoveryRef,
                },
              ]
            : []),
        ];
      default:
        return [];
    }
  }, [
    activePage,
    leaderboardRef,
    memberCreateRef,
    payload?.currentUser.role,
    payload?.compatibility.backupReadiness,
    payload?.compatibility.notificationDevices,
    payload?.compatibility.notificationHealth,
    payload?.compatibility.notificationRecovery,
    payload?.compatibility.systemStatus,
    payload?.compatibility.takeoverRequests,
    pendingTakeoverRequests.length,
    t,
    workspaceVariant,
  ]);

  function openWorkspacePage(page: WorkspacePage, targetRef?: RefObject<HTMLElement | null>) {
    if (workspaceVariant === 'client' && page !== 'chores') {
      setIsClientComposerOpen(false);
      if (editingInstanceId) {
        resetInstanceForm();
      }
    }
    setIsMobileProfileOpen(false);

    const nextPathname = getPathnameForWorkspacePage(page);
    if (window.location.pathname !== nextPathname) {
      const currentUrl = new URL(window.location.href);
      currentUrl.pathname = nextPathname;
      window.history.pushState({}, document.title, currentUrl.toString());
    }

    setActivePage(page);
    if (targetRef) {
      window.setTimeout(() => {
        scrollToSection(targetRef);
      }, 60);
    }
  }

  function handleDismissAvailableUpdate() {
    if (!availableUpdateKey) {
      return;
    }

    window.localStorage.setItem(getDismissedUpdateStorageKey(workspaceVariant), availableUpdateKey);
    setDismissedUpdateKey(availableUpdateKey);
  }

  async function handleInstallPwa() {
    if (!installPromptEvent) {
      return;
    }

    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPromptEvent(null);
      setNotice(t('pwa.install_success'));
      return;
    }

    setInstallPromptEvent(null);
  }

  function handleDismissInstallPrompt() {
    window.localStorage.setItem(getDismissedPwaInstallStorageKey(workspaceVariant), 'true');
    setInstallPromptDismissed(true);
    setInstallPromptEvent(null);
  }

  function handleSelectMobileAvatar(avatarAssetPath: string) {
    setMobileProfileAvatar(avatarAssetPath);
    writeStoredMobileAvatar(workspaceVariant, avatarAssetPath);
  }

  async function handleMobileAvatarUpload(event: FormEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const selectedFile = input.files?.[0];
    if (!selectedFile) {
      return;
    }

    try {
      const dataUrl = await convertImageFileToAvatarDataUrl(selectedFile);
      setMobileProfileAvatar(dataUrl);
      writeStoredMobileAvatar(workspaceVariant, dataUrl);
      setNotice('Profile picture updated.');
    } catch (error) {
      setPageError(readErrorMessage(error, 'Could not use that image.'));
    } finally {
      input.value = '';
    }
  }

  async function handleEnableBrowserNotifications() {
    if (!token) {
      return;
    }

    setBusyAction('enable-browser-notifications');
    try {
      const status = await enableClientWebPush({
        token,
        language,
        appVersion: `${currentWebReleaseInfo.releaseVersion}+${currentWebReleaseInfo.buildNumber}`,
      });
      setClientWebPushStatus(status);

      if (status.enabled) {
        setNotice(t('pwa.browser_notifications_enabled'));
        await refreshDashboard(token, { silent: true });
      } else if (status.permission === 'denied') {
        setPageError(t('pwa.browser_notifications_denied'));
      }
    } catch (error) {
      setPageError(readErrorMessage(error, t('pwa.browser_notifications_failed')));
    } finally {
      setBusyAction(null);
    }
  }

  function handleOpenClientComposer() {
    setActivePage('chores');
    setPageError(null);
    resetInstanceForm();
    setIsClientComposerOpen(true);
  }

  function handleCloseClientComposer() {
    resetInstanceForm();
    setIsClientComposerOpen(false);
  }

  function renderScheduleChorePanel(
    pageClassName: string,
    options?: {
      mobileSheet?: boolean;
    },
  ) {
    if (!payload) {
      return null;
    }

    const selectedTemplate =
      visibleScheduleTemplates.find((template) => template.id === instanceForm.templateId) ??
      payload.templates.find((template) => template.id === instanceForm.templateId);
    const selectedTemplateRepeats = selectedTemplate && selectedTemplate.recurrence.type !== 'none';
    const isMobileCompact = Boolean(options?.mobileSheet);

    return (
      <article
        className={`panel ${options?.mobileSheet ? 'mobile-composer-panel' : `page-panel ${pageClassName}`}`}
        ref={scheduleRef}
      >
        <div className={`section-heading ${options?.mobileSheet ? 'mobile-composer-heading' : ''}`}>
          <div>
            <h2 id={options?.mobileSheet ? 'mobile-chore-composer-title' : undefined}>
              {t('panel.schedule_chore')}
            </h2>
            {options?.mobileSheet ? (
              <p className="schedule-panel-subtitle">{activePageDescription}</p>
            ) : null}
          </div>
          <div className="workspace-page-meta">
            <span className="section-kicker">{visibleHouseholdChores.length}</span>
            {options?.mobileSheet ? (
              <button className="ghost-button" type="button" onClick={handleCloseClientComposer}>
                {t('common.cancel')}
              </button>
            ) : null}
          </div>
        </div>
        <form
          className={`login-form member-form schedule-form ${isMobileCompact ? 'schedule-form-mobile-compact' : ''}`}
          onSubmit={handleCreateInstance}
        >
          <label>
            <span>{t('instances.group')}</span>
            <select
              value={visibleScheduleTemplateGroup}
              onChange={(event) => {
                const nextGroupTitle = event.target.value;
                setSelectedTemplateGroup(nextGroupTitle);
                setInstanceForm((current) => ({
                  ...current,
                  templateGroupTitle: nextGroupTitle,
                  variantId: undefined,
                }));
              }}
            >
              {templateGroupOptions.map((groupTitle) => (
                <option key={groupTitle} value={groupTitle}>
                  {groupTitle}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('instances.template')}</span>
            <select
              value={instanceForm.templateId}
              onChange={(event) =>
                setInstanceForm((current) => ({
                  ...current,
                  templateId: event.target.value,
                  templateGroupTitle: visibleScheduleTemplateGroup,
                  variantId: undefined,
                }))
              }
            >
              {visibleScheduleTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title}
                </option>
              ))}
            </select>
          </label>
          {(() => {
            const selectedTemplateWithVariants = payload.templates.find(
              (template) => template.id === instanceForm.templateId,
            );
            if ((selectedTemplateWithVariants?.variants?.length ?? 0) === 0) {
              return null;
            }

            return (
              <label>
                <span>{t('instances.subtype')}</span>
                <select
                  required
                  value={instanceForm.variantId ?? ''}
                  onChange={(event) =>
                    setInstanceForm((current) => ({
                      ...current,
                      variantId: event.target.value || undefined,
                    }))
                  }
                >
                  <option value="">{t('instances.select_subtype')}</option>
                  {selectedTemplateWithVariants!.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.label}
                    </option>
                  ))}
                </select>
                <small className="inline-message">{t('instances.subtype_required')}</small>
              </label>
            );
          })()}
          {editingInstanceId && !hasFeature('reassignment') ? null : isMobileCompact ? (
            <details className="schedule-collapsible">
              <summary>{t('instances.assignee')}</summary>
              <div className="schedule-collapsible-content">
                <label>
                  <span>{t('instances.assignee')}</span>
                  <select
                    value={instanceForm.assigneeId ?? ''}
                    onChange={(event) =>
                      setInstanceForm((current) => ({
                        ...current,
                        assigneeId: event.target.value,
                        reassignAutomatically: event.target.value
                          ? false
                          : current.reassignAutomatically,
                      }))
                    }
                  >
                    <option value="">{t('instances.unassigned')}</option>
                    {payload.household.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                {editingInstanceId ? (
                  <label className="toggle-row">
                    <span>{t('instances.reassign_automatically')}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(instanceForm.reassignAutomatically)}
                      disabled={Boolean(instanceForm.assigneeId)}
                      onChange={(event) =>
                        setInstanceForm((current) => ({
                          ...current,
                          reassignAutomatically: event.target.checked,
                        }))
                      }
                    />
                  </label>
                ) : null}
              </div>
            </details>
          ) : (
            <>
              <label>
                <span>{t('instances.assignee')}</span>
                <select
                  value={instanceForm.assigneeId ?? ''}
                  onChange={(event) =>
                    setInstanceForm((current) => ({
                      ...current,
                      assigneeId: event.target.value,
                      reassignAutomatically: event.target.value
                        ? false
                        : current.reassignAutomatically,
                    }))
                  }
                >
                  <option value="">{t('instances.unassigned')}</option>
                  {payload.household.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
              </label>
              {editingInstanceId ? (
                <label className="toggle-row">
                  <span>{t('instances.reassign_automatically')}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(instanceForm.reassignAutomatically)}
                    disabled={Boolean(instanceForm.assigneeId)}
                    onChange={(event) =>
                      setInstanceForm((current) => ({
                        ...current,
                        reassignAutomatically: event.target.checked,
                      }))
                    }
                  />
                </label>
              ) : null}
            </>
          )}
          <label>
            <span>{t('instances.title_override')}</span>
            <input
              type="text"
              value={instanceForm.title ?? ''}
              onChange={(event) =>
                setInstanceForm((current) => ({ ...current, title: event.target.value }))
              }
            />
          </label>
          <label>
            <span>{t('instances.due_at')}</span>
            <input
              type="datetime-local"
              value={instanceForm.dueAt}
              onChange={(event) =>
                setInstanceForm((current) => ({ ...current, dueAt: event.target.value }))
              }
              required
            />
          </label>
          {selectedTemplateRepeats ? (
            isMobileCompact ? (
              <details className="schedule-collapsible">
                <summary>{t('instances.repeat_duration')}</summary>
                <div className="schedule-form-section schedule-collapsible-content">
                  <label>
                    <span>{t('instances.repeat_duration')}</span>
                    <select
                      value={instanceForm.recurrenceEndMode ?? 'never'}
                      onChange={(event) =>
                        setInstanceForm((current) => ({
                          ...current,
                          recurrenceEndMode: event.target
                            .value as InstanceFormState['recurrenceEndMode'],
                        }))
                      }
                    >
                      <option value="never">{t('instances.repeat_forever')}</option>
                      <option value="after_occurrences">
                        {t('instances.repeat_after_occurrences')}
                      </option>
                      <option value="on_date">{t('instances.repeat_until_date')}</option>
                    </select>
                  </label>
                  {instanceForm.recurrenceEndMode === 'after_occurrences' ? (
                    <label>
                      <span>{t('instances.repeat_occurrence_count')}</span>
                      <input
                        type="number"
                        min={1}
                        value={instanceForm.recurrenceOccurrences ?? ''}
                        onChange={(event) =>
                          setInstanceForm((current) => ({
                            ...current,
                            recurrenceOccurrences: event.target.value
                              ? Math.max(1, Math.floor(Number(event.target.value)))
                              : undefined,
                          }))
                        }
                        required
                      />
                    </label>
                  ) : null}
                  {instanceForm.recurrenceEndMode === 'on_date' ? (
                    <label>
                      <span>{t('instances.repeat_end_date')}</span>
                      <input
                        type="datetime-local"
                        value={instanceForm.recurrenceEndsAt ?? ''}
                        onChange={(event) =>
                          setInstanceForm((current) => ({
                            ...current,
                            recurrenceEndsAt: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                  ) : null}
                </div>
              </details>
            ) : (
              <div className="schedule-form-section">
                <label>
                  <span>{t('instances.repeat_duration')}</span>
                  <select
                    value={instanceForm.recurrenceEndMode ?? 'never'}
                    onChange={(event) =>
                      setInstanceForm((current) => ({
                        ...current,
                        recurrenceEndMode: event.target
                          .value as InstanceFormState['recurrenceEndMode'],
                      }))
                    }
                  >
                    <option value="never">{t('instances.repeat_forever')}</option>
                    <option value="after_occurrences">
                      {t('instances.repeat_after_occurrences')}
                    </option>
                    <option value="on_date">{t('instances.repeat_until_date')}</option>
                  </select>
                </label>
                {instanceForm.recurrenceEndMode === 'after_occurrences' ? (
                  <label>
                    <span>{t('instances.repeat_occurrence_count')}</span>
                    <input
                      type="number"
                      min={1}
                      value={instanceForm.recurrenceOccurrences ?? ''}
                      onChange={(event) =>
                        setInstanceForm((current) => ({
                          ...current,
                          recurrenceOccurrences: event.target.value
                            ? Math.max(1, Math.floor(Number(event.target.value)))
                            : undefined,
                        }))
                      }
                      required
                    />
                  </label>
                ) : null}
                {instanceForm.recurrenceEndMode === 'on_date' ? (
                  <label>
                    <span>{t('instances.repeat_end_date')}</span>
                    <input
                      type="datetime-local"
                      value={instanceForm.recurrenceEndsAt ?? ''}
                      onChange={(event) =>
                        setInstanceForm((current) => ({
                          ...current,
                          recurrenceEndsAt: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                ) : null}
              </div>
            )
          ) : null}
          <div className="button-row schedule-form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={
                busyAction === 'create-instance' ||
                payload.templates.length === 0 ||
                !hasFeature('chores_manage')
              }
            >
              {editingInstanceId ? t('instances.save') : t('instances.create')}
            </button>
            {editingInstanceId || options?.mobileSheet ? (
              <button className="ghost-button" type="button" onClick={handleCloseClientComposer}>
                {t('common.cancel')}
              </button>
            ) : null}
          </div>
        </form>
      </article>
    );
  }

  return (
    <main
      className={`app-shell variant-${workspaceVariant} ${payload ? 'is-authenticated' : 'is-auth-entry'} ${
        showNewClientMobileShell ? 'mobile-ui-new' : ''
      }`}
      data-variant={workspaceVariant}
    >
      {showSetupWizard ? (
        <div
          className="setup-wizard-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={t('wizard.title')}
        >
          <div className="setup-wizard-panel">
            <header className="setup-wizard-header">
              <h2>{t('wizard.title')}</h2>
              <p>{t('wizard.subtitle')}</p>
              <div className="setup-wizard-progress">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className={`setup-wizard-dot ${setupWizardStep >= i ? 'active' : ''}`}
                  />
                ))}
              </div>
              <p className="setup-wizard-step-label">
                {t('wizard.step', { current: String(setupWizardStep + 1), total: '6' })}
              </p>
            </header>
            <div className="setup-wizard-body">
              {setupWizardStep === 0 && (
                <fieldset>
                  <legend>{t('wizard.household_type.question')}</legend>
                  {(['solo', 'couple', 'family', 'flatmates'] as const).map((v) => (
                    <label key={v} className="setup-wizard-option">
                      <input
                        type="radio"
                        name="householdType"
                        checked={setupWizardAnswers.householdType === v}
                        onChange={() => setSetupWizardAnswers((a) => ({ ...a, householdType: v }))}
                      />
                      {t(`wizard.household_type.${v}`)}
                    </label>
                  ))}
                </fieldset>
              )}
              {setupWizardStep === 1 && (
                <fieldset>
                  <legend>{t('wizard.home_type.question')}</legend>
                  {(['flat', 'house', 'house_garden', 'house_garden_lawn'] as const).map((v) => (
                    <label key={v} className="setup-wizard-option">
                      <input
                        type="radio"
                        name="homeType"
                        checked={setupWizardAnswers.homeType === v}
                        onChange={() => setSetupWizardAnswers((a) => ({ ...a, homeType: v }))}
                      />
                      {t(`wizard.home_type.${v}`)}
                    </label>
                  ))}
                </fieldset>
              )}
              {setupWizardStep === 2 && (
                <fieldset>
                  <legend>{t('wizard.appliances.question')}</legend>
                  <p className="setup-wizard-hint">{t('wizard.appliances.hint')}</p>
                  {(['dishwasher', 'tumble_dryer', 'washing_machine', 'robot_vacuum'] as const).map(
                    (v) => (
                      <label key={v} className="setup-wizard-option">
                        <input
                          type="checkbox"
                          checked={(setupWizardAnswers.appliances ?? []).includes(v)}
                          onChange={(e) =>
                            setSetupWizardAnswers((a) => ({
                              ...a,
                              appliances: e.target.checked
                                ? [...(a.appliances ?? []), v]
                                : (a.appliances ?? []).filter((x) => x !== v),
                            }))
                          }
                        />
                        {t(`wizard.appliances.${v}`)}
                      </label>
                    ),
                  )}
                </fieldset>
              )}
              {setupWizardStep === 3 && (
                <fieldset>
                  <legend>{t('wizard.pets.question')}</legend>
                  <p className="setup-wizard-hint">{t('wizard.pets.hint')}</p>
                  {(['none', 'dog', 'cat', 'other'] as const).map((v) => (
                    <label key={v} className="setup-wizard-option">
                      <input
                        type="checkbox"
                        checked={(setupWizardAnswers.pets ?? []).includes(v)}
                        onChange={(e) =>
                          setSetupWizardAnswers((a) => ({
                            ...a,
                            pets: e.target.checked
                              ? [...(a.pets ?? []), v]
                              : (a.pets ?? []).filter((x) => x !== v),
                          }))
                        }
                      />
                      {t(`wizard.pets.${v}`)}
                    </label>
                  ))}
                </fieldset>
              )}
              {setupWizardStep === 4 && (
                <fieldset>
                  <legend>{t('wizard.cooking.question')}</legend>
                  {(['one_person', 'take_turns', 'mostly_takeout', 'mixed'] as const).map((v) => (
                    <label key={v} className="setup-wizard-option">
                      <input
                        type="radio"
                        name="cookingStyle"
                        checked={setupWizardAnswers.cookingStyle === v}
                        onChange={() => setSetupWizardAnswers((a) => ({ ...a, cookingStyle: v }))}
                      />
                      {t(`wizard.cooking.${v}`)}
                    </label>
                  ))}
                </fieldset>
              )}
              {setupWizardStep === 5 && (
                <fieldset>
                  <legend>{t('wizard.gamification.question')}</legend>
                  {(['track_only', 'light', 'full', 'default'] as const).map((v) => (
                    <label key={v} className="setup-wizard-option">
                      <input
                        type="radio"
                        name="gamificationStyle"
                        checked={setupWizardAnswers.gamificationStyle === v}
                        onChange={() =>
                          setSetupWizardAnswers((a) => ({ ...a, gamificationStyle: v }))
                        }
                      />
                      {t(`wizard.gamification.${v}`)}
                    </label>
                  ))}
                </fieldset>
              )}
            </div>
            <footer className="setup-wizard-footer">
              {setupWizardStep > 0 && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setSetupWizardStep((s) => s - 1)}
                >
                  {t('wizard.back')}
                </button>
              )}
              {setupWizardStep < 5 ? (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void advanceWizardStep(setupWizardAnswers)}
                >
                  {t('wizard.next')}
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void handleSubmitSetupWizard()}
                >
                  {t('wizard.finish')}
                </button>
              )}
              <button
                type="button"
                className="ghost-button"
                onClick={() => void handleSubmitSetupWizard()}
              >
                {t('wizard.skip')}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
      {showNewClientMobileShell && payload ? (
        <section className="toolbar mobile-new-toolbar">
          <div className="toolbar-group">
            <div className="toolbar-brand" aria-label="TaskBandit">
              <img className="mobile-new-toolbar-logo" src={brandIconAssetPath} alt="TaskBandit" />
            </div>
          </div>
          <div className="toolbar-group mobile-new-toolbar-actions">
            <button
              className="ghost-button mobile-new-avatar-button"
              type="button"
              aria-label={payload.currentUser.displayName}
              onClick={() => setIsMobileProfileOpen(true)}
            >
              {mobileProfileAvatar ? (
                <img src={mobileProfileAvatar} alt="" aria-hidden="true" />
              ) : (
                <span>{initialsFromDisplayName(payload.currentUser.displayName)}</span>
              )}
            </button>
          </div>
        </section>
      ) : (
        <section className="toolbar">
          <div className="toolbar-group">
            <div className="toolbar-brand" aria-label="TaskBandit">
              <img
                className="toolbar-brand-mascot"
                src={brandIconAssetPath}
                alt=""
                aria-hidden="true"
              />
              <div>
                <strong>TaskBandit</strong>
                <span>{workspaceVariantLabel}</span>
              </div>
            </div>
            {payload?.currentUser ? (
              <div className="user-badge">
                <strong>{payload.currentUser.displayName}</strong>
                <span>
                  {t(`role.${payload.currentUser.role}`)} -{' '}
                  {formatNumber(payload.currentUser.points)} {t('user.points')}
                </span>
              </div>
            ) : (
              <div className="toolbar-pill">{t('auth.local_sign_in')}</div>
            )}
          </div>
          <div className="toolbar-group">
            <label className="language-picker">
              <span>{t('locale.label')}</span>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as AppLanguage)}
              >
                {languageOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {payload?.currentUser ? (
              <button className="ghost-button" type="button" onClick={() => handleLogout()}>
                {t('auth.logout')}
              </button>
            ) : null}
          </div>
        </section>
      )}

      {!payload ? (
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              {workspaceVariant === 'admin'
                ? t('workspace.variant_admin')
                : t('workspace.variant_client')}
            </p>
            <h1>
              {workspaceVariant === 'admin'
                ? t('hero.login_admin_title')
                : t('hero.login_client_title')}
            </h1>
            <p className="lede">
              {workspaceVariant === 'admin'
                ? t('hero.login_admin_lede')
                : t('hero.login_client_lede')}
            </p>
          </div>
          <div className="mascot-card" aria-label="TaskBandit mascot placeholder">
            <img className="mascot-art" src={mascotLoginAssetPath} alt={t('hero.mascot_alt')} />
            <p>
              {workspaceVariant === 'admin'
                ? t('hero.login_admin_mascot')
                : t('hero.login_client_mascot')}
            </p>
          </div>
        </section>
      ) : null}

      {completionCelebration ? (
        <div className="celebration-backdrop" role="presentation">
          <section
            className={`celebration-dialog celebration-variant-${completionCelebration.variant}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="completion-celebration-title"
          >
            <div className="celebration-confetti" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <img
              className="celebration-mascot"
              src={mascotCelebrationAssetPath}
              alt={t('hero.mascot_alt')}
            />
            <div className="celebration-copy">
              <p className="eyebrow">{t(completionCelebration.eyebrowKey)}</p>
              <h2 id="completion-celebration-title">{t(completionCelebration.titleKey)}</h2>
              {completionCelebration.points > 0 ? (
                <p className="celebration-points">
                  {t('celebration.points').replace(
                    '{points}',
                    formatNumber(completionCelebration.points),
                  )}
                </p>
              ) : null}
              <p className="celebration-chore">{completionCelebration.choreTitle}</p>
              <p className="celebration-quote">{t(completionCelebration.phraseKey)}</p>
              <button
                className="primary-button"
                type="button"
                onClick={() => setCompletionCelebration(null)}
              >
                {t('celebration.close')}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {notice || pageError ? (
        <div className="floating-notice-stack" aria-live="polite" aria-atomic="true">
          {notice ? (
            <div className="floating-notice success" role="status">
              <p>{notice}</p>
              <button
                className="floating-notice-close"
                type="button"
                onClick={() => setNotice(null)}
                aria-label={t('release.dismiss_update')}
              >
                {t('release.dismiss_update')}
              </button>
            </div>
          ) : null}
          {pageError ? (
            <div className="floating-notice error" role="alert">
              <p>{pageError}</p>
              <button
                className="floating-notice-close"
                type="button"
                onClick={() => setPageError(null)}
                aria-label={t('release.dismiss_update')}
              >
                {t('release.dismiss_update')}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {workspaceVariant === 'client' &&
      token &&
      clientWebPushStatus.supported &&
      clientWebPushStatus.needsPrompt &&
      !showClientMobileShell ? (
        <div className="notice-banner info update-banner">
          <div>
            <strong>{t('pwa.browser_notifications_title')}</strong>
            <p>{t('pwa.browser_notifications_body')}</p>
          </div>
          <div className="button-row">
            <button
              className="secondary-button"
              type="button"
              disabled={busyAction === 'enable-browser-notifications'}
              onClick={() => void handleEnableBrowserNotifications()}
            >
              {t('pwa.browser_notifications_action')}
            </button>
          </div>
        </div>
      ) : null}

      {!payload ? (
        <section
          className={`content-grid login-grid ${
            bootstrapStatus?.isBootstrapped === false ? 'bootstrap-grid' : ''
          }`}
        >
          {bootstrapStatus?.isBootstrapped === false ? (
            <article className="panel login-panel bootstrap-panel">
              <div className="section-heading">
                <h2>{t('bootstrap.title')}</h2>
                <span className="section-kicker">{t('bootstrap.kicker')}</span>
              </div>
              <form
                className="login-form bootstrap-flow"
                onSubmit={(event) => {
                  if (bootstrapSetupStep !== 'review') {
                    event.preventDefault();
                    if (bootstrapSetupStep === 'account' && !event.currentTarget.reportValidity()) {
                      return;
                    }
                    handleBootstrapNext();
                    return;
                  }

                  void handleBootstrapSubmit(event);
                }}
              >
                <div className="bootstrap-stepper" aria-label={t('bootstrap.steps_label')}>
                  {bootstrapStepItems.map((step, index) => {
                    const isActive = step.key === bootstrapSetupStep;
                    const isComplete = index < activeBootstrapStepIndex;
                    const isLocked = index > 0 && !bootstrapAccountComplete;

                    return (
                      <button
                        className={`bootstrap-step ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
                        type="button"
                        key={step.key}
                        disabled={isLocked}
                        onClick={() => goToBootstrapStep(step.key)}
                      >
                        <span>{index + 1}</span>
                        <strong>{step.label}</strong>
                        <small>{step.helper}</small>
                      </button>
                    );
                  })}
                </div>

                {bootstrapSetupStep === 'account' ? (
                  <section className="bootstrap-step-panel bootstrap-account-panel">
                    <div>
                      <p className="section-kicker">{t('bootstrap.step_account')}</p>
                      <h3>{t('bootstrap.account_title')}</h3>
                      <p className="inline-message">{t('bootstrap.account_hint')}</p>
                    </div>
                    <div className="bootstrap-field-grid">
                      <label>
                        <span>{t('bootstrap.household_name')}</span>
                        <input
                          type="text"
                          value={bootstrapForm.householdName}
                          required
                          onChange={(event) =>
                            setBootstrapForm((current) => ({
                              ...current,
                              householdName: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>{t('bootstrap.owner_display_name')}</span>
                        <input
                          type="text"
                          value={bootstrapForm.ownerDisplayName}
                          required
                          onChange={(event) =>
                            setBootstrapForm((current) => ({
                              ...current,
                              ownerDisplayName: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>{t('bootstrap.owner_email')}</span>
                        <input
                          type="email"
                          value={bootstrapForm.ownerEmail}
                          required
                          onChange={(event) =>
                            setBootstrapForm((current) => ({
                              ...current,
                              ownerEmail: event.target.value,
                            }))
                          }
                          autoComplete="email"
                        />
                      </label>
                      <label>
                        <span>{t('bootstrap.owner_password')}</span>
                        <input
                          type="password"
                          value={bootstrapForm.ownerPassword}
                          required
                          onChange={(event) =>
                            setBootstrapForm((current) => ({
                              ...current,
                              ownerPassword: event.target.value,
                            }))
                          }
                          autoComplete="new-password"
                        />
                      </label>
                    </div>
                    <label className="toggle-row bootstrap-toggle">
                      <span>
                        <strong>{t('bootstrap.self_signup')}</strong>
                        <small className="inline-message">{t('bootstrap.self_signup_hint')}</small>
                      </span>
                      <input
                        type="checkbox"
                        checked={bootstrapForm.selfSignupEnabled}
                        onChange={(event) =>
                          setBootstrapForm((current) => ({
                            ...current,
                            selfSignupEnabled: event.target.checked,
                          }))
                        }
                      />
                    </label>
                  </section>
                ) : null}

                {bootstrapSetupStep === 'templates' ? (
                  <section className="bootstrap-step-panel">
                    <div className="bootstrap-template-heading">
                      <div>
                        <p className="section-kicker">{t('bootstrap.step_templates')}</p>
                        <h3>{t('bootstrap.starter_templates')}</h3>
                        <p className="inline-message">{t('bootstrap.starter_templates_hint')}</p>
                      </div>
                      <span className="section-kicker">
                        {t('bootstrap.selected_templates')
                          .replace('{selected}', String(selectedStarterTemplateCount))
                          .replace('{groups}', String(selectedStarterGroupCount))}
                      </span>
                    </div>
                    {starterTemplatesByGroup.length > 0 && activeBootstrapStarterGroup ? (
                      <div className="bootstrap-template-flow">
                        <div className="bootstrap-group-list">
                          {starterTemplatesByGroup.map((group) => {
                            const groupKeys = group.templates.map((template) => template.key);
                            const selectedCount = groupKeys.filter((key) =>
                              (bootstrapForm.starterTemplateKeys ?? []).includes(key),
                            ).length;
                            const allSelected = selectedCount === groupKeys.length;

                            return (
                              <button
                                className={`bootstrap-group-button ${
                                  group.groupTitle === activeBootstrapStarterGroup.groupTitle
                                    ? 'active'
                                    : ''
                                }`}
                                type="button"
                                key={group.groupTitle}
                                onClick={() => setSelectedBootstrapStarterGroup(group.groupTitle)}
                              >
                                <strong>{group.groupTitle}</strong>
                                <small>
                                  {t('bootstrap.starter_group_selected')
                                    .replace('{selected}', String(selectedCount))
                                    .replace('{total}', String(groupKeys.length))}
                                </small>
                                <span>
                                  {allSelected
                                    ? t('bootstrap.group_ready')
                                    : t('bootstrap.group_review')}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="task-row compact bootstrap-active-group">
                          <div className="task-row-header align-start">
                            <div>
                              <strong>{activeBootstrapStarterGroup.groupTitle}</strong>
                              <p className="inline-message">{t('bootstrap.active_group_hint')}</p>
                            </div>
                            <button
                              className="ghost-button"
                              type="button"
                              onClick={() => {
                                const groupKeys = activeBootstrapStarterGroup.templates.map(
                                  (template) => template.key,
                                );
                                const selectedCount = groupKeys.filter((key) =>
                                  (bootstrapForm.starterTemplateKeys ?? []).includes(key),
                                ).length;
                                setBootstrapStarterGroupSelection(
                                  groupKeys,
                                  selectedCount !== groupKeys.length,
                                );
                              }}
                            >
                              {activeBootstrapStarterGroup.templates.every((template) =>
                                (bootstrapForm.starterTemplateKeys ?? []).includes(template.key),
                              )
                                ? t('bootstrap.clear_group')
                                : t('bootstrap.select_group')}
                            </button>
                          </div>
                          <div className="stack-list">
                            {activeBootstrapStarterGroup.templates.map((template) => {
                              const checked = (bootstrapForm.starterTemplateKeys ?? []).includes(
                                template.key,
                              );
                              return (
                                <label className="toggle-row align-start" key={template.key}>
                                  <span>
                                    <strong>{template.title}</strong>
                                    <small className="inline-message">{template.description}</small>
                                    {template.followUps.length > 0 ? (
                                      <small className="inline-message">
                                        {t('bootstrap.starter_follow_ups')}:{' '}
                                        {template.followUps
                                          .map((followUp) => followUp.title)
                                          .join(', ')}
                                      </small>
                                    ) : null}
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) =>
                                      toggleBootstrapStarterTemplate(
                                        template.key,
                                        event.target.checked,
                                      )
                                    }
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="inline-message">{t('bootstrap.no_starter_templates')}</p>
                    )}
                  </section>
                ) : null}

                {bootstrapSetupStep === 'review' ? (
                  <section className="bootstrap-step-panel bootstrap-review-panel">
                    <div>
                      <p className="section-kicker">{t('bootstrap.step_review')}</p>
                      <h3>{t('bootstrap.review_title')}</h3>
                      <p className="inline-message">{t('bootstrap.review_hint')}</p>
                    </div>
                    <div className="bootstrap-review-grid">
                      <div className="task-row compact">
                        <strong>{t('bootstrap.review_household')}</strong>
                        <p>{bootstrapForm.householdName || t('common.none')}</p>
                        <p>{bootstrapForm.ownerDisplayName || t('common.none')}</p>
                        <p>{bootstrapForm.ownerEmail || t('common.none')}</p>
                      </div>
                      <div className="task-row compact">
                        <strong>{t('bootstrap.review_access')}</strong>
                        <p>
                          {bootstrapForm.selfSignupEnabled
                            ? t('bootstrap.review_self_signup_enabled')
                            : t('bootstrap.review_self_signup_disabled')}
                        </p>
                      </div>
                      <div className="task-row compact">
                        <strong>{t('bootstrap.review_templates')}</strong>
                        <p>
                          {t('bootstrap.selected_templates')
                            .replace('{selected}', String(selectedStarterTemplateCount))
                            .replace('{groups}', String(selectedStarterGroupCount))}
                        </p>
                      </div>
                    </div>
                  </section>
                ) : null}

                <div className="bootstrap-flow-actions">
                  {bootstrapSetupStep !== 'account' ? (
                    <button className="ghost-button" type="button" onClick={handleBootstrapBack}>
                      {t('common.back')}
                    </button>
                  ) : null}
                  {bootstrapSetupStep !== 'review' ? (
                    <button className="primary-button" type="submit">
                      {t('bootstrap.next_step')}
                    </button>
                  ) : (
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={busyAction === 'bootstrap'}
                    >
                      {busyAction === 'bootstrap' ? t('bootstrap.creating') : t('bootstrap.create')}
                    </button>
                  )}
                </div>
              </form>
            </article>
          ) : (
            <AuthPanel workspaceVariant={workspaceVariant} onNotice={setNotice} />
          )}
        </section>
      ) : (
        <div className="workspace-shell">
          {availablePages.length > 0 ? (
            <aside className="workspace-sidebar">
              <div className="panel workspace-sidebar-panel">
                <p className="workspace-nav-kicker">{t('nav.workspace')}</p>
                <div className="workspace-nav">
                  {availablePages.map((page) => (
                    <button
                      key={page.key}
                      className={`workspace-nav-button ${page.key === activePage ? 'active' : ''}`}
                      type="button"
                      onClick={() => openWorkspacePage(page.key)}
                    >
                      {page.label}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          ) : null}
          <div className="workspace-main" data-page={activePage}>
            {payload.hostedSubscription.hostedMode &&
            payload.hostedSubscription.betaStatus?.isBeta &&
            (payload.currentUser.role === 'admin' || payload.currentUser.role === 'parent') ? (
              <BetaEndBanner
                betaStatus={payload.hostedSubscription.betaStatus}
                migrationUrl={payload.hostedSubscription.canonicalWebBaseUrl ?? null}
              />
            ) : null}
            {!showClientMobileShell ? (
              <section className="panel workspace-page-header">
                <div>
                  <p className="workspace-nav-kicker">{payload.household.name}</p>
                  <h2>{activePageLabel}</h2>
                  <p className="workspace-page-copy">{activePageDescription}</p>
                </div>
                <div className="workspace-page-meta">
                  <span className="status-pill">{workspaceVariantLabel}</span>
                  <span className="status-pill">{t(`role.${payload.currentUser.role}`)}</span>
                  <span className="status-pill">
                    {formatNumber(payload.currentUser.points)} {t('user.points')}
                  </span>
                  <span className="status-pill">
                    {formatNumber(payload.currentUser.currentStreak)} {t('user.streak')}
                  </span>
                  <button className="ghost-button" type="button" onClick={handleOpenOnboarding}>
                    {t(showOnboarding ? 'onboarding.restart' : 'onboarding.open_tour')}
                  </button>
                </div>
              </section>
            ) : null}

            {showClientMobileShell && activePage === 'chores' ? (
              <section className="panel mobile-workspace-summary" ref={mobileSummaryRef}>
                {payload.currentUser.role !== 'child' && hasFeature('quick_log') ? (
                  <button
                    className="mobile-quick-log-card mobile-quick-log-card-button"
                    type="button"
                    onClick={() => {
                      closeQuickLog();
                      setIsQuickLogComposerOpen(true);
                    }}
                  >
                    <span className="mobile-quick-log-card-copy">
                      <h4>Quick log</h4>
                    </span>
                    <span className="mobile-quick-log-card-chevron" aria-hidden="true">
                      &#8250;
                    </span>
                  </button>
                ) : null}
              </section>
            ) : null}

            {isAdminVariantAccessDenied ? (
              <section className="panel page-panel">
                <div className="section-heading">
                  <h2>{t('workspace.admin_only_title')}</h2>
                  <span className="section-kicker">{t('workspace.variant_admin')}</span>
                </div>
                <p>{t('workspace.admin_only_body')}</p>
              </section>
            ) : null}

            {showOnboarding ? (
              <aside
                className={`onboarding-floating ${showClientMobileShell ? 'mobile-onboarding-floating' : ''}`}
                aria-live="polite"
              >
                <article className="panel onboarding-panel onboarding-floating-panel">
                  <div className="onboarding-floating-header">
                    <div>
                      <p className="workspace-nav-kicker">
                        {t(
                          workspaceVariant === 'admin'
                            ? 'onboarding.workspace_admin'
                            : showClientMobileShell
                              ? 'onboarding.workspace_client_mobile'
                              : 'onboarding.workspace_client',
                        )}
                      </p>
                      <h2>{t('onboarding.title')}</h2>
                    </div>
                    <div className="toolbar-group">
                      <span className="section-kicker">
                        {t('onboarding.progress')
                          .replace('{current}', String(onboardingIndex + 1))
                          .replace('{total}', String(onboardingSteps.length))}
                      </span>
                      <button
                        className="ghost-button onboarding-close-button"
                        type="button"
                        aria-label={t('onboarding.later')}
                        onClick={handleDismissOnboarding}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="onboarding-step-list">
                    {onboardingSteps.map((step, index) => (
                      <button
                        key={step.key}
                        className={`onboarding-chip ${step.key === onboardingStep ? 'active' : ''}`}
                        type="button"
                        onClick={() => handleFocusOnboardingStep(step)}
                      >
                        <span>{index + 1}</span>
                        <strong>{step.title}</strong>
                      </button>
                    ))}
                  </div>
                  <div className="onboarding-body">
                    <h3>{currentOnboardingStep.title}</h3>
                    <p>{currentOnboardingStep.description}</p>
                  </div>
                  <div className="button-row">
                    <button
                      className="ghost-button"
                      type="button"
                      disabled={onboardingIndex === 0}
                      onClick={handlePreviousOnboardingStep}
                    >
                      {t('onboarding.back')}
                    </button>
                    {currentOnboardingStep.targetRef ? (
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => handleFocusOnboardingStep(currentOnboardingStep)}
                      >
                        {t('onboarding.take_me_there')}
                      </button>
                    ) : null}
                    {onboardingIndex < onboardingSteps.length - 1 ? (
                      <button
                        className="primary-button"
                        type="button"
                        onClick={handleNextOnboardingStep}
                      >
                        {t('onboarding.next')}
                      </button>
                    ) : (
                      <button
                        className="primary-button"
                        type="button"
                        disabled={busyAction === 'complete-onboarding'}
                        onClick={() => void handleCompleteOnboarding()}
                      >
                        {t('onboarding.finish')}
                      </button>
                    )}
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={handleDismissOnboarding}
                    >
                      {t('onboarding.later')}
                    </button>
                  </div>
                </article>
              </aside>
            ) : null}

            {activePage === 'overview' ? (
              <section className="metrics">
                {featuredMetrics.map((metric) => (
                  <DashboardCard key={metric.label} label={metric.label} value={metric.value} />
                ))}
              </section>
            ) : null}

            {isLoading ? <div className="notice-banner info">{t('common.loading')}</div> : null}

            <section className="content-grid dashboard-grid">
              {payload.currentUser.role !== 'child' && hasFeature('approvals') ? (
                <article
                  className="panel page-panel page-overview page-approval-queue"
                  ref={approvalQueueRef}
                >
                  <div className="section-heading">
                    <h2>{t('panel.approval_queue')}</h2>
                    <span className="section-kicker">{pendingApprovals.length}</span>
                  </div>
                  {pendingApprovals.length === 0 ? (
                    <p className="empty-state">{t('approval.empty')}</p>
                  ) : (
                    <div className="stack-list">
                      {pendingApprovals.map((instance) => (
                        <div className="task-row" key={instance.id}>
                          <div className="task-row-header">
                            <div>
                              <p className="inline-message">{instance.groupTitle}</p>
                              <strong>{instance.typeTitle || instance.title}</strong>
                              {instance.subtypeLabel ? (
                                <p className="inline-message">{instance.subtypeLabel}</p>
                              ) : null}
                            </div>
                            <span className="status-pill state-pending_approval">
                              {t('state.pending_approval')}
                            </span>
                          </div>
                          <p>
                            {t('task.assignee')}:{' '}
                            {instance.assigneeId
                              ? (memberLookup.get(instance.assigneeId)?.displayName ??
                                t('common.unknown'))
                              : t('common.unassigned')}
                          </p>
                          <p>
                            {t('task.submitted')}: {formatDate(instance.submittedAt)}
                          </p>
                          {instance.submissionNote ? (
                            <p>
                              {t('task.note')}: {instance.submissionNote}
                            </p>
                          ) : null}
                          {instance.attachments.length > 0
                            ? renderAttachmentList(t('task.attachments'), instance.attachments)
                            : null}
                          <label className="inline-field">
                            <span>{t('approval.review_note')}</span>
                            <textarea
                              value={reviewNotes[instance.id] ?? ''}
                              onChange={(event) =>
                                setReviewNotes((current) => ({
                                  ...current,
                                  [instance.id]: event.target.value,
                                }))
                              }
                              rows={3}
                            />
                          </label>
                          <div className="button-row">
                            <button
                              className="primary-button"
                              type="button"
                              disabled={
                                busyAction === `approve:${instance.id}` ||
                                busyAction === `reject:${instance.id}`
                              }
                              onClick={() => void handleReview(instance.id, 'approve')}
                            >
                              {t('approval.approve')}
                            </button>
                            <button
                              className="secondary-button"
                              type="button"
                              disabled={
                                busyAction === `approve:${instance.id}` ||
                                busyAction === `reject:${instance.id}`
                              }
                              onClick={() => void handleReview(instance.id, 'reject')}
                            >
                              {t('approval.reject')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ) : null}

              {payload.compatibility.takeoverRequests &&
              hasFeature('takeover_requests') &&
              pendingTakeoverRequests.length > 0 ? (
                <article
                  className="panel page-panel page-overview page-takeover-requests"
                  ref={takeoverRequestsRef}
                >
                  <div className="section-heading">
                    <h2>{t('panel.takeover_approvals')}</h2>
                    <span className="section-kicker">{pendingTakeoverRequests.length}</span>
                  </div>
                  <p className="inline-message">{t('takeover.panel_hint')}</p>
                  <div className="stack-list">
                    {pendingTakeoverRequests.map((request) => renderTakeoverRequestCard(request))}
                  </div>
                </article>
              ) : null}

              <article
                className={`panel page-panel page-overview page-overview-home ${showClientMobileShell ? 'page-chores' : ''}`}
                ref={myChoresRef}
              >
                <div className="section-heading">
                  <h2>Due today</h2>
                  <span className="section-kicker">{clientMobileDueTodayChores.length}</span>
                </div>
                {showClientMobileShell ? (
                  renderMockMobileChoreList(
                    clientMobileDueTodayChores.slice(0, 12),
                    renderClientMobileDueBucketCard,
                    t('submission.empty'),
                  )
                ) : myChores.length === 0 ? (
                  <p className="empty-state">{t('submission.empty')}</p>
                ) : (
                  <div className="stack-list my-chore-groups">
                    <p className="inline-message">{t('submission.priority_hint')}</p>
                    {renderVisibleCompactChoreSection(
                      t('panel.waiting_readiness'),
                      myDeferredChores,
                      t('submission.empty_deferred'),
                    )}
                    {renderMyChoreSection(
                      t('panel.needs_fixes'),
                      myNeedsFixesChores,
                      t('submission.empty_needs_fixes'),
                    )}
                    {renderMyChoreSection(
                      t('panel.in_progress'),
                      myInProgressChores,
                      t('submission.empty_in_progress'),
                    )}
                    {renderMyChoreSection(
                      t('panel.ready_to_start'),
                      myReadyToStartChores,
                      t('submission.empty_ready_to_start'),
                    )}
                  </div>
                )}
              </article>

              {payload.currentUser.role !== 'child' && !showClientMobileShell
                ? renderScheduleChorePanel('page-chores')
                : null}

              <article className="panel page-panel page-leaderboard" ref={leaderboardRef}>
                <div className="section-heading">
                  <h2>{t('panel.leaderboard')}</h2>
                  <span className="section-kicker">{payload.dashboard.streakLeader}</span>
                </div>
                {showClientMobileShell ? (
                  <div className="mock-mobile-leaderboard-cheer">
                    <img src="/brand/mascot-celebration.png" alt="" aria-hidden="true" />
                    <p>{t('mobile.leaderboard_cheer')}</p>
                  </div>
                ) : null}
                <div
                  className={`stack-list ${showClientMobileShell ? 'mock-mobile-leaderboard-list' : ''}`}
                >
                  {payload.dashboard.leaderboard.map((member, index) => (
                    <div
                      className={`leader-row ${showClientMobileShell ? 'mock-mobile-leader-row' : ''}`}
                      key={member.id}
                    >
                      <div>
                        <strong>
                          <span className={`leader-rank-badge rank-${index + 1}`}>
                            {index === 0
                              ? '🥇'
                              : index === 1
                                ? '🥈'
                                : index === 2
                                  ? '🥉'
                                  : `${index + 1}.`}
                          </span>{' '}
                          {member.displayName}
                          {member.isExternal ? (
                            <span className="leader-external-badge" title="External helper">
                              {' '}
                              ↗
                            </span>
                          ) : null}
                        </strong>
                        <p>
                          {member.isExternal
                            ? 'External helper'
                            : `${t(`role.${member.role}`)} - ${member.currentStreak} ${t('user.streak')}`}
                        </p>
                      </div>
                      <strong>
                        {formatNumber(member.leaderboardPoints ?? member.points)} {t('user.points')}
                      </strong>
                    </div>
                  ))}
                </div>
              </article>

              <article
                className={`panel page-panel page-notifications ${
                  workspaceVariant === 'client' && showClientMobileShell ? 'page-settings' : ''
                }`}
                ref={notificationsRef}
              >
                <div className="section-heading">
                  <h2>{t('panel.notifications')}</h2>
                  <div className="toolbar-group">
                    <span className="section-kicker">{unreadNotifications.length}</span>
                    {unreadNotifications.length > 0 ? (
                      <button
                        className="ghost-button"
                        type="button"
                        disabled={busyAction === 'notification-read-all'}
                        onClick={() => void handleMarkAllNotificationsRead()}
                      >
                        {t('notifications.mark_all_read')}
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="stack-list">
                  {payload.notifications.length === 0 ? (
                    <p className="inline-message">{t('notifications.empty')}</p>
                  ) : (
                    payload.notifications.map((notification) => (
                      <div className="task-row compact" key={notification.id}>
                        <div className="task-row-header">
                          <strong>{notification.title}</strong>
                          <span className="status-pill">
                            {notification.isRead
                              ? t('notifications.read')
                              : t('notifications.unread')}
                          </span>
                        </div>
                        <p>{notification.message}</p>
                        <div className="notification-delivery-grid">
                          <div className="notification-delivery-block">
                            <span
                              className={`status-pill delivery-${notification.delivery.push.status}`}
                            >
                              {t('notifications.push_delivery')}:{' '}
                              {t(`notifications.delivery_${notification.delivery.push.status}`)}
                            </span>
                            <p>
                              {t('notifications.delivery_targets')}:{' '}
                              {notification.delivery.push.targetCount}
                            </p>
                            {notification.delivery.push.targetCount > 0 ? (
                              <p>
                                {t('notifications.delivery_counts')
                                  .replace('{sent}', String(notification.delivery.push.sentCount))
                                  .replace(
                                    '{pending}',
                                    String(notification.delivery.push.pendingCount),
                                  )
                                  .replace(
                                    '{failed}',
                                    String(notification.delivery.push.failedCount),
                                  )}
                              </p>
                            ) : null}
                          </div>
                          <div className="notification-delivery-block">
                            <span
                              className={`status-pill delivery-${notification.delivery.email.status}`}
                            >
                              {t('notifications.email_fallback')}:{' '}
                              {t(`notifications.delivery_${notification.delivery.email.status}`)}
                            </span>
                            {notification.delivery.email.attemptedAt ? (
                              <p>
                                {t('notifications.delivery_attempted')}:{' '}
                                {formatDate(notification.delivery.email.attemptedAt)}
                              </p>
                            ) : null}
                            {notification.delivery.email.error ? (
                              <p>
                                {t('notifications.delivery_error')}:{' '}
                                {notification.delivery.email.error}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="button-row">
                          <p>
                            {t('notifications.recorded')}: {formatDate(notification.createdAt)}
                          </p>
                          {!notification.isRead ? (
                            <button
                              className="ghost-button"
                              type="button"
                              disabled={busyAction === `notification-read:${notification.id}`}
                              onClick={() => void handleMarkNotificationRead(notification.id)}
                            >
                              {t('notifications.mark_read')}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="panel page-panel page-household page-household-points">
                <div className="section-heading">
                  <h2>{t('panel.points_feed')}</h2>
                  <div className="toolbar-group">
                    <span className="section-kicker">{payload.pointsLedger.length}</span>
                    {payload.pointsLedger.length > 15 ? (
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => setShowAllPointsLedger(!showAllPointsLedger)}
                      >
                        {showAllPointsLedger ? t('common.hide') : t('common.show')}
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="stack-list">
                  {payload.pointsLedger.length === 0 ? (
                    <p className="inline-message">{t('points.empty')}</p>
                  ) : (
                    (showAllPointsLedger
                      ? payload.pointsLedger
                      : payload.pointsLedger.slice(0, 15)
                    ).map((entry) => (
                      <div className="task-row compact" key={entry.id}>
                        <div className="task-row-header">
                          <strong>{entry.user.displayName}</strong>
                          <span className="status-pill">
                            {entry.amount > 0 ? `+${entry.amount}` : entry.amount}{' '}
                            {t('user.points')}
                          </span>
                        </div>
                        <p>{entry.reason}</p>
                      </div>
                    ))
                  )}
                </div>
              </article>

              {showAdminOps ? (
                <article className="panel page-panel page-admin" ref={auditLogRef}>
                  <div className="section-heading">
                    <h2>{t('panel.audit_log')}</h2>
                    <span className="section-kicker">{payload.auditLog.length}</span>
                  </div>
                  <div className="stack-list">
                    {payload.auditLog.length === 0 ? (
                      <p className="inline-message">{t('audit.empty')}</p>
                    ) : (
                      payload.auditLog.map((entry) => (
                        <div className="task-row compact" key={entry.id}>
                          <div className="task-row-header">
                            <strong>{entry.summary}</strong>
                            <span className="status-pill">{formatDate(entry.createdAt)}</span>
                          </div>
                          <p>
                            {t('audit.actor')}:{' '}
                            {entry.actor
                              ? `${entry.actor.displayName} (${t(`role.${entry.actor.role}`)})`
                              : t('audit.system')}
                          </p>
                          <p>
                            {t('audit.entity')}: {entry.entityType}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              ) : null}

              {showAdminOps ? (
                <article className="panel page-panel page-admin" ref={runtimeLogsRef}>
                  <div className="section-heading">
                    <h2>{t('panel.runtime_logs')}</h2>
                    <div className="toolbar-group">
                      <span className="section-kicker">{runtimeLogs.length}</span>
                      <button
                        className="ghost-button"
                        type="button"
                        disabled={busyAction === 'refresh-runtime-logs'}
                        onClick={() => void handleRefreshRuntimeLogs()}
                      >
                        {t('logs.refresh')}
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        disabled={busyAction === 'download-runtime-logs-txt'}
                        onClick={() => void handleDownloadRuntimeLogs('txt')}
                      >
                        {t('logs.export_text')}
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        disabled={busyAction === 'download-runtime-logs-json'}
                        onClick={() => void handleDownloadRuntimeLogs('json')}
                      >
                        {t('logs.export_json')}
                      </button>
                    </div>
                  </div>
                  <div className="log-viewer">
                    {runtimeLogs.length === 0 ? (
                      <p className="inline-message">{t('logs.empty')}</p>
                    ) : (
                      runtimeLogs.map((entry) => (
                        <div className={`log-entry log-level-${entry.level}`} key={entry.id}>
                          <div className="log-meta">
                            <span className={`status-pill log-pill log-pill-${entry.level}`}>
                              {t(`logs.level.${entry.level}`)}
                            </span>
                            <span>{formatDate(entry.timestamp)}</span>
                            {entry.context ? <span>{entry.context}</span> : null}
                          </div>
                          <p className="log-message">{entry.message}</p>
                          {entry.stack ? <pre className="log-stack">{entry.stack}</pre> : null}
                        </div>
                      ))
                    )}
                  </div>
                </article>
              ) : null}

              <article
                className={`panel panel-wide page-panel ${showClientMobileShell ? 'page-chores' : 'page-household page-household-chores'}`}
                ref={householdChoresRef}
              >
                {(() => {
                  const activeBlock = payload.holidayBlocks.find((b) => b.status === 'active');
                  return activeBlock ? (
                    <div className="inline-message holiday-mode-banner">
                      {t('holiday.banner')
                        .replace('{{name}}', activeBlock.name)
                        .replace('{{endDate}}', activeBlock.endDate)}
                    </div>
                  ) : null;
                })()}
                <div className="section-heading">
                  <h2>
                    {showNewClientMobileShell ? 'Due this week' : t('panel.household_chores')}
                  </h2>
                  <div className="toolbar-group">
                    {payload.currentUser.role === 'admin' && !showNewClientMobileShell ? (
                      <button
                        className="ghost-button"
                        type="button"
                        disabled={busyAction === 'download-household-snapshot'}
                        onClick={() => void handleDownloadHouseholdSnapshot()}
                      >
                        {t('exports.download_household_snapshot')}
                      </button>
                    ) : null}
                  </div>
                </div>
                {showClientMobileShell ? (
                  renderMockMobileChoreList(
                    clientMobileDueThisWeekChores.slice(0, 12),
                    renderClientMobileDueBucketCard,
                    t('empty.filtered_chores'),
                  )
                ) : (
                  <>
                    <div className="household-filter-bar">
                      <label>
                        <span>{t('filters.view')}</span>
                        <div
                          className="segmented-toggle"
                          role="tablist"
                          aria-label={t('filters.view')}
                        >
                          <button
                            className={householdViewMode === 'list' ? 'active' : ''}
                            type="button"
                            onClick={() => setHouseholdViewMode('list')}
                          >
                            {t('view.list')}
                          </button>
                          <button
                            className={householdViewMode === 'board' ? 'active' : ''}
                            type="button"
                            onClick={() => setHouseholdViewMode('board')}
                          >
                            {t('view.board')}
                          </button>
                          <button
                            className={householdViewMode === 'calendar' ? 'active' : ''}
                            type="button"
                            onClick={() => setHouseholdViewMode('calendar')}
                          >
                            {t('view.calendar')}
                          </button>
                        </div>
                      </label>
                      <label>
                        <span>{t('filters.state')}</span>
                        <select
                          value={householdStateFilter}
                          onChange={(event) =>
                            setHouseholdStateFilter(event.target.value as HouseholdChoreStateFilter)
                          }
                        >
                          <option value="all">{t('filters.all_states')}</option>
                          {activeChoreStates.map((state) => (
                            <option key={state} value={state}>
                              {t(`state.${state}`)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>{t('filters.assignee')}</span>
                        <select
                          value={householdAssigneeFilter}
                          onChange={(event) => setHouseholdAssigneeFilter(event.target.value)}
                        >
                          <option value="all">{t('filters.all_members')}</option>
                          <option value="unassigned">{t('filters.unassigned')}</option>
                          {payload.household.members
                            .filter((member) => member.id !== payload.currentUser.id)
                            .map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.displayName}
                              </option>
                            ))}
                        </select>
                      </label>
                    </div>
                    {visibleHouseholdChores.length === 0 ? (
                      <p className="empty-state">{t('empty.filtered_chores')}</p>
                    ) : householdViewMode === 'list' ? (
                      <div className="stack-list my-chore-groups">
                        {renderCompactChoreSection(
                          t('panel.assigned_elsewhere'),
                          visibleAssignedElsewhereChores,
                          t('chores.empty_assigned_elsewhere'),
                        )}
                        {renderCompactChoreSection(
                          t('panel.unassigned_chores'),
                          visibleUnassignedHouseholdChores,
                          t('chores.empty_unassigned'),
                        )}
                      </div>
                    ) : householdViewMode === 'board' ? (
                      <div className="board-grid">
                        {householdBoardColumns.map((column) => (
                          <section className="board-column" key={column.state}>
                            <div className="board-column-header">
                              <strong>{t(`state.${column.state}`)}</strong>
                              <span className={`status-pill state-${column.state}`}>
                                {column.chores.length}
                              </span>
                            </div>
                            <div className="stack-list">
                              {column.chores.map((instance) => renderHouseholdChoreCard(instance))}
                            </div>
                          </section>
                        ))}
                      </div>
                    ) : (
                      <div className="calendar-grid">
                        {householdCalendarGroups.map((group) => (
                          <section className="calendar-day" key={group.dateKey}>
                            <div className="calendar-day-header">
                              <strong>{formatCalendarDate(group.dateKey)}</strong>
                              <span className="status-pill">{group.chores.length}</span>
                            </div>
                            <div className="stack-list">
                              {group.chores.map((instance) => renderHouseholdChoreCard(instance))}
                            </div>
                          </section>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </article>

              {showClientMobileShell ? (
                <article className="panel panel-wide page-panel page-chores mobile-due-later-panel">
                  <div className="section-heading">
                    <h2>Due later</h2>
                    <span className="section-kicker">{clientMobileDueLaterChores.length}</span>
                  </div>
                  {renderMockMobileChoreList(
                    clientMobileDueLaterChores.slice(0, 12),
                    renderClientMobileDueBucketCard,
                    t('empty.filtered_chores'),
                  )}
                </article>
              ) : null}

              <article
                className="panel panel-wide page-panel page-chores mobile-history-panel"
                ref={choreHistoryRef}
              >
                <div className="section-heading">
                  <h2>{showClientMobileShell ? 'Completed chores' : t('panel.chore_history')}</h2>
                  <div className="toolbar-group">
                    <span className="section-kicker">
                      {showClientMobileShell
                        ? Math.min(historicChores.length, 15)
                        : historicChores.length}
                    </span>
                    {showClientMobileShell ? (
                      <button
                        className="ghost-button mock-mobile-view-all"
                        type="button"
                        onClick={() => setShowMobileCompletedChores(!showMobileCompletedChores)}
                      >
                        {showMobileCompletedChores ? 'Hide' : 'Show'}
                      </button>
                    ) : null}
                    {!showClientMobileShell ? (
                      <>
                        {showDesktopChoreHistory ? (
                          <span className="inline-message">
                            {t('history.page_indicator')
                              .replace('{page}', String(historyPage))
                              .replace('{pages}', String(historyPageCount))}
                          </span>
                        ) : null}
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => setShowDesktopChoreHistory(!showDesktopChoreHistory)}
                        >
                          {showDesktopChoreHistory ? t('common.hide') : t('common.show')}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
                {showClientMobileShell ? (
                  !showMobileCompletedChores ? (
                    <p className="empty-state">Open to load the latest completed chores.</p>
                  ) : historicChores.length === 0 ? (
                    <p className="empty-state">{t('history.empty')}</p>
                  ) : (
                    <div className="stack-list">
                      {historicChores
                        .slice(0, 15)
                        .map((instance) => renderHouseholdChoreCard(instance, { historic: true }))}
                    </div>
                  )
                ) : showDesktopChoreHistory ? (
                  <>
                    <div className="household-filter-bar export-filter-bar">
                      <label>
                        <span>{t('exports.assignment_filter')}</span>
                        <select
                          value={exportAssigneeFilter}
                          onChange={(event) => setExportAssigneeFilter(event.target.value)}
                        >
                          <option value="all">{t('filters.all_members')}</option>
                          <option value="mine">{t('exports.assignment_mine')}</option>
                          <option value="assigned_elsewhere">
                            {t('exports.assignment_assigned_elsewhere')}
                          </option>
                          <option value="unassigned">{t('filters.unassigned')}</option>
                          {payload.household.members.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.displayName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>{t('exports.status_filter')}</span>
                        <select
                          value={exportStatusFilter}
                          onChange={(event) =>
                            setExportStatusFilter(event.target.value as ChoreExportStatusFilter)
                          }
                        >
                          <option value="all">{t('filters.all_states')}</option>
                          <option value="active">{t('exports.status_active')}</option>
                          <option value="historic">{t('exports.status_historic')}</option>
                          {householdBoardStateOrder.map((state) => (
                            <option key={state} value={state}>
                              {t(`state.${state}`)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>{t('exports.date_from')}</span>
                        <input
                          type="date"
                          value={exportDateFrom}
                          onChange={(event) => setExportDateFrom(event.target.value)}
                        />
                      </label>
                      <label>
                        <span>{t('exports.date_to')}</span>
                        <input
                          type="date"
                          value={exportDateTo}
                          onChange={(event) => setExportDateTo(event.target.value)}
                        />
                      </label>
                      <div className="export-actions">
                        <p className="inline-message">
                          {t('exports.matching_results').replace(
                            '{count}',
                            String(exportableChores.length),
                          )}
                        </p>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={
                            busyAction === 'download-chores-export' || exportableChores.length === 0
                          }
                          onClick={() => void handleDownloadChoresExport()}
                        >
                          {t('exports.download_chores')}
                        </button>
                      </div>
                    </div>
                    {historicChores.length === 0 ? (
                      <p className="empty-state">{t('history.empty')}</p>
                    ) : (
                      <>
                        <div className="stack-list">
                          {paginatedHistoricChores.map((instance) =>
                            renderHouseholdChoreCard(instance, { historic: true }),
                          )}
                        </div>
                        <div className="pagination-bar">
                          <button
                            className="ghost-button"
                            type="button"
                            disabled={historyPage <= 1}
                            onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                          >
                            {t('history.previous_page')}
                          </button>
                          <button
                            className="ghost-button"
                            type="button"
                            disabled={historyPage >= historyPageCount}
                            onClick={() =>
                              setHistoryPage(Math.min(historyPageCount, historyPage + 1))
                            }
                          >
                            {t('history.next_page')}
                          </button>
                        </div>
                      </>
                    )}
                  </>
                ) : null}
              </article>

              {notificationPreferencesDraft ? (
                <article
                  className="panel page-panel page-settings"
                  ref={notificationPreferencesRef}
                >
                  <div className="section-heading">
                    <h2>{t('panel.notification_preferences')}</h2>
                    <span className="section-kicker">{t('settings.member_level')}</span>
                  </div>
                  <div className="settings-list settings-list-columns">
                    <label className="toggle-row">
                      <span>{t('settings.notify_assignments')}</span>
                      <input
                        type="checkbox"
                        checked={notificationPreferencesDraft.receiveAssignments}
                        onChange={(event) =>
                          setNotificationPreferencesDraft((current) =>
                            current
                              ? { ...current, receiveAssignments: event.target.checked }
                              : current,
                          )
                        }
                      />
                    </label>
                    <label className="toggle-row">
                      <span>{t('settings.notify_reviews')}</span>
                      <input
                        type="checkbox"
                        checked={notificationPreferencesDraft.receiveReviewUpdates}
                        onChange={(event) =>
                          setNotificationPreferencesDraft((current) =>
                            current
                              ? { ...current, receiveReviewUpdates: event.target.checked }
                              : current,
                          )
                        }
                      />
                    </label>
                    <label className="toggle-row">
                      <span>{t('settings.notify_due_soon')}</span>
                      <input
                        type="checkbox"
                        checked={notificationPreferencesDraft.receiveDueSoonReminders}
                        onChange={(event) =>
                          setNotificationPreferencesDraft((current) =>
                            current
                              ? { ...current, receiveDueSoonReminders: event.target.checked }
                              : current,
                          )
                        }
                      />
                    </label>
                    <label className="toggle-row">
                      <span>{t('settings.notify_overdue')}</span>
                      <input
                        type="checkbox"
                        checked={notificationPreferencesDraft.receiveOverdueAlerts}
                        onChange={(event) =>
                          setNotificationPreferencesDraft((current) =>
                            current
                              ? { ...current, receiveOverdueAlerts: event.target.checked }
                              : current,
                          )
                        }
                      />
                    </label>
                    <label className="toggle-row">
                      <span>{t('settings.notify_daily_summary')}</span>
                      <input
                        type="checkbox"
                        checked={notificationPreferencesDraft.receiveDailySummary}
                        onChange={(event) =>
                          setNotificationPreferencesDraft((current) =>
                            current
                              ? { ...current, receiveDailySummary: event.target.checked }
                              : current,
                          )
                        }
                      />
                    </label>
                  </div>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={busyAction === 'save-notification-preferences'}
                    onClick={() => void handleSaveNotificationPreferences()}
                  >
                    {t('settings.save_notification_preferences')}
                  </button>
                </article>
              ) : null}

              {payload.compatibility.notificationDevices ? (
                <article className="panel page-panel page-settings" ref={notificationDevicesRef}>
                  <div className="section-heading">
                    <h2>{t('panel.mobile_push_devices')}</h2>
                    <span className="section-kicker">{formatNumber(pushReadyDeviceCount)}</span>
                  </div>
                  <p>{t('settings.push_primary_hint')}</p>
                  {!payload.household.settings.enablePushNotifications ? (
                    <p className="error-text">{t('settings.push_household_disabled')}</p>
                  ) : null}
                  {payload.notificationDevices.length === 0 ? (
                    <p className="inline-message">{t('settings.no_notification_devices')}</p>
                  ) : (
                    <div className="stack-list">
                      {payload.notificationDevices.map((device) => (
                        <div className="task-row compact" key={device.id}>
                          <div className="task-row-header">
                            <strong>
                              {device.deviceName ||
                                (device.platform === 'web'
                                  ? t('settings.notification_device_browser')
                                  : t('settings.notification_device_android'))}
                            </strong>
                            <span
                              className={`status-pill ${device.pushTokenConfigured ? 'state-completed' : 'state-open'}`}
                            >
                              {device.pushTokenConfigured
                                ? t('settings.notification_device_push_ready')
                                : t('settings.notification_device_waiting')}
                            </span>
                          </div>
                          <p>
                            {t('settings.notification_device_last_seen')}:{' '}
                            {formatDate(device.lastSeenAt)}
                          </p>
                          <button
                            className="ghost-button"
                            type="button"
                            onClick={() =>
                              setExpandedDeviceDetailsById((current) => ({
                                ...current,
                                [device.id]: !current[device.id],
                              }))
                            }
                          >
                            {expandedDeviceDetailsById[device.id]
                              ? t('settings.notification_device_hide_details')
                              : t('settings.notification_device_show_details')}
                          </button>
                          {expandedDeviceDetailsById[device.id] ? (
                            <div className="notification-device-details">
                              <p>
                                {t('settings.notification_device_provider')}:{' '}
                                {device.provider === 'fcm'
                                  ? t('settings.notification_device_provider_fcm')
                                  : device.provider === 'web_push'
                                    ? t('settings.notification_device_provider_web_push')
                                    : t('settings.notification_device_provider_generic')}
                              </p>
                              {device.appVersion ? (
                                <p>
                                  {t('settings.notification_device_app_version')}:{' '}
                                  {device.appVersion}
                                </p>
                              ) : null}
                              {device.locale ? (
                                <p>
                                  {t('settings.notification_device_locale')}: {device.locale}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                          <div className="button-row">
                            <button
                              className="ghost-button"
                              type="button"
                              disabled={busyAction === `delete-device:${device.id}`}
                              onClick={() => void handleDeleteNotificationDevice(device.id)}
                            >
                              {t('settings.notification_device_remove')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ) : null}

              {payload.hostedSubscription.hostedMode && payload.currentUser.role !== 'child' ? (
                <article className="panel page-panel page-settings">
                  <div className="section-heading">
                    <h2>{t('subscription.summary_title')}</h2>
                    <span className="section-kicker">
                      {payload.hostedSubscription.packageDisplayName ??
                        t('subscription.hosted_plan_fallback')}
                    </span>
                  </div>
                  <div className="stack-list">
                    <div className="task-row compact">
                      <p>
                        {t('subscription.package_label')}:{' '}
                        {payload.hostedSubscription.packageDisplayName ??
                          payload.hostedSubscription.packageCode ??
                          t('subscription.na')}
                      </p>
                      <p>
                        {t('subscription.status_label')}:{' '}
                        {formatSubscriptionStatusLabel(
                          payload.hostedSubscription.lifecycleState ??
                            payload.hostedSubscription.entitlementState ??
                            payload.hostedSubscription.billingStatus,
                        ) ?? t('subscription.na')}
                      </p>
                    </div>
                    <div className="task-row compact">
                      <strong>{t('subscription.usage_quota_title')}</strong>
                      <div className="task-row-meta-grid quota-meta-grid">
                        <div className="task-row-meta-item">
                          <span>{t('subscription.members_label')}</span>
                          <strong>
                            {formatUsageLine(
                              payload.hostedSubscription.usage?.membersUsed,
                              payload.hostedSubscription.quotas?.membersLimit,
                            )}
                          </strong>
                        </div>
                        <div className="task-row-meta-item">
                          <span>{t('subscription.storage_label')}</span>
                          <strong>
                            {formatUsageLine(
                              payload.hostedSubscription.usage?.storageBytesUsed,
                              payload.hostedSubscription.quotas?.storageBytesLimit,
                              (value) => formatByteSize(value),
                            )}
                          </strong>
                        </div>
                        <div className="task-row-meta-item">
                          <span>{t('subscription.monthly_notifications_label')}</span>
                          <strong>
                            {formatUsageLine(
                              payload.hostedSubscription.usage?.monthlyNotificationsUsed,
                              payload.hostedSubscription.quotas?.monthlyNotificationLimit,
                            )}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ) : null}

              {payload.hostedSubscription.hostedMode && payload.currentUser.role === 'admin' ? (
                <article className="panel page-panel page-settings">
                  <div className="section-heading">
                    <h2>Plan &amp; Features</h2>
                    <span className="section-kicker">
                      {payload.hostedSubscription.packageDisplayName ?? 'Hosted plan'}
                    </span>
                  </div>
                  <div className="stack-list">
                    <div className="task-row compact">
                      <p>
                        Package:{' '}
                        {payload.hostedSubscription.packageDisplayName ??
                          payload.hostedSubscription.packageCode ??
                          'n/a'}
                      </p>
                      <p>Entitlement: {payload.hostedSubscription.entitlementState ?? 'n/a'}</p>
                      <p>Lifecycle: {payload.hostedSubscription.lifecycleState ?? 'n/a'}</p>
                      <p>Billing: {payload.hostedSubscription.billingStatus ?? 'n/a'}</p>
                      {payload.hostedSubscription.trialEndsAt ? (
                        <p>Trial ends: {formatDate(payload.hostedSubscription.trialEndsAt)}</p>
                      ) : null}
                      <p>
                        Grace ends: {formatDate(payload.hostedSubscription.graceEndsAt ?? null)}
                      </p>
                      <p>
                        Suspension reason:{' '}
                        {payload.hostedSubscription.suspensionReason ?? t('common.none')}
                      </p>
                    </div>
                    <div className="task-row compact">
                      <strong>Usage vs quota</strong>
                      <div className="task-row-meta-grid quota-meta-grid">
                        <div className="task-row-meta-item">
                          <span>Members</span>
                          <strong>
                            {formatUsageLine(
                              payload.hostedSubscription.usage?.membersUsed,
                              payload.hostedSubscription.quotas?.membersLimit,
                            )}
                          </strong>
                        </div>
                        <div className="task-row-meta-item">
                          <span>Storage</span>
                          <strong>
                            {formatUsageLine(
                              payload.hostedSubscription.usage?.storageBytesUsed,
                              payload.hostedSubscription.quotas?.storageBytesLimit,
                              (value) => formatByteSize(value),
                            )}
                          </strong>
                        </div>
                        <div className="task-row-meta-item">
                          <span>Monthly notifications</span>
                          <strong>
                            {formatUsageLine(
                              payload.hostedSubscription.usage?.monthlyNotificationsUsed,
                              payload.hostedSubscription.quotas?.monthlyNotificationLimit,
                            )}
                          </strong>
                        </div>
                      </div>
                      <p>
                        Retention (audit / export / proof days):{' '}
                        {formatRetentionDaysLine(
                          payload.hostedSubscription.quotas?.auditRetentionDays,
                          payload.hostedSubscription.quotas?.exportRetentionDays,
                          payload.hostedSubscription.quotas?.proofRetentionDays,
                        )}
                      </p>
                    </div>
                    <div className="task-row compact">
                      <strong>Feature Access</strong>
                      {Object.entries(payload.hostedSubscription.featureAccess ?? {}).map(
                        ([featureId, enabled]) => (
                          <p key={featureId}>
                            {formatFeatureLabel(featureId)}:{' '}
                            {enabled ? t('common.enabled') : t('common.disabled')}
                          </p>
                        ),
                      )}
                    </div>
                  </div>
                </article>
              ) : null}

              {showAdminOps && payload.compatibility.notificationHealth ? (
                <article className="panel page-panel page-admin" ref={notificationHealthRef}>
                  <div className="section-heading">
                    <h2>{t('panel.household_notification_health')}</h2>
                    <span className="section-kicker">{formatNumber(householdPushReadyCount)}</span>
                  </div>
                  <p>{t('settings.household_notification_health_hint')}</p>
                  {payload.householdNotificationHealth.length === 0 ? (
                    <p className="inline-message">
                      {t('settings.household_notification_health_empty')}
                    </p>
                  ) : (
                    <div className="stack-list">
                      {payload.householdNotificationHealth.map((entry) => (
                        <div className="task-row compact" key={entry.userId}>
                          <div className="task-row-header">
                            <strong>{entry.displayName}</strong>
                            <span className={`status-pill delivery-${entry.deliveryMode}`}>
                              {t(`settings.delivery_mode_${entry.deliveryMode}`)}
                            </span>
                          </div>
                          <p>
                            {t('members.role')}: {t(`role.${entry.role}`)}
                          </p>
                          <p>
                            {t('settings.notification_device_count')}: {entry.registeredDeviceCount}
                          </p>
                          <p>
                            {t('settings.notification_push_ready_count')}:{' '}
                            {entry.pushReadyDeviceCount}
                          </p>
                          <p>
                            {t('settings.notification_email_fallback')}:{' '}
                            {entry.emailFallbackEligible
                              ? t('common.enabled')
                              : t('common.disabled')}
                          </p>
                          {entry.email ? (
                            <p>
                              {t('members.email')}: {entry.email}
                            </p>
                          ) : null}
                          {entry.latestDeviceSeenAt ? (
                            <p>
                              {t('settings.notification_device_last_seen')}:{' '}
                              {formatDate(entry.latestDeviceSeenAt)}
                            </p>
                          ) : null}
                          <div className="button-row">
                            <button
                              className="ghost-button"
                              type="button"
                              disabled={busyAction === `test-notification:${entry.userId}`}
                              onClick={() => void handleSendTestNotification(entry.userId)}
                            >
                              {t('settings.send_test_notification')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ) : null}

              {showAdminOps && payload.compatibility.backupReadiness ? (
                <article className="panel page-panel page-admin" ref={backupReadinessRef}>
                  <div className="section-heading">
                    <h2>{t('panel.backup_readiness')}</h2>
                    <div className="toolbar-group">
                      <span className="section-kicker">
                        {payload.backupReadiness
                          ? formatDate(payload.backupReadiness.checkedAt)
                          : t('common.none')}
                      </span>
                      <button
                        className="ghost-button"
                        type="button"
                        disabled={busyAction === 'refresh-backup-readiness'}
                        onClick={() => void handleRefreshBackupReadiness()}
                      >
                        {t('backup.refresh')}
                      </button>
                    </div>
                  </div>
                  <p>{t('backup.hint')}</p>
                  {payload.backupReadiness ? (
                    <div className="system-status-grid">
                      <div className="task-row compact">
                        <div className="task-row-header">
                          <strong>{t('backup.checklist')}</strong>
                          <span
                            className={`status-pill system-${
                              backupMigrationChecklist.every((item) => item.status === 'ready')
                                ? 'ready'
                                : 'warning'
                            }`}
                          >
                            {
                              backupMigrationChecklist.filter((item) => item.status === 'ready')
                                .length
                            }
                            /{backupMigrationChecklist.length}
                          </span>
                        </div>
                        <p>{t('backup.checklist_hint')}</p>
                        <div className="stack-list">
                          {backupMigrationChecklist.map((item) => (
                            <div className="notification-delivery-block" key={item.key}>
                              <div className="task-row-header">
                                <strong>{item.title}</strong>
                                <span className={`status-pill system-${item.status}`}>
                                  {formatStatusChip(item.status)}
                                </span>
                              </div>
                              <p>{item.detail}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="task-row compact">
                        <div className="task-row-header">
                          <strong>{t('backup.host_paths')}</strong>
                          <span className="status-pill system-ready">
                            {t('system_status.status_ready')}
                          </span>
                        </div>
                        <p>
                          {t('backup.data_root')}:{' '}
                          {payload.backupReadiness.hostPaths.dataRootHint ??
                            t('backup.path_unavailable')}
                        </p>
                        <p>
                          {t('backup.postgres_data')}:{' '}
                          {payload.backupReadiness.hostPaths.postgresDataPathHint ??
                            t('backup.path_unavailable')}
                        </p>
                        <p>
                          {t('backup.taskbandit_data')}:{' '}
                          {payload.backupReadiness.hostPaths.appDataPathHint ??
                            t('backup.path_unavailable')}
                        </p>
                        <p>
                          {t('backup.compose_file')}:{' '}
                          {payload.backupReadiness.hostPaths.composeFileHint ??
                            t('backup.path_unavailable')}
                        </p>
                        <p>
                          {t('backup.env_file')}:{' '}
                          {payload.backupReadiness.hostPaths.envFileHint ??
                            t('backup.path_unavailable')}
                        </p>
                      </div>
                      <div className="task-row compact">
                        <div className="task-row-header">
                          <strong>{t('backup.server_paths')}</strong>
                          <span className="status-pill system-ready">
                            {t('system_status.status_ready')}
                          </span>
                        </div>
                        <p>
                          {t('backup.storage_root')}:{' '}
                          {payload.backupReadiness.serverPaths.storageRootPath}
                        </p>
                        <p>
                          {t('backup.runtime_log_path')}:{' '}
                          {payload.backupReadiness.serverPaths.runtimeLogFilePath}
                        </p>
                        <p>{t('backup.server_paths_hint')}</p>
                      </div>
                      <div className="task-row compact">
                        <div className="task-row-header">
                          <strong>{t('backup.exports')}</strong>
                          <span className="status-pill system-ready">
                            {t('system_status.status_ready')}
                          </span>
                        </div>
                        <p>{t('backup.exports_hint')}</p>
                        <p>
                          {t('backup.snapshot_export')}:{' '}
                          {payload.backupReadiness.exports.householdSnapshotReady
                            ? t('common.enabled')
                            : t('common.disabled')}
                        </p>
                        <p>
                          {t('backup.runtime_log_export')}:{' '}
                          {payload.backupReadiness.exports.runtimeLogsReady
                            ? t('common.enabled')
                            : t('common.disabled')}
                        </p>
                        <div className="button-row">
                          <button
                            className="ghost-button"
                            type="button"
                            disabled={busyAction === 'download-household-snapshot'}
                            onClick={() => void handleDownloadHouseholdSnapshot()}
                          >
                            {t('exports.download_household_snapshot')}
                          </button>
                          <button
                            className="ghost-button"
                            type="button"
                            disabled={busyAction === 'export-runtime-logs-text'}
                            onClick={() => void handleDownloadRuntimeLogs('txt')}
                          >
                            {t('logs.export_text')}
                          </button>
                          <button
                            className="ghost-button"
                            type="button"
                            disabled={busyAction === 'download-runtime-logs-json'}
                            onClick={() => void handleDownloadRuntimeLogs('json')}
                          >
                            {t('logs.export_json')}
                          </button>
                        </div>
                      </div>
                      <div className="task-row compact">
                        <div className="task-row-header">
                          <strong>{t('backup.recovery_features')}</strong>
                          <span className="status-pill system-ready">
                            {t('system_status.status_ready')}
                          </span>
                        </div>
                        <p>{t('backup.recovery_hint')}</p>
                        <p>
                          {t('backup.local_recovery')}:{' '}
                          {payload.backupReadiness.recovery.localAuthForcedByConfig
                            ? t('common.enabled')
                            : t('common.disabled')}
                        </p>
                        <p>
                          {t('backup.admin_local_recovery')}:{' '}
                          {t('backup.admin_local_recovery_detail')
                            .replace('{configured}', String(adminLocalRecoveryCount))
                            .replace('{total}', String(adminMembers.length || 1))}
                        </p>
                        <p>
                          {t('backup.smtp_reset')}:{' '}
                          {smtpRecoveryReady && adminLocalRecoveryEmailCount > 0
                            ? t('common.enabled')
                            : t('common.disabled')}
                        </p>
                        <p>
                          {t('backup.admin_recovery_email')}: {adminLocalRecoveryEmailCount}
                        </p>
                        <p>
                          {t('backup.oidc_ui')}:{' '}
                          {payload.backupReadiness.recovery.oidcUiConfigured
                            ? t('common.enabled')
                            : t('common.disabled')}
                        </p>
                        <p>
                          {t('backup.oidc_env')}:{' '}
                          {payload.backupReadiness.recovery.oidcEnvFallbackEnabled
                            ? t('common.enabled')
                            : t('common.disabled')}
                        </p>
                        <p>
                          {t('backup.smtp')}:{' '}
                          {payload.backupReadiness.recovery.smtpConfigured
                            ? t('common.enabled')
                            : t('common.disabled')}
                        </p>
                        <p>
                          {t('backup.push')}:{' '}
                          {payload.backupReadiness.recovery.pushConfigured
                            ? t('common.enabled')
                            : t('common.disabled')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="inline-message">{t('backup.empty')}</p>
                  )}
                </article>
              ) : null}

              {showAdminOps && payload.compatibility.systemStatus ? (
                <article className="panel page-panel page-admin" ref={systemStatusRef}>
                  <div className="section-heading">
                    <h2>{t('panel.system_status')}</h2>
                    <div className="toolbar-group">
                      <span className="section-kicker">
                        {payload.systemStatus
                          ? formatDate(payload.systemStatus.checkedAt)
                          : t('common.none')}
                      </span>
                      <button
                        className="ghost-button"
                        type="button"
                        disabled={busyAction === 'refresh-system-status'}
                        onClick={() => void handleRefreshSystemStatus()}
                      >
                        {t('system_status.refresh')}
                      </button>
                    </div>
                  </div>
                  <p>{t('system_status.hint')}</p>
                  {payload.systemStatus ? (
                    <div className="system-status-grid">
                      <div className="task-row compact">
                        <div className="task-row-header">
                          <strong>{t('system_status.application')}</strong>
                          <span
                            className={`status-pill system-${payload.systemStatus.application.status}`}
                          >
                            {formatStatusChip(payload.systemStatus.application.status)}
                          </span>
                        </div>
                        <p>
                          {t('system_status.listen_port')}: {payload.systemStatus.application.port}
                        </p>
                        <p>
                          {t('system_status.embedded_web')}:{' '}
                          {payload.systemStatus.application.serveEmbeddedWeb
                            ? t('common.enabled')
                            : t('common.disabled')}
                        </p>
                        <p>
                          {t('system_status.cors_origins')}:{' '}
                          {payload.systemStatus.application.corsAllowedOrigins.length > 0
                            ? payload.systemStatus.application.corsAllowedOrigins.join(', ')
                            : t('system_status.cors_open')}
                        </p>
                        <p>
                          {t('system_status.reverse_proxy')}:{' '}
                          {payload.systemStatus.application.reverseProxyEnabled
                            ? t('common.enabled')
                            : t('common.disabled')}
                        </p>
                        <p>
                          {t('system_status.path_base')}:{' '}
                          {payload.systemStatus.application.reverseProxyPathBase ??
                            t('common.none')}
                        </p>
                      </div>
                      <div className="task-row compact">
                        <div className="task-row-header">
                          <strong>{t('system_status.database')}</strong>
                          <span
                            className={`status-pill system-${payload.systemStatus.database.status}`}
                          >
                            {formatStatusChip(payload.systemStatus.database.status)}
                          </span>
                        </div>
                        <p>
                          {t('system_status.database_hint')}:{' '}
                          {payload.systemStatus.database.error ?? t('system_status.ok')}
                        </p>
                      </div>
                      <div className="task-row compact">
                        <div className="task-row-header">
                          <strong>{t('system_status.storage')}</strong>
                          <span
                            className={`status-pill system-${payload.systemStatus.storage.status}`}
                          >
                            {formatStatusChip(payload.systemStatus.storage.status)}
                          </span>
                        </div>
                        <p>
                          {t('system_status.storage_root')}: {payload.systemStatus.storage.rootPath}
                        </p>
                        <p>
                          {t('system_status.runtime_log_path')}:{' '}
                          {payload.systemStatus.storage.runtimeLogFilePath}
                        </p>
                        <p>
                          {t('system_status.runtime_log_limit_per_file')}:{' '}
                          {payload.systemStatus.storage.runtimeLogMaxFileSizeMb} MB
                        </p>
                        <p>
                          {t('system_status.runtime_log_limit_total')}:{' '}
                          {payload.systemStatus.storage.runtimeLogMaxTotalSizeMb} MB
                        </p>
                        <p>
                          {t('system_status.docker_log_limit')}:{' '}
                          {payload.systemStatus.storage.dockerLogMaxSize} x{' '}
                          {payload.systemStatus.storage.dockerLogMaxFiles}
                        </p>
                        <p>
                          {t('system_status.storage_hint')}:{' '}
                          {payload.systemStatus.storage.error ?? t('system_status.ok')}
                        </p>
                      </div>
                      <div className="task-row compact">
                        <div className="task-row-header">
                          <strong>{t('system_status.auth')}</strong>
                          <span
                            className={`status-pill system-${payload.systemStatus.auth.status}`}
                          >
                            {formatStatusChip(payload.systemStatus.auth.status)}
                          </span>
                        </div>
                        <p>
                          {t('system_status.local_auth_effective')}:{' '}
                          {payload.systemStatus.auth.localAuthEffective
                            ? t('common.enabled')
                            : t('common.disabled')}
                        </p>
                        <p>
                          {t('system_status.local_auth_forced')}:{' '}
                          {payload.systemStatus.auth.localAuthForcedByConfig
                            ? t('common.enabled')
                            : t('common.disabled')}
                        </p>
                        <p>
                          {t('system_status.oidc_effective')}:{' '}
                          {payload.systemStatus.auth.oidcEffective
                            ? t('common.enabled')
                            : t('common.disabled')}{' '}
                          ({t(`auth.oidc_source_${payload.systemStatus.auth.oidcSource}`)})
                        </p>
                        {payload.systemStatus.auth.oidcEffective ? (
                          <p>
                            {t('system_status.oidc_authority')}:{' '}
                            {payload.systemStatus.auth.oidcAuthority || t('common.none')}
                          </p>
                        ) : null}
                      </div>
                      <div className="task-row compact">
                        <div className="task-row-header">
                          <strong>{t('system_status.push')}</strong>
                          <span
                            className={`status-pill system-${payload.systemStatus.push.status}`}
                          >
                            {formatStatusChip(payload.systemStatus.push.status)}
                          </span>
                        </div>
                        <div className="stack-list push-readiness-list">
                          <strong>{t('system_status.push_readiness')}</strong>
                          {pushReadinessChecklist.map((item) => (
                            <div className="notification-delivery-block" key={item.key}>
                              <div className="task-row-header">
                                <strong>{item.title}</strong>
                                <span className={`status-pill system-${item.status}`}>
                                  {formatStatusChip(item.status)}
                                </span>
                              </div>
                              <p>{item.detail}</p>
                            </div>
                          ))}
                        </div>
                        <p>
                          {t('system_status.push_household_enabled')}:{' '}
                          {payload.systemStatus.push.householdPushEnabled
                            ? t('common.enabled')
                            : t('common.disabled')}
                        </p>
                        <p>
                          {t('system_status.fcm_server_enabled')}:{' '}
                          {payload.systemStatus.push.serverFcmEnabled
                            ? t('common.enabled')
                            : t('common.disabled')}
                        </p>
                        <p>
                          {t('system_status.service_account')}:{' '}
                          {payload.systemStatus.push.serviceAccountConfigured
                            ? t('common.enabled')
                            : t('common.disabled')}
                        </p>
                        <p>
                          {t('system_status.web_push_enabled')}:{' '}
                          {payload.systemStatus.push.serverWebPushEnabled
                            ? t('common.enabled')
                            : t('common.disabled')}
                        </p>
                        <p>
                          {t('system_status.push_devices')}:{' '}
                          {payload.systemStatus.push.pushReadyDeviceCount} /{' '}
                          {payload.systemStatus.push.registeredDeviceCount}
                        </p>
                        <p>
                          {t('system_status.member_delivery_breakdown')}{' '}
                          {payload.systemStatus.push.membersWithPushReadyDevices} /{' '}
                          {payload.systemStatus.push.membersUsingEmailFallback} /{' '}
                          {payload.systemStatus.push.membersWithoutDeliveryPath}
                        </p>
                      </div>
                      <div className="task-row compact">
                        <div className="task-row-header">
                          <strong>{t('system_status.email_fallback')}</strong>
                          <span
                            className={`status-pill system-${payload.systemStatus.emailFallback.status}`}
                          >
                            {formatStatusChip(payload.systemStatus.emailFallback.status)}
                          </span>
                        </div>
                        <p>
                          {t('system_status.smtp_ready')}:{' '}
                          {payload.systemStatus.emailFallback.smtpReady
                            ? t('common.enabled')
                            : t('common.disabled')}
                        </p>
                        <p>
                          {t('system_status.smtp_configured')}:{' '}
                          {payload.systemStatus.smtp.configured
                            ? t('common.enabled')
                            : t('common.disabled')}
                        </p>
                        <p>
                          {t('system_status.smtp_host')}:{' '}
                          {payload.systemStatus.smtp.host ?? t('common.none')}
                        </p>
                        <p>
                          {t('system_status.email_fallback_members')}:{' '}
                          {payload.systemStatus.emailFallback.activeFallbackMemberCount} /{' '}
                          {payload.systemStatus.emailFallback.eligibleMemberCount}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="inline-message">{t('system_status.empty')}</p>
                  )}
                </article>
              ) : null}

              {showAdminOps && payload.compatibility.notificationRecovery ? (
                <article className="panel page-panel page-admin" ref={notificationRecoveryRef}>
                  <div className="section-heading">
                    <h2>{t('panel.notification_recovery')}</h2>
                    <span className="section-kicker">
                      {(payload.notificationRecovery?.failedPushDeliveries.length ?? 0) +
                        (payload.notificationRecovery?.failedEmailNotifications.length ?? 0)}
                    </span>
                  </div>
                  <p>{t('notification_recovery.hint')}</p>
                  {payload.notificationRecovery &&
                  payload.notificationRecovery.failedPushDeliveries.length === 0 &&
                  payload.notificationRecovery.failedEmailNotifications.length === 0 ? (
                    <p className="inline-message">{t('notification_recovery.empty')}</p>
                  ) : (
                    <div className="stack-list">
                      <div className="recovery-group">
                        <div className="section-heading">
                          <h3>{t('notification_recovery.failed_push')}</h3>
                          <span className="section-kicker">
                            {payload.notificationRecovery?.failedPushDeliveries.length ?? 0}
                          </span>
                        </div>
                        {payload.notificationRecovery?.failedPushDeliveries.length ? (
                          payload.notificationRecovery.failedPushDeliveries.map((entry) => (
                            <div className="task-row compact" key={entry.id}>
                              <div className="task-row-header">
                                <strong>{entry.title}</strong>
                                <span className="status-pill delivery-failed">
                                  {t('notifications.delivery_failed')}
                                </span>
                              </div>
                              <p>
                                {t('notification_recovery.recipient')}: {entry.recipientDisplayName}
                              </p>
                              <p>
                                {t('notification_recovery.device')}:{' '}
                                {entry.deviceName ?? t('common.unknown')} ({entry.provider})
                              </p>
                              <p>
                                {t('notification_recovery.last_attempt')}:{' '}
                                {formatDate(entry.attemptedAt)}
                              </p>
                              <p>
                                {t('notification_recovery.error')}:{' '}
                                {entry.error ?? t('common.none')}
                              </p>
                              <div className="button-row">
                                <button
                                  className="ghost-button"
                                  type="button"
                                  disabled={busyAction === `retry-push:${entry.id}`}
                                  onClick={() => void handleRetryPushDelivery(entry.id)}
                                >
                                  {t('notification_recovery.retry_push')}
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="inline-message">{t('notification_recovery.none_push')}</p>
                        )}
                      </div>
                      <div className="recovery-group">
                        <div className="section-heading">
                          <h3>{t('notification_recovery.failed_email')}</h3>
                          <span className="section-kicker">
                            {payload.notificationRecovery?.failedEmailNotifications.length ?? 0}
                          </span>
                        </div>
                        {payload.notificationRecovery?.failedEmailNotifications.length ? (
                          payload.notificationRecovery.failedEmailNotifications.map((entry) => (
                            <div className="task-row compact" key={entry.id}>
                              <div className="task-row-header">
                                <strong>{entry.title}</strong>
                                <span className="status-pill delivery-failed">
                                  {t('notifications.delivery_failed')}
                                </span>
                              </div>
                              <p>
                                {t('notification_recovery.recipient')}: {entry.recipientDisplayName}
                              </p>
                              <p>
                                {t('notification_recovery.email')}:{' '}
                                {entry.recipientEmail ?? t('common.none')}
                              </p>
                              <p>
                                {t('notification_recovery.last_attempt')}:{' '}
                                {formatDate(entry.attemptedAt)}
                              </p>
                              <p>
                                {t('notification_recovery.error')}:{' '}
                                {entry.error ?? t('common.none')}
                              </p>
                              <div className="button-row">
                                <button
                                  className="ghost-button"
                                  type="button"
                                  disabled={busyAction === `retry-email:${entry.id}`}
                                  onClick={() => void handleRetryEmailDelivery(entry.id)}
                                >
                                  {t('notification_recovery.retry_email')}
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="inline-message">{t('notification_recovery.none_email')}</p>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              ) : null}

              {payload.currentUser.role === 'admin' && settingsDraft ? (
                <>
                  <article
                    className="panel page-panel page-settings settings-panel-wide"
                    ref={householdSettingsRef}
                  >
                    <div className="section-heading">
                      <h2>{t('panel.household_settings')}</h2>
                      <span className="section-kicker">{t('settings.admin_only')}</span>
                    </div>
                    <div className="settings-sections settings-sections-wide">
                      {!isHostedSaas ? (
                        <section
                          className="settings-section settings-section-oidc"
                          ref={oidcSettingsRef}
                        >
                          <div className="section-heading section-heading-compact">
                            <h3>{t('settings.section_oidc')}</h3>
                          </div>
                          <div className="settings-list">
                            <label className="toggle-row">
                              <span>{t('settings.oidc_enabled')}</span>
                              <input
                                type="checkbox"
                                checked={settingsDraft.oidcEnabled}
                                onChange={(event) =>
                                  setSettingsDraft((current) =>
                                    current
                                      ? { ...current, oidcEnabled: event.target.checked }
                                      : current,
                                  )
                                }
                              />
                            </label>
                            <label>
                              <span>{t('settings.oidc_authority')}</span>
                              <input
                                type="text"
                                value={settingsDraft.oidcAuthority}
                                onChange={(event) =>
                                  setSettingsDraft((current) =>
                                    current
                                      ? { ...current, oidcAuthority: event.target.value }
                                      : current,
                                  )
                                }
                                placeholder="https://auth.example.com/application/o/taskbandit/"
                              />
                            </label>
                            <label>
                              <span>{t('settings.oidc_client_id')}</span>
                              <input
                                type="text"
                                value={settingsDraft.oidcClientId}
                                onChange={(event) =>
                                  setSettingsDraft((current) =>
                                    current
                                      ? { ...current, oidcClientId: event.target.value }
                                      : current,
                                  )
                                }
                              />
                            </label>
                            <label>
                              <span>{t('settings.oidc_client_secret')}</span>
                              <input
                                type="password"
                                value={settingsDraft.oidcClientSecret}
                                onChange={(event) =>
                                  setSettingsDraft((current) =>
                                    current
                                      ? { ...current, oidcClientSecret: event.target.value }
                                      : current,
                                  )
                                }
                                placeholder={
                                  settingsDraft.oidcClientSecretConfigured
                                    ? t('settings.oidc_secret_saved')
                                    : ''
                                }
                              />
                            </label>
                            <label>
                              <span>{t('settings.oidc_scope')}</span>
                              <input
                                type="text"
                                value={settingsDraft.oidcScope}
                                onChange={(event) =>
                                  setSettingsDraft((current) =>
                                    current
                                      ? { ...current, oidcScope: event.target.value }
                                      : current,
                                  )
                                }
                              />
                            </label>
                            <p className="inline-message">
                              {t('settings.oidc_runtime_status')
                                .replace(
                                  '{effective}',
                                  settingsDraft.oidcEffective
                                    ? t('common.enabled')
                                    : t('common.disabled'),
                                )
                                .replace(
                                  '{source}',
                                  t(`auth.oidc_source_${settingsDraft.oidcSource}`),
                                )}
                            </p>
                          </div>
                        </section>
                      ) : null}

                      {!isHostedSaas ? (
                        <section
                          className="settings-section settings-section-smtp"
                          ref={smtpSettingsRef}
                        >
                          <div className="section-heading section-heading-compact">
                            <h3>{t('settings.section_smtp')}</h3>
                          </div>
                          <div className="settings-list">
                            <label className="toggle-row">
                              <span>{t('settings.smtp_enabled')}</span>
                              <input
                                type="checkbox"
                                checked={settingsDraft.smtpEnabled}
                                onChange={(event) =>
                                  setSettingsDraft((current) =>
                                    current
                                      ? { ...current, smtpEnabled: event.target.checked }
                                      : current,
                                  )
                                }
                              />
                            </label>
                            <label>
                              <span>{t('settings.smtp_host')}</span>
                              <input
                                type="text"
                                value={settingsDraft.smtpHost}
                                onChange={(event) =>
                                  setSettingsDraft((current) =>
                                    current
                                      ? { ...current, smtpHost: event.target.value }
                                      : current,
                                  )
                                }
                                placeholder="smtp.example.com"
                              />
                            </label>
                            <label>
                              <span>{t('settings.smtp_port')}</span>
                              <input
                                type="number"
                                min={1}
                                max={65535}
                                value={settingsDraft.smtpPort}
                                onChange={(event) =>
                                  setSettingsDraft((current) =>
                                    current
                                      ? { ...current, smtpPort: Number(event.target.value || 0) }
                                      : current,
                                  )
                                }
                              />
                            </label>
                            <label className="toggle-row">
                              <span>{t('settings.smtp_secure')}</span>
                              <input
                                type="checkbox"
                                checked={settingsDraft.smtpSecure}
                                onChange={(event) =>
                                  setSettingsDraft((current) =>
                                    current
                                      ? { ...current, smtpSecure: event.target.checked }
                                      : current,
                                  )
                                }
                              />
                            </label>
                            <label>
                              <span>{t('settings.smtp_username')}</span>
                              <input
                                type="text"
                                value={settingsDraft.smtpUsername}
                                onChange={(event) =>
                                  setSettingsDraft((current) =>
                                    current
                                      ? { ...current, smtpUsername: event.target.value }
                                      : current,
                                  )
                                }
                              />
                            </label>
                            <label>
                              <span>{t('settings.smtp_password')}</span>
                              <input
                                type="password"
                                value={settingsDraft.smtpPassword}
                                onChange={(event) =>
                                  setSettingsDraft((current) =>
                                    current
                                      ? { ...current, smtpPassword: event.target.value }
                                      : current,
                                  )
                                }
                                placeholder={
                                  settingsDraft.smtpPasswordConfigured
                                    ? t('settings.smtp_password_saved')
                                    : ''
                                }
                              />
                            </label>
                            <label>
                              <span>{t('settings.smtp_from_email')}</span>
                              <input
                                type="email"
                                value={settingsDraft.smtpFromEmail}
                                onChange={(event) =>
                                  setSettingsDraft((current) =>
                                    current
                                      ? { ...current, smtpFromEmail: event.target.value }
                                      : current,
                                  )
                                }
                              />
                            </label>
                            <label>
                              <span>{t('settings.smtp_from_name')}</span>
                              <input
                                type="text"
                                value={settingsDraft.smtpFromName}
                                onChange={(event) =>
                                  setSettingsDraft((current) =>
                                    current
                                      ? { ...current, smtpFromName: event.target.value }
                                      : current,
                                  )
                                }
                              />
                            </label>
                          </div>
                          <div className="button-row">
                            <button
                              className="secondary-button"
                              type="button"
                              disabled={busyAction === 'test-smtp'}
                              onClick={() => void handleTestSmtp()}
                            >
                              {t('settings.smtp_test')}
                            </button>
                          </div>
                          {smtpTestRequiredToEnable ? (
                            <p className="inline-message">
                              SMTP_TEST_REQUIRED: Test the SMTP settings successfully before
                              enabling SMTP.
                            </p>
                          ) : null}
                        </section>
                      ) : null}

                      <section
                        className="settings-section settings-section-general"
                        ref={generalSettingsRef}
                      >
                        <div className="section-heading section-heading-compact">
                          <h3>{t('settings.section_general')}</h3>
                        </div>
                        <div className="settings-list">
                          <label className="toggle-row">
                            <span>{t('settings.self_signup')}</span>
                            <input
                              type="checkbox"
                              checked={settingsDraft.selfSignupEnabled}
                              onChange={(event) =>
                                setSettingsDraft((current) =>
                                  current
                                    ? { ...current, selfSignupEnabled: event.target.checked }
                                    : current,
                                )
                              }
                            />
                          </label>
                          <label className="toggle-row">
                            <span>{t('settings.full_visibility')}</span>
                            <input
                              type="checkbox"
                              checked={settingsDraft.membersCanSeeFullHouseholdChoreDetails}
                              onChange={(event) =>
                                setSettingsDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        membersCanSeeFullHouseholdChoreDetails:
                                          event.target.checked,
                                      }
                                    : current,
                                )
                              }
                            />
                          </label>
                          {isHostedSaas ? (
                            <p className="inline-message">{t('settings.push_always_on_saas')}</p>
                          ) : (
                            <label className="toggle-row">
                              <span>{t('settings.push_notifications')}</span>
                              <input
                                type="checkbox"
                                checked={settingsDraft.enablePushNotifications}
                                onChange={(event) =>
                                  setSettingsDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          enablePushNotifications: event.target.checked,
                                        }
                                      : current,
                                  )
                                }
                              />
                            </label>
                          )}
                          <label className="toggle-row">
                            <span>{t('settings.overdue_penalties')}</span>
                            <input
                              type="checkbox"
                              checked={settingsDraft.enableOverduePenalties}
                              onChange={(event) =>
                                setSettingsDraft((current) =>
                                  current
                                    ? { ...current, enableOverduePenalties: event.target.checked }
                                    : current,
                                )
                              }
                            />
                          </label>
                          <label className="toggle-row">
                            <span>{t('settings.enable_achievements')}</span>
                            <input
                              type="checkbox"
                              checked={settingsDraft.enableAchievements}
                              onChange={(event) =>
                                setSettingsDraft((current) =>
                                  current
                                    ? { ...current, enableAchievements: event.target.checked }
                                    : current,
                                )
                              }
                            />
                          </label>
                          <label className="toggle-row">
                            <span>{t('settings.require_reward_approval')}</span>
                            <input
                              type="checkbox"
                              checked={settingsDraft.requireRewardApproval}
                              onChange={(event) =>
                                setSettingsDraft((current) =>
                                  current
                                    ? { ...current, requireRewardApproval: event.target.checked }
                                    : current,
                                )
                              }
                            />
                          </label>
                          <label>
                            <span>{t('settings.takeover_points_delta')}</span>
                            <input
                              type="number"
                              min={-1000}
                              max={1000}
                              step={1}
                              value={settingsDraft.takeoverPointsDelta}
                              onChange={(event) =>
                                setSettingsDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        takeoverPointsDelta:
                                          Number.parseInt(event.target.value || '0', 10) || 0,
                                      }
                                    : current,
                                )
                              }
                            />
                          </label>
                          <p className="inline-message">{t('settings.takeover_points_hint')}</p>
                          <p className="inline-message">
                            {settingsDraft.takeoverPointsDelta === 0
                              ? t('settings.takeover_points_disabled')
                              : settingsDraft.takeoverPointsDelta > 0
                                ? t('settings.takeover_points_reward').replace(
                                    '{points}',
                                    formatNumber(settingsDraft.takeoverPointsDelta),
                                  )
                                : t('settings.takeover_points_penalty').replace(
                                    '{points}',
                                    formatNumber(Math.abs(settingsDraft.takeoverPointsDelta)),
                                  )}
                          </p>
                          <label>
                            <span>Quick log default points (blank = inherit)</span>
                            <input
                              type="number"
                              min={0}
                              max={1000}
                              step={1}
                              value={settingsDraft.quickLogPointsDefault ?? ''}
                              onChange={(event) =>
                                setSettingsDraft((current) => {
                                  if (!current) {
                                    return current;
                                  }
                                  const nextValue = event.target.value.trim();
                                  return {
                                    ...current,
                                    quickLogPointsDefault:
                                      nextValue === ''
                                        ? null
                                        : Math.max(0, Number.parseInt(nextValue, 10) || 0),
                                  };
                                })
                              }
                            />
                          </label>
                          <p className="inline-message">
                            This value is used by quick log by default. Users can still override
                            points per entry.
                          </p>
                          <label>
                            <span>Leaderboard reset</span>
                            <select
                              value={settingsDraft.leaderboardResetMode ?? 'never'}
                              onChange={(event) =>
                                setSettingsDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        leaderboardResetMode: event.target.value as
                                          | 'never'
                                          | 'weekly'
                                          | 'monthly'
                                          | 'quarterly',
                                      }
                                    : current,
                                )
                              }
                            >
                              <option value="never">Never (all-time)</option>
                              <option value="weekly">Weekly (resets each Monday)</option>
                              <option value="monthly">Monthly (resets on the 1st)</option>
                              <option value="quarterly">
                                Quarterly (resets Jan, Apr, Jul, Oct)
                              </option>
                            </select>
                          </label>
                          <p className="inline-message">
                            Controls how often the leaderboard ranking resets to zero. Points
                            balance is never affected — only the leaderboard score resets.
                            {settingsDraft.lastLeaderboardResetAt
                              ? ` Last reset: ${new Date(settingsDraft.lastLeaderboardResetAt).toLocaleDateString()}.`
                              : null}
                          </p>
                          <label>
                            <span>{t('settings.timezone')}</span>
                            <input
                              type="text"
                              list="iana-timezones"
                              value={settingsDraft.timezone ?? 'UTC'}
                              onChange={(event) =>
                                setSettingsDraft((current) =>
                                  current ? { ...current, timezone: event.target.value } : current,
                                )
                              }
                              placeholder="UTC"
                            />
                          </label>
                          <p className="inline-message">{t('settings.timezone_hint')}</p>
                          {!isHostedSaas ? (
                            <>
                              <label className="toggle-row">
                                <span>{t('settings.local_auth_enabled')}</span>
                                <input
                                  type="checkbox"
                                  checked={settingsDraft.localAuthEnabled}
                                  onChange={(event) =>
                                    setSettingsDraft((current) =>
                                      current
                                        ? { ...current, localAuthEnabled: event.target.checked }
                                        : current,
                                    )
                                  }
                                />
                              </label>
                              {settingsDraft.localAuthForcedByConfig ? (
                                <p className="inline-message">
                                  {t('settings.local_auth_forced_note')}
                                </p>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      </section>

                      <HolidayBlocksSection
                        blocks={payload.holidayBlocks}
                        onRefresh={async () => {
                          const blocks = await taskBanditApi.getHolidayBlocks(token!, language);
                          updatePayload((prev) => ({ ...prev, holidayBlocks: blocks }));
                        }}
                        token={token!}
                        language={language}
                        t={t}
                      />

                      {!isHostedSaas ? (
                        <section className="settings-section settings-section-recovery">
                          <div className="section-heading section-heading-compact">
                            <h3>{t('settings.section_recovery')}</h3>
                          </div>
                          <div className="settings-list">
                            <p className="inline-message">{t('settings.recovery_summary_hint')}</p>
                            <p>
                              {t('settings.recovery_local_admins')}:{' '}
                              {t('settings.recovery_local_admins_detail')
                                .replace('{configured}', String(adminLocalRecoveryCount))
                                .replace('{total}', String(adminMembers.length || 1))}
                            </p>
                            <p>
                              {t('backup.local_recovery')}:{' '}
                              {effectiveHouseholdSettings?.localAuthForcedByConfig
                                ? t('common.enabled')
                                : t('common.disabled')}
                            </p>
                            <p>
                              {t('settings.recovery_reset_email')}:{' '}
                              {smtpRecoveryReady && adminLocalRecoveryEmailCount > 0
                                ? t('common.enabled')
                                : t('common.disabled')}
                            </p>
                            <p>
                              {t('settings.recovery_backup_callout').replace(
                                '{emails}',
                                String(adminLocalRecoveryEmailCount),
                              )}
                            </p>
                            <p className="inline-message">
                              {t('settings.recovery_member_password_hint')}
                            </p>
                          </div>
                        </section>
                      ) : null}
                    </div>
                    <div className="button-row">
                      <button
                        className="primary-button"
                        type="button"
                        disabled={busyAction === 'save-settings' || smtpTestRequiredToEnable}
                        onClick={() => void handleSaveSettings()}
                      >
                        {t('settings.save')}
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={busyAction === 'process-overdue-penalties'}
                        onClick={() => void handleProcessOverduePenalties()}
                      >
                        {t('settings.process_overdue')}
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        disabled={busyAction === 'process-notification-maintenance'}
                        onClick={() => void handleProcessNotificationMaintenance()}
                      >
                        {t('settings.process_notifications')}
                      </button>
                    </div>
                  </article>

                  <article
                    className="panel page-panel page-household page-household-members"
                    ref={membersRef}
                  >
                    <div className="section-heading">
                      <h2>{t('panel.household_members')}</h2>
                      <span className="section-kicker">{payload.household.members.length}</span>
                    </div>
                    <div className="household-member-layout">
                      <section className="settings-section household-member-section">
                        <div className="section-heading section-heading-compact">
                          <h3>{t('members.manage_section')}</h3>
                          <span className="section-kicker">{payload.household.members.length}</span>
                        </div>
                        <div className="stack-list">
                          {payload.household.members.map((member) => (
                            <div key={member.id}>
                              <div className="leader-row member-row">
                                <div>
                                  <strong>{member.displayName}</strong>
                                  <p>
                                    {t(`role.${member.role}`)} - {member.email ?? t('common.none')}
                                  </p>
                                  <div className="member-provider-row">
                                    {member.authProviders.map((provider) => (
                                      <span
                                        className="status-pill member-provider-pill"
                                        key={provider}
                                      >
                                        {t(`members.provider_${provider}`)}
                                      </span>
                                    ))}
                                    <span className="member-provider-note">
                                      {member.localAuthConfigured
                                        ? t('members.local_recovery_ready')
                                        : t('members.local_recovery_missing')}
                                    </span>
                                  </div>
                                </div>
                                <div className="member-row-actions">
                                  <strong>
                                    {formatNumber(member.points)} {t('user.points')}
                                  </strong>
                                  <button
                                    className="ghost-button"
                                    type="button"
                                    onClick={() => beginEditingMember(member)}
                                    disabled={busyAction === `update-member:${member.id}`}
                                  >
                                    {t('common.edit')}
                                  </button>
                                </div>
                              </div>
                              {editingMemberId === member.id ? (
                                <form
                                  className="login-form member-form member-edit-form"
                                  onSubmit={handleUpdateHouseholdMember}
                                >
                                  <label>
                                    <span>{t('members.display_name')}</span>
                                    <input
                                      type="text"
                                      value={memberEditForm.displayName}
                                      onChange={(event) =>
                                        setMemberEditForm((current) => ({
                                          ...current,
                                          displayName: event.target.value,
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    <span>{t('members.role')}</span>
                                    <select
                                      value={
                                        member.role === 'admin' ? 'parent' : memberEditForm.role
                                      }
                                      disabled={member.role === 'admin'}
                                      onChange={(event) =>
                                        setMemberEditForm((current) => ({
                                          ...current,
                                          role: event.target.value as 'parent' | 'child',
                                        }))
                                      }
                                    >
                                      <option value="child">{t('role.child')}</option>
                                      <option value="parent">{t('role.parent')}</option>
                                    </select>
                                  </label>
                                  {member.role === 'admin' ? (
                                    <p className="inline-message">
                                      {t('members.admin_role_locked')}
                                    </p>
                                  ) : null}
                                  {!member.localAuthConfigured ? (
                                    <p className="inline-message">
                                      {t('members.password_adds_local_auth')}
                                    </p>
                                  ) : null}
                                  <label>
                                    <span>{t('members.email')}</span>
                                    <input
                                      type="email"
                                      value={memberEditForm.email}
                                      onChange={(event) =>
                                        setMemberEditForm((current) => ({
                                          ...current,
                                          email: event.target.value,
                                        }))
                                      }
                                      autoComplete="email"
                                    />
                                  </label>
                                  <label>
                                    <span>{t('members.new_password')}</span>
                                    <input
                                      type="password"
                                      value={memberEditForm.password ?? ''}
                                      onChange={(event) =>
                                        setMemberEditForm((current) => ({
                                          ...current,
                                          password: event.target.value,
                                        }))
                                      }
                                      autoComplete="new-password"
                                    />
                                  </label>
                                  <div className="button-row">
                                    <button
                                      className="primary-button"
                                      type="submit"
                                      disabled={busyAction === `update-member:${member.id}`}
                                    >
                                      {t('members.save')}
                                    </button>
                                    <button
                                      className="ghost-button"
                                      type="button"
                                      onClick={cancelEditingMember}
                                    >
                                      {t('common.cancel')}
                                    </button>
                                  </div>
                                </form>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </section>
                      <section
                        className="settings-section household-member-section"
                        ref={memberCreateRef}
                      >
                        <div className="section-heading section-heading-compact">
                          <h3>{t('members.create_section')}</h3>
                        </div>
                        <form
                          className="login-form member-form household-member-create-form"
                          onSubmit={handleCreateHouseholdMember}
                        >
                          <label>
                            <span>{t('members.display_name')}</span>
                            <input
                              type="text"
                              value={memberForm.displayName}
                              onChange={(event) =>
                                setMemberForm((current) => ({
                                  ...current,
                                  displayName: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            <span>{t('members.role')}</span>
                            <select
                              value={memberForm.role}
                              onChange={(event) =>
                                setMemberForm((current) => ({
                                  ...current,
                                  role: event.target.value as 'parent' | 'child',
                                }))
                              }
                            >
                              <option value="child">{t('role.child')}</option>
                              <option value="parent">{t('role.parent')}</option>
                            </select>
                          </label>
                          <label>
                            <span>{t('members.email')}</span>
                            <input
                              type="email"
                              value={memberForm.email}
                              onChange={(event) =>
                                setMemberForm((current) => ({
                                  ...current,
                                  email: event.target.value,
                                }))
                              }
                              autoComplete="email"
                            />
                          </label>
                          <label>
                            <span>{t('members.password')}</span>
                            <input
                              type="password"
                              value={memberForm.password}
                              onChange={(event) =>
                                setMemberForm((current) => ({
                                  ...current,
                                  password: event.target.value,
                                }))
                              }
                              autoComplete="new-password"
                            />
                          </label>
                          <p className="inline-message">{t('members.password_generated_hint')}</p>
                          <label className="toggle-row">
                            <span>{t('members.send_invite_email')}</span>
                            <input
                              type="checkbox"
                              checked={Boolean(memberForm.sendInviteEmail)}
                              onChange={(event) =>
                                setMemberForm((current) => ({
                                  ...current,
                                  sendInviteEmail: event.target.checked,
                                }))
                              }
                            />
                          </label>
                          <button
                            className="primary-button"
                            type="submit"
                            disabled={busyAction === 'create-member'}
                          >
                            {t('members.create')}
                          </button>
                        </form>
                      </section>
                    </div>
                  </article>
                </>
              ) : null}

              {showTemplateManager ? (
                <article className="panel panel-wide page-panel page-templates" ref={templatesRef}>
                  <div className="section-heading">
                    <h2>{t('panel.chore_templates')}</h2>
                    <span className="section-kicker">{payload.templates.length}</span>
                  </div>
                  <div
                    className="template-admin-layout"
                    data-has-selection={editingTemplateId !== null ? 'true' : 'false'}
                  >
                    <div className="stack-list template-browser-panel">
                      <div className="template-browser-toolbar">
                        <label className="template-search-field">
                          <span>{t('templates.search')}</span>
                          <input
                            type="search"
                            value={templateSearch}
                            onChange={(event) => setTemplateSearch(event.target.value)}
                            placeholder={t('templates.search_placeholder')}
                          />
                        </label>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={!hasFeature('templates_manage')}
                          onClick={() => {
                            setTemplateSearch('');
                            resetTemplateForm();
                          }}
                        >
                          {t('templates.new_template')}
                        </button>
                        {payload.currentUser.role === 'admin' && (
                          <button
                            className="ghost-button danger-button"
                            type="button"
                            disabled={
                              !hasFeature('templates_manage') || busyAction === 'reset-templates'
                            }
                            onClick={() => void handleResetTemplatesToDefaults()}
                          >
                            {t('templates.reset_to_defaults')}
                          </button>
                        )}
                      </div>
                      {filteredTemplateGroups.length === 0 ? (
                        <p className="inline-message">{t('templates.search_empty')}</p>
                      ) : (
                        <>
                          <div className="template-group-selector">
                            {templateBrowserGroupOptions.map((groupTitle) => {
                              const group = filteredTemplateGroups.find(
                                (entry) => entry.groupTitle === groupTitle,
                              );
                              return (
                                <button
                                  key={groupTitle}
                                  className={`template-group-chip ${
                                    visibleTemplateBrowserGroup === groupTitle ? 'active' : ''
                                  }`}
                                  type="button"
                                  onClick={() => setSelectedTemplateBrowserGroup(groupTitle)}
                                >
                                  <span>{groupTitle}</span>
                                  <span className="section-kicker">
                                    {group?.templates.length ?? 0}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <section
                            className="template-group-block"
                            key={visibleTemplateBrowserGroup}
                          >
                            <div className="section-heading">
                              <h3>{visibleTemplateBrowserGroup}</h3>
                              <span className="section-kicker">
                                {visibleTemplateBrowserTemplates.length}
                              </span>
                            </div>
                            <div className="stack-list compact-stack">
                              {visibleTemplateBrowserTemplates.map((template) => {
                                const dependencyRules = normalizeTemplateDependencyRules(
                                  template.dependencyRules,
                                  template.dependencyTemplateIds,
                                );
                                return (
                                  <button
                                    className={`template-browser-card template-browser-card-compact ${
                                      editingTemplateId === template.id ? 'active' : ''
                                    }`}
                                    key={template.id}
                                    type="button"
                                    onClick={() => startEditingTemplate(template)}
                                  >
                                    <div className="template-browser-card-main">
                                      <strong>{template.title}</strong>
                                      <div className="template-browser-flags">
                                        <span className="status-pill">
                                          {t(`difficulty.${template.difficulty}`)}
                                        </span>
                                        {template.requirePhotoProof ? (
                                          <span className="status-pill">
                                            {t('templates.photo_required_short')}
                                          </span>
                                        ) : null}
                                        {template.checklist.length > 0 ? (
                                          <span className="status-pill">
                                            {t('templates.checklist_short').replace(
                                              '{count}',
                                              String(template.checklist.length),
                                            )}
                                          </span>
                                        ) : null}
                                        {template.variants.length > 0 ? (
                                          <span className="status-pill">
                                            {t('templates.subtypes_short').replace(
                                              '{count}',
                                              String(template.variants.length),
                                            )}
                                          </span>
                                        ) : null}
                                        {dependencyRules.length > 0 ? (
                                          <span className="status-pill">
                                            {t('templates.follow_ups_short').replace(
                                              '{count}',
                                              String(dependencyRules.length),
                                            )}
                                          </span>
                                        ) : null}
                                      </div>
                                      {template.stickyFollowUpAssignee ? (
                                        <p className="inline-message">
                                          {t('templates.follow_up_assignment_sticky')}
                                        </p>
                                      ) : null}
                                    </div>
                                    <div
                                      className="template-browser-translations"
                                      aria-label={t('templates.translations')}
                                    >
                                      {templateTranslationLocales.map((locale) => (
                                        <span
                                          key={`${template.id}-${locale}`}
                                          className={`translation-flag ${
                                            locale === template.defaultLocale
                                              ? 'is-default'
                                              : hasTemplateTranslationCoverage(template, locale)
                                                ? 'is-complete'
                                                : 'is-missing'
                                          }`}
                                          title={locale.toUpperCase()}
                                        >
                                          {locale.toUpperCase()}
                                        </span>
                                      ))}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </section>
                        </>
                      )}
                    </div>
                    <form
                      className="login-form member-form template-editor-panel"
                      onSubmit={handleCreateTemplate}
                    >
                      {showClientMobileShell && editingTemplateId ? (
                        <button
                          className="mobile-editor-back-button"
                          type="button"
                          onClick={() => setEditingTemplateId(null)}
                        >
                          ← {t('common.back')}
                        </button>
                      ) : null}
                      {!hasFeature('templates_manage') ? (
                        <p className="inline-message">{t('feature.templates_manage_disabled')}</p>
                      ) : null}
                      <div className="stack-list">
                        <div className="section-heading">
                          <h3>{t('templates.edit_language')}</h3>
                          <span className="section-kicker">
                            {getLanguageLabel(templateEditorLocale)}
                          </span>
                        </div>
                        <div
                          className="segmented-toggle"
                          role="tablist"
                          aria-label={t('templates.edit_language')}
                        >
                          {templateTranslationLocales.map((locale) => (
                            <button
                              key={locale}
                              className={templateEditorLocale === locale ? 'active' : ''}
                              type="button"
                              onClick={() => setTemplateEditorLocale(locale)}
                            >
                              {getLanguageLabel(locale)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="template-editor-grid">
                        {isEditingTemplateBaseLocale ? (
                          <label>
                            <span>{t('templates.group_name')}</span>
                            <select
                              value={templateGroupPickerValue}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                if (nextValue === '__new__') {
                                  setTemplateForm((current) => ({
                                    ...current,
                                    groupTitle: templateGroupOptions.includes(
                                      current.groupTitle.trim(),
                                    )
                                      ? ''
                                      : current.groupTitle,
                                  }));
                                  return;
                                }

                                setTemplateForm((current) => ({
                                  ...current,
                                  groupTitle: nextValue,
                                }));
                              }}
                            >
                              {templateGroupOptions.map((groupTitle) => (
                                <option key={groupTitle} value={groupTitle}>
                                  {groupTitle}
                                </option>
                              ))}
                              <option value="__new__">{t('templates.group_create_new')}</option>
                            </select>
                          </label>
                        ) : (
                          <label>
                            <span>{t('templates.group_name')}</span>
                            <input
                              type="text"
                              value={activeTemplateTranslation?.groupTitle ?? ''}
                              onChange={(event) =>
                                updateTemplateTranslation(templateEditorLocale, {
                                  groupTitle: event.target.value,
                                })
                              }
                            />
                          </label>
                        )}
                        <label>
                          <span>{t('templates.title')}</span>
                          <input
                            type="text"
                            value={
                              isEditingTemplateBaseLocale
                                ? templateForm.title
                                : (activeTemplateTranslation?.title ?? '')
                            }
                            onChange={(event) =>
                              isEditingTemplateBaseLocale
                                ? setTemplateForm((current) => ({
                                    ...current,
                                    title: event.target.value,
                                  }))
                                : updateTemplateTranslation(templateEditorLocale, {
                                    title: event.target.value,
                                  })
                            }
                          />
                        </label>
                      </div>
                      {isEditingTemplateBaseLocale && templateGroupPickerValue === '__new__' ? (
                        <label>
                          <span>{t('templates.group_new_name')}</span>
                          <input
                            type="text"
                            value={templateForm.groupTitle}
                            onChange={(event) =>
                              setTemplateForm((current) => ({
                                ...current,
                                groupTitle: event.target.value,
                              }))
                            }
                            placeholder={t('templates.group_new_placeholder')}
                          />
                        </label>
                      ) : null}
                      <label>
                        <span>{t('templates.description')}</span>
                        <textarea
                          value={
                            isEditingTemplateBaseLocale
                              ? templateForm.description
                              : (activeTemplateTranslation?.description ?? '')
                          }
                          onChange={(event) =>
                            isEditingTemplateBaseLocale
                              ? setTemplateForm((current) => ({
                                  ...current,
                                  description: event.target.value,
                                }))
                              : updateTemplateTranslation(templateEditorLocale, {
                                  description: event.target.value,
                                })
                          }
                          rows={4}
                        />
                      </label>
                      <div className="template-editor-grid">
                        <label>
                          <span>{t('templates.difficulty')}</span>
                          <select
                            value={templateForm.difficulty}
                            onChange={(event) =>
                              setTemplateForm((current) => ({
                                ...current,
                                difficulty: event.target.value as TemplateFormState['difficulty'],
                              }))
                            }
                          >
                            <option value="easy">{t('difficulty.easy')}</option>
                            <option value="medium">{t('difficulty.medium')}</option>
                            <option value="hard">{t('difficulty.hard')}</option>
                          </select>
                        </label>
                        <label>
                          <span>{t('templates.assignment_strategy')}</span>
                          <select
                            value={templateForm.assignmentStrategy}
                            onChange={(event) =>
                              setTemplateForm((current) => ({
                                ...current,
                                assignmentStrategy: event.target
                                  .value as TemplateFormState['assignmentStrategy'],
                              }))
                            }
                          >
                            {assignmentStrategyOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="template-editor-grid">
                        <label>
                          <span>{t('templates.recurrence')}</span>
                          <select
                            value={templateForm.recurrenceType ?? 'none'}
                            onChange={(event) =>
                              setTemplateForm((current) => ({
                                ...current,
                                recurrenceType: event.target
                                  .value as TemplateFormState['recurrenceType'],
                              }))
                            }
                          >
                            {recurrenceOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>{t('templates.recurrence_anchor')}</span>
                          <select
                            value={templateForm.recurrenceStartStrategy ?? 'due_at'}
                            onChange={(event) =>
                              setTemplateForm((current) => ({
                                ...current,
                                recurrenceStartStrategy: event.target.value as
                                  | 'due_at'
                                  | 'completed_at',
                              }))
                            }
                          >
                            <option value="due_at">
                              {t('templates.recurrence_anchor_due_at')}
                            </option>
                            <option value="completed_at">
                              {t('templates.recurrence_anchor_completed_at')}
                            </option>
                          </select>
                        </label>
                      </div>
                      <label className="toggle-row">
                        <span>{t('templates.sticky_follow_up_assignee')}</span>
                        <input
                          type="checkbox"
                          checked={Boolean(templateForm.stickyFollowUpAssignee)}
                          onChange={(event) =>
                            setTemplateForm((current) => ({
                              ...current,
                              stickyFollowUpAssignee: event.target.checked,
                            }))
                          }
                        />
                      </label>
                      <p className="inline-message">
                        {templateForm.stickyFollowUpAssignee
                          ? t('templates.follow_up_assignment_sticky')
                          : t('templates.follow_up_assignment_flexible')}
                      </p>
                      {templateForm.recurrenceType === 'every_x_days' ? (
                        <label>
                          <span>{t('templates.interval_days')}</span>
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={templateForm.recurrenceIntervalDays ?? 1}
                            onChange={(event) =>
                              setTemplateForm((current) => ({
                                ...current,
                                recurrenceIntervalDays: Number(event.target.value || 1),
                              }))
                            }
                          />
                        </label>
                      ) : null}
                      {templateForm.recurrenceType === 'custom_weekly' ? (
                        <div className="stack-list">
                          <div className="section-heading">
                            <h3>{t('templates.weekdays')}</h3>
                            <span className="section-kicker">
                              {(templateForm.recurrenceWeekdays ?? []).length}
                            </span>
                          </div>
                          {recurrenceWeekdayOptions.map((weekday) => {
                            const selected = (templateForm.recurrenceWeekdays ?? []).includes(
                              weekday.value,
                            );
                            return (
                              <label className="toggle-row" key={weekday.value}>
                                <span>{weekday.label}</span>
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={(event) =>
                                    setTemplateForm((current) => ({
                                      ...current,
                                      recurrenceWeekdays: event.target.checked
                                        ? [
                                            ...new Set([
                                              ...(current.recurrenceWeekdays ?? []),
                                              weekday.value,
                                            ]),
                                          ]
                                        : (current.recurrenceWeekdays ?? []).filter(
                                            (value) => value !== weekday.value,
                                          ),
                                    }))
                                  }
                                />
                              </label>
                            );
                          })}
                        </div>
                      ) : null}
                      <label className="toggle-row">
                        <span>{t('templates.require_photo')}</span>
                        <input
                          type="checkbox"
                          checked={templateForm.requirePhotoProof}
                          onChange={(event) =>
                            setTemplateForm((current) => ({
                              ...current,
                              requirePhotoProof: event.target.checked,
                            }))
                          }
                        />
                      </label>
                      <details className="template-advanced-panel">
                        <summary className="template-advanced-summary">
                          <span>{t('templates.subtypes')}</span>
                          <span className="section-kicker">
                            {(templateForm.variants ?? []).length}
                          </span>
                        </summary>
                        <div className="stack-list template-advanced-body">
                          {(templateForm.variants ?? []).length === 0 ? (
                            <p className="inline-message">{t('templates.no_subtypes')}</p>
                          ) : (
                            (templateForm.variants ?? []).map((variant, index) => (
                              <div
                                className="task-row compact"
                                key={variant.id ?? `variant-${index}`}
                              >
                                <label>
                                  <span>{t('templates.subtype_name')}</span>
                                  <input
                                    type="text"
                                    value={variant.label}
                                    maxLength={100}
                                    onChange={(event) =>
                                      updateVariantDraftItem(index, { label: event.target.value })
                                    }
                                  />
                                </label>
                                {templateTranslationLocales
                                  .filter(
                                    (locale) => locale !== (templateForm.defaultLocale ?? language),
                                  )
                                  .map((locale) => {
                                    const translation = (variant.translations ?? []).find(
                                      (entry) => entry.locale === locale,
                                    );

                                    return (
                                      <label key={`${variant.id ?? index}-${locale}`}>
                                        <span>
                                          {getLanguageLabel(locale)} {t('templates.subtype_name')}
                                        </span>
                                        <input
                                          type="text"
                                          value={translation?.label ?? ''}
                                          maxLength={100}
                                          onChange={(event) =>
                                            updateVariantTranslation(
                                              index,
                                              locale,
                                              event.target.value,
                                            )
                                          }
                                        />
                                      </label>
                                    );
                                  })}
                                <button
                                  type="button"
                                  className="ghost-button"
                                  onClick={() => removeVariantDraftItem(index)}
                                >
                                  {t('templates.remove_subtype')}
                                </button>
                              </div>
                            ))
                          )}
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={addVariantDraftItem}
                          >
                            {t('templates.add_subtype')}
                          </button>
                        </div>
                      </details>
                      {hasFeature('follow_up_automation') ? (
                        <details className="template-advanced-panel">
                          <summary className="template-advanced-summary">
                            <span>{t('templates.follow_ups')}</span>
                            <span className="section-kicker">
                              {selectedTemplateDependencyRules.length}
                            </span>
                          </summary>
                          <div className="stack-list template-advanced-body">
                            {!templateForm.groupTitle.trim() ? (
                              <p className="inline-message">
                                {t('templates.follow_up_group_required')}
                              </p>
                            ) : sameGroupFollowUpCandidates.length === 0 ? (
                              <p className="inline-message">
                                {t('templates.follow_up_same_group_empty')}
                              </p>
                            ) : (
                              <>
                                <details className="multi-select-menu">
                                  <summary>
                                    {t('templates.follow_up_summary').replace(
                                      '{count}',
                                      String(selectedTemplateDependencyRules.length),
                                    )}
                                  </summary>
                                  <div className="stack-list compact-stack">
                                    {sameGroupFollowUpCandidates.map((template) => {
                                      const selected = selectedTemplateDependencyRules.some(
                                        (dependencyRule) =>
                                          dependencyRule.templateId === template.id,
                                      );
                                      return (
                                        <label className="toggle-row" key={template.id}>
                                          <span>{template.title}</span>
                                          <input
                                            type="checkbox"
                                            checked={selected}
                                            disabled={false}
                                            onChange={(event) =>
                                              toggleTemplateDependencyRule(
                                                template.id,
                                                event.target.checked,
                                              )
                                            }
                                          />
                                        </label>
                                      );
                                    })}
                                  </div>
                                </details>
                                {selectedTemplateDependencyRules.length === 0 ? (
                                  <p className="inline-message">{t('templates.no_follow_ups')}</p>
                                ) : (
                                  selectedTemplateDependencyRules.map((selectedRule) => {
                                    const followUpTemplate = sameGroupFollowUpCandidates.find(
                                      (template) => template.id === selectedRule.templateId,
                                    );
                                    return (
                                      <div
                                        className="task-row compact template-follow-up-rule"
                                        key={selectedRule.templateId}
                                      >
                                        <strong>
                                          {followUpTemplate?.title ?? t('common.unknown')}
                                        </strong>
                                        <div className="button-row">
                                          <label>
                                            <span>{t('templates.follow_up_delay')}</span>
                                            <input
                                              type="number"
                                              min={1}
                                              max={365}
                                              value={selectedRule.delayValue}
                                              disabled={false}
                                              onChange={(event) =>
                                                updateTemplateDependencyRule(
                                                  selectedRule.templateId,
                                                  {
                                                    delayValue: Number(event.target.value || 1),
                                                  },
                                                )
                                              }
                                            />
                                          </label>
                                          <label>
                                            <span>{t('templates.follow_up_delay_unit')}</span>
                                            <select
                                              value={selectedRule.delayUnit}
                                              disabled={false}
                                              onChange={(event) =>
                                                updateTemplateDependencyRule(
                                                  selectedRule.templateId,
                                                  {
                                                    delayUnit: event.target
                                                      .value as FollowUpDelayUnit,
                                                  },
                                                )
                                              }
                                            >
                                              <option value="hours">
                                                {t('templates.delay_hours')}
                                              </option>
                                              <option value="days">
                                                {t('templates.delay_days')}
                                              </option>
                                            </select>
                                          </label>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </>
                            )}
                          </div>
                        </details>
                      ) : null}
                      <details className="template-advanced-panel">
                        <summary className="template-advanced-summary">
                          <span>{t('templates.checklist')}</span>
                          <span className="section-kicker">
                            {(templateForm.checklist ?? []).length}
                          </span>
                        </summary>
                        <div className="stack-list template-advanced-body">
                          {(templateForm.checklist ?? []).length === 0 ? (
                            <p className="inline-message">{t('templates.no_checklist_draft')}</p>
                          ) : (
                            (templateForm.checklist ?? []).map((item, index) => (
                              <div className="task-row compact" key={`${item.title}-${index}`}>
                                <label>
                                  <span>{t('templates.checklist_item_title')}</span>
                                  <input
                                    type="text"
                                    value={item.title}
                                    onChange={(event) =>
                                      updateChecklistDraftItem(index, { title: event.target.value })
                                    }
                                  />
                                </label>
                                <label className="toggle-row">
                                  <span>{t('templates.checklist_required')}</span>
                                  <input
                                    type="checkbox"
                                    checked={item.required}
                                    onChange={(event) =>
                                      updateChecklistDraftItem(index, {
                                        required: event.target.checked,
                                      })
                                    }
                                  />
                                </label>
                                <button
                                  className="secondary-button"
                                  type="button"
                                  onClick={() => removeChecklistDraftItem(index)}
                                >
                                  {t('templates.remove_checklist_item')}
                                </button>
                              </div>
                            ))
                          )}
                          <button
                            className="ghost-button"
                            type="button"
                            onClick={addChecklistDraftItem}
                          >
                            {t('templates.add_checklist_item')}
                          </button>
                        </div>
                      </details>
                      {hasFeature('mastery') ? (
                        <details className="template-editor-section">
                          <summary>Mastery</summary>
                          <label className="toggle-row">
                            <span>Disable mastery for this chore</span>
                            <input
                              type="checkbox"
                              checked={Boolean(templateForm.masteryDisabled)}
                              onChange={(event) =>
                                setTemplateForm((current) => ({
                                  ...current,
                                  masteryDisabled: event.target.checked,
                                }))
                              }
                            />
                          </label>
                          {!templateForm.masteryDisabled ? (
                            <>
                              <label>
                                <span>Level 1 badge — completions needed</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={templateForm.masteryLevel1Threshold ?? 5}
                                  onChange={(event) =>
                                    setTemplateForm((current) => ({
                                      ...current,
                                      masteryLevel1Threshold: Number(event.target.value || 5),
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                <span>Level 2 bonus — completions needed</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={200}
                                  value={templateForm.masteryLevel2Threshold ?? 10}
                                  onChange={(event) =>
                                    setTemplateForm((current) => ({
                                      ...current,
                                      masteryLevel2Threshold: Number(event.target.value || 10),
                                    }))
                                  }
                                />
                              </label>
                              <label>
                                <span>Level 2 point bonus (%)</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={templateForm.masteryLevel2BonusPercentage ?? 10}
                                  onChange={(event) =>
                                    setTemplateForm((current) => ({
                                      ...current,
                                      masteryLevel2BonusPercentage: Number(event.target.value),
                                    }))
                                  }
                                />
                              </label>
                            </>
                          ) : null}
                        </details>
                      ) : null}
                      <div className="template-editor-actions">
                        <button
                          className="primary-button"
                          type="submit"
                          disabled={
                            busyAction === 'create-template' || !hasFeature('templates_manage')
                          }
                        >
                          {editingTemplateId ? t('templates.save') : t('templates.create')}
                        </button>
                        {editingTemplateId ? (
                          <button
                            className="ghost-button"
                            type="button"
                            disabled={
                              busyAction === `delete-template:${editingTemplateId}` ||
                              !hasFeature('templates_manage')
                            }
                            onClick={() => void handleDeleteTemplate(editingTemplateId)}
                          >
                            {busyAction === `delete-template:${editingTemplateId}`
                              ? t('templates.deleting')
                              : t('common.delete')}
                          </button>
                        ) : null}
                        {editingTemplateId ? (
                          <button
                            className="ghost-button"
                            type="button"
                            onClick={resetTemplateForm}
                          >
                            {t('common.cancel')}
                          </button>
                        ) : (
                          <button
                            className="ghost-button"
                            type="button"
                            onClick={resetTemplateForm}
                          >
                            {t('templates.clear_editor')}
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </article>
              ) : null}

              {/* ── Rewards page ── */}
              {canUseRewards && !isParentOrAdmin ? (
                /* Child view: Rewards Shop */
                <article className="panel page-panel page-rewards">
                  <div className="section-heading">
                    <h2>{t('rewards.shop.title')}</h2>
                    <span className="section-kicker">
                      {payload.currentUser.points} {t('user.points')}
                    </span>
                  </div>
                  <div className="segmented-toggle">
                    <button
                      type="button"
                      className={rewardsTab === 'shop' ? 'active' : ''}
                      onClick={() => setRewardsTab('shop')}
                    >
                      {t('rewards.tab.shop')}
                    </button>
                    <button
                      type="button"
                      className={rewardsTab === 'history' ? 'active' : ''}
                      onClick={() => setRewardsTab('history')}
                    >
                      {t('rewards.tab.history')}
                    </button>
                  </div>
                  {rewardsTab === 'shop' && (
                    <div className="rewards-grid">
                      {enabledRewards.length === 0 ? (
                        <p className="inline-message">{t('rewards.shop.empty')}</p>
                      ) : (
                        enabledRewards.map((reward) => {
                          const isExclusive = reward.workflowType === 'DAILY_EXCLUSIVE';
                          const myRedemptionsForReward = myRedemptions.filter(
                            (r) =>
                              r.reward.id === reward.id &&
                              r.status !== 'REJECTED' &&
                              r.status !== 'CANCELLED',
                          );
                          const lastApproved = myRedemptionsForReward
                            .filter((r) => r.status === 'APPROVED')
                            .sort((a, b) => b.requestedAtUtc.localeCompare(a.requestedAtUtc))[0];
                          const onCooldown =
                            reward.cooldownDays != null && lastApproved
                              ? Date.now() - new Date(lastApproved.requestedAtUtc).getTime() <
                                reward.cooldownDays * 86400_000
                              : false;
                          // For DAILY_EXCLUSIVE, pending doesn't block (user can book multiple dates)
                          const hasPending =
                            !isExclusive &&
                            myRedemptionsForReward.some((r) => r.status === 'PENDING');
                          const reachedLimit =
                            reward.maxRedemptionsPerChild != null &&
                            myRedemptionsForReward.filter((r) => r.status === 'APPROVED').length >=
                              reward.maxRedemptionsPerChild;
                          const myUpcomingClaims = reward.upcomingClaims.filter(
                            (c) => c.userId === payload.currentUser.id,
                          );
                          const othersUpcomingClaims = reward.upcomingClaims.filter(
                            (c) => c.userId !== payload.currentUser.id,
                          );
                          return (
                            <div
                              key={reward.id}
                              className={`reward-card category-${reward.category.toLowerCase()}`}
                            >
                              <span className="reward-category-icon">
                                {categoryEmoji(reward.category)}
                              </span>
                              <h3 className="reward-title">{reward.title}</h3>
                              {reward.description && (
                                <p className="reward-description">{reward.description}</p>
                              )}
                              <div className="reward-footer">
                                <span className="reward-cost-badge">
                                  {reward.pointCost} {t('user.points_short')}
                                </span>
                                <button
                                  type="button"
                                  className="primary-button"
                                  disabled={
                                    payload.currentUser.points < reward.pointCost ||
                                    onCooldown ||
                                    hasPending ||
                                    reachedLimit
                                  }
                                  onClick={() => setRedeemDialogRewardId(reward.id)}
                                >
                                  {hasPending ? t('rewards.pending') : t('rewards.redeem')}
                                </button>
                              </div>
                              {onCooldown && (
                                <span className="reward-cooldown-notice">
                                  {t('rewards.on_cooldown')}
                                </span>
                              )}
                              {reachedLimit && (
                                <span className="reward-cooldown-notice">
                                  {t('rewards.limit_reached')}
                                </span>
                              )}
                              {isExclusive &&
                                (myUpcomingClaims.length > 0 ||
                                  othersUpcomingClaims.length > 0) && (
                                  <div className="reward-upcoming-claims">
                                    {myUpcomingClaims.map((claim) => (
                                      <div
                                        key={claim.redemptionId}
                                        className="reward-booking-chip reward-booking-chip--mine"
                                      >
                                        <span>
                                          {t('rewards.your_booking_for', {
                                            date: formatBookingDate(claim.targetDate),
                                          })}
                                        </span>
                                        <button
                                          type="button"
                                          className="ghost-button ghost-button--small"
                                          onClick={() => {
                                            setRescheduleRedemptionId(claim.redemptionId);
                                            setRescheduleTargetDate(claim.targetDate);
                                          }}
                                        >
                                          {t('rewards.reschedule')}
                                        </button>
                                      </div>
                                    ))}
                                    {othersUpcomingClaims.map((claim) => (
                                      <div key={claim.redemptionId} className="reward-booking-chip">
                                        <span>
                                          {t('rewards.booked_for_date_by', {
                                            date: formatBookingDate(claim.targetDate),
                                            name: claim.displayName,
                                          })}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                  {rewardsTab === 'history' && (
                    <div className="stack-list">
                      {myRedemptions.length === 0 ? (
                        <p className="inline-message">{t('rewards.history.empty')}</p>
                      ) : (
                        myRedemptions
                          .slice()
                          .sort((a, b) => b.requestedAtUtc.localeCompare(a.requestedAtUtc))
                          .map((r) => (
                            <div key={r.id} className="task-row">
                              <span className="redemption-reward-title">
                                {r.reward.title}
                                {r.targetDate && (
                                  <span className="redemption-date-label">
                                    {' · '}
                                    {formatBookingDate(r.targetDate)}
                                  </span>
                                )}
                              </span>
                              <span className={`status-badge status-${r.status.toLowerCase()}`}>
                                {t(`redemption.status.${r.status.toLowerCase()}`)}
                              </span>
                              <span className="redemption-cost">
                                −{r.pointsDeducted} {t('user.points_short')}
                              </span>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                  {/* Redeem confirmation dialog */}
                  {redeemDialogReward &&
                    (() => {
                      const isExclusive = redeemDialogReward.workflowType === 'DAILY_EXCLUSIVE';
                      const conflictingClaim =
                        isExclusive && redeemTargetDate
                          ? redeemDialogReward.upcomingClaims.find(
                              (c) =>
                                c.targetDate === redeemTargetDate &&
                                c.userId !== payload.currentUser.id,
                            )
                          : undefined;
                      return (
                        <dialog className="modal-overlay" open>
                          <div className="modal-card">
                            <h3>{t('rewards.confirm_dialog.title')}</h3>
                            <p>{redeemDialogReward.title}</p>
                            {isExclusive && (
                              <label className="form-field">
                                <span>{t('rewards.confirm_dialog.choose_date')}</span>
                                <input
                                  type="date"
                                  value={redeemTargetDate}
                                  min={todayIso}
                                  max={maxBookingDate}
                                  onChange={(e) => setRedeemTargetDate(e.target.value)}
                                />
                              </label>
                            )}
                            {conflictingClaim && (
                              <p className="inline-message inline-message--warning">
                                {t('rewards.exclusive_date_taken', {
                                  name: conflictingClaim.displayName,
                                })}
                              </p>
                            )}
                            <p>
                              {t('rewards.confirm_dialog.cost')}: {redeemDialogReward.pointCost}{' '}
                              {t('user.points_short')}
                            </p>
                            <p>
                              {t('rewards.confirm_dialog.balance_after')}:{' '}
                              {payload.currentUser.points - redeemDialogReward.pointCost}{' '}
                              {t('user.points_short')}
                            </p>
                            <div className="modal-actions">
                              <button
                                type="button"
                                className="ghost-button"
                                onClick={() => {
                                  setRedeemDialogRewardId(null);
                                  setRedeemTargetDate('');
                                }}
                              >
                                {t('common.cancel')}
                              </button>
                              <button
                                type="button"
                                className="primary-button"
                                disabled={isExclusive && (!redeemTargetDate || !!conflictingClaim)}
                                onClick={() => void handleRedeemReward()}
                              >
                                {t('rewards.confirm_dialog.confirm')}
                              </button>
                            </div>
                          </div>
                        </dialog>
                      );
                    })()}
                  {/* Reschedule booking dialog */}
                  {rescheduleRedemption &&
                    (() => {
                      const rescheduleReward = payload.rewards.find(
                        (r) => r.id === rescheduleRedemption.reward.id,
                      );
                      const rescheduleConflict =
                        rescheduleReward && rescheduleTargetDate
                          ? rescheduleReward.upcomingClaims.find(
                              (c) =>
                                c.targetDate === rescheduleTargetDate &&
                                c.userId !== payload.currentUser.id &&
                                c.redemptionId !== rescheduleRedemptionId,
                            )
                          : undefined;
                      return (
                        <dialog className="modal-overlay" open>
                          <div className="modal-card">
                            <h3>{t('rewards.reschedule_dialog.title')}</h3>
                            <p>{rescheduleRedemption.reward.title}</p>
                            <label className="form-field">
                              <span>{t('rewards.reschedule_dialog.new_date')}</span>
                              <input
                                type="date"
                                value={rescheduleTargetDate}
                                min={todayIso}
                                max={maxBookingDate}
                                onChange={(e) => setRescheduleTargetDate(e.target.value)}
                              />
                            </label>
                            {rescheduleConflict && (
                              <p className="inline-message inline-message--warning">
                                {t('rewards.exclusive_date_taken', {
                                  name: rescheduleConflict.displayName,
                                })}
                              </p>
                            )}
                            <div className="modal-actions">
                              <button
                                type="button"
                                className="ghost-button"
                                onClick={() => {
                                  setRescheduleRedemptionId(null);
                                  setRescheduleTargetDate('');
                                }}
                              >
                                {t('common.cancel')}
                              </button>
                              <button
                                type="button"
                                className="primary-button"
                                disabled={!rescheduleTargetDate || !!rescheduleConflict}
                                onClick={() => void handleRescheduleRedemption()}
                              >
                                {t('rewards.reschedule_dialog.confirm')}
                              </button>
                            </div>
                          </div>
                        </dialog>
                      );
                    })()}
                </article>
              ) : canUseRewards ? (
                /* Parent / Admin view: Rewards */
                <article
                  className={`panel page-panel page-rewards${rewardsManagerTab === 'catalogue' ? ' panel-wide' : ''}`}
                >
                  <div
                    className={
                      rewardsManagerTab === 'catalogue' ? 'template-admin-layout' : 'stack-list'
                    }
                    data-has-selection={selectedReward || isCreatingNewReward ? 'true' : 'false'}
                  >
                    {/* Left: catalogue + approvals */}
                    <div className="stack-list template-browser-panel">
                      <div className="section-heading">
                        <h2>{t('rewards.manager.title')}</h2>
                        {pendingRedemptions.length > 0 && (
                          <span className="section-kicker badge-alert">
                            {pendingRedemptions.length}
                          </span>
                        )}
                      </div>
                      <div className="segmented-toggle">
                        <button
                          type="button"
                          className={rewardsManagerTab === 'my_shop' ? 'active' : ''}
                          onClick={() => setRewardsManagerTab('my_shop')}
                        >
                          {t('rewards.manager.tab.my_shop')}
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            className={rewardsManagerTab === 'catalogue' ? 'active' : ''}
                            onClick={() => setRewardsManagerTab('catalogue')}
                          >
                            {t('rewards.manager.tab.catalogue')}
                          </button>
                        )}
                        <button
                          type="button"
                          className={rewardsManagerTab === 'approvals' ? 'active' : ''}
                          onClick={() => setRewardsManagerTab('approvals')}
                        >
                          {t('rewards.manager.tab.approvals')}
                          {pendingRedemptions.length > 0 && (
                            <span className="inline-badge">{pendingRedemptions.length}</span>
                          )}
                        </button>
                      </div>

                      {rewardsManagerTab === 'catalogue' && (
                        <>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={openNewRewardForm}
                          >
                            + {t('rewards.manager.add_custom')}
                          </button>
                          {rewardsByCategory.categories.map((cat) => {
                            const catRewards = rewardsByCategory.map[cat];
                            if (catRewards.length === 0) return null;
                            return (
                              <div key={cat} className="template-group-block">
                                <div className="section-heading">
                                  <h3>
                                    {categoryEmoji(cat)} {categoryLabel(cat)}
                                  </h3>
                                  <span className="section-kicker">{catRewards.length}</span>
                                </div>
                                <div className="stack-list compact-stack">
                                  {catRewards.map((reward) => (
                                    <button
                                      key={reward.id}
                                      type="button"
                                      className={`template-browser-card template-browser-card-compact ${selectedRewardId === reward.id ? 'active' : ''}`}
                                      onClick={() => selectRewardForEdit(reward)}
                                    >
                                      <div className="template-browser-card-body">
                                        {reward.isOperatorManaged && (
                                          <span
                                            className="lock-icon"
                                            title={t('rewards.operator_managed')}
                                            aria-label={t('rewards.operator_managed')}
                                          >
                                            🔒
                                          </span>
                                        )}
                                        <span className="template-browser-card-title">
                                          {reward.title}
                                        </span>
                                        <span className="section-kicker">
                                          {reward.pointCost} {t('user.points_short')}
                                        </span>
                                        {reward.eligibility != null &&
                                          reward.eligibility !== 'ALL' && (
                                            <span
                                              className={`inline-badge eligibility-badge eligibility-${reward.eligibility.toLowerCase()}`}
                                            >
                                              {reward.eligibility === 'CHILD_ONLY'
                                                ? t('reward.eligibility.child_only')
                                                : t('reward.eligibility.adult_only')}
                                            </span>
                                          )}
                                      </div>
                                      <label
                                        className="toggle-row"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={reward.isEnabled}
                                          onChange={() => void handleToggleReward(reward.id)}
                                        />
                                      </label>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}

                      {rewardsManagerTab === 'approvals' && (
                        <div className="stack-list">
                          {pendingRedemptions.length === 0 ? (
                            <p className="inline-message">{t('rewards.approvals.empty')}</p>
                          ) : (
                            pendingRedemptions.map((r) => (
                              <div key={r.id} className="task-row redemption-row">
                                <div className="redemption-row-info">
                                  <span className="member-name">{r.requestedBy.displayName}</span>
                                  <span className="reward-title">
                                    {r.reward.title}
                                    {r.targetDate && (
                                      <span className="redemption-date-label">
                                        {' · '}
                                        {formatBookingDate(r.targetDate)}
                                      </span>
                                    )}
                                  </span>
                                  <span className="redemption-cost">
                                    −{r.pointsDeducted} {t('user.points_short')}
                                  </span>
                                </div>
                                <div className="redemption-actions">
                                  <button
                                    type="button"
                                    className="primary-button"
                                    onClick={() => void handleApproveRedemption(r.id)}
                                  >
                                    {t('approval.approve')}
                                  </button>
                                  <button
                                    type="button"
                                    className="ghost-button danger-button"
                                    onClick={() => {
                                      setRejectDialogRedemptionId(r.id);
                                      setRejectDialogNote('');
                                    }}
                                  >
                                    {t('approval.reject')}
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {rewardsManagerTab === 'my_shop' && (
                        <div>
                          <p className="section-kicker">
                            {payload.currentUser.points} {t('user.points_short')}
                          </p>
                          {enabledRewards.length === 0 ? (
                            <p className="inline-message">
                              {t('rewards.manager.shop.empty_for_admin')}
                            </p>
                          ) : (
                            <div className="rewards-grid">
                              {enabledRewards.map((reward) => {
                                const isExclusive = reward.workflowType === 'DAILY_EXCLUSIVE';
                                const myUpcomingClaims = reward.upcomingClaims.filter(
                                  (c) => c.userId === payload.currentUser.id,
                                );
                                const othersUpcomingClaims = reward.upcomingClaims.filter(
                                  (c) => c.userId !== payload.currentUser.id,
                                );
                                return (
                                  <div
                                    key={reward.id}
                                    className={`reward-card category-${reward.category.toLowerCase()}`}
                                  >
                                    <span className="reward-category-icon">
                                      {categoryEmoji(reward.category)}
                                    </span>
                                    <h3 className="reward-title">{reward.title}</h3>
                                    {reward.description && (
                                      <p className="reward-description">{reward.description}</p>
                                    )}
                                    <div className="reward-footer">
                                      <span className="reward-cost-badge">
                                        {reward.pointCost} {t('user.points_short')}
                                      </span>
                                      <button
                                        type="button"
                                        className="primary-button"
                                        disabled={payload.currentUser.points < reward.pointCost}
                                        onClick={() => setRedeemDialogRewardId(reward.id)}
                                      >
                                        {t('rewards.redeem')}
                                      </button>
                                    </div>
                                    {isExclusive &&
                                      (myUpcomingClaims.length > 0 ||
                                        othersUpcomingClaims.length > 0) && (
                                        <div className="reward-upcoming-claims">
                                          {myUpcomingClaims.map((claim) => (
                                            <div
                                              key={claim.redemptionId}
                                              className="reward-booking-chip reward-booking-chip--mine"
                                            >
                                              <span>
                                                {t('rewards.your_booking_for', {
                                                  date: formatBookingDate(claim.targetDate),
                                                })}
                                              </span>
                                              <button
                                                type="button"
                                                className="ghost-button ghost-button--small"
                                                onClick={() => {
                                                  setRescheduleRedemptionId(claim.redemptionId);
                                                  setRescheduleTargetDate(claim.targetDate);
                                                }}
                                              >
                                                {t('rewards.reschedule')}
                                              </button>
                                            </div>
                                          ))}
                                          {othersUpcomingClaims.map((claim) => (
                                            <div
                                              key={claim.redemptionId}
                                              className="reward-booking-chip"
                                            >
                                              <span>
                                                {t('rewards.booked_for_date_by', {
                                                  date: formatBookingDate(claim.targetDate),
                                                  name: claim.displayName,
                                                })}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: reward editor */}
                    <div className="template-editor-panel">
                      {showClientMobileShell && (selectedReward || isCreatingNewReward) ? (
                        <button
                          className="mobile-editor-back-button"
                          type="button"
                          onClick={() => {
                            setSelectedRewardId(null);
                            setIsCreatingNewReward(false);
                          }}
                        >
                          ← {t('common.back')}
                        </button>
                      ) : null}
                      {selectedReward || isCreatingNewReward ? (
                        <form
                          className="login-form member-form template-editor-panel"
                          onSubmit={(e) => void handleSaveReward(e)}
                        >
                          {selectedReward?.isOperatorManaged && (
                            <p className="inline-message">{t('rewards.operator_managed_notice')}</p>
                          )}
                          <fieldset disabled={selectedReward?.isOperatorManaged ?? false}>
                            <label>
                              <span>{t('reward.field.title')}</span>
                              <input
                                required
                                value={rewardForm.title}
                                onChange={(e) =>
                                  setRewardForm((c) => ({ ...c, title: e.target.value }))
                                }
                              />
                            </label>
                            <label>
                              <span>{t('reward.field.description')}</span>
                              <textarea
                                value={rewardForm.description}
                                onChange={(e) =>
                                  setRewardForm((c) => ({ ...c, description: e.target.value }))
                                }
                              />
                            </label>
                            <label>
                              <span>{t('reward.field.category')}</span>
                              <select
                                value={rewardForm.category}
                                onChange={(e) =>
                                  setRewardForm((c) => ({
                                    ...c,
                                    category: e.target.value as RewardCategory,
                                  }))
                                }
                              >
                                {(
                                  [
                                    'SCREEN_TIME',
                                    'ALLOWANCE',
                                    'TREAT',
                                    'ACTIVITY',
                                    'PRIVILEGE',
                                    'CUSTOM',
                                  ] as RewardCategory[]
                                ).map((cat) => (
                                  <option key={cat} value={cat}>
                                    {categoryLabel(cat)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              <span>{t('reward.field.eligibility')}</span>
                              <select
                                value={rewardForm.eligibility}
                                onChange={(e) =>
                                  setRewardForm((c) => ({
                                    ...c,
                                    eligibility: e.target.value as RewardEligibility,
                                  }))
                                }
                              >
                                <option value="CHILD_ONLY">
                                  {t('reward.eligibility.child_only')}
                                </option>
                                <option value="ALL">{t('reward.eligibility.all')}</option>
                                <option value="ADULT_ONLY">
                                  {t('reward.eligibility.adult_only')}
                                </option>
                              </select>
                            </label>
                            <label>
                              <span>{t('reward.field.point_cost')}</span>
                              <input
                                type="number"
                                min={1}
                                required
                                value={rewardForm.pointCost}
                                onChange={(e) =>
                                  setRewardForm((c) => ({
                                    ...c,
                                    pointCost: Number(e.target.value || 1),
                                  }))
                                }
                              />
                            </label>
                            <label>
                              <span>{t('reward.field.max_redemptions')}</span>
                              <input
                                type="number"
                                min={1}
                                placeholder={t('reward.unlimited')}
                                value={rewardForm.maxRedemptionsPerChild}
                                onChange={(e) =>
                                  setRewardForm((c) => ({
                                    ...c,
                                    maxRedemptionsPerChild: e.target.value,
                                  }))
                                }
                              />
                            </label>
                            <label>
                              <span>{t('reward.field.cooldown_days')}</span>
                              <input
                                type="number"
                                min={0}
                                placeholder={t('reward.no_cooldown')}
                                value={rewardForm.cooldownDays}
                                onChange={(e) =>
                                  setRewardForm((c) => ({ ...c, cooldownDays: e.target.value }))
                                }
                              />
                            </label>
                            <label>
                              <span>{t('reward.field.workflow_type')}</span>
                              <select
                                value={rewardForm.workflowType}
                                onChange={(e) =>
                                  setRewardForm((c) => ({
                                    ...c,
                                    workflowType: e.target.value as 'STANDARD' | 'DAILY_EXCLUSIVE',
                                  }))
                                }
                              >
                                <option value="STANDARD">
                                  {t('reward.workflow_type.standard')}
                                </option>
                                <option value="DAILY_EXCLUSIVE">
                                  {t('reward.workflow_type.daily_exclusive')}
                                </option>
                              </select>
                            </label>
                          </fieldset>
                          {!(selectedReward?.isOperatorManaged ?? false) && (
                            <div className="template-editor-actions">
                              <button type="submit" className="primary-button">
                                {t('settings.save')}
                              </button>
                              {selectedReward && (
                                <button
                                  type="button"
                                  className="ghost-button danger-button"
                                  onClick={() => void handleDeleteReward()}
                                >
                                  {t('common.delete')}
                                </button>
                              )}
                            </div>
                          )}
                        </form>
                      ) : (
                        <p className="inline-message">{t('rewards.editor.select_or_create')}</p>
                      )}
                    </div>
                  </div>
                </article>
              ) : null}

              {/* Request takeover dialog */}
              {takeoverRequestInstanceId && payload ? (
                <dialog className="modal-overlay" open>
                  <div className="modal-card">
                    <h3>{t('takeover.request_dialog_title')}</h3>
                    <p>{t('takeover.request_dialog_body')}</p>
                    <label className="form-field">
                      <span>{t('takeover.request_select_member')}</span>
                      <select
                        value={takeoverRequestMemberId}
                        onChange={(e) => setTakeoverRequestMemberId(e.target.value)}
                      >
                        <option value="">—</option>
                        {payload.household.members
                          .filter((m) => m.id !== payload.currentUser.id)
                          .map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.displayName}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="form-field">
                      <span>{t('takeover.request_note_label')}</span>
                      <textarea
                        value={takeoverRequestNote}
                        maxLength={240}
                        placeholder={t('takeover.request_note_placeholder')}
                        onChange={(e) => setTakeoverRequestNote(e.target.value)}
                      />
                    </label>
                    <div className="modal-actions">
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => setTakeoverRequestInstanceId(null)}
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        disabled={
                          !takeoverRequestMemberId ||
                          busyAction === `takeover-request:${takeoverRequestInstanceId}`
                        }
                        onClick={() => void handleRequestTakeover()}
                      >
                        {busyAction === `takeover-request:${takeoverRequestInstanceId}`
                          ? t('takeover.request_sending')
                          : t('takeover.request_send')}
                      </button>
                    </div>
                  </div>
                </dialog>
              ) : null}

              {/* Reject redemption dialog */}
              {rejectDialogRedemptionId && (
                <dialog className="modal-overlay" open>
                  <div className="modal-card">
                    <h3>{t('rewards.reject_dialog.title')}</h3>
                    <label>
                      <span>{t('rewards.reject_dialog.note')}</span>
                      <textarea
                        value={rejectDialogNote}
                        onChange={(e) => setRejectDialogNote(e.target.value)}
                      />
                    </label>
                    <div className="modal-actions">
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => setRejectDialogRedemptionId(null)}
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        className="primary-button danger-button"
                        onClick={() => void handleRejectRedemption()}
                      >
                        {t('approval.reject')}
                      </button>
                    </div>
                  </div>
                </dialog>
              )}

              <article className="panel page-panel page-settings">
                <div className="section-heading">
                  <h2>{t('panel.assignment_logic')}</h2>
                  <span className="section-kicker">{t('panel.strategy_live')}</span>
                </div>
                <ul className="simple-list">
                  <li>{t('assignment.round_robin')}</li>
                  <li>{t('assignment.least_completed_recently')}</li>
                  <li>{t('assignment.highest_streak')}</li>
                  <li>{t('templates.follow_up_assignment_sticky')}</li>
                </ul>
              </article>

              {showClientMobileShell ? (
                <article className="panel page-panel page-settings">
                  <div className="section-heading">
                    <h2>{t('onboarding.workspace_client_mobile')}</h2>
                  </div>
                  <button className="primary-button" type="button" onClick={handleOpenOnboarding}>
                    {t('onboarding.open_tour')}
                  </button>
                </article>
              ) : null}
            </section>
          </div>
        </div>
      )}
      {showClientMobileShell && payload?.currentUser.role !== 'child' && mobileDueEditorInstance ? (
        <div className="mobile-composer-backdrop" role="presentation">
          <div
            className="mobile-composer-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-due-editor-title"
          >
            <article className="panel mobile-composer-panel">
              <div className="section-heading mobile-composer-heading">
                <div>
                  <h2 id="mobile-due-editor-title">{t('instances.due_at')}</h2>
                  <p className="schedule-panel-subtitle">
                    {mobileDueEditorInstance.typeTitle || mobileDueEditorInstance.title}
                  </p>
                </div>
              </div>
              <form
                className="login-form member-form schedule-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSaveMobileDueEditor();
                }}
              >
                <label>
                  <span>{t('instances.title_override')}</span>
                  <input
                    type="text"
                    value={mobileDueEditorTitle}
                    onChange={(event) => setMobileDueEditorTitle(event.target.value)}
                  />
                </label>
                <label>
                  <span>Icon</span>
                  <select
                    value={mobileDueEditorIconId}
                    onChange={(event) =>
                      setMobileDueEditorIconId((event.target.value as ChoreIconId) || '')
                    }
                  >
                    <option value="">Auto</option>
                    {choreIconPresets.map((iconPreset) => (
                      <option key={iconPreset.id} value={iconPreset.id}>
                        {iconPreset.label}
                      </option>
                    ))}
                  </select>
                </label>
                {mobileDueEditorTemplateVariants.length > 0 ? (
                  <label>
                    <span>{t('instances.subtype')}</span>
                    <select
                      value={mobileDueEditorVariantId}
                      onChange={(event) => setMobileDueEditorVariantId(event.target.value)}
                    >
                      <option value="">{t('instances.select_subtype')}</option>
                      {mobileDueEditorTemplateVariants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label>
                  <span>{t('instances.due_at')}</span>
                  <input
                    type="datetime-local"
                    value={mobileDueEditorValue}
                    onChange={(event) => setMobileDueEditorValue(event.target.value)}
                    required
                  />
                </label>
                <div className="button-row schedule-form-actions">
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={busyAction === `update-due:${mobileDueEditorInstance.id}`}
                  >
                    {t('instances.save')}
                  </button>
                  <button className="ghost-button" type="button" onClick={closeMobileDueEditor}>
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            </article>
          </div>
        </div>
      ) : null}
      {showClientMobileShell && payload?.currentUser.role !== 'child' && isClientComposerOpen ? (
        <div className="mobile-composer-backdrop" role="presentation">
          <div
            className="mobile-composer-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-chore-composer-title"
          >
            {renderScheduleChorePanel('page-chores', { mobileSheet: true })}
          </div>
        </div>
      ) : null}
      {showNewClientMobileShell && mobileChoreDialogInstance ? (
        <div
          className="mobile-composer-backdrop mobile-chore-actions-backdrop"
          role="presentation"
          onClick={() => setMobileChoreDialogInstanceId(null)}
        >
          <div
            className="mobile-composer-sheet mobile-chore-actions-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-chore-actions-title"
            onClick={(event) => event.stopPropagation()}
          >
            <article className="panel mobile-composer-panel mobile-chore-actions-panel">
              <div className="section-heading mobile-composer-heading">
                <div>
                  <h2 id="mobile-chore-actions-title">Chore actions</h2>
                </div>
              </div>
              {mobileChoreDialogIsMine
                ? renderMyChoreCard(mobileChoreDialogInstance, { forceLegacy: true })
                : renderHouseholdChoreCard(mobileChoreDialogInstance, { forceLegacy: true })}
            </article>
          </div>
        </div>
      ) : null}
      {showClientMobileShell &&
      payload?.currentUser.role !== 'child' &&
      hasFeature('quick_log') &&
      isQuickLogComposerOpen ? (
        <div className="mobile-composer-backdrop" role="presentation">
          <div
            className="mobile-composer-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-quick-log-title"
          >
            <article className="panel mobile-composer-panel">
              <div className="section-heading mobile-composer-heading mobile-quick-log-heading">
                <div>
                  <h2 id="mobile-quick-log-title">Quick log</h2>
                  <p className="schedule-panel-subtitle">
                    Log a completed chore quickly, even if it was not planned.
                  </p>
                </div>
              </div>
              <form
                className="login-form member-form schedule-form mobile-quick-log-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSubmitQuickLog();
                }}
              >
                <label>
                  <span>What did you complete?</span>
                  <div className="mobile-quick-log-input-wrap">
                    <input
                      type="text"
                      value={quickLogQuery}
                      onChange={(event) => {
                        setQuickLogQuery(event.target.value);
                        setQuickLogSelectedInstanceId(null);
                        setQuickLogSelectedTemplateId(null);
                      }}
                      placeholder="Take out recycling"
                    />
                    {quickLogQuery ? (
                      <button
                        className="ghost-button mobile-quick-log-clear"
                        type="button"
                        onClick={() => {
                          setQuickLogQuery('');
                          setQuickLogSelectedInstanceId(null);
                          setQuickLogSelectedTemplateId(null);
                        }}
                        aria-label="Clear"
                      >
                        x
                      </button>
                    ) : null}
                  </div>
                </label>
                <div className="mobile-quick-log-icon-picker" role="group" aria-label="Chore icon">
                  <button
                    key="__none__"
                    className={`ghost-button mobile-quick-log-icon-chip ${quickLogIcon === null ? 'active' : ''}`}
                    type="button"
                    onClick={() => setQuickLogIcon(null)}
                  >
                    —
                  </button>
                  {choreIconPresets.map((preset) => (
                    <button
                      key={preset.id}
                      className={`ghost-button mobile-quick-log-icon-chip ${quickLogIcon === preset.id ? 'active' : ''}`}
                      type="button"
                      onClick={() => setQuickLogIcon(preset.id)}
                    >
                      <img src={preset.assetPath} alt={preset.label} />
                    </button>
                  ))}
                </div>
                {quickLogMatches.length > 0 ? (
                  <div className="stack-list mobile-quick-log-suggestions">
                    {quickLogMatches.map((match) => {
                      const active =
                        (match.kind === 'instance' && quickLogSelectedInstanceId === match.id) ||
                        (match.kind === 'template' && quickLogSelectedTemplateId === match.id);
                      return (
                        <button
                          key={`${match.kind}:${match.id}`}
                          className={`ghost-button mobile-quick-log-suggestion ${active ? 'active' : ''}`}
                          type="button"
                          onClick={() => {
                            setQuickLogQuery(match.label);
                            setQuickLogSelectedInstanceId(
                              match.kind === 'instance' ? match.id : null,
                            );
                            setQuickLogSelectedTemplateId(
                              match.kind === 'template' ? match.id : null,
                            );
                            setQuickLogIcon(resolveChoreIconIdFromText(match.label, match.detail));
                            if (match.kind === 'instance') {
                              setQuickLogCreateTemplateFromEntry(false);
                            }
                          }}
                        >
                          <span>{match.label}</span>
                          <span className="inline-message">
                            {match.kind === 'instance' ? 'Open chore' : 'Template'} | {match.detail}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {!quickLogSelectedInstanceId && !quickLogSelectedTemplateId ? (
                  <label className="toggle-row">
                    <span>Create template from this quick log</span>
                    <input
                      type="checkbox"
                      checked={quickLogCreateTemplateFromEntry}
                      onChange={(event) => setQuickLogCreateTemplateFromEntry(event.target.checked)}
                    />
                  </label>
                ) : null}
                <label>
                  <span>Optional note</span>
                  <textarea
                    rows={2}
                    placeholder="Add a note (optional)"
                    value={quickLogNote}
                    onChange={(event) => setQuickLogNote(event.target.value)}
                  />
                </label>
                <label className="toggle-row">
                  <span>Override points for this entry</span>
                  <input
                    type="checkbox"
                    checked={quickLogUsePointsOverride}
                    onChange={(event) => setQuickLogUsePointsOverride(event.target.checked)}
                  />
                </label>
                {quickLogUsePointsOverride ? (
                  <label>
                    <span>
                      Points override (default{' '}
                      {payload?.household.settings.quickLogPointsDefault ?? 0})
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={quickLogPointsOverride}
                      onChange={(event) => setQuickLogPointsOverride(event.target.value)}
                    />
                  </label>
                ) : (
                  <p className="inline-message mobile-quick-log-helper">
                    Household default points:{' '}
                    {payload?.household.settings.quickLogPointsDefault ?? 0}
                  </p>
                )}
                <div className="button-row schedule-form-actions">
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={busyAction === 'quick-log'}
                  >
                    {busyAction === 'quick-log' ? 'Saving...' : 'Log now'}
                  </button>
                  <button className="ghost-button" type="button" onClick={closeQuickLog}>
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            </article>
          </div>
        </div>
      ) : null}
      {showNewClientMobileShell && payload && isMobileProfileOpen ? (
        <div className="mobile-composer-backdrop" role="presentation">
          <div
            className="mobile-composer-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-profile-title"
          >
            <article className="panel mobile-composer-panel mobile-profile-panel">
              <div className="section-heading mobile-composer-heading mobile-profile-heading">
                <div>
                  <h2 id="mobile-profile-title">Profile</h2>
                </div>
              </div>
              <div className="mobile-profile-avatar-preview" aria-hidden="true">
                {mobileProfileAvatar ? (
                  <img src={mobileProfileAvatar} alt="" />
                ) : (
                  <span>{initialsFromDisplayName(payload.currentUser.displayName)}</span>
                )}
              </div>
              <div className="mobile-profile-grid">
                <div className="mobile-profile-row">
                  <span>Name</span>
                  <strong>{payload.currentUser.displayName}</strong>
                </div>
                <div className="mobile-profile-row">
                  <span>Role</span>
                  <strong>{t(`role.${payload.currentUser.role}`)}</strong>
                </div>
                <div className="mobile-profile-row">
                  <span>Points</span>
                  <strong>{formatNumber(payload.currentUser.points)}</strong>
                </div>
                <div className="mobile-profile-row">
                  <span>Streak</span>
                  <strong>{formatNumber(payload.currentUser.currentStreak)}</strong>
                </div>
                {payload.currentUser.email ? (
                  <div className="mobile-profile-row">
                    <span>Email</span>
                    <strong>{payload.currentUser.email}</strong>
                  </div>
                ) : null}
              </div>
              {payload.household.settings.enableAchievements && payload.achievements.length > 0 ? (
                <div className="mobile-profile-achievements">
                  <h3 className="mobile-profile-achievements-heading">
                    {t('achievements.panel_title')}
                  </h3>
                  <ul className="achievement-list">
                    {payload.achievements.map((a) => (
                      <li
                        key={a.key}
                        className={`achievement-row ${a.earnedAt ? 'achievement-row--earned' : 'achievement-row--locked'}`}
                      >
                        <div className="achievement-row-info">
                          <span className="achievement-name">{a.name}</span>
                          {a.earnedAt ? (
                            <span className="achievement-earned-badge">
                              {t('achievements.earned')}
                            </span>
                          ) : (
                            <span className="achievement-progress-text">
                              {a.progress}/{a.goal}
                            </span>
                          )}
                        </div>
                        <progress
                          className="achievement-progress-bar"
                          value={a.progress}
                          max={a.goal}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {hasFeature('mastery') && payload.masteryStats.length > 0 ? (
                <div className="mobile-profile-mastery">
                  <h3 className="mobile-profile-achievements-heading">My Mastery</h3>
                  <ul className="achievement-list">
                    {payload.masteryStats.map((s) => {
                      const maxProgress =
                        s.masteryLevel >= 2 ? s.masteryLevel2Threshold : s.masteryLevel1Threshold;
                      const progressValue = Math.min(s.completionCount, maxProgress);
                      const badge = s.masteryLevel >= 2 ? '🏆' : s.masteryLevel === 1 ? '⭐' : null;
                      return (
                        <li key={s.templateId} className="achievement-row achievement-row--mastery">
                          <div className="achievement-row-info">
                            <span className="achievement-name">
                              {badge ? <span className="mastery-badge">{badge}</span> : null}
                              {s.templateTitle}
                            </span>
                            <span className="achievement-progress-text">
                              {s.completionCount}/{maxProgress}
                            </span>
                          </div>
                          <progress
                            className="achievement-progress-bar"
                            value={progressValue}
                            max={maxProgress}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
              <div className="mobile-profile-avatar-controls">
                <p>Choose avatar</p>
                <div
                  className="mobile-profile-avatar-preset-row"
                  role="list"
                  aria-label="Avatar presets"
                >
                  {mobileAvatarPresetAssets.map((avatarAssetPath) => (
                    <button
                      key={avatarAssetPath}
                      className={`mobile-profile-avatar-preset ${
                        mobileProfileAvatar === avatarAssetPath ? 'active' : ''
                      }`}
                      type="button"
                      onClick={() => handleSelectMobileAvatar(avatarAssetPath)}
                      aria-label="Select profile mascot"
                      role="listitem"
                    >
                      <img src={avatarAssetPath} alt="" aria-hidden="true" />
                    </button>
                  ))}
                </div>
                <input
                  ref={mobileAvatarUploadInputRef}
                  className="mobile-profile-avatar-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={handleMobileAvatarUpload}
                />
                <button
                  className="secondary-button mobile-profile-avatar-upload-button"
                  type="button"
                  onClick={() => mobileAvatarUploadInputRef.current?.click()}
                >
                  Upload image
                </button>
              </div>
              <div className="button-row schedule-form-actions mobile-profile-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => setIsMobileProfileOpen(false)}
                >
                  Save
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => setIsMobileProfileOpen(false)}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </article>
          </div>
        </div>
      ) : null}
      {showNewClientMobileShell &&
      activePage === 'chores' &&
      payload?.currentUser.role !== 'child' ? (
        <button
          className="mobile-fab-add"
          type="button"
          aria-label="Add chore"
          onClick={handleOpenClientComposer}
        >
          +
        </button>
      ) : null}
      {showClientMobileShell ? (
        <nav className="mobile-bottom-nav" aria-label={t('nav.workspace')} ref={mobileBottomNavRef}>
          <div
            className="mobile-bottom-nav-track"
            style={
              {
                '--mobile-nav-columns': mobileBottomNavPages.length,
              } as CSSProperties
            }
          >
            {mobileBottomNavPages.map((page) => {
              const isMoreTab = page.key === 'more';
              const isActive = isMoreTab
                ? isMobileMoreSheetOpen || activePage === 'settings' || activePage === 'templates'
                : page.key === activePage;
              return (
                <button
                  key={page.key}
                  className={`mobile-bottom-nav-button ${isActive ? 'active' : ''}`}
                  type="button"
                  onClick={
                    isMoreTab
                      ? () => setIsMobileMoreSheetOpen(true)
                      : () => openWorkspacePage(page.key as WorkspacePage)
                  }
                  aria-label={page.label}
                  title={page.label}
                >
                  {mobileNavIconByPage[page.key] ? (
                    <img
                      className="mobile-bottom-nav-icon"
                      src={mobileNavIconByPage[page.key]}
                      alt=""
                      aria-hidden="true"
                    />
                  ) : null}
                  <span className="mobile-bottom-nav-label">{page.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      ) : null}
      {showClientMobileShell && isMobileMoreSheetOpen ? (
        <div
          className="mobile-more-sheet-backdrop"
          onClick={() => setIsMobileMoreSheetOpen(false)}
          role="presentation"
        >
          <div className="mobile-more-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-more-sheet-handle" />
            <nav className="mobile-more-sheet-nav">
              <button
                className="mobile-more-nav-item"
                type="button"
                onClick={() => {
                  setIsMobileMoreSheetOpen(false);
                  openWorkspacePage('settings');
                }}
              >
                <img
                  className="mobile-more-nav-icon"
                  src="/mobile-icons/settings.png"
                  alt=""
                  aria-hidden="true"
                />
                {t('mobile.more.settings')}
              </button>
              {showTemplateManager ? (
                <button
                  className="mobile-more-nav-item"
                  type="button"
                  onClick={() => {
                    setIsMobileMoreSheetOpen(false);
                    openWorkspacePage('templates');
                  }}
                >
                  <img
                    className="mobile-more-nav-icon"
                    src="/mobile-icons/more.png"
                    alt=""
                    aria-hidden="true"
                  />
                  {t('mobile.more.templates')}
                </button>
              ) : null}
              {isParentOrAdmin ? (
                <button
                  className="mobile-more-nav-item"
                  type="button"
                  onClick={() => {
                    setIsMobileMoreSheetOpen(false);
                    openWorkspacePage('rewards');
                  }}
                >
                  <img
                    className="mobile-more-nav-icon"
                    src="/mobile-icons/rewards.png"
                    alt=""
                    aria-hidden="true"
                  />
                  {t('mobile.more.rewards_manager')}
                </button>
              ) : null}
            </nav>
          </div>
        </div>
      ) : null}
      <footer className="app-release-footer">
        <div className="app-release-footer-inner">
          <span className="app-release-chip">
            <span>
              {t('release.web_build').replace(
                '{release}',
                formatReleaseLabel(currentWebReleaseInfo),
              )}
            </span>
            {formatReleaseDetails(currentWebReleaseInfo) ? (
              <span className="app-release-detail">
                {formatReleaseDetails(currentWebReleaseInfo)}
              </span>
            ) : null}
          </span>
          {serverReleaseInfo ? (
            <span className="app-release-chip">
              <span>
                {t('release.server_build').replace(
                  '{release}',
                  formatReleaseLabel(serverReleaseInfo),
                )}
              </span>
              {formatReleaseDetails(serverReleaseInfo) ? (
                <span className="app-release-detail">
                  {formatReleaseDetails(serverReleaseInfo)}
                </span>
              ) : null}
            </span>
          ) : null}
          {showAvailableUpdateNotice && availableUpdate ? (
            <div className="app-release-update-chip" role="status" aria-live="polite">
              <span className="app-release-chip app-release-chip-highlight">
                {t('release.update_available_chip').replace(
                  '{release}',
                  formatReleaseLabel(availableUpdate),
                )}
              </span>
              <button
                className="app-release-dismiss"
                type="button"
                onClick={() => window.location.reload()}
              >
                {t('release.reload_to_update')}
              </button>
              <button
                className="app-release-dismiss"
                type="button"
                onClick={handleDismissAvailableUpdate}
              >
                {t('release.dismiss_update')}
              </button>
            </div>
          ) : null}
        </div>
      </footer>
    </main>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

function getHistoricChoreDate(instance: ChoreInstance) {
  return instance.state === 'cancelled'
    ? (instance.cancelledAt ??
        instance.completedAt ??
        instance.reviewedAt ??
        instance.submittedAt ??
        instance.dueAt)
    : (instance.completedAt ?? instance.reviewedAt ?? instance.submittedAt ?? instance.dueAt);
}

function resolveClientMobileChoreSection(
  instance: ChoreInstance,
  currentUserId?: string | null,
): ClientMobileChoreSection {
  if (instance.assigneeId && instance.assigneeId === currentUserId) {
    return 'mine';
  }

  if (!instance.assigneeId) {
    return 'unassigned';
  }

  return 'others';
}

function getClientMobileChoreSectionRank(section: ClientMobileChoreSection) {
  switch (section) {
    case 'mine':
      return 0;
    case 'unassigned':
      return 1;
    case 'others':
      return 2;
  }
}

function parseChoreInstantForSort(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function compareClientMobileChoreOrder(
  left: ChoreInstance,
  right: ChoreInstance,
  currentUserId?: string | null,
) {
  const sectionDifference =
    getClientMobileChoreSectionRank(resolveClientMobileChoreSection(left, currentUserId)) -
    getClientMobileChoreSectionRank(resolveClientMobileChoreSection(right, currentUserId));

  if (sectionDifference !== 0) {
    return sectionDifference;
  }

  const dueDifference =
    parseChoreInstantForSort(left.dueAt) - parseChoreInstantForSort(right.dueAt);
  if (dueDifference !== 0) {
    return dueDifference;
  }

  return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' });
}

function resolveClientMobileDueBucket(
  instance: ChoreInstance,
  _language: AppLanguage,
): ClientMobileDueBucket {
  const dueAt = new Date(instance.dueAt);
  if (Number.isNaN(dueAt.getTime())) {
    return 'today';
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDate = new Date(dueAt.getFullYear(), dueAt.getMonth(), dueAt.getDate());

  if (dueDate.getTime() <= todayStart.getTime()) {
    return 'today';
  }

  const sevenDaysOut = new Date(todayStart);
  sevenDaysOut.setDate(todayStart.getDate() + 7);

  return dueDate.getTime() <= sevenDaysOut.getTime() ? 'this_week' : 'later';
}

function getHistoricChoreDateLabelKey(instance: ChoreInstance) {
  return instance.state === 'cancelled' ? 'task.cancelled' : 'task.completed';
}

function getExportRelevantDate(instance: ChoreInstance) {
  return historicChoreStates.includes(instance.state)
    ? getHistoricChoreDate(instance)
    : instance.dueAt;
}

function escapeCsvValue(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function scrollToSection(targetRef: RefObject<HTMLElement | null>) {
  targetRef.current?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

function readErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof TaskBanditApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}
