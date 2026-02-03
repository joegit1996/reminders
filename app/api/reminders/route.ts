import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  getAllReminders,
  createReminder,
} from '@/lib/db';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reminders = await getAllReminders(supabase);
    return NextResponse.json(reminders);
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reminders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      text, 
      description, 
      dueDate, 
      periodDays, 
      slackWebhook, 
      slackChannelId,
      slackChannelName,
      delayMessage, 
      delayWebhooks,
      delaySlackChannelId,
      delaySlackChannelName,
      automatedMessages, 
      completionMessage, 
      completionWebhook,
      completionSlackChannelId,
      completionSlackChannelName,
    } = body;

    // Validation - either webhook or channel is required
    if (!text || !dueDate || !periodDays) {
      return NextResponse.json(
        { error: 'Missing required fields (text, dueDate, periodDays)' },
        { status: 400 }
      );
    }

    // Either slack webhook or channel ID must be provided
    if (!slackWebhook && !slackChannelId) {
      return NextResponse.json(
        { error: 'Either webhook URL or Slack channel must be provided' },
        { status: 400 }
      );
    }

    if (periodDays < 1) {
      return NextResponse.json(
        { error: 'Period days must be at least 1' },
        { status: 400 }
      );
    }

    // Validate webhook URL format if provided
    if (slackWebhook && !slackWebhook.startsWith('https://hooks.slack.com/')) {
      return NextResponse.json(
        { error: 'Invalid Slack webhook URL' },
        { status: 400 }
      );
    }

    // Validate delay webhooks if provided
    if (delayWebhooks && Array.isArray(delayWebhooks)) {
      for (const webhook of delayWebhooks) {
        if (!webhook.startsWith('https://hooks.slack.com/')) {
          return NextResponse.json(
            { error: 'Invalid delay webhook URL' },
            { status: 400 }
          );
        }
      }
    }

    // Validate automated messages if provided
    if (automatedMessages && Array.isArray(automatedMessages)) {
      for (const msg of automatedMessages) {
        if (!msg.days_before || !msg.title || !msg.description) {
          return NextResponse.json(
            { error: 'Automated messages must have days_before, title, and description' },
            { status: 400 }
          );
        }
        // Either webhook_url or slack_channel_id must be provided
        if (!msg.webhook_url && !msg.slack_channel_id) {
          return NextResponse.json(
            { error: 'Automated messages must have either webhook_url or slack_channel_id' },
            { status: 400 }
          );
        }
        if (msg.webhook_url && !msg.webhook_url.startsWith('https://hooks.slack.com/')) {
          return NextResponse.json(
            { error: 'Invalid automated message webhook URL' },
            { status: 400 }
          );
        }
        if (msg.days_before < 1) {
          return NextResponse.json(
            { error: 'days_before must be at least 1' },
            { status: 400 }
          );
        }
      }
    }

    // Validate completion webhook if provided
    if (completionWebhook && !completionWebhook.startsWith('https://hooks.slack.com/')) {
      return NextResponse.json(
        { error: 'Invalid completion webhook URL' },
        { status: 400 }
      );
    }

    let reminder;
    try {
      reminder = await createReminder(
        supabase,
        user.id,
        text,
        dueDate,
        periodDays,
        slackWebhook || '',
        description || null,
        delayMessage || null,
        delayWebhooks || [],
        automatedMessages || [],
        completionMessage || null,
        completionWebhook || null,
        slackChannelId || null,
        slackChannelName || null,
        delaySlackChannelId || null,
        delaySlackChannelName || null,
        completionSlackChannelId || null,
        completionSlackChannelName || null
      );
    } catch (dbError) {
      console.error('[REMINDERS API] Database error creating reminder:', dbError);
      return NextResponse.json(
        { error: 'Failed to save reminder to database', details: String(dbError) },
        { status: 500 }
      );
    }
    
    // Send immediate reminder (don't fail the whole request if sending fails)
    try {
      const { sendSlackReminder } = await import('@/lib/slack');
      const sent = await sendSlackReminder(reminder, supabase);
      if (sent) {
        const { updateLastSent } = await import('@/lib/db');
        await updateLastSent(supabase, reminder.id);
      } else {
        console.warn('[REMINDERS API] Failed to send Slack reminder, but reminder was created');
      }
    } catch (slackError) {
      console.error('[REMINDERS API] Error sending Slack reminder:', slackError);
      // Don't fail the request - reminder was created successfully
    }

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    console.error('[REMINDERS API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to create reminder', details: String(error) },
      { status: 500 }
    );
  }
}
