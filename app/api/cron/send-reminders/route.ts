import { NextRequest, NextResponse } from 'next/server';
import { getRemindersToSend, updateLastSent, initDatabase } from '@/lib/db';
import { sendSlackReminder } from '@/lib/slack';

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

    for (const reminder of reminders) {
      try {
        const success = await sendSlackReminder(reminder);
        if (success) {
          await updateLastSent(reminder.id);
          results.push({ id: reminder.id, status: 'sent' });
        } else {
          results.push({ id: reminder.id, status: 'failed' });
        }
      } catch (error) {
        console.error(`Error sending reminder ${reminder.id}:`, error);
        results.push({ id: reminder.id, status: 'error' });
      }
    }

    return NextResponse.json({
      processed: reminders.length,
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
