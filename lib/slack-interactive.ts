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
  userAccessToken?: string | null;  // User token for sending as the user (appears in DMs, not Apps)
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
    userAccessToken,
    channelId,
    reminderId,
    reminderText,
    reminderDescription,
    dueDate,
    daysRemaining,
    appUrl,
  } = options;
  
  // Use user token for DMs so messages appear in regular chats, not Apps section
  const isUserDM = channelId.startsWith('U');
  const sendToken = (isUserDM && userAccessToken) ? userAccessToken : accessToken;

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
        text: 'Automated Message - Followup',
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
            text: '📋 Open App',
            emoji: true,
          },
          url: 'https://reminders-liard.vercel.app/',
        },
      ],
    },
  ];

  try {
    console.log('[SLACK INTERACTIVE] Sending to channel:', channelId, 'using', isUserDM && userAccessToken ? 'user token' : 'bot token');
    
    // For user IDs (U...), open a conversation first to get the DM channel
    let targetChannel = channelId;
    if (channelId.startsWith('U')) {
      console.log('[SLACK INTERACTIVE] Opening DM with user:', channelId);
      const openResponse = await fetch('https://slack.com/api/conversations.open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sendToken}`,
        },
        body: JSON.stringify({
          users: channelId,  // Single user ID as string
        }),
      });
      const openResult = await openResponse.json();
      console.log('[SLACK INTERACTIVE] conversations.open result:', JSON.stringify(openResult));
      
      if (openResult.ok && openResult.channel?.id) {
        targetChannel = openResult.channel.id;
        console.log('[SLACK INTERACTIVE] Opened DM channel:', targetChannel);
      } else {
        console.error('[SLACK INTERACTIVE] conversations.open failed:', openResult.error);
        return { ok: false, error: openResult.error || 'Failed to open DM conversation' };
      }
    }
    
    console.log('[SLACK INTERACTIVE] Posting message to:', targetChannel);
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sendToken}`,
      },
      body: JSON.stringify({
        channel: targetChannel,
        blocks,
        text: `${statusEmoji} Reminder: ${reminderText}`, // Fallback for notifications
      }),
    });

    const result = await response.json();
    console.log('[SLACK INTERACTIVE] chat.postMessage result:', JSON.stringify({ ok: result.ok, error: result.error, ts: result.ts }));
    
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

// Send a simple automated message via Slack API
export async function sendSlackApiMessage(
  accessToken: string,
  channelId: string,
  title: string,
  description: string
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📢 ${title}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: description,
      },
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
        text: `${title}: ${description}`,
      }),
    });

    const result = await response.json();
    
    if (!result.ok) {
      console.error('[SLACK API MESSAGE] Error sending message:', result.error);
    }

    return result;
  } catch (error) {
    console.error('[SLACK API MESSAGE] Error sending message:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Send a delay notification via Slack API
export async function sendDelayNotificationViaApi(
  accessToken: string,
  channelId: string,
  message: string,
  newDueDate: string
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '⏰ Due Date Updated',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${message}\n\n*New due date:* ${newDueDate}`,
      },
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
        text: `${message} - New due date: ${newDueDate}`,
      }),
    });

    const result = await response.json();
    
    if (!result.ok) {
      console.error('[SLACK DELAY NOTIFICATION] Error sending message:', result.error);
    }

    return result;
  } catch (error) {
    console.error('[SLACK DELAY NOTIFICATION] Error sending message:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Send a completion notification via Slack API
export async function sendCompletionNotificationViaApi(
  accessToken: string,
  channelId: string,
  reminderText: string,
  completionMessage: { title: string; description: string } | string
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  const title = typeof completionMessage === 'string' ? completionMessage : completionMessage.title;
  const description = typeof completionMessage === 'string' ? '' : completionMessage.description;

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `✅ ${title || 'Reminder Completed'}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Reminder:* ${reminderText}${description ? `\n\n${description}` : ''}`,
      },
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
        text: `✅ ${title || 'Reminder Completed'}: ${reminderText}`,
      }),
    });

    const result = await response.json();
    
    if (!result.ok) {
      console.error('[SLACK COMPLETION NOTIFICATION] Error sending message:', result.error);
    }

    return result;
  } catch (error) {
    console.error('[SLACK COMPLETION NOTIFICATION] Error sending message:', error);
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
