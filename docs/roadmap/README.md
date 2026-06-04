# Roadmap issue drafts

GitHub CLI (`gh`) was not available in this environment, so the roadmap issues were drafted as markdown files for later creation in GitHub. These drafts intentionally use **one issue per roadmap feature area**; teams can split any feature-level issue into sub-issues later if implementation requires it.

## Architecture map used for scoping

| Area | Current repository locations | Notes |
|---|---|---|
| Chores and approval workflow | `apps/server/src/modules/chores`, `apps/server/src/modules/household/household.repository.ts`, `docs/chore-workflow.md` | Chore templates/instances, checklist completions, proof uploads, submit/review, takeover, co-completion, recurrence, and assignment logic are already present. |
| Scheduling | `apps/server/prisma/schema.prisma`, `apps/server/src/modules/household/household.repository.ts` | Assignment strategies and recurrence generation live primarily in the household repository. |
| Users and household members | `apps/server/prisma/schema.prisma`, `apps/server/src/modules/settings`, `apps/server/src/modules/household` | Users have household roles, points, leaderboard points, streaks, auth identities, notification prefs/devices, and reward/chore relations. |
| Rewards and points | `apps/server/src/modules/rewards`, `apps/server/src/modules/gamification/points.service.ts`, `docs/rewards-workflow.md` | Rewards/redemptions and a points ledger already exist; allowance tracking should build on these without payment processing. |
| Onboarding/templates/content | `apps/server/src/modules/bootstrap`, `apps/server/src/modules/settings`, `apps/server/src/modules/chores/hosted-template-seed.controller.ts`, `docs/localization.md` | Starter/operator template catalogs, onboarding answers, catalog sync, and localized starter content exist. |
| Calendar/schedule | `apps/web/src/App.tsx`, `apps/android/app/src/main/java/com/taskbandit/app/ui/screens/DashboardScreen.kt`, recurrence fields in Prisma and DTOs | Scheduling views are represented through dashboard/chore screens and recurrence configuration rather than a separate calendar module in this repo snapshot. |
| Native/web UI | `apps/web/src`, `apps/android/app/src/main/java/com/taskbandit/app` | Web uses React/Vite/Zustand; Android uses Kotlin/Compose models, API client, parsers, screens, push, and widgets. |
| Backend API | `apps/server/src/modules/*/*.controller.ts`, DTOs under module `dto` folders | NestJS controllers use JWT/role/feature guards with Swagger decorators. |
| Database/migrations | `apps/server/prisma/schema.prisma`, `apps/server/prisma/migrations` | Prisma schema has tenant/household scoping, chores, rewards, notifications, audit log, settings, holiday blocks, achievements, and indexes. |
| Notifications | `apps/server/src/modules/dashboard/*worker.service.ts`, `apps/server/prisma/schema.prisma`, Android push package, web PWA push files | Notification models/workers already cover assignments, reminders, approvals, takeovers, rewards, push, and email delivery. |

## Recommended implementation order

1. Start with [001 Group-based chore rotation](issues/001-group-based-chore-rotation.md) because it is a contained scheduling/data-model change.
2. Use discovery steps inside [002 Focus Mode](issues/002-focus-step-by-step-mode.md), [003 Accessibility](issues/003-accessibility-baseline.md), [005 Analytics](issues/005-parent-analytics-fairness-dashboard.md), and [006 Integrations](issues/006-qr-nfc-webhook-integrations.md) before implementation.
3. Build data/API foundations before UI in each feature-level issue.
4. If any issue becomes too large during execution, split it into sub-issues using the "Suggested follow-up sub-issues" section in that issue.

## Issue summary

| # | Draft file | Title | Milestone | Suggested labels | Dependencies |
|---:|---|---|---|---|---|
| 1 | [001-group-based-chore-rotation.md](issues/001-group-based-chore-rotation.md) | Allow chore rotation within selected eligible household members | Milestone 1: Scheduling and Core Household Logic | feature, scheduling, backend, web, android, database | None |
| 2 | [002-focus-step-by-step-mode.md](issues/002-focus-step-by-step-mode.md) | Add Focus Mode with optional chore substeps and simplified child flow | Milestone 2: Child Experience and Inclusivity | feature, focus-mode, ux, backend, web, android, accessibility | None |
| 3 | [003-accessibility-baseline.md](issues/003-accessibility-baseline.md) | Deliver baseline accessibility improvements across core app flows | Milestone 2: Child Experience and Inclusivity | accessibility, ux, web, android, settings | None |
| 4 | [004-seasonal-situational-chore-packs.md](issues/004-seasonal-situational-chore-packs.md) | Add seasonal and situational chore pack library with preview/import flow | Milestone 3: Content and Onboarding Expansion | feature, templates, onboarding, content, localization, web, android | None |
| 5 | [005-parent-analytics-fairness-dashboard.md](issues/005-parent-analytics-fairness-dashboard.md) | Add parent analytics and fairness dashboard | Milestone 4: Parent Intelligence | feature, analytics, backend, web, android, privacy | None |
| 6 | [006-qr-nfc-webhook-integrations.md](issues/006-qr-nfc-webhook-integrations.md) | Add lightweight QR, NFC, webhook, and Home Assistant/n8n integrations | Milestone 5: Integrations | feature, integrations, backend, web, android, security, docs | None |
| 7 | [007-manual-allowance-tracking.md](issues/007-manual-allowance-tracking.md) | Add optional manual allowance tracking and point-to-money payouts | Milestone 6: Allowance | feature, allowance, rewards, points, backend, web, android | None |
| 8 | [008-contextual-comments-quick-replies.md](issues/008-contextual-comments-quick-replies.md) | Add lightweight contextual comments and quick replies for chores/requests | Milestone 2: Child Experience and Inclusivity | feature, comments, approvals, notifications, backend, web, android | None |
