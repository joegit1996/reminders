# Due Date Nudge & Set New Due Date from Slack

## Summary

Add a built-in nudge message sent as a thread reply 2 days before a reminder's due date, with interactive buttons to complete the task or set a new due date via a Slack modal. Also add a "Set New Due Date" button to the original reminder message. On by default, can be disabled per-reminder.

## Database Changes

New columns on `reminders` table:

- `last_sent_message_ts TEXT` -- Slack message timestamp from the most recent reminder send. Enables thread replies. Updated each time a reminder is sent via the Slack API (not applicable for webhook-only reminders).
- `nudge_enabled BOOLEAN NOT NULL DEFAULT true` -- Controls whether the 2-day-before nudge is sent.
- `nudge_sent_at TIMESTAMP` -- Tracks whether the nudge has already fired for the current due date cycle, preventing re-sends.

### Migration

Single SQL migration:

1. Add all three columns with defaults
2. Backfill `nudge_enabled = true` for all existing reminders
3. No backfill needed for `last_sent_message_ts` or `nudge_sent_at`

## Storing the Message Timestamp

When `sendInteractiveReminder()` posts a reminder via the Slack API, the response includes a `ts` (timestamp). After a successful send, save `ts` to `last_sent_message_ts` on the reminder row.

Webhook-only reminders have no `ts` available, so the nudge feature does not fire for those. Webhooks don't support interactive buttons anyway.

## Original Reminder Message -- New Button

The interactive reminder message gets a third button:

1. **Mark Complete** (existing, primary style)
2. **Set New Due Date** (new)
3. **Use App** (existing, link button)

Clicking "Set New Due Date" opens the same Slack modal described below.

## Cron Job -- Nudge Logic

A new step runs alongside the existing automated messages processing in the daily cron (10 AM UTC):

1. **Query** reminders where:
   - `nudge_enabled = true`
   - `is_complete = false`
   - `due_date` is exactly 2 days from today (UTC)
   - `nudge_sent_at` is null
   - `last_sent_message_ts` is not null
2. **Send** a thread reply (using `last_sent_message_ts` as `thread_ts`) to the same channel with:
   - Text: "This reminder is closing in on its due date. Would you like to add a new due date?"
   - Note: "Ignore if still on track"
   - Two buttons: **Complete Task** and **Set New Due Date**
3. **Update** `nudge_sent_at = now()` to prevent re-sending.

When a due date is updated (via the Set New Due Date flow), `nudge_sent_at` is cleared to null so the nudge can fire again for the new date.

## Slack Modal Flow

When the user clicks **Set New Due Date** (from either the original reminder or the nudge):

1. Slack sends an interaction with `action_id: "set_new_due_date"` and the reminder ID as the value.
2. Server opens a modal via `views.open` with:
   - **Title:** "Set New Due Date"
   - **Date picker** -- pre-filled with the current due date
   - **Text input** -- label: "Reason for change" (required)
   - **Submit button** -- "Update"
   - Reminder ID passed in `private_metadata`
3. On submit, the server:
   - Updates the due date on the reminder
   - Logs the change in `due_date_update_logs`
   - Sends the delay message (to the configured delay channel) with the reason appended
   - Clears `nudge_sent_at` so the nudge can fire again 2 days before the new date
   - Updates the original reminder message to reflect the new due date

The interaction handler at `/api/slack/interactions/route.ts` gains a new `view_submission` handler alongside the existing `block_actions` handler.

## Delay Message Format

When the due date is changed via the modal, the delay message sent to the configured delay channel:

> **Reminder: [reminder text]**
>
> Due date has been updated.
> **Reason:** [user's reason text]
>
> New expected due date: Feb 20, 2026

Reuses existing delay notification infrastructure (`sendDelayNotificationViaApi` / `sendDelayMessage`), enriched with the reason. If no delay channel is configured, only the due date update happens.

## UI Toggle

The reminder form gets a toggle near the due date field:

- **"Due date nudge"** -- checkbox/switch, on by default
- Subtitle: "Send a reminder 2 days before the due date"
- Reflects `nudge_enabled` when editing an existing reminder

## API Changes

`POST /api/reminders` and `PATCH /api/reminders/[id]` accept `nudgeEnabled` (boolean). Defaults to `true` if not provided on creation.

## Files Changed

| Area | Files |
|---|---|
| Database | New migration in `migrations/` |
| Slack interactive message | `lib/slack-interactive.ts` -- add button, build nudge message |
| Slack modal | `lib/slack-interactive.ts` -- new `openSetDueDateModal()` function |
| Interaction handler | `app/api/slack/interactions/route.ts` -- handle `set_new_due_date` action + `view_submission` |
| Cron job | `app/api/cron/send-reminders/route.ts` + `lib/db.ts` -- nudge query and send |
| Delay message | `lib/slack.ts` or `lib/slack-interactive.ts` -- append reason |
| Reminder form | `components/ReminderForm.tsx` -- nudge toggle |
| API routes | `app/api/reminders/route.ts`, `app/api/reminders/[id]/route.ts` -- accept `nudgeEnabled` |
