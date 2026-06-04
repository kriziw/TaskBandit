# Add lightweight QR, NFC, webhook, and Home Assistant/n8n integrations

## Repository context observed

- Backend API: NestJS modules under `apps/server/src/modules`; chores route through `ChoresController`/`ChoresService`, while most persistence, assignment, recurrence, and mapping logic is in `HouseholdRepository`.
- Database: Prisma schema and migrations under `apps/server/prisma`; relevant models include `User`, `HouseholdSettings`, `ChoreTemplate`, `ChoreInstance`, checklist/completion tables, takeover requests, rewards/redemptions, notifications, audit logs, and points ledger entries.
- Web app: React/Vite/Zustand under `apps/web/src`, with shared API calls in `api/taskbanditApi.ts`, models in `types/taskbandit.ts`, and major workspace UI in `App.tsx`.
- Android app: Kotlin/Compose under `apps/android/app/src/main/java/com/taskbandit/app`, with dashboard, chores, rewards, settings, templates, onboarding, mobile API/models/parsers, push, widgets, and current auth/onboarding deep-link handling.
- Notifications: server notification models/workers already cover assignments, reminders, approvals, takeovers, rewards, push, and email delivery.
- Localization/content: starter/operator templates and app language resources currently cover English, German, and Hungarian.
- GitHub issue creation: `gh` was not available in this environment, so this draft is stored as markdown under `docs/roadmap/issues/` for later GitHub issue creation.

## Suggested milestone

Milestone 5: Integrations

## Suggested labels

feature, integrations, backend, web, android, security, docs

## Dependencies

- N/A

## Product background

TaskBandit can support useful household automations without deep appliance integrations by starting with generic chore/routine deep links, printable QR codes, NFC tags that reuse those links, and signed household webhooks for selected events.

## User story

As a parent/admin, I can connect chores to physical locations and automation tools by printing a QR code, writing an NFC tag, or sending signed webhooks to tools like Home Assistant or n8n.

## Functional requirements

- Parent/admin can generate a QR code for a chore or routine.
- QR and NFC links open the correct TaskBandit app/web screen through a documented deep-link format.
- If the app is not installed or user is unauthenticated, behavior is documented or handled through existing web/app-link patterns.
- Parent/admin can configure household webhook endpoints with selected event types.
- Webhook events include chore assigned, chore completed, chore overdue, approval requested, and reward redeemed as MVP events.
- Webhook deliveries are signed and logged or visible according to existing operational patterns.
- Docs include Home Assistant and n8n examples.

## UX / UI requirements

- QR print view should include chore title/icon and simple scan instructions.
- Integration settings should explain that QR/NFC are links, not automatic completion bypasses.
- Webhook UI should make event selection, endpoint status, and signing-secret rotation understandable.

## Backend requirements

- First define secure canonical deep-link formats for chore instance/template/routine targets.
- Add QR generation client-side or server-side after deciding link generation ownership.
- Add webhook models/service/controller and dispatch hooks near notification/event creation points.
- Use async delivery worker/retry patterns if consistent with notification workers.
- Add tests for link authorization, webhook signing, event payload scoping, and delivery failures.

## Data model considerations

- Avoid storing generated QR images unless needed; store link/share tokens only if security requires opaque links.
- Webhook config should store endpoint URL, enabled flag, subscribed events, signing secret, creator, timestamps, and delivery attempts.
- Payloads should include useful minimal fields and stable event IDs.

## API considerations

- Deep-link resolver or link generation endpoint if client-generated links are not enough.
- CRUD endpoints under settings/integrations namespace for webhooks.
- Endpoint for rotating webhook signing secrets.
- Document webhook headers, payload shape, retries, and signature verification.

## Mobile / native app considerations

- Extend Android intent filters/parser/navigation beyond current auth/onboarding deep links.
- NFC should reuse the same link format as QR.
- Web should route app links to the correct chore/routine screen where possible.

## Permissions / security considerations

- Links must not bypass authentication or household membership checks.
- Webhook payloads must never leak cross-household data.
- Sign payloads with HMAC or comparable verification.
- Validate webhook URL schemes and consider SSRF/private-network protections for hosted mode.
- Limit QR generation and webhook config to admin/parent users.

## Edge cases

- Chore deleted/cancelled after QR is printed.
- User scans another household's code.
- Multiple households on one device.
- Endpoint down/slow or retries duplicate automations.
- Webhook secret rotation.
- App not installed.

## Acceptance criteria

- QR code opens the intended chore/routine for authorized users.
- NFC can reuse the same deep-link format.
- Webhook events are sent for selected event types with minimal signed payloads.
- Failed deliveries are recorded or visible.
- Home Assistant and n8n example docs match the shipped payload/signature format.

## Suggested follow-up sub-issues, if this needs to be split later

- Deep-link discovery and routing.
- QR code generation/print UI.
- NFC setup docs/reuse.
- Webhook config, delivery, and signing.
- Home Assistant and n8n examples.
