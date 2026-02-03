import { differenceInDays, format } from 'date-fns';
import { Reminder, getSlackConnectionByUserId } from './db';
import { sendInteractiveReminder } from './slack-interactive';
import { createServiceClient } from './supabase-server';

export async function sendSlackReminder(reminder: Reminder): Promise<boolean> {
  try {
    const dueDate = new Date(reminder.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const daysRemaining = differenceInDays(dueDate, today);
    
    // If we have a channel ID, use the Slack API
    if (reminder.slack_channel_id && reminder.user_id) {
      const supabase = createServiceClient();
      const connection = await getSlackConnectionByUserId(supabase, reminder.user_id);
      
      if (!connection || !connection.access_token) {
        console.error('[SLACK] No Slack connection found for user:', reminder.user_id);
        return false;
      }
      
      const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://reminders-liard.vercel.app';
      
      const result = await sendInteractiveReminder({
        accessToken: connection.access_token,
        channelId: reminder.slack_channel_id,
        reminderId: reminder.id,
        reminderText: reminder.text,
        reminderDescription: reminder.description,
        dueDate: format(dueDate, 'MMM dd, yyyy'),
        daysRemaining,
        appUrl,
      });
      
      if (!result.ok) {
        console.error('[SLACK] Failed to send interactive reminder:', result.error);
        return false;
      }
      
      return true;
    }
    
    // Fallback to webhook if no channel ID (legacy support)
    if (!reminder.slack_webhook) {
      console.error('[SLACK] No channel ID or webhook configured for reminder:', reminder.id);
      return false;
    }
    
    let messageText = `*${reminder.text}*\n\n`;
    if (reminder.description) {
      messageText += `${reminder.description}\n\n`;
    }
    messageText += `📅 Due: ${format(dueDate, 'MMM dd, yyyy')}\n⏰ Days remaining: ${daysRemaining >= 0 ? daysRemaining : `-${Math.abs(daysRemaining)} (overdue)`}`;
    
    const message = {
      text: reminder.text,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: messageText,
          },
        },
      ],
    };

    const response = await fetch(reminder.slack_webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Slack API error: ${response.status} - ${errorText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending Slack reminder:', error);
    return false;
  }
}

// Send delay message to webhooks
export async function sendDelayMessage(
  messageTemplate: string,
  newDueDate: string,
  webhookUrls: string[]
): Promise<{ sent: number; failed: number }> {
  // Format date as DD.MM.YYYY
  const dateObj = new Date(newDueDate);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const formattedDate = `${day}.${month}.${year}`;

  // Automatically append the new due date to the message
  const message = `${messageTemplate}\n\nNew expected due date: ${formattedDate}`;

  const results = { sent: 0, failed: 0 };

  for (const webhookUrl of webhookUrls) {
    try {
      const slackMessage = {
        text: message,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: message,
            },
          },
        ],
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackMessage),
      });

      if (response.ok) {
        results.sent++;
      } else {
        console.error(`Failed to send delay message to ${webhookUrl}: ${response.status}`);
        results.failed++;
      }
    } catch (error) {
      console.error(`Error sending delay message to ${webhookUrl}:`, error);
      results.failed++;
    }
  }

  return results;
}

// Send automated message
export async function sendAutomatedMessage(
  title: string,
  description: string,
  webhookUrl: string
): Promise<boolean> {
  try {
    const message = {
      text: title,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${title}*\n\n${description}`,
          },
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Slack API error: ${response.status} - ${errorText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending automated message:', error);
    return false;
  }
}

// Send completion message to webhook
export async function sendCompletionMessage(
  reminderText: string,
  completionMessage: { title: string; description: string } | string,
  webhookUrl: string
): Promise<boolean> {
  try {
    // Handle both old string format and new object format
    let title: string;
    let description: string;
    
    if (typeof completionMessage === 'string') {
      title = `Reminder Completed: ${reminderText}`;
      description = completionMessage;
    } else {
      title = completionMessage.title || `Reminder Completed: ${reminderText}`;
      description = completionMessage.description || '';
    }
    
    const messageText = `✅ *${title}*${description ? `\n\n${description}` : ''}`;
    
    const message = {
      text: title,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: messageText,
          },
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Slack API error: ${response.status} - ${errorText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending completion message:', error);
    return false;
  }
}
