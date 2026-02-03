import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { verifySlackRequest } from '@/lib/slack-interactive';
import { 
  getReminderById, 
  markReminderComplete, 
  getSlackConnectionByTeamId,
} from '@/lib/db';

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

    const { actions, response_url, team, user: slackUser } = payload;
    
    if (!actions || actions.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const action = actions[0];

    // Use service client to bypass RLS (this is a webhook callback, not a user request)
    const supabase = createServiceClient();

    if (action.action_id === 'mark_complete') {
      const reminderId = parseInt(action.value);
      
      try {
        // SECURITY FIX: Verify the Slack team matches the reminder owner's connection
        const reminder = await getReminderById(supabase, reminderId);
        if (!reminder) {
          console.error('[SLACK INTERACTIONS] Reminder not found:', reminderId);
          await sendEphemeralError(response_url, 'Reminder not found.');
          return NextResponse.json({ ok: true });
        }

        // Get the Slack connection for this team
        const connection = await getSlackConnectionByTeamId(supabase, team.id);
        if (!connection) {
          console.error('[SLACK INTERACTIONS] No connection found for team:', team.id);
          await sendEphemeralError(response_url, 'This workspace is not connected to the app.');
          return NextResponse.json({ ok: true });
        }

        // Verify the reminder belongs to the user who owns this Slack connection
        if (reminder.user_id !== connection.user_id) {
          console.error('[SLACK INTERACTIONS] Unauthorized: reminder user_id does not match connection user_id');
          await sendEphemeralError(response_url, 'You can only complete your own reminders.');
          return NextResponse.json({ ok: true });
        }

        // Mark the reminder as complete
        await markReminderComplete(supabase, reminderId);
        console.log('[SLACK INTERACTIONS] Reminder marked complete:', reminderId);

        // Update the original message to show it's completed
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
        console.error('[SLACK INTERACTIONS] Error marking complete:', error);
        await sendEphemeralError(response_url, 'Failed to mark reminder as complete. Please try again.');
        return NextResponse.json({ ok: true });
      }
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
