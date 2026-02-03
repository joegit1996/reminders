import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  getReminderById,
  markReminderComplete,
  updateReminderDueDate,
} from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = parseInt(params.id);
    const reminder = await getReminderById(supabase, id);

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
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = parseInt(params.id);
    const body = await request.json();
    const { action, dueDate, delayMessage, delayWebhooks, completionMessage, completionWebhook } = body;

    if (action === 'complete') {
      const reminder = await markReminderComplete(supabase, id);
      return NextResponse.json(reminder);
    }

    if (action === 'update-due-date') {
      if (!dueDate) {
        return NextResponse.json(
          { error: 'dueDate is required' },
          { status: 400 }
        );
      }

      const result = await updateReminderDueDate(supabase, id, dueDate);
      return NextResponse.json(result);
    }

    if (action === 'update-delay-config') {
      const { delaySlackChannelId, delaySlackChannelName } = body;
      
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

      const reminder = await getReminderById(supabase, id);
      if (!reminder) {
        return NextResponse.json(
          { error: 'Reminder not found' },
          { status: 404 }
        );
      }

      const { data: updatedReminder, error } = await supabase
        .from('reminders')
        .update({
          delay_message: delayMessage || null,
          delay_webhooks: delayWebhooks || [],
          delay_slack_channel_id: delaySlackChannelId || null,
          delay_slack_channel_name: delaySlackChannelName || null,
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

      const reminder = await getReminderById(supabase, id);
      if (!reminder) {
        return NextResponse.json(
          { error: 'Reminder not found' },
          { status: 404 }
        );
      }

      const { data: updatedReminder, error } = await supabase
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

    if (action === 'update-completion-config') {
      const { completionSlackChannelId, completionSlackChannelName } = body;
      
      // Validate completion webhook if provided
      if (completionWebhook && !completionWebhook.startsWith('https://hooks.slack.com/')) {
        return NextResponse.json(
          { error: 'Invalid completion webhook URL' },
          { status: 400 }
        );
      }

      const reminder = await getReminderById(supabase, id);
      if (!reminder) {
        return NextResponse.json(
          { error: 'Reminder not found' },
          { status: 404 }
        );
      }

      const { data: updatedReminder, error } = await supabase
        .from('reminders')
        .update({
          completion_message: completionMessage || null,
          completion_webhook: completionWebhook || null,
          completion_slack_channel_id: completionSlackChannelId || null,
          completion_slack_channel_name: completionSlackChannelName || null,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = parseInt(params.id);
    const reminder = await getReminderById(supabase, id);

    if (!reminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return NextResponse.json(
      { error: 'Failed to delete reminder' },
      { status: 500 }
    );
  }
}
