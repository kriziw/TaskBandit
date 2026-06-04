# Deliver baseline accessibility improvements across core app flows

## Repository context observed

- Backend API: NestJS modules under `apps/server/src/modules`; chores route through `ChoresController`/`ChoresService`, while most persistence, assignment, recurrence, and mapping logic is in `HouseholdRepository`.
- Database: Prisma schema and migrations under `apps/server/prisma`; relevant models include `User`, `HouseholdSettings`, `ChoreTemplate`, `ChoreInstance`, checklist/completion tables, takeover requests, rewards/redemptions, notifications, audit logs, and points ledger entries.
- Web app: React/Vite/Zustand under `apps/web/src`, with shared API calls in `api/taskbanditApi.ts`, models in `types/taskbandit.ts`, and major workspace UI in `App.tsx`.
- Android app: Kotlin/Compose under `apps/android/app/src/main/java/com/taskbandit/app`, with dashboard, chores, rewards, settings, templates, onboarding, mobile API/models/parsers, push, widgets, and current auth/onboarding deep-link handling.
- Notifications: server notification models/workers already cover assignments, reminders, approvals, takeovers, rewards, push, and email delivery.
- Localization/content: starter/operator templates and app language resources currently cover English, German, and Hungarian.
- GitHub issue creation: `gh` was not available in this environment, so this draft is stored as markdown under `docs/roadmap/issues/` for later GitHub issue creation.

## Suggested milestone

Milestone 2: Child Experience and Inclusivity

## Suggested labels

accessibility, ux, web, android, settings

## Dependencies

- N/A

## Product background

TaskBandit has child and parent workflows that rely on colors, icons, animations, forms, and mobile interactions. The next accessibility package should start with an audit and then address high-impact issues in core flows.

## User story

As a child, parent, or admin using assistive technology or adjusted display preferences, I can understand statuses and complete core tasks without relying on color, tiny targets, or unlabeled icons.

## Functional requirements

- Audit onboarding, chore list/detail/completion, approval, reward redemption, leaderboard, calendar/schedule views, and settings.
- Important actions and statuses must not rely on color alone.
- Icon-only actions must have accessible names or visible labels where needed.
- Interactive elements should meet appropriate touch target sizes.
- Reduced motion, high contrast, larger text, and icon label settings should be supported where implemented.
- Screen reader support should be reviewed for core flows.

## UX / UI requirements

- Use text/status badges in addition to color for chore/reward/approval states and errors.
- Ensure larger text does not break main layouts.
- Reduced motion should simplify celebrations/animations without removing feedback.
- High contrast should improve readability while preserving brand enough for usability.
- Friendly child-facing copy should remain clear with screen readers.

## Backend requirements

- Document audit findings before broad changes.
- Add any missing display/status fields only if clients cannot derive accessible text from current API payloads.
- Avoid changing business logic while improving semantics and presentation.

## Data model considerations

- User-level accessibility preferences may require a preferences table; household-wide preferences can extend `HouseholdSettings`; local-only preferences may be acceptable for purely presentational options.
- Do not store sensitive accessibility data unnecessarily.

## API considerations

- Settings APIs may need to persist accessibility preferences.
- Core payloads should contain enough status data for non-color labels.

## Mobile / native app considerations

- Add Compose semantics/content descriptions and TalkBack-friendly traversal.
- Respect Android platform font scale and reduced-motion signals where available.
- Update web ARIA labels, semantic elements, and keyboard/focus behavior.

## Permissions / security considerations

- Accessible labels must not reveal admin-only or hidden data.
- Preference changes should be limited to users/roles allowed by the chosen scope.

## Edge cases

- Long localized labels in English/German/Hungarian.
- Small screens and large font scale.
- Dynamic toasts/notifications and modal dialogs.
- Disabled/loading/error states.
- High contrast combined with brand colors.

## Acceptance criteria

- Accessibility audit findings are documented and prioritized.
- Critical child-facing and parent-facing flows have accessible labels and semantic roles.
- Reduced motion and high contrast settings work in scoped flows.
- Statuses are not communicated by color alone.
- Main screens remain usable with larger text.

## Suggested follow-up sub-issues, if this needs to be split later

- Accessibility audit.
- Component/status label improvements.
- Accessibility preference settings.
- Touch target and screen reader pass for core flows.
