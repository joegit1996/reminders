import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { verifySlackRequest } from '@/lib/slack-interactive';
import {
  getReminderById,
  markReminderComplete,
  getSlackConnectionByTeamId,
  updateReminderDueDate,
} from '@/lib/db';
import { sendDelayNotificationViaApi } from '@/lib/slack-interactive';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const timestamp = request.headers.get('x-slack-request-timestamp') || '';
    const signature = request.headers.get('x-slack-signature') || '';

    // Verify request is from Slack
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    if (!signingSecret) {
      console.error('[SLACK INTERACTIONS] SLACK_SIGNING_SECRET not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (!verifySlackRequest(signingSecret, rawBody, timestamp, signature)) {
      console.error('[SLACK INTERACTIONS] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse the payload
    const params = new URLSearchParams(rawBody);
    const payload = JSON.parse(params.get('payload') || '{}');
    const payloadType = payload.type;

    // Use service client to bypass RLS (this is a webhook callback, not a user request)
    const supabase = createServiceClient();

    if (payloadType === 'view_submission') {
      return handleViewSubmission(supabase, payload);
    }

    // block_actions handling
    const { actions, response_url, team, user: slackUser } = payload;

    if (!actions || actions.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const action = actions[0];

    if (action.action_id === 'mark_complete') {
      return handleMarkComplete(supabase, action, response_url, team, slackUser);
    }

    if (action.action_id === 'set_new_due_date') {
      return handleSetNewDueDate(supabase, action, payload, team, response_url);
    }

    // Handle other actions (like open_app which is just a URL button)
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[SLACK INTERACTIONS] Error processing interaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleMarkComplete(
  supabase: ReturnType<typeof createServiceClient>,
  action: { value: string },
  response_url: string,
  team: { id: string },
  slackUser: { id: string }
) {
  const reminderId = parseInt(action.value);

  try {
    console.log('[SLACK INTERACTIONS] Processing mark_complete for reminder:', reminderId, 'team:', team?.id);

    const reminder = await getReminderById(supabase, reminderId);
    if (!reminder) {
      console.error('[SLACK INTERACTIONS] Reminder not found:', reminderId);
      await sendEphemeralError(response_url, 'Reminder not found.');
      return NextResponse.json({ ok: true });
    }
    console.log('[SLACK INTERACTIONS] Found reminder:', reminderId, 'user_id:', reminder.user_id);

    const connection = await getSlackConnectionByTeamId(supabase, team?.id);
    if (!connection) {
      console.error('[SLACK INTERACTIONS] No connection found for team:', team?.id);
      await sendEphemeralError(response_url, 'This workspace is not connected to the app.');
      return NextResponse.json({ ok: true });
    }
    console.log('[SLACK INTERACTIONS] Found connection for team:', team?.id, 'user_id:', connection.user_id);

    if (reminder.user_id !== connection.user_id) {
      console.error('[SLACK INTERACTIONS] Unauthorized: reminder user_id', reminder.user_id, 'does not match connection user_id', connection.user_id);
      await sendEphemeralError(response_url, 'You can only complete your own reminders.');
      return NextResponse.json({ ok: true });
    }

    console.log('[SLACK INTERACTIONS] Marking reminder complete:', reminderId);
    await markReminderComplete(supabase, reminderId);
    console.log('[SLACK INTERACTIONS] Reminder marked complete successfully:', reminderId);

    await fetch(response_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        replace_original: true,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `~${reminder.text}~\n\n✅ *Completed* by <@${slackUser.id}>`,
            },
          },
        ],
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[SLACK INTERACTIONS] Error marking complete:', error instanceof Error ? error.message : error, error instanceof Error ? error.stack : '');
    await sendEphemeralError(response_url, 'Failed to mark reminder as complete. Please try again.');
    return NextResponse.json({ ok: true });
  }
}

async function handleSetNewDueDate(
  supabase: ReturnType<typeof createServiceClient>,
  action: { value: string },
  payload: {
    trigger_id: string;
    team: { id: string };
    channel?: { id: string };
    message?: { ts: string };
    container?: { channel_id: string; message_ts: string };
  },
  team: { id: string },
  response_url: string
) {
  const reminderId = parseInt(action.value);

  try {
    // Parallelize DB calls to minimize time before views.open (trigger_id expires in 3s)
    const [reminder, connection] = await Promise.all([
      getReminderById(supabase, reminderId),
      getSlackConnectionByTeamId(supabase, team?.id),
    ]);

    if (!reminder) {
      console.error('[SLACK INTERACTIONS] Reminder not found for set_new_due_date:', reminderId);
      await sendEphemeralError(response_url, 'Reminder not found.');
      return NextResponse.json({ ok: true });
    }

    if (!connection) {
      console.error('[SLACK INTERACTIONS] No connection found for team:', team?.id);
      await sendEphemeralError(response_url, 'This workspace is not connected to the app.');
      return NextResponse.json({ ok: true });
    }

    if (reminder.user_id !== connection.user_id) {
      console.error('[SLACK INTERACTIONS] Unauthorized for set_new_due_date');
      await sendEphemeralError(response_url, 'You can only modify your own reminders.');
      return NextResponse.json({ ok: true });
    }

    // Get channel and message ts from the payload for updating the original message later
    const channelId = payload.channel?.id || payload.container?.channel_id || '';
    const messageTs = payload.message?.ts || payload.container?.message_ts || '';

    const privateMetadata = JSON.stringify({
      reminderId,
      channelId,
      messageTs,
    });

    // Open modal with date picker and reason
    console.log('[SLACK INTERACTIONS] Opening modal for set_new_due_date, trigger_id:', payload.trigger_id);
    const modalResponse = await fetch('https://slack.com/api/views.open', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${connection.access_token}`,
      },
      body: JSON.stringify({
        trigger_id: payload.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'set_new_due_date_modal',
          private_metadata: privateMetadata,
          title: {
            type: 'plain_text',
            text: 'Set New Due Date',
          },
          submit: {
            type: 'plain_text',
            text: 'Update Due Date',
          },
          close: {
            type: 'plain_text',
            text: 'Cancel',
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${reminder.text}*\nCurrent due date: ${reminder.due_date}`,
              },
            },
            {
              type: 'input',
              block_id: 'due_date_block',
              element: {
                type: 'datepicker',
                action_id: 'new_due_date',
                initial_date: reminder.due_date,
                placeholder: {
                  type: 'plain_text',
                  text: 'Select a date',
                },
              },
              label: {
                type: 'plain_text',
                text: 'New Due Date',
              },
            },
            {
              type: 'input',
              block_id: 'reason_block',
              element: {
                type: 'plain_text_input',
                action_id: 'reason',
                multiline: true,
                placeholder: {
                  type: 'plain_text',
                  text: 'Why is the due date changing?',
                },
              },
              label: {
                type: 'plain_text',
                text: 'Reason',
              },
            },
          ],
        },
      }),
    });

    const modalResult = await modalResponse.json();
    console.log('[SLACK INTERACTIONS] views.open result:', JSON.stringify(modalResult));
    if (!modalResult.ok) {
      console.error('[SLACK INTERACTIONS] Error opening modal:', modalResult.error);
      await sendEphemeralError(response_url, `Failed to open date picker: ${modalResult.error}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[SLACK INTERACTIONS] Error handling set_new_due_date:', error);
    await sendEphemeralError(response_url, 'Something went wrong. Please try again.');
    return NextResponse.json({ ok: true });
  }
}

async function handleViewSubmission(
  supabase: ReturnType<typeof createServiceClient>,
  payload: {
    view: {
      callback_id: string;
      private_metadata: string;
      state: {
        values: Record<string, Record<string, { type: string; selected_date?: string; value?: string }>>;
      };
    };
    user: { id: string; team_id: string };
  }
) {
  if (payload.view.callback_id !== 'set_new_due_date_modal') {
    return NextResponse.json({ ok: true });
  }

  try {
    const { reminderId, channelId, messageTs } = JSON.parse(payload.view.private_metadata);
    const newDueDate = payload.view.state.values.due_date_block.new_due_date.selected_date;
    const reason = payload.view.state.values.reason_block.reason.value || '';

    if (!newDueDate) {
      return NextResponse.json({
        response_action: 'errors',
        errors: { due_date_block: 'Please select a date' },
      });
    }

    const reminder = await getReminderById(supabase, reminderId);
    if (!reminder) {
      console.error('[SLACK INTERACTIONS] Reminder not found for view_submission:', reminderId);
      return NextResponse.json({ response_action: 'clear' });
    }

    // Update due date (this also clears nudge_sent_at and logs the change)
    const result = await updateReminderDueDate(supabase, reminderId, newDueDate);

    // Get Slack connection
    const connection = await getSlackConnectionByTeamId(supabase, payload.user.team_id);

    // Send delay notification with reason if configured
    if (connection?.access_token && reminder.delay_message && reminder.delay_slack_channel_id) {
      const messageWithReason = reason
        ? `${reminder.delay_message}\n\n*Reason:* ${reason}`
        : reminder.delay_message;

      await sendDelayNotificationViaApi(
        connection.access_token,
        reminder.delay_slack_channel_id,
        messageWithReason,
        newDueDate,
        connection.user_access_token
      );
    }

    // Update the original message to reflect new due date
    if (connection?.access_token && channelId && messageTs) {
      const dueDate = new Date(newDueDate);
      const today = new Date();
      dueDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      const daysRemaining = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const statusEmoji = daysRemaining <= 0 ? '🚨' : daysRemaining <= 3 ? '⚠️' : '⏰';
      const statusText = daysRemaining <= 0
        ? `*${Math.abs(daysRemaining)} days overdue!*`
        : `*${daysRemaining} days remaining*`;

      const sendToken = connection.user_access_token || connection.access_token;

      await fetch('https://slack.com/api/chat.update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sendToken}`,
        },
        body: JSON.stringify({
          channel: channelId,
          ts: messageTs,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: 'Automated Message - Followup',
                emoji: true,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${reminder.text}*${reminder.description ? `\n${reminder.description}` : ''}`,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `📅 *Due Date:*\n${format(dueDate, 'MMM dd, yyyy')}`,
                },
                {
                  type: 'mrkdwn',
                  text: `⏰ *Status:*\n${statusText}`,
                },
              ],
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `📅 Due date updated by <@${payload.user.id}>${reason ? `: ${reason}` : ''}`,
                },
              ],
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: '✅ Mark Complete',
                    emoji: true,
                  },
                  action_id: 'mark_complete',
                  value: String(reminderId),
                  style: 'primary',
                },
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: '📅 Set New Due Date',
                    emoji: true,
                  },
                  action_id: 'set_new_due_date',
                  value: String(reminderId),
                },
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: '🔗 Use App',
                    emoji: true,
                  },
                  url: 'https://reminders-liard.vercel.app/',
                },
              ],
            },
          ],
          text: `Followup: ${reminder.text}`,
        }),
      });
    }

    // Close the modal
    return NextResponse.json({ response_action: 'clear' });
  } catch (error) {
    console.error('[SLACK INTERACTIONS] Error handling view_submission:', error);
    return NextResponse.json({ response_action: 'clear' });
  }
}

// Helper to send ephemeral error message
async function sendEphemeralError(responseUrl: string, message: string) {
  try {
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response_type: 'ephemeral',
        text: `❌ ${message}`,
      }),
    });
  } catch (error) {
    console.error('[SLACK INTERACTIONS] Error sending ephemeral message:', error);
  }
}
