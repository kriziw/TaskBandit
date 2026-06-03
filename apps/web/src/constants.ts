/**
 * Centralised domain option lists.
 *
 * All hardcoded value arrays that appear in multiple UI locations live here.
 * Screens derive their display labels by mapping over these arrays with the
 * i18n `t()` hook — keeping the label keys co-located with the values.
 *
 * When a new option is added to any of these enums, update the list here and
 * the server enum only — no other files need touching for the option to appear.
 */

import type {
  AssignmentStrategy,
  ChoreAssignmentReason,
  Difficulty,
  RecurrenceType,
  TemplateTranslationLocale,
} from './types/taskbandit';

export const ASSIGNMENT_STRATEGIES: readonly AssignmentStrategy[] = [
  'round_robin',
  'least_completed_recently',
  'highest_streak',
  'fixed_assignee',
];

export const ASSIGNMENT_REASONS: readonly ChoreAssignmentReason[] = [
  'round_robin',
  'least_completed_recently',
  'highest_streak',
  'fixed_assignee',
  'manual',
  'claimed',
  'sticky_follow_up',
  'rebalanced',
];

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

export const RECURRENCE_TYPES: readonly RecurrenceType[] = [
  'none',
  'daily',
  'weekly',
  'every_x_days',
  'custom_weekly',
];

export const TEMPLATE_LOCALES: readonly TemplateTranslationLocale[] = ['en', 'de', 'hu'];

export const WEEKDAY_ORDER = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;
