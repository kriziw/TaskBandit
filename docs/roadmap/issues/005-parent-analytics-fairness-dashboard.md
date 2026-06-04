# Add parent analytics and fairness dashboard

## Repository context observed

- Backend API: NestJS modules under `apps/server/src/modules`; chores route through `ChoresController`/`ChoresService`, while most persistence, assignment, recurrence, and mapping logic is in `HouseholdRepository`.
- Database: Prisma schema and migrations under `apps/server/prisma`; relevant models include `User`, `HouseholdSettings`, `ChoreTemplate`, `ChoreInstance`, checklist/completion tables, takeover requests, rewards/redemptions, notifications, audit logs, and points ledger entries.
- Web app: React/Vite/Zustand under `apps/web/src`, with shared API calls in `api/taskbanditApi.ts`, models in `types/taskbandit.ts`, and major workspace UI in `App.tsx`.
- Android app: Kotlin/Compose under `apps/android/app/src/main/java/com/taskbandit/app`, with dashboard, chores, rewards, settings, templates, onboarding, mobile API/models/parsers, push, widgets, and current auth/onboarding deep-link handling.
- Notifications: server notification models/workers already cover assignments, reminders, approvals, takeovers, rewards, push, and email delivery.
- Localization/content: starter/operator templates and app language resources currently cover English, German, and Hungarian.
- GitHub issue creation: `gh` was not available in this environment, so this draft is stored as markdown under `docs/roadmap/issues/` for later GitHub issue creation.

## Suggested milestone

Milestone 4: Parent Intelligence

## Suggested labels

feature, analytics, backend, web, android, privacy

## Dependencies

- N/A

## Product background

Parents need visibility into workload, completion patterns, fairness, and reward economy. Current data sources include chore instance states/timestamps, points ledger entries, reward redemptions, takeover requests, notifications, audit logs, mastery, and leaderboard fields, but metric reliability should be confirmed before implementation.

## User story

As a parent/admin, I can view neutral household analytics that help me understand chore completion, workload distribution, overdue trends, approvals, takeovers, and reward economy without shaming children.

## Functional requirements

- Parent/admin can view household analytics for selected time ranges.
- Dashboard works with sparse or no data.
- Metrics are calculated only from the current household/tenant.
- Children do not see sensitive parent analytics unless explicitly allowed later.
- Use neutral language and avoid shame-oriented ranking.
- If difficulty/base points are the best available effort proxy, document that limitation for fairness calculations.

## UX / UI requirements

- Show simple cards/trends before complex charts.
- Include empty states and plain-language explanations.
- Fairness/effort split should show methodology and avoid labels like lazy or overloaded child.
- Time range controls should be clear and respect household timezone.

## Backend requirements

- Start with discovery of available event/history data and metric gaps.
- Implement household-scoped aggregation service/API for completed, missed/overdue, approvals pending, rejection ratio, takeover frequency, assignment load, points earned/redeemed, reward redemptions, and fairness/effort split where data supports it.
- Add tests for aggregation math, empty data, deleted users, and timezone boundaries.
- Add performance indexes only where discovery shows need.

## Data model considerations

- Current tables may be sufficient for MVP; add an analytics event table only if discovery proves it is needed.
- Fairness can initially use base points/difficulty as effort proxy; estimated minutes/effort weighting can be a later enhancement.
- Preserve historical display for removed users where needed without restoring access.

## API considerations

- Suggested endpoint: `GET /api/dashboard/analytics?from=...&to=...` or a new `GET /api/analytics/household`.
- Return raw values, per-member breakdowns, and formula metadata for fairness.
- Document timezone/date-range behavior.

## Mobile / native app considerations

- Build responsive web dashboard and Android parent screen if native analytics is in scope.
- Handle loading, errors, and sparse data in existing stores/viewmodels.
- Do not expose analytics navigation to child accounts.

## Permissions / security considerations

- Restrict analytics to admin/parent by default.
- Never aggregate across household or tenant boundaries.
- Be careful that reward economy and rejection metrics do not expose sensitive notes beyond authorized roles.

## Edge cases

- No history yet.
- Deleted users with historical chores.
- One-child or solo household.
- Daylight saving and household timezone boundaries.
- Refunded or rescheduled reward redemptions.
- Chores completed externally or by co-completers.

## Acceptance criteria

- Parent/admin can see a basic analytics dashboard.
- Metrics are current-household scoped and tested.
- Empty/sparse states are graceful.
- Fairness calculation is documented and exposed in UI/API.
- Reward economy metrics do not break existing reward flows.

## Suggested follow-up sub-issues, if this needs to be split later

- Analytics data discovery.
- Aggregation API.
- Fairness score/effort split.
- Parent dashboard UI.
- Reward economy analytics.
