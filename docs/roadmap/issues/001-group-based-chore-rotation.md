# Allow chore rotation within selected eligible household members

## Repository context observed

- Backend API: NestJS modules under `apps/server/src/modules`; chores route through `ChoresController`/`ChoresService`, while most persistence, assignment, recurrence, and mapping logic is in `HouseholdRepository`.
- Database: Prisma schema and migrations under `apps/server/prisma`; relevant models include `User`, `HouseholdSettings`, `ChoreTemplate`, `ChoreInstance`, checklist/completion tables, takeover requests, rewards/redemptions, notifications, audit logs, and points ledger entries.
- Web app: React/Vite/Zustand under `apps/web/src`, with shared API calls in `api/taskbanditApi.ts`, models in `types/taskbandit.ts`, and major workspace UI in `App.tsx`.
- Android app: Kotlin/Compose under `apps/android/app/src/main/java/com/taskbandit/app`, with dashboard, chores, rewards, settings, templates, onboarding, mobile API/models/parsers, push, widgets, and current auth/onboarding deep-link handling.
- Notifications: server notification models/workers already cover assignments, reminders, approvals, takeovers, rewards, push, and email delivery.
- Localization/content: starter/operator templates and app language resources currently cover English, German, and Hungarian.
- GitHub issue creation: `gh` was not available in this environment, so this draft is stored as markdown under `docs/roadmap/issues/` for later GitHub issue creation.

## Suggested milestone

Milestone 1: Scheduling and Core Household Logic

## Suggested labels

feature, scheduling, backend, web, android, database

## Dependencies

- N/A

## Product background

TaskBandit already supports automatic assignment strategies including round robin, least-completed-recently, highest-streak, fixed/manual assignment, and recurring chore generation. The missing capability is restricting automatic assignment candidates to a parent-selected eligible member group per chore.

## User story

As a parent/admin, I can configure a chore so it rotates only among selected household members, such as older children for trash, children for pet care, or adults/teens for mowing.

## Functional requirements

- Parent/admin can choose eligible members for a chore/template.
- Automatic strategies respect the eligible pool for recurring and one-off generation.
- Existing chores without configured eligibility keep current all-household behavior after migration.
- Inactive, removed, unavailable, or otherwise invalid users are skipped according to existing product patterns.
- If no eligible user can be assigned, the system uses a safe documented fallback such as unassigned/open plus a configuration warning.

## UX / UI requirements

- Add a 'Who can do this chore?' style control to parent/admin create/edit flows.
- Default state should clearly mean everyone remains eligible.
- Warn when the selected pool is empty or conflicts with a fixed assignee.
- Show eligible-member summary on chore/template details where useful.

## Backend requirements

- Add persistence and DTO validation for eligible assignees on chore templates and any necessary instance override/snapshot.
- Update `HouseholdRepository` assignment helpers including round robin, least-completed-recently, highest-streak, fixed-assignee validation, recurrence creation, and rebalancing.
- Update bootstrap/starter/operator template import paths to default to unrestricted eligibility.
- Add regression tests for normal rotation, removed users, empty group, recurrence, fixed assignee conflicts, and unrestricted legacy behavior.

## Data model considerations

- Prefer a normalized join table such as `ChoreTemplateEligibleAssignee(templateId,userId)` for referential integrity.
- Only add instance-level snapshot/override data if recurrence/editing semantics require historical eligibility.
- Use cascading or cleanup behavior that prevents removed users from breaking future assignments.

## API considerations

- Extend template create/update/get payloads with eligible assignee IDs or objects.
- Decide whether instance create/update supports eligibility overrides or inherits template-only eligibility.
- Keep backwards compatibility for clients that omit the new field.

## Mobile / native app considerations

- Update web types/stores/API and Android mobile models/parsers.
- Implement the selector in web and Android parent/admin chore configuration flows if both clients support template editing.
- Keep child-facing chore lists unchanged except for resulting assignments.

## Permissions / security considerations

- Only admin/parent users with existing chore/template management permissions can mutate eligibility.
- Reject user IDs outside the caller's household.
- Avoid leaking household member data through eligibility responses beyond what current member APIs already expose.

## Edge cases

- Eligible pool has one member.
- Last round-robin assignee was removed or is no longer eligible.
- All eligible members are unavailable/removed.
- Manual locked assignments and frozen rebalance windows.
- Existing recurring chores created before migration.

## Acceptance criteria

- Existing chores continue to assign as before after migration.
- A chore can be configured to rotate only among selected users.
- Recurring generation respects the eligible pool and rotation history where existing architecture supports it.
- Removing a household member does not break future assignments.
- Automated tests cover the documented edge cases.

## Suggested follow-up sub-issues, if this needs to be split later

- Data model/API support for eligible assignees.
- Scheduling engine and recurrence behavior.
- Parent/admin web and Android selector UI.
- Regression test suite for edge cases.
