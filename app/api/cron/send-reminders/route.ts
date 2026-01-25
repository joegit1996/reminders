import { NextRequest, NextResponse } from 'next/server';
import { 
  getRemindersToSend, 
  updateLastSent, 
  initDatabase,
  getAutomatedMessagesToSend,
  markAutomatedMessageSent,
} from '@/lib/db';
import { sendSlackReminder, sendAutomatedMessage } from '@/lib/slack';

let dbInitialized = false;

export async function GET(request: NextRequest) {
  // Verify cron secret for security (Vercel sets this header)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  try {
    if (!dbInitialized) {
      await initDatabase();
      dbInitialized = true;
    }

    const reminders = await getRemindersToSend();
    const results = [];

    // Send regular reminders
    for (const reminder of reminders) {
      try {
        const success = await sendSlackReminder(reminder);
        if (success) {
          await updateLastSent(reminder.id);
          results.push({ id: reminder.id, type: 'reminder', status: 'sent' });
        } else {
          results.push({ id: reminder.id, type: 'reminder', status: 'failed' });
        }
      } catch (error) {
        console.error(`Error sending reminder ${reminder.id}:`, error);
        results.push({ id: reminder.id, type: 'reminder', status: 'error' });
      }
    }

    // Send automated messages
    const automatedMessages = await getAutomatedMessagesToSend();
    for (const { reminder, automatedMessage } of automatedMessages) {
      try {
        const success = await sendAutomatedMessage(
          automatedMessage.title,
          automatedMessage.description,
          automatedMessage.webhook_url
        );
        if (success) {
          await markAutomatedMessageSent(reminder.id, automatedMessage.id);
          results.push({ 
            id: reminder.id, 
            type: 'automated_message', 
            messageId: automatedMessage.id,
            status: 'sent' 
          });
        } else {
          results.push({ 
            id: reminder.id, 
            type: 'automated_message', 
            messageId: automatedMessage.id,
            status: 'failed' 
          });
        }
      } catch (error) {
        console.error(`Error sending automated message ${automatedMessage.id} for reminder ${reminder.id}:`, error);
        results.push({ 
          id: reminder.id, 
          type: 'automated_message', 
          messageId: automatedMessage.id,
          status: 'error' 
        });
      }
    }

    return NextResponse.json({
      processed: reminders.length + automatedMessages.length,
      reminders: reminders.length,
      automatedMessages: automatedMessages.length,
      results,
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}
