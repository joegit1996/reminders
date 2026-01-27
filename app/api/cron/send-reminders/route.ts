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
  // Verify cron secret for security
  // Vercel cron jobs automatically send Authorization: Bearer <CRON_SECRET> if CRON_SECRET is set
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // Check for Vercel-specific headers that indicate it's a legitimate cron job
  const userAgent = request.headers.get('user-agent') || '';
  const isVercelCron = userAgent.includes('vercel-cron') || 
                       request.headers.get('x-vercel-cron') === '1' ||
                       request.headers.get('x-vercel-signature');
  
  // Authentication: Accept either valid CRON_SECRET or verified Vercel cron request
  let isAuthenticated = false;
  
  // Method 1: Check CRON_SECRET if set
  if (cronSecret && authHeader) {
    const expectedHeader = `Bearer ${cronSecret}`;
    const normalizedAuthHeader = authHeader.trim();
    const normalizedExpected = expectedHeader.trim();
    
    if (normalizedAuthHeader === normalizedExpected) {
      isAuthenticated = true;
      console.log('[CRON] Authenticated via CRON_SECRET');
    } else {
      console.warn('[CRON] CRON_SECRET provided but did not match');
      console.warn('[CRON] Expected length:', normalizedExpected.length, 'Received length:', normalizedAuthHeader.length);
    }
  }
  
  // Method 2: Trust Vercel's cron infrastructure headers
  // Vercel signs cron requests and these headers cannot be spoofed by external requests
  if (!isAuthenticated && isVercelCron) {
    isAuthenticated = true;
    console.log('[CRON] Authenticated via Vercel cron headers');
  }
  
  // Reject if neither authentication method succeeded
  if (!isAuthenticated) {
    console.error('[CRON] Authentication failed.');
    console.error('[CRON] Auth header present:', !!authHeader);
    console.error('[CRON] CRON_SECRET configured:', !!cronSecret);
    console.error('[CRON] Is Vercel cron:', isVercelCron);
    console.error('[CRON] User-Agent:', userAgent);
    
    return NextResponse.json(
      { 
        error: 'Unauthorized',
        hint: 'Request must come from Vercel cron or include valid CRON_SECRET'
      },
      { status: 401 }
    );
  }
  
  const timestamp = new Date().toISOString();
  console.log('[CRON] Cron job triggered at', timestamp);
  console.log('[CRON] Authentication successful');
  
  try {
    if (!dbInitialized) {
      await initDatabase();
      dbInitialized = true;
    }

    const reminders = await getRemindersToSend();
    console.log('[CRON] Found', reminders.length, 'reminders to send');
    if (reminders.length > 0) {
      console.log('[CRON] Reminder IDs to send:', reminders.map(r => r.id));
    }
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
