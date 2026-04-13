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
- Child submissions move to `pending_approval`.
- Approved submissions move to `completed`.
- Rejected submissions move to `needs_fixes`.
- Cancelling a repeating chore from the client cancels every still-open chore in that repeat and stops future repeats.
- Admins can configure a signed takeover points rule in household settings: positive values reward the user who accepts a takeover, negative values deduct points when someone asks another member to take over.
- Required checklist items must be completed before submit.
- Chores marked with required photo proof must include at least one uploaded image.
- Proof uploads accept image files and return attachment metadata for the final submit payload.

## Notes

- This is the first workflow slice, not the final one.
- Fresh household setup can import a curated starter template catalog with English, German, and Hungarian labels. The import is optional and selected with checkboxes during bootstrap.
- The admin template editor groups templates by group and uses compact locale tabs so translated group, type, and description text can be maintained without making the editor excessively tall.
- Submission payloads now persist checklist completion records and attachment metadata.
- Historic chore views distinguish completed timestamps from cancelled timestamps.
- Takeover penalty deductions never drive a member's point balance below zero.
- Proof uploads are now stored on local disk under the configured storage root.
- Authorization currently focuses on role and assignee checks for the new workflow endpoints.
