# Chore Workflow

TaskBandit now includes the first protected submission and review flow for chores.

## Current Endpoints

- `GET /api/chores/templates`
- `POST /api/chores/templates`
- `GET /api/chores/instances`
- `POST /api/chores/instances/:id/submit`
- `POST /api/chores/instances/:id/approve`
- `POST /api/chores/instances/:id/reject`

## Current Rules

- All chore endpoints require a bearer token.
- Only `admin` and `parent` users can create chore templates.
- Children can only submit chores assigned to themselves.
- `admin` and `parent` users can approve or reject chore submissions.
- Child submissions move to `pending_approval`.
- Approved submissions move to `completed`.
- Rejected submissions move to `needs_fixes`.

## Notes

- This is the first workflow slice, not the final one.
- Checklist progress and attachment counts are accepted in the submission payload, but full checklist persistence and upload handling still need to be expanded.
- Authorization currently focuses on role and assignee checks for the new workflow endpoints.

