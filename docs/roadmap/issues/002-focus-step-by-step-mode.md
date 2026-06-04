# Add Focus Mode with optional chore substeps and simplified child flow

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

feature, focus-mode, ux, backend, web, android, accessibility

## Dependencies

- N/A

## Product background

The product already has child chore completion, checklist/proof requirements, approval, rewards, points, takeover requests, and leaderboard flows. Focus Mode should simplify the child experience without rebranding it as ADHD-specific and without creating parallel approval or reward logic.

## User story

As a child, I can work through one chore at a time with simple steps and a clear primary action; as a parent/admin, I can define steps and enable the simplified mode where it helps.

## Functional requirements

- Parent/admin can define optional ordered substeps for chores/templates, reusing existing checklist models where sufficient.
- Child can see one chore at a time in a low-distraction Focus Mode.
- Child can mark substeps complete and then submit the chore through the existing approval workflow.
- Existing proof upload, approval, points, rewards, mastery, and takeover behavior remains unchanged unless explicitly changed in this issue.
- Focus Mode can be enabled/disabled per the best fit with current settings architecture.

## UX / UI requirements

- Use neutral names such as Focus Mode, Simple Mode, Step-by-step Mode, or Routine Mode; do not call it ADHD mode in child UI.
- Large primary action button, clear chore title/icon, progress indicator, friendly non-punitive copy, and minimal secondary navigation.
- Avoid catalogue, leaderboard, and reward distractions while actively completing a focused chore.
- Include 'ask for help' or 'request more time' only if it can reuse existing request/notification/comment patterns.
- Support small mobile screens.

## Backend requirements

- First inventory current child-facing web and Android screens before coding UI changes.
- Evaluate whether `ChoreTemplateChecklistItem` and `ChoreChecklistCompletion` can be the canonical substep model.
- If new persistence is needed, add ordered substep metadata without duplicating existing checklist concepts unnecessarily.
- Ensure required substeps block submission consistently with current required checklist behavior.
- Add tests around substeps, submission, approval, and existing reward/point invariants.

## Data model considerations

- Prefer extending existing checklist semantics before adding new tables.
- If Focus Mode settings are per-child, consider a user preferences table; if household-wide, extend `HouseholdSettings`.
- Preserve existing checklist data and recurring chore inheritance.

## API considerations

- Expose substeps/progress in template and instance payloads.
- Return Focus Mode settings through settings/dashboard/bootstrap payloads as appropriate.
- Avoid new completion endpoints unless existing checklist/submit APIs cannot support the flow.

## Mobile / native app considerations

- Implement web mobile and Android Compose layouts with simple navigation and proper back behavior.
- Update Android models/parsers for substeps and settings.
- Respect any native cache/outbox constraints if substep completion can happen offline.

## Permissions / security considerations

- Children can only act on chores permitted by existing role/assignee rules.
- Children should not be able to modify household-level Focus Mode settings unless current settings architecture allows it.
- Do not expose parent analytics or admin/catalogue controls in Focus Mode.

## Edge cases

- No assigned chores.
- Multiple overdue chores.
- Proof photo required.
- Rejected chore with `needs_fixes` and review note.
- Co-completer/joint completion chores.
- Template edited after instances already exist.

## Acceptance criteria

- A parent/admin can create or edit a chore with substeps.
- A child can complete substeps and submit the chore for approval in Focus Mode.
- Existing approval, reward, and point balance flows still work.
- Focus Mode can be enabled/disabled according to the chosen settings scope.
- UI remains usable on small mobile screens.

## Suggested follow-up sub-issues, if this needs to be split later

- Discovery/map of child screens and navigation.
- Substep/checklist data and API support.
- Parent/admin substep editor.
- Child Focus Mode UI.
- Settings and help/request integration.
