# Rewards Workflow

TaskBandit includes a full household rewards shop: admins curate a catalogue, members redeem points, and requests go through an optional approval step.

## Endpoints

- `GET /api/rewards` — list all rewards for the household, with per-reward `upcomingClaims` for `DAILY_EXCLUSIVE` rewards
- `POST /api/rewards` — create a custom reward (admin/parent)
- `PATCH /api/rewards/:id` — update a reward (admin/parent)
- `DELETE /api/rewards/:id` — delete a custom reward (admin/parent)
- `POST /api/rewards/:id/redeem` — submit a redemption request; accepts optional `note` and `targetDate` (ISO date string, required for `DAILY_EXCLUSIVE` rewards)
- `GET /api/rewards/redemptions` — list redemptions for the calling user
- `GET /api/rewards/redemptions/pending` — list all pending redemptions for the household (admin/parent)
- `POST /api/rewards/redemptions/:id/resolve` — approve or reject a pending redemption (admin/parent)
- `PATCH /api/rewards/redemptions/:id/reschedule` — move a booking to a different date (see below)
- `POST /api/rewards/import-starters` — import the built-in starter catalogue into the household

## Workflow Types

Every reward has a `workflowType` field:

### `STANDARD`

The default. A member redeems a reward, points are held or deducted, and the redemption goes through the normal approval flow. Per-member restrictions (`cooldownDays`, `maxRedemptionsPerChild`) apply at redemption time.

### `DAILY_EXCLUSIVE`

Designed for household-level one-per-day rewards such as "Pick tonight's dinner" or "Vote for takeout". The mechanics differ from `STANDARD` in several ways:

- **Forward-dated booking** — the member picks a target date (today through 14 days out) at redemption time. Multiple members can book the same reward on different dates simultaneously.
- **Date conflict guard** — if any other booking (status `PENDING` or `APPROVED`) already exists for the same reward on the chosen date, the server returns `400 reward_date_taken`. The client shows a conflict notice inline before the member confirms.
- **`upcomingClaims` on the reward** — `GET /api/rewards` returns an `upcomingClaims` array on each `DAILY_EXCLUSIVE` reward. Each entry carries `{ redemptionId, userId, displayName, targetDate }`. The shop UI uses this to render per-date booking chips so members can see who has booked which dates.
- **Household notifications** — when a `DAILY_EXCLUSIVE` redemption is approved (automatically or by an admin), a `REWARD_CLAIMED_EXCLUSIVE` push notification is sent to all other household members so everyone knows the date is claimed.
- **`hasPending` bypass** — the normal guard that blocks a second redemption while one is already pending does not apply to `DAILY_EXCLUSIVE` rewards, because a member may legitimately hold bookings for multiple future dates at the same time.

## Rescheduling a Booking

`PATCH /api/rewards/redemptions/:id/reschedule` with body `{ "targetDate": "YYYY-MM-DD" }`.

The behaviour depends on the current redemption status:

- **`PENDING`** — the `targetDate` is updated in place. The same redemption ID is returned.
- **`APPROVED`** — the existing redemption is cancelled and the points are refunded. A new `PENDING` redemption is created with the new date. The response contains the new redemption's ID.

In both cases the date conflict guard applies: if the new date is already taken the request returns `400 reward_date_taken`.

## Booking Reminders

`processRewardBookingReminders` runs daily via the scheduler. On the morning of each booked date, members with a `PENDING` or `APPROVED` booking receive a push reminder (one per booking, idempotent — a `reminderSentAt` flag prevents duplicate delivery).

## Starter Catalogue

A fresh household can import the built-in starter rewards using `POST /api/rewards/import-starters`. All starter rewards are created disabled; admins enable only the ones that suit their household.

The current catalogue ships twenty-three rewards across six categories:

| Category | Count | Examples |
|---|---|---|
| Screen Time | 2 | Extra screen time (30 min, 1 hour) |
| Treat & Food | 7 | Pick tonight's dinner, Vote for takeout tonight, Family ice cream trip, Breakfast in Bed |
| Privilege & Passes | 6 | Homework-Free Night, Skip Dinner Cleanup, Extended Curfew for a Night |
| Activity & Experiences | 5 | Pick the Game Night Game, Invite a Friend Over, Choose a Weekend Outing |
| Allowance | 2 | Pocket money bonus, Bonus Allowance |
| Custom | — | User-created rewards |

Three of the starter rewards use the `DAILY_EXCLUSIVE` workflow type: `pick_dinner`, `order_takeout`, and `game_night_pick`.

## Approval Flow

Household setting: **Require reward approval** (default: on).

- **On** — redemptions start as `PENDING`. Points are not deducted until an admin or parent approves. Rejection returns the held points.
- **Off** — redemptions transition directly to `APPROVED` at submission time and points are deducted immediately.

The auto-approve path still runs the `DAILY_EXCLUSIVE` conflict check and triggers the `REWARD_CLAIMED_EXCLUSIVE` household notification on success.

## Points Ledger

Every point transaction — chore completion, takeover penalty, redemption deduction, refund on rejection or reschedule — is recorded in the points ledger. The admin UI exposes a full ledger view per member. The `showAllPointsLedger` flag in the web store controls whether the ledger is paginated or expanded.

## Notes

- Starter rewards with a `catalogKey` are protected from deletion by household admins; they can be toggled, edited, and re-enabled but not permanently removed.
- `maxRedemptionsPerChild` is a per-member lifetime cap and is checked at redemption time against the member's approved redemptions for that reward.
- `cooldownDays` counts from the most recent approved redemption. The remaining wait is surfaced as a human-readable notice on the reward card.
- Operator-imported rewards (those with a `catalogKey`) mark themselves as `operatorManaged`; clients display these without the edit/delete controls to signal that they originate from the platform catalogue.
