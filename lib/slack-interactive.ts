import crypto from 'crypto';

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: Array<{
    type: string;
    text?: { type: string; text: string; emoji?: boolean };
    action_id?: string;
    value?: string;
    style?: string;
    url?: string;
  }>;
  fields?: Array<{ type: string; text: string }>;
}

export interface InteractiveReminderOptions {
  accessToken: string;
  channelId: string;
  reminderId: number;
  reminderText: string;
  reminderDescription?: string | null;
  dueDate: string;
  daysRemaining: number;
  appUrl: string;
}

export async function sendInteractiveReminder(options: InteractiveReminderOptions): Promise<{ ok: boolean; ts?: string; error?: string }> {
  const {
    accessToken,
    channelId,
    reminderId,
    reminderText,
    reminderDescription,
    dueDate,
    daysRemaining,
    appUrl,
  } = options;

  const statusEmoji = daysRemaining <= 0 ? '🚨' : daysRemaining <= 3 ? '⚠️' : '⏰';
  const statusText = daysRemaining <= 0 
    ? `*${Math.abs(daysRemaining)} days overdue!*` 
    : `*${daysRemaining} days remaining*`;

  const statusColor = daysRemaining <= 0 ? '#dc2626' : daysRemaining <= 3 ? '#f59e0b' : '#22c55e';

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${statusEmoji} Reminder`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${reminderText}*${reminderDescription ? `\n${reminderDescription}` : ''}`,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `📅 *Due Date:*\n${dueDate}`,
        },
        {
          type: 'mrkdwn',
          text: `⏰ *Status:*\n${statusText}`,
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
            text: '🔗 Open App',
            emoji: true,
          },
          action_id: 'open_app',
          url: appUrl,
        },
      ],
    },
  ];

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        channel: channelId,
        blocks,
        text: `${statusEmoji} Reminder: ${reminderText}`, // Fallback for notifications
      }),
    });

    const result = await response.json();
    
    if (!result.ok) {
      console.error('[SLACK INTERACTIVE] Error sending message:', result.error);
    }

    return result;
  } catch (error) {
    console.error('[SLACK INTERACTIVE] Error sending message:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Update the original message when completed
export async function updateMessageToCompleted(
  accessToken: string,
  channelId: string,
  messageTs: string,
  reminderText: string,
  completedByUserId: string
): Promise<{ ok: boolean; error?: string }> {
  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `~${reminderText}~\n\n✅ *Completed* by <@${completedByUserId}>`,
      },
    },
  ];

  try {
    const response = await fetch('https://slack.com/api/chat.update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        channel: channelId,
        ts: messageTs,
        blocks,
        text: `✅ Completed: ${reminderText}`,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error('[SLACK INTERACTIVE] Error updating message:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Verify Slack request signature for security
export function verifySlackRequest(
  signingSecret: string,
  requestBody: string,
  timestamp: string,
  signature: string
): boolean {
  // Check timestamp is recent (within 5 minutes)
  const requestTime = parseInt(timestamp, 10);
  const currentTime = Math.floor(Date.now() / 1000);
  
  if (Math.abs(currentTime - requestTime) > 300) {
    console.warn('[SLACK VERIFY] Request timestamp too old');
    return false;
  }

  // Compute expected signature
  const baseString = `v0:${timestamp}:${requestBody}`;
  const hmac = crypto.createHmac('sha256', signingSecret);
  hmac.update(baseString);
  const expectedSignature = `v0=${hmac.digest('hex')}`;

  // Compare signatures using timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  } catch (error) {
    console.error('[SLACK VERIFY] Error comparing signatures:', error);
    return false;
  }
}
