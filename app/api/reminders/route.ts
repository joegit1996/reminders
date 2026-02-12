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
      scheduleType: rawScheduleType,
      scheduleConfig: rawScheduleConfig,
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

    // Derive schedule type and config (backward compat: if only periodDays sent, convert)
    const scheduleType = rawScheduleType || 'period_days';
    const scheduleConfig = rawScheduleConfig || { period_days: periodDays || 1 };

    // Validation
    if (!text || !dueDate) {
      return NextResponse.json(
        { error: 'Missing required fields (text, dueDate)' },
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

    // Validate schedule type and config
    const validScheduleTypes = ['period_days', 'days_of_week', 'days_of_month'];
    if (!validScheduleTypes.includes(scheduleType)) {
      return NextResponse.json(
        { error: `Invalid schedule type. Must be one of: ${validScheduleTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (scheduleType === 'period_days') {
      const pd = scheduleConfig.period_days;
      if (!pd || typeof pd !== 'number' || pd < 1) {
        return NextResponse.json(
          { error: 'period_days must be at least 1' },
          { status: 400 }
        );
      }
    } else if (scheduleType === 'days_of_week') {
      const days = scheduleConfig.days;
      if (!Array.isArray(days) || days.length === 0 || !days.every((d: unknown) => typeof d === 'number' && d >= 0 && d <= 6)) {
        return NextResponse.json(
          { error: 'days_of_week requires a non-empty array of integers 0-6' },
          { status: 400 }
        );
      }
    } else if (scheduleType === 'days_of_month') {
      const days = scheduleConfig.days;
      if (!Array.isArray(days) || days.length === 0 || !days.every((d: unknown) => typeof d === 'number' && d >= 1 && d <= 31)) {
        return NextResponse.json(
          { error: 'days_of_month requires a non-empty array of integers 1-31' },
          { status: 400 }
        );
      }
    }

    // Use periodDays from config for backward compat column
    const effectivePeriodDays = scheduleType === 'period_days' ? (scheduleConfig.period_days as number) : 1;

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

    // If using Slack channel, validate we have a connection
    let slackConnection = null;
    if (slackChannelId) {
      const { getSlackConnectionByUserId } = await import('@/lib/db');
      
      slackConnection = await getSlackConnectionByUserId(supabase, user.id);
      if (!slackConnection || !slackConnection.access_token) {
        return NextResponse.json(
          { error: 'Slack not connected. Please connect Slack in Settings.' },
          { status: 400 }
        );
      }
    }

    let reminder;
    try {
      reminder = await createReminder(
        supabase,
        user.id,
        text,
        dueDate,
        effectivePeriodDays,
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
        completionSlackChannelName || null,
        scheduleType,
        scheduleConfig
      );
    } catch (dbError) {
      console.error('[REMINDERS API] Database error creating reminder:', dbError);
      return NextResponse.json(
        { error: 'Failed to save reminder to database', details: String(dbError) },
        { status: 500 }
      );
    }
    
    // Send the Slack message with the actual reminder ID
    if (slackChannelId && slackConnection) {
      const { sendInteractiveReminder } = await import('@/lib/slack-interactive');
      const { differenceInDays, format } = await import('date-fns');
      
      const dueDateObj = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDateObj.setHours(0, 0, 0, 0);
      const daysRemaining = differenceInDays(dueDateObj, today);
      const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://reminders-liard.vercel.app';
      
      // Send with actual reminder ID so Mark Complete button works
      const sendResult = await sendInteractiveReminder({
        accessToken: slackConnection.access_token,
        userAccessToken: slackConnection.user_access_token,
        channelId: slackChannelId,
        reminderId: reminder.id,
        reminderText: text,
        reminderDescription: description || null,
        dueDate: format(dueDateObj, 'MMM dd, yyyy'),
        daysRemaining,
        appUrl,
      });
      
      if (sendResult.ok) {
        const { updateLastSent } = await import('@/lib/db');
        await updateLastSent(supabase, reminder.id);
      } else {
        console.error('[REMINDERS API] Failed to send Slack message:', sendResult.error);
        // Reminder was created, but message failed - don't delete, just warn
      }
    } else if (slackWebhook) {
      // Legacy webhook flow
      try {
        const { sendSlackReminder } = await import('@/lib/slack');
        const sent = await sendSlackReminder(reminder, supabase);
        if (sent) {
          const { updateLastSent } = await import('@/lib/db');
          await updateLastSent(supabase, reminder.id);
        } else {
          console.warn('[REMINDERS API] Failed to send Slack reminder via webhook');
        }
      } catch (slackError) {
        console.error('[REMINDERS API] Error sending Slack reminder:', slackError);
      }
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
