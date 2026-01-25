import { NextRequest, NextResponse } from 'next/server';
import {
  getAllReminders,
  createReminder,
  initDatabase,
} from '@/lib/db';

// Initialize database on first request
let dbInitialized = false;

export async function GET() {
  try {
    if (!dbInitialized) {
      await initDatabase();
      dbInitialized = true;
    }
    const reminders = await getAllReminders();
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
    if (!dbInitialized) {
      await initDatabase();
      dbInitialized = true;
    }

    const body = await request.json();
    const { text, description, dueDate, periodDays, slackWebhook, delayMessage, delayWebhooks } = body;

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

    const reminder = await createReminder(
      text,
      dueDate,
      periodDays,
      slackWebhook,
      description || null,
      delayMessage || null,
      delayWebhooks || []
    );
    
    // Send immediate reminder
    const { sendSlackReminder } = await import('@/lib/slack');
    await sendSlackReminder(reminder);
    const { updateLastSent } = await import('@/lib/db');
    await updateLastSent(reminder.id);

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    console.error('Error creating reminder:', error);
    return NextResponse.json(
      { error: 'Failed to create reminder' },
      { status: 500 }
    );
  }
}
