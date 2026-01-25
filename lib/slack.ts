import { differenceInDays, format } from 'date-fns';
import { Reminder } from './db';

export async function sendSlackReminder(reminder: Reminder): Promise<boolean> {
  try {
    const dueDate = new Date(reminder.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const daysRemaining = differenceInDays(dueDate, today);
    
    const message = {
      text: reminder.text,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${reminder.text}*\n\n📅 Due: ${format(dueDate, 'MMM dd, yyyy')}\n⏰ Days remaining: ${daysRemaining >= 0 ? daysRemaining : `-${Math.abs(daysRemaining)} (overdue)`}`,
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
