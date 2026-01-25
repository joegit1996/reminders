import { differenceInDays, format } from 'date-fns';
import { Reminder } from './db';

export async function sendSlackReminder(reminder: Reminder): Promise<boolean> {
  try {
    const dueDate = new Date(reminder.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const daysRemaining = differenceInDays(dueDate, today);
    
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

  // Replace DD.MM.YYYY placeholder with actual date
  const message = messageTemplate.replace(/DD\.MM\.YYYY/g, formattedDate);

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
