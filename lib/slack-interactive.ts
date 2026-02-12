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

  // Prefer user token so messages appear in regular chats (not Apps section)
  // Messages sent with user token show as coming from the user, not the app
  const sendToken = userAccessToken || accessToken;

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
  ];

  try {
    console.log('[SLACK INTERACTIVE] Sending to channel:', channelId, 'using', userAccessToken ? 'user token' : 'bot token');
    
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
        text: `Followup: ${reminderText}; confirm what you understood you will do`, // Fallback for notifications
      }),
    });

    const result = await response.json();
    console.log('[SLACK INTERACTIVE] chat.postMessage result:', JSON.stringify({ ok: result.ok, error: result.error, ts: result.ts }));

    if (!result.ok) {
      console.error('[SLACK INTERACTIVE] Error sending message:', result.error);

      // If user token failed, retry with bot token for channels where bot is a member
      if ((result.error === 'channel_not_found' || result.error === 'not_in_channel') &&
          sendToken === userAccessToken && accessToken !== userAccessToken) {
        console.log('[SLACK INTERACTIVE] Retrying with bot token');
        const retryResponse = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            channel: targetChannel,
            blocks,
            text: `Followup: ${reminderText}; confirm what you understood you will do`,
          }),
        });

        const retryResult = await retryResponse.json();
        console.log('[SLACK INTERACTIVE] Retry with bot token result:', JSON.stringify({ ok: retryResult.ok, error: retryResult.error, ts: retryResult.ts }));

        if (retryResult.ok) {
          return retryResult;
        }
        console.error('[SLACK INTERACTIVE] Retry with bot token also failed:', retryResult.error);
      }
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
  description: string,
  userAccessToken?: string | null
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  // Prefer user token so messages appear in regular chats (not Apps section)
  const sendToken = userAccessToken || accessToken;

  // Resolve channel ID (handles user IDs for DMs)
  const resolved = await resolveChannelId(sendToken, channelId);
  if (!resolved.ok) {
    console.error('[SLACK API MESSAGE] Failed to resolve channel:', resolved.error);
    return { ok: false, error: resolved.error };
  }
  const targetChannel = resolved.channelId;

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
        text: `*${title}*${description ? `\n\n${description}` : ''}`,
      },
    },
    {
      type: 'actions',
      elements: [
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
  ];

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sendToken}`,
      },
      body: JSON.stringify({
        channel: targetChannel,
        blocks,
        text: `Followup: ${title}`,
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
  newDueDate: string,
  userAccessToken?: string | null
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  // Prefer user token so messages appear in regular chats (not Apps section)
  const sendToken = userAccessToken || accessToken;

  // Resolve channel ID (handles user IDs for DMs)
  const resolved = await resolveChannelId(sendToken, channelId);
  if (!resolved.ok) {
    console.error('[SLACK DELAY NOTIFICATION] Failed to resolve channel:', resolved.error);
    return { ok: false, error: resolved.error };
  }
  const targetChannel = resolved.channelId;

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
        text: `${message}\n\n*New due date:* ${newDueDate}`,
      },
    },
    {
      type: 'actions',
      elements: [
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
  ];

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sendToken}`,
      },
      body: JSON.stringify({
        channel: targetChannel,
        blocks,
        text: `Followup: ${message}`,
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
  completionMessage: { title: string; description: string } | string,
  userAccessToken?: string | null
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  // Prefer user token so messages appear in regular chats (not Apps section)
  const sendToken = userAccessToken || accessToken;

  // Resolve channel ID (handles user IDs for DMs)
  const resolved = await resolveChannelId(sendToken, channelId);
  if (!resolved.ok) {
    console.error('[SLACK COMPLETION NOTIFICATION] Failed to resolve channel:', resolved.error);
    return { ok: false, error: resolved.error };
  }
  const targetChannel = resolved.channelId;

  const title = typeof completionMessage === 'string' ? completionMessage : completionMessage.title;
  const description = typeof completionMessage === 'string' ? '' : completionMessage.description;

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
        text: `*${title || 'Reminder Completed'}*${description ? `\n\n${description}` : ''}`,
      },
    },
    {
      type: 'actions',
      elements: [
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
  ];

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sendToken}`,
      },
      body: JSON.stringify({
        channel: targetChannel,
        blocks,
        text: `Followup: ${title || 'Reminder Completed'}`,
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

// Send a nudge reply as a thread under the original reminder message
export async function sendNudgeReply(options: {
  accessToken: string;
  userAccessToken?: string | null;
  channelId: string;
  threadTs: string;
  reminderId: number;
  reminderText: string;
}): Promise<{ ok: boolean; ts?: string; error?: string }> {
  const { accessToken, userAccessToken, channelId, threadTs, reminderId, reminderText } = options;
  const sendToken = userAccessToken || accessToken;

  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `⏰ *Nudge:* This reminder is closing in on its due date. Would you like to set a new due date?\n\n_Ignore if still on track._`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '✅ Complete Task',
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
      ],
    },
  ];

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sendToken}`,
      },
      body: JSON.stringify({
        channel: channelId,
        thread_ts: threadTs,
        blocks,
        text: `Nudge: ${reminderText} is closing in on its due date.`,
      }),
    });

    const result = await response.json();
    if (!result.ok) {
      console.error('[SLACK NUDGE] Error sending nudge:', result.error);
    }
    return result;
  } catch (error) {
    console.error('[SLACK NUDGE] Error sending nudge:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Helper to resolve channel ID - opens DM if channel is a user ID
async function resolveChannelId(
  accessToken: string,
  channelId: string
): Promise<{ ok: boolean; channelId: string; error?: string }> {
  if (!channelId.startsWith('U')) {
    return { ok: true, channelId };
  }

  // For user IDs, open a conversation first to get the DM channel
  try {
    const openResponse = await fetch('https://slack.com/api/conversations.open', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        users: channelId,
      }),
    });
    const openResult = await openResponse.json();

    if (openResult.ok && openResult.channel?.id) {
      return { ok: true, channelId: openResult.channel.id };
    }
    return { ok: false, channelId, error: openResult.error || 'Failed to open DM conversation' };
  } catch (error) {
    return { ok: false, channelId, error: error instanceof Error ? error.message : 'Unknown error' };
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
