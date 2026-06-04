# Add lightweight contextual comments and quick replies for chores/requests

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

feature, comments, approvals, notifications, backend, web, android

## Dependencies

- N/A

## Product background

TaskBandit already has takeover and approval requests plus notes/review fields, but no general chat. The goal is lightweight communication scoped to chores or requests without creating family chat rooms or broad messaging.

## User story

As a child, I can send predefined quick replies such as 'I need help' from a chore; as a parent/admin, I can leave notes and rejection/redo reasons in the relevant chore/request context.

## Functional requirements

- Parent can leave a contextual note on a chore.
- Parent can provide a rejection/redo reason that is visible in the needs-fixes/focus/chore detail context.
- Child can send predefined quick replies such as I need help, I need more time, I cannot do this today, and Done, please check.
- Comments and quick replies are scoped to chore, approval, or takeover/request context only.
- Optional free-text comments are explicitly reviewed before enabling; initial implementation may be quick-reply-only for children.
- Existing takeover and approval flows remain intact.

## UX / UI requirements

- Use quick-reply chips/buttons in child-facing flows.
- Show notes only where relevant, not as a global inbox/chat thread.
- Make redo/rejection reasons easy to find without punitive language.
- Avoid UI affordances that imply full chat, arbitrary recipients, or unrelated message feeds.

## Backend requirements

- Add contextual comment model/service/controller or extend existing notes carefully.
- Integrate rejection/redo reasons with comment history without losing existing `reviewNote` semantics.
- Create notifications for quick replies/comments only if they fit existing notification preferences and delivery patterns.
- Add permission tests for chore/request-scoped visibility and cross-household isolation.

## Data model considerations

- Suggested fields: tenantId, householdId, choreInstanceId nullable, takeoverRequestId nullable, authorUserId, type, quickReplyKey/body, createdAt, status/visibility.
- Avoid global chat-room or recipient-free thread models.
- Keep author history stable if a user is later removed.

## API considerations

- Endpoints for listing/creating comments by chore/request context, or embed comments in existing chore/request payloads if simpler.
- Approval/rejection endpoints may accept or create contextual comments for redo reasons.
- Payload should include author display name/role and quick reply metadata.

## Mobile / native app considerations

- Add quick reply actions to web child chore/focus flows and Android Compose screens.
- Show parent notes/rejection reasons in chore detail and approval context.
- Handle notification disabled/offline states gracefully.

## Permissions / security considerations

- Users can only see comments for chores/requests they are allowed to access.
- Children cannot message unrelated users or households.
- Free text should stay disabled or constrained unless moderation/privacy review approves it.
- No global family chat endpoint should be introduced.

## Edge cases

- Repeated quick replies.
- Parent comments after chore completion/cancellation.
- Rejected chore with old review note and new comments.
- Notifications disabled.
- User removed after authoring a comment.
- Takeover request declined/cancelled.

## Acceptance criteria

- Contextual notes are visible only in relevant chore/request contexts.
- Child can send predefined quick replies from child-facing flow.
- Parent sees or receives the message in the appropriate approval/request context.
- Existing takeover and approval flows remain intact.
- Permissions prevent users from seeing unrelated household data.

## Suggested follow-up sub-issues, if this needs to be split later

- Comment/note model and API.
- Quick replies in child flows.
- Approval rejection/redo notes.
- Notification integration if supported.
- Moderation/free-text decision as future scope.
