import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { 
  getRemindersToSend, 
  updateLastSent, 
  getAutomatedMessagesToSend,
  markAutomatedMessageSent,
  getAllSlackConnections,
  getSlackConnectionByUserId,
  Reminder,
} from '@/lib/db';
import { sendSlackReminder, sendAutomatedMessage } from '@/lib/slack';
import { sendInteractiveReminder, sendSlackApiMessage } from '@/lib/slack-interactive';
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  const userAgent = request.headers.get('user-agent') || '';
  const isVercelCron = userAgent.includes('vercel-cron') || 
                       request.headers.get('x-vercel-cron') === '1' ||
                       request.headers.get('x-vercel-signature');
  
  let isAuthenticated = false;
  
  if (cronSecret && authHeader) {
    const expectedHeader = `Bearer ${cronSecret}`;
    const normalizedAuthHeader = authHeader.trim();
    const normalizedExpected = expectedHeader.trim();
    
    if (normalizedAuthHeader === normalizedExpected) {
      isAuthenticated = true;
      console.log('[CRON] Authenticated via CRON_SECRET');
    } else {
      console.warn('[CRON] CRON_SECRET provided but did not match');
    }
  }
  
  if (!isAuthenticated && isVercelCron) {
    isAuthenticated = true;
    console.log('[CRON] Authenticated via Vercel cron headers');
  }
  
  if (!isAuthenticated) {
    console.error('[CRON] Authentication failed.');
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
  
  try {
    // Use service client to bypass RLS for cron jobs
    const supabase = createServiceClient();

    const reminders = await getRemindersToSend(supabase);
    console.log('[CRON] Found', reminders.length, 'reminders to send');
    if (reminders.length > 0) {
      console.log('[CRON] Reminder IDs to send:', reminders.map(r => r.id));
    }
    
    const results: Array<{
      id: number;
      type: string;
      status: string;
      method?: string;
      messageId?: string;
    }> = [];

    // Get all Slack connections for sending interactive messages
    const slackConnections = await getAllSlackConnections(supabase);
    const connectionsByUserId = new Map(
      slackConnections.map(conn => [conn.user_id, conn])
    );

    // Send regular reminders
    for (const reminder of reminders) {
      try {
        // Check if user has Slack connection with a default channel
        const connection = connectionsByUserId.get(reminder.user_id);
        
        if (connection && connection.default_channel_id && connection.access_token) {
          // Use interactive message via Slack API
          const channelId = reminder.slack_channel_id || connection.default_channel_id;
          
          // Calculate days remaining
          const dueDate = new Date(reminder.due_date);
          const today = new Date();
          dueDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          const daysRemaining = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          const result = await sendInteractiveReminder({
            accessToken: connection.access_token,
            channelId,
            reminderId: reminder.id,
            reminderText: reminder.text,
            reminderDescription: reminder.description,
            dueDate: format(dueDate, 'MMM dd, yyyy'),
            daysRemaining,
            appUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://reminders.vercel.app',
          });

          if (result.ok) {
            await updateLastSent(supabase, reminder.id);
            results.push({ id: reminder.id, type: 'reminder', status: 'sent', method: 'interactive' });
            console.log('[CRON] Sent interactive reminder:', reminder.id);
          } else {
            // Fallback to webhook if interactive fails
            console.warn('[CRON] Interactive message failed, falling back to webhook:', result.error);
            const webhookSuccess = await sendSlackReminder(reminder);
            if (webhookSuccess) {
              await updateLastSent(supabase, reminder.id);
              results.push({ id: reminder.id, type: 'reminder', status: 'sent', method: 'webhook' });
            } else {
              results.push({ id: reminder.id, type: 'reminder', status: 'failed', method: 'both' });
            }
          }
        } else {
          // No Slack connection or no default channel - use legacy webhook
          const success = await sendSlackReminder(reminder);
          if (success) {
            await updateLastSent(supabase, reminder.id);
            results.push({ id: reminder.id, type: 'reminder', status: 'sent', method: 'webhook' });
          } else {
            results.push({ id: reminder.id, type: 'reminder', status: 'failed', method: 'webhook' });
          }
        }
      } catch (error) {
        console.error(`[CRON] Error sending reminder ${reminder.id}:`, error);
        results.push({ id: reminder.id, type: 'reminder', status: 'error' });
      }
    }

    // Send automated messages - prefer Slack API with channel, fallback to webhooks
    const automatedMessages = await getAutomatedMessagesToSend(supabase);
    for (const { reminder, automatedMessage } of automatedMessages) {
      try {
        let success = false;
        let method = 'unknown';
        
        // Check if automated message has a Slack channel configured
        if (automatedMessage.slack_channel_id) {
          // Get user's Slack connection for the access token
          const connection = connectionsByUserId.get(reminder.user_id);
          if (connection?.access_token) {
            const result = await sendSlackApiMessage(
              connection.access_token,
              automatedMessage.slack_channel_id,
              automatedMessage.title,
              automatedMessage.description
            );
            success = result.ok;
            method = 'slack_api';
            if (!success) {
              console.warn(`[CRON] Slack API failed for automated message, trying webhook fallback:`, result.error);
            }
          }
        }
        
        // Fallback to webhook if Slack API didn't work or wasn't configured
        if (!success && automatedMessage.webhook_url) {
          success = await sendAutomatedMessage(
            automatedMessage.title,
            automatedMessage.description,
            automatedMessage.webhook_url
          );
          method = 'webhook';
        }
        
        if (success) {
          await markAutomatedMessageSent(supabase, reminder.id, automatedMessage.id);
          results.push({ 
            id: reminder.id, 
            type: 'automated_message', 
            messageId: automatedMessage.id,
            status: 'sent',
            method,
          });
        } else {
          results.push({ 
            id: reminder.id, 
            type: 'automated_message', 
            messageId: automatedMessage.id,
            status: 'failed',
            method,
          });
        }
      } catch (error) {
        console.error(`[CRON] Error sending automated message ${automatedMessage.id} for reminder ${reminder.id}:`, error);
        results.push({ 
          id: reminder.id, 
          type: 'automated_message', 
          messageId: automatedMessage.id,
          status: 'error' 
        });
      }
    }

    // Summary statistics
    const interactiveSent = results.filter(r => r.method === 'interactive' && r.status === 'sent').length;
    const webhookSent = results.filter(r => r.method === 'webhook' && r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed' || r.status === 'error').length;

    return NextResponse.json({
      processed: reminders.length + automatedMessages.length,
      reminders: reminders.length,
      automatedMessages: automatedMessages.length,
      stats: {
        interactiveSent,
        webhookSent,
        failed,
      },
      results,
    });
  } catch (error) {
    console.error('[CRON] Error in cron job:', error);
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}
