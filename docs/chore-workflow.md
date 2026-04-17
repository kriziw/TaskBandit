# Chore Workflow

TaskBandit now includes the first protected submission and review flow for chores.

## Current Endpoints

- `GET /api/chores/templates`
- `POST /api/chores/templates`
- `GET /api/chores/instances`
- `POST /api/chores/uploads/proof`
- `POST /api/chores/instances/:id/submit`
- `POST /api/chores/instances/:id/approve`
- `POST /api/chores/instances/:id/reject`
- `POST /api/chores/instances/:id/close-cycle`

## Current Rules

- All chore endpoints require a bearer token.
- Only `admin` and `parent` users can create chore templates.
- Templates now use three display layers: group, type, and optional sub-type. The group keeps related work together, the type names the main chore, and the sub-type captures selectable variants such as laundry color or room.
- Follow-up chores inherit the configured group, type, optional sub-type, checklist, recurrence, proof-photo requirement, and translated labels from their follow-up template.
- Children can only submit chores assigned to themselves.
- `admin` and `parent` users can approve or reject chore submissions.
- Template assignment strategies now cover only automatic assignment:
  - `round_robin`
  - `least_completed_recently`
  - `highest_streak`
- Manual assignment is now a per-instance choice when scheduling or editing a chore.
- Editing a chore preserves its current assignee by default.
- Automatic rebalancing only touches flexible chores:
  - state is still `open` or `assigned`
  - assignment is not manually locked
  - due time is outside the freeze window
- Claiming a chore assigns it to the acting user instead of moving it into a separate progress state.
- Child submissions move to `pending_approval`.
- Approved submissions move to `completed`.
- Completed chores can show cosmetic celebration variants in clients; these do not change task state, points, approvals, or scoring rules.
- The Perfect Day/Clean Sweep milestone is server-triggered after a real completion transition when no assigned chores remain active or pending for that user's UTC due-date window; it is recorded once per user per day.
- Rejected submissions move to `needs_fixes`.
- Cancelling a repeating chore from the client cancels every still-open chore in that repeat and stops future repeats.
- Admins can configure a signed takeover points rule in household settings: positive values reward the user who accepts a takeover, negative values deduct points when someone asks another member to take over.
- Required checklist items must be completed before submit.
- Chores marked with required photo proof must include at least one uploaded image.
- Proof uploads accept image files and return attachment metadata for the final submit payload.
- Follow-up chores can optionally keep the same assignee when the template enables sticky follow-up assignment.

## Notes

- This is the first workflow slice, not the final one.
- Fresh household setup can import a curated starter template catalog with English, German, and Hungarian labels. The import is optional and selected with checkboxes during bootstrap.
- The admin template editor groups templates by group and uses compact locale tabs so translated group, type, and description text can be maintained without making the editor excessively tall.
- Submission payloads now persist checklist completion records and attachment metadata.
- Historic chore views distinguish completed timestamps from cancelled timestamps.
- Takeover penalty deductions never drive a member's point balance below zero.
- Proof uploads are now stored on local disk under the configured storage root.
- Authorization currently focuses on role and assignee checks for the new workflow endpoints.
- The API now returns compact assignment reasons so clients can explain why a chore is assigned where it is.
