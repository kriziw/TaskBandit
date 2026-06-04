# Add seasonal and situational chore pack library with preview/import flow

## Repository context observed

- Backend API: NestJS modules under `apps/server/src/modules`; chores route through `ChoresController`/`ChoresService`, while most persistence, assignment, recurrence, and mapping logic is in `HouseholdRepository`.
- Database: Prisma schema and migrations under `apps/server/prisma`; relevant models include `User`, `HouseholdSettings`, `ChoreTemplate`, `ChoreInstance`, checklist/completion tables, takeover requests, rewards/redemptions, notifications, audit logs, and points ledger entries.
- Web app: React/Vite/Zustand under `apps/web/src`, with shared API calls in `api/taskbanditApi.ts`, models in `types/taskbandit.ts`, and major workspace UI in `App.tsx`.
- Android app: Kotlin/Compose under `apps/android/app/src/main/java/com/taskbandit/app`, with dashboard, chores, rewards, settings, templates, onboarding, mobile API/models/parsers, push, widgets, and current auth/onboarding deep-link handling.
- Notifications: server notification models/workers already cover assignments, reminders, approvals, takeovers, rewards, push, and email delivery.
- Localization/content: starter/operator templates and app language resources currently cover English, German, and Hungarian.
- GitHub issue creation: `gh` was not available in this environment, so this draft is stored as markdown under `docs/roadmap/issues/` for later GitHub issue creation.

## Suggested milestone

Milestone 3: Content and Onboarding Expansion

## Suggested labels

feature, templates, onboarding, content, localization, web, android

## Dependencies

- N/A

## Product background

Onboarding already asks household questions and seeds relevant chore templates, but parents cannot later browse reusable seasonal or situational packs such as School Morning, Pet Care, Guests Coming, or Sick Day/Low-Energy Mode.

## User story

As a parent/admin, I can browse a library of chore packs after onboarding, preview included chores, choose which ones to import, and manage imported chores through the normal template flow.

## Functional requirements

- Parent/admin can browse available packs.
- Parent/admin can preview chores in a pack before adding them.
- Parent/admin can choose all or selected chores to import.
- Imported chores use existing chore catalogue/template mechanisms where possible.
- Import avoids or flags obvious duplicates.
- Initial seed packs exist for school morning, after school, bedtime, weekend reset, pet care, holiday mode, back to school, guests coming, deep cleaning, moving house, garden care, and sick day/low-energy mode.

## UX / UI requirements

- Pack cards should show localized title, short description, context/season, and chore count.
- Preview should show chore names, points/difficulty, recurrence/checklist summary, and duplicate warnings.
- Use parent-facing, non-punitive language, especially for low-energy/sick-day packs.
- Import result should link back to normal template management.

## Backend requirements

- Define pack metadata and import service, likely reusing starter/operator template catalog patterns.
- Add idempotent import behavior and duplicate/conflict reporting.
- Keep existing onboarding-generated chore behavior intact.
- Add tests for preview, partial import, duplicates, locale fallback, and missing catalog references.

## Data model considerations

- Packs may be static catalog JSON, database-managed operator content, or both; choose the option that best fits existing bootstrap/operator catalogs.
- Imported items should become normal `ChoreTemplate` records with stable catalog/source keys where possible.
- Include age/context metadata only if existing onboarding answers support useful filtering.

## API considerations

- Suggested endpoints: `GET /api/chores/packs`, `GET /api/chores/packs/:key`, and `POST /api/chores/packs/:key/import`.
- Return localized preview payloads and duplicate/conflict details.
- Use existing language negotiation and fallback behavior.

## Mobile / native app considerations

- Add web pack library UI; add Android UI if native template management is in scope.
- Update client models/parsers for pack previews and import results.
- Imported chores should appear in existing chore/template lists without special client handling.

## Permissions / security considerations

- Only admin/parent users can import packs.
- Pack import must target only the caller's household.
- Do not expose operator-only or other-household content through duplicate/conflict messages.

## Edge cases

- Household already has similar onboarding-generated templates.
- Partial import succeeds/fails.
- Locale missing translation.
- Household lacks pets/garden/appliance referenced by a pack.
- Multiple packs include overlapping chores.

## Acceptance criteria

- A parent/admin can add a chore pack after onboarding.
- Imported chores appear in normal chore management.
- Existing onboarding-generated chores and catalog sync are not broken.
- Duplicate handling is documented and tested.
- At least the initial seed pack set exists with localization/fallback policy.

## Suggested follow-up sub-issues, if this needs to be split later

- Pack data/import API.
- Seed content and localization.
- Pack library preview/import UI.
