import { NextRequest, NextResponse } from 'next/server';
import {
  getReminderById,
  markReminderComplete,
  updateReminderDueDate,
  initDatabase,
} from '@/lib/db';

let dbInitialized = false;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!dbInitialized) {
      await initDatabase();
      dbInitialized = true;
    }

    const id = parseInt(params.id);
    const reminder = await getReminderById(id);

    if (!reminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(reminder);
  } catch (error) {
    console.error('Error fetching reminder:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reminder' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!dbInitialized) {
      await initDatabase();
      dbInitialized = true;
    }

    const id = parseInt(params.id);
    const body = await request.json();
    const { action, dueDate, delayMessage, delayWebhooks } = body;

    if (action === 'complete') {
      const reminder = await markReminderComplete(id);
      return NextResponse.json(reminder);
    }

    if (action === 'update-due-date') {
      if (!dueDate) {
        return NextResponse.json(
          { error: 'dueDate is required' },
          { status: 400 }
        );
      }

      const result = await updateReminderDueDate(id, dueDate);
      return NextResponse.json(result);
    }

    if (action === 'update-delay-config') {
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

      const { getReminderById } = await import('@/lib/db');
      const reminder = await getReminderById(id);
      if (!reminder) {
        return NextResponse.json(
          { error: 'Reminder not found' },
          { status: 404 }
        );
      }

      const { data: updatedReminder, error } = await (await import('@/lib/supabase')).supabase
        .from('reminders')
        .update({
          delay_message: delayMessage || null,
          delay_webhooks: delayWebhooks || [],
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(updatedReminder);
    }

    if (action === 'update-automated-messages') {
      const { automatedMessages } = body;

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

      const { getReminderById } = await import('@/lib/db');
      const reminder = await getReminderById(id);
      if (!reminder) {
        return NextResponse.json(
          { error: 'Reminder not found' },
          { status: 404 }
        );
      }

      const { data: updatedReminder, error } = await (await import('@/lib/supabase')).supabase
        .from('reminders')
        .update({
          automated_messages: automatedMessages || [],
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(updatedReminder);
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating reminder:', error);
    return NextResponse.json(
      { error: 'Failed to update reminder' },
      { status: 500 }
    );
  }
}
