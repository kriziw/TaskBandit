# Add optional manual allowance tracking and point-to-money payouts

## Repository context observed

- Backend API: NestJS modules under `apps/server/src/modules`; chores route through `ChoresController`/`ChoresService`, while most persistence, assignment, recurrence, and mapping logic is in `HouseholdRepository`.
- Database: Prisma schema and migrations under `apps/server/prisma`; relevant models include `User`, `HouseholdSettings`, `ChoreTemplate`, `ChoreInstance`, checklist/completion tables, takeover requests, rewards/redemptions, notifications, audit logs, and points ledger entries.
- Web app: React/Vite/Zustand under `apps/web/src`, with shared API calls in `api/taskbanditApi.ts`, models in `types/taskbandit.ts`, and major workspace UI in `App.tsx`.
- Android app: Kotlin/Compose under `apps/android/app/src/main/java/com/taskbandit/app`, with dashboard, chores, rewards, settings, templates, onboarding, mobile API/models/parsers, push, widgets, and current auth/onboarding deep-link handling.
- Notifications: server notification models/workers already cover assignments, reminders, approvals, takeovers, rewards, push, and email delivery.
- Localization/content: starter/operator templates and app language resources currently cover English, German, and Hungarian.
- GitHub issue creation: `gh` was not available in this environment, so this draft is stored as markdown under `docs/roadmap/issues/` for later GitHub issue creation.

## Suggested milestone

Milestone 6: Allowance

## Suggested labels

feature, allowance, rewards, points, backend, web, android

## Dependencies

- N/A

## Product background

TaskBandit already tracks points and reward redemptions, including allowance-category rewards, but it does not provide optional point-to-money conversion or auditable manual pocket-money payouts. This feature must not implement banking or payment processing.

## User story

As a parent/admin, I can optionally map points to money and manually track payouts; as a child, I can request a payout and see my own allowance history when enabled.

## Functional requirements

- Parent/admin can enable/disable allowance tracking.
- Parent/admin can configure point-to-money conversion and currency.
- Child can request a payout if allowance tracking is enabled and balance rules permit it.
- Parent/admin can approve, reject, and mark payout as paid manually.
- Parent/admin can view household payout history; child can view only their own payout history.
- Existing non-money reward redemption continues to work.
- No real banking, payment processing, or money movement is implemented.

## UX / UI requirements

- Wallet UI should clearly explain conversion, point balance, money equivalent, pending requests, and paid history.
- Parent payout management should clearly distinguish requested, approved, rejected, and paid states.
- Copy must state this is manual tracking only, not an automatic transfer.
- Disabled households should not see allowance prompts as required workflow.

## Backend requirements

- Add allowance settings persistence and validation.
- Add payout request/history model, service, and controller.
- Choose and document deduction timing: request, approval, or mark-paid; record deductions/refunds in the points ledger accordingly.
- Add tests for settings validation, request permissions, approval/rejection/paid flow, ledger entries, conversion snapshots, and disabled behavior.

## Data model considerations

- Allowance settings may extend `HouseholdSettings` or use a dedicated settings table if history/config versioning requires it.
- Payout records should store householdId, tenantId, requestedBy, points amount, money amount/currency snapshot, status, timestamps, resolver, paid marker, and notes.
- Conversion snapshots are needed so history remains auditable after settings changes.

## API considerations

- Extend settings APIs or add allowance settings endpoint.
- Add payout endpoints for create/list/resolve/mark-paid.
- Return own-history vs household-history according to role.

## Mobile / native app considerations

- Add web wallet and parent payout management UI.
- Update Android models/parsers and screens if native rewards/wallet scope includes allowance.
- Use locale-aware currency formatting.

## Permissions / security considerations

- Only admin/parent can manage payout requests; likely admin-only for conversion settings unless current settings permissions expand.
- Children can create/list only their own payout requests.
- No cross-household payout or ledger visibility.
- Do not store bank details or payment credentials.

## Edge cases

- Allowance disabled after a request is created.
- Insufficient points at approval time.
- Conversion changed after request.
- Currency changed.
- Rejected request needs refund depending on deduction timing.
- Existing reward approval disabled/enabled settings.

## Acceptance criteria

- Allowance feature can be disabled with no impact on normal rewards.
- A child can request a payout based on points.
- Parent/admin can approve/reject/mark paid manually.
- Points are deducted/refunded according to documented flow.
- History is auditable with conversion snapshots.
- Existing non-money rewards still work.

## Suggested follow-up sub-issues, if this needs to be split later

- Allowance settings/conversion.
- Payout request/history API.
- Child wallet UI.
- Parent payout management UI.
- Optional savings goals/jars as later scope only.
