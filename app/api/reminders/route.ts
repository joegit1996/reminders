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
      delayMessage, 
      delayWebhooks, 
      automatedMessages, 
      completionMessage, 
      completionWebhook,
      slackChannelId 
    } = body;

    // Validation
    if (!text || !dueDate || !periodDays || !slackWebhook) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (periodDays < 1) {
      return NextResponse.json(
        { error: 'Period days must be at least 1' },
        { status: 400 }
      );
    }

    // Validate webhook URL format
    if (!slackWebhook.startsWith('https://hooks.slack.com/')) {
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
        if (!msg.days_before || !msg.title || !msg.description || !msg.webhook_url) {
          return NextResponse.json(
            { error: 'Automated messages must have days_before, title, description, and webhook_url' },
            { status: 400 }
          );
        }
        if (!msg.webhook_url.startsWith('https://hooks.slack.com/')) {
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

    const reminder = await createReminder(
      supabase,
      user.id,
      text,
      dueDate,
      periodDays,
      slackWebhook,
      description || null,
      delayMessage || null,
      delayWebhooks || [],
      automatedMessages || [],
      completionMessage || null,
      completionWebhook || null,
      slackChannelId || null
    );
    
    // Send immediate reminder
    const { sendSlackReminder } = await import('@/lib/slack');
    await sendSlackReminder(reminder);
    const { updateLastSent } = await import('@/lib/db');
    await updateLastSent(supabase, reminder.id);

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    console.error('Error creating reminder:', error);
    return NextResponse.json(
      { error: 'Failed to create reminder' },
      { status: 500 }
    );
  }
}
