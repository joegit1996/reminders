import { SupabaseClient } from '@supabase/supabase-js';

export interface AutomatedMessage {
  id: string; // Unique ID for this automated message
  days_before: number;
  title: string;
  description: string;
  webhook_url: string;
  slack_channel_id: string | null;
  slack_channel_name: string | null;
  sent: boolean;
  sent_at: string | null;
}

export interface Reminder {
  id: number;
  user_id: string;
  text: string;
  description: string | null;
  due_date: string;
  period_days: number;
  slack_webhook: string;
  slack_channel_id: string | null;
  slack_channel_name: string | null;
  delay_message: string | null;
  delay_webhooks: string[];
  delay_slack_channel_id: string | null;
  delay_slack_channel_name: string | null;
  automated_messages: AutomatedMessage[];
  completion_message: { title: string; description: string } | string | null;
  completion_webhook: string | null;
  completion_slack_channel_id: string | null;
  completion_slack_channel_name: string | null;
  is_complete: boolean;
  completed_at: string | null;
  days_remaining_at_completion: number | null;
  last_sent: string | null;
  created_at: string;
}

export interface SavedWebhook {
  id: number;
  user_id: string;
  name: string;
  webhook_url: string;
  created_at: string;
}

export interface DueDateUpdateLog {
  id: number;
  reminder_id: number;
  old_due_date: string;
  new_due_date: string;
  updated_at: string;
}

export interface SlackConnection {
  id: number;
  user_id: string;
  team_id: string;
  team_name: string | null;
  access_token: string;
  user_access_token: string | null;  // User token for reading conversations
  bot_user_id: string | null;
  default_channel_id: string | null;
  default_channel_name: string | null;
  created_at: string;
}

// Initialize database tables
// Note: Tables should be created via Supabase SQL Editor using migrations
export async function initDatabase() {
  console.log('Database tables should be created via Supabase SQL Editor');
}

// =====================================================
// REMINDER FUNCTIONS
// =====================================================

// Get all active reminders for the authenticated user
export async function getActiveReminders(supabase: SupabaseClient): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('is_complete', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Reminder[];
}

// Get all reminders for the authenticated user (including completed)
export async function getAllReminders(supabase: SupabaseClient): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Reminder[];
}

// Get reminder by ID (RLS ensures user can only access their own)
export async function getReminderById(supabase: SupabaseClient, id: number): Promise<Reminder | null> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data as Reminder;
}

// Create a new reminder
export async function createReminder(
  supabase: SupabaseClient,
  userId: string,
  text: string,
  dueDate: string,
  periodDays: number,
  slackWebhook: string,
  description?: string | null,
  delayMessage?: string | null,
  delayWebhooks?: string[],
  automatedMessages?: AutomatedMessage[],
  completionMessage?: { title: string; description: string } | string | null,
  completionWebhook?: string | null,
  slackChannelId?: string | null,
  slackChannelName?: string | null,
  delaySlackChannelId?: string | null,
  delaySlackChannelName?: string | null,
  completionSlackChannelId?: string | null,
  completionSlackChannelName?: string | null
): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .insert({
      user_id: userId,
      text,
      description: description || null,
      due_date: dueDate,
      period_days: periodDays,
      slack_webhook: slackWebhook,
      slack_channel_id: slackChannelId || null,
      slack_channel_name: slackChannelName || null,
      delay_message: delayMessage || null,
      delay_webhooks: delayWebhooks || [],
      delay_slack_channel_id: delaySlackChannelId || null,
      delay_slack_channel_name: delaySlackChannelName || null,
      automated_messages: automatedMessages || [],
      completion_message: completionMessage || null,
      completion_webhook: completionWebhook || null,
      completion_slack_channel_id: completionSlackChannelId || null,
      completion_slack_channel_name: completionSlackChannelName || null,
      is_complete: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Reminder;
}

// Update reminder due date
export async function updateReminderDueDate(
  supabase: SupabaseClient,
  id: number,
  newDueDate: string
): Promise<{ reminder: Reminder; log: DueDateUpdateLog; delayMessageSent: boolean }> {
  // Get current reminder
  const reminder = await getReminderById(supabase, id);
  if (!reminder) {
    throw new Error('Reminder not found');
  }

  const oldDueDate = reminder.due_date;

  // Update reminder
  const { data: updatedReminder, error: updateError } = await supabase
    .from('reminders')
    .update({ due_date: newDueDate })
    .eq('id', id)
    .select()
    .single();

  if (updateError) throw updateError;

  // Log the update
  const { data: log, error: logError } = await supabase
    .from('due_date_update_logs')
    .insert({
      reminder_id: id,
      old_due_date: oldDueDate,
      new_due_date: newDueDate,
    })
    .select()
    .single();

  if (logError) throw logError;

  // Send delay message if configured
  let delayMessageSent = false;
  
  // First, try to send via Slack API if channel is configured
  if (updatedReminder.delay_message && updatedReminder.delay_slack_channel_id) {
    try {
      // Get user's Slack connection for the access token
      const connection = await getSlackConnectionByUserId(supabase, updatedReminder.user_id);
      if (connection?.access_token) {
        const { sendDelayNotificationViaApi } = await import('./slack-interactive');
        const result = await sendDelayNotificationViaApi(
          connection.access_token,
          updatedReminder.delay_slack_channel_id,
          updatedReminder.delay_message,
          newDueDate
        );
        delayMessageSent = result.ok;
      }
    } catch (error) {
      console.error('Error sending delay message via Slack API:', error);
    }
  }
  
  // Fallback to webhooks if Slack API didn't work or wasn't configured
  if (!delayMessageSent && updatedReminder.delay_message && updatedReminder.delay_webhooks && updatedReminder.delay_webhooks.length > 0) {
    const { sendDelayMessage } = await import('./slack');
    const results = await sendDelayMessage(
      updatedReminder.delay_message,
      newDueDate,
      updatedReminder.delay_webhooks
    );
    delayMessageSent = results.sent > 0;
  }

  // Reset automated messages sent status when due date is updated
  if (updatedReminder.automated_messages && Array.isArray(updatedReminder.automated_messages)) {
    const resetMessages = updatedReminder.automated_messages.map((msg: AutomatedMessage) => ({
      ...msg,
      sent: false,
      sent_at: null,
    }));

    await supabase
      .from('reminders')
      .update({ automated_messages: resetMessages })
      .eq('id', id);
  }

  return {
    reminder: updatedReminder as Reminder,
    log: log as DueDateUpdateLog,
    delayMessageSent,
  };
}

// Mark reminder as complete
export async function markReminderComplete(supabase: SupabaseClient, id: number): Promise<Reminder> {
  // Get the reminder first to check for completion webhook
  const reminder = await getReminderById(supabase, id);
  if (!reminder) {
    throw new Error('Reminder not found');
  }

  // Calculate days remaining at completion time
  const dueDate = new Date(reminder.due_date);
  const today = new Date();
  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const daysRemaining = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const { data, error } = await supabase
    .from('reminders')
    .update({ 
      is_complete: true,
      completed_at: new Date().toISOString(),
      days_remaining_at_completion: daysRemaining
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Send completion message if configured
  let completionSent = false;
  
  // First, try to send via Slack API if channel is configured
  if (reminder.completion_message && reminder.completion_slack_channel_id) {
    try {
      // Get user's Slack connection for the access token
      const connection = await getSlackConnectionByUserId(supabase, reminder.user_id);
      if (connection?.access_token) {
        const { sendCompletionNotificationViaApi } = await import('./slack-interactive');
        const result = await sendCompletionNotificationViaApi(
          connection.access_token,
          reminder.completion_slack_channel_id,
          reminder.text,
          reminder.completion_message
        );
        completionSent = result.ok;
      }
    } catch (error) {
      console.error('Error sending completion message via Slack API:', error);
    }
  }
  
  // Fallback to webhook if Slack API didn't work or wasn't configured
  if (!completionSent && reminder.completion_message && reminder.completion_webhook) {
    try {
      const { sendCompletionMessage } = await import('./slack');
      const completionMsg = typeof reminder.completion_message === 'string'
        ? reminder.completion_message
        : reminder.completion_message;
      await sendCompletionMessage(
        reminder.text,
        completionMsg,
        reminder.completion_webhook
      );
    } catch (error) {
      console.error('Error sending completion message:', error);
    }
  }

  return data as Reminder;
}

// Update last_sent timestamp
export async function updateLastSent(supabase: SupabaseClient, id: number): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .update({ last_sent: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// Get reminders that need to be sent (for cron job - uses service client)
export async function getRemindersToSend(supabase: SupabaseClient): Promise<Reminder[]> {
  const now = new Date();
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('is_complete', false);

  if (error) throw error;

  // Filter reminders that need to be sent
  const remindersToSend = (data as Reminder[]).filter((reminder) => {
    if (!reminder.last_sent) return true; // Never sent

    const lastSent = new Date(reminder.last_sent);
    
    const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const lastSentUTC = Date.UTC(lastSent.getUTCFullYear(), lastSent.getUTCMonth(), lastSent.getUTCDate());
    const calendarDaysSinceLastSent = Math.floor((nowUTC - lastSentUTC) / (1000 * 60 * 60 * 24));

    return calendarDaysSinceLastSent >= reminder.period_days;
  });

  return remindersToSend;
}

// Get automated messages that need to be sent (for cron job)
export async function getAutomatedMessagesToSend(supabase: SupabaseClient): Promise<Array<{ reminder: Reminder; automatedMessage: AutomatedMessage }>> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('is_complete', false);

  if (error) throw error;

  const messagesToSend: Array<{ reminder: Reminder; automatedMessage: AutomatedMessage }> = [];

  for (const reminder of data as Reminder[]) {
    if (!reminder.automated_messages || !Array.isArray(reminder.automated_messages)) continue;

    const dueDate = new Date(reminder.due_date);
    dueDate.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    for (const automatedMessage of reminder.automated_messages) {
      if (
        !automatedMessage.sent &&
        daysUntilDue === automatedMessage.days_before &&
        daysUntilDue >= automatedMessage.days_before
      ) {
        messagesToSend.push({ reminder, automatedMessage });
      }
    }
  }

  return messagesToSend;
}

// Mark automated message as sent
export async function markAutomatedMessageSent(
  supabase: SupabaseClient,
  reminderId: number,
  automatedMessageId: string
): Promise<void> {
  const reminder = await getReminderById(supabase, reminderId);
  if (!reminder) throw new Error('Reminder not found');

  const updatedMessages = reminder.automated_messages.map((msg: AutomatedMessage) => {
    if (msg.id === automatedMessageId) {
      return {
        ...msg,
        sent: true,
        sent_at: new Date().toISOString(),
      };
    }
    return msg;
  });

  const { error } = await supabase
    .from('reminders')
    .update({ automated_messages: updatedMessages })
    .eq('id', reminderId);

  if (error) throw error;
}

// Get update logs for a reminder
export async function getUpdateLogs(supabase: SupabaseClient, reminderId: number): Promise<DueDateUpdateLog[]> {
  const { data, error } = await supabase
    .from('due_date_update_logs')
    .select('*')
    .eq('reminder_id', reminderId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as DueDateUpdateLog[];
}

// =====================================================
// SAVED WEBHOOKS FUNCTIONS
// =====================================================

export async function getAllSavedWebhooks(supabase: SupabaseClient): Promise<SavedWebhook[]> {
  const { data, error } = await supabase
    .from('saved_webhooks')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as SavedWebhook[];
}

export async function createSavedWebhook(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  webhookUrl: string
): Promise<SavedWebhook> {
  const { data, error } = await supabase
    .from('saved_webhooks')
    .insert({
      user_id: userId,
      name,
      webhook_url: webhookUrl,
    })
    .select()
    .single();

  if (error) throw error;
  return data as SavedWebhook;
}

export async function updateSavedWebhook(
  supabase: SupabaseClient,
  id: number,
  name: string,
  webhookUrl: string
): Promise<SavedWebhook> {
  const { data, error } = await supabase
    .from('saved_webhooks')
    .update({
      name,
      webhook_url: webhookUrl,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as SavedWebhook;
}

export async function deleteSavedWebhook(supabase: SupabaseClient, id: number): Promise<void> {
  const { error } = await supabase
    .from('saved_webhooks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// SLACK CONNECTION FUNCTIONS
// =====================================================

export async function getSlackConnection(supabase: SupabaseClient): Promise<SlackConnection | null> {
  const { data, error } = await supabase
    .from('slack_connections')
    .select('*')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data as SlackConnection;
}

export async function getSlackConnectionByUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<SlackConnection | null> {
  const { data, error } = await supabase
    .from('slack_connections')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as SlackConnection;
}

export async function getSlackConnectionByTeamId(
  supabase: SupabaseClient,
  teamId: string
): Promise<SlackConnection | null> {
  const { data, error } = await supabase
    .from('slack_connections')
    .select('*')
    .eq('team_id', teamId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as SlackConnection;
}

export async function upsertSlackConnection(
  supabase: SupabaseClient,
  userId: string,
  teamId: string,
  teamName: string | null,
  accessToken: string,
  botUserId: string | null,
  userAccessToken: string | null = null
): Promise<SlackConnection> {
  const upsertData: Record<string, unknown> = {
    user_id: userId,
    team_id: teamId,
    team_name: teamName,
    access_token: accessToken,
    bot_user_id: botUserId,
  };
  
  // Only include user_access_token if provided
  if (userAccessToken) {
    upsertData.user_access_token = userAccessToken;
  }
  
  const { data, error } = await supabase
    .from('slack_connections')
    .upsert(upsertData, {
      onConflict: 'user_id',
    })
    .select()
    .single();

  if (error) throw error;
  return data as SlackConnection;
}

export async function updateSlackConnectionChannel(
  supabase: SupabaseClient,
  channelId: string,
  channelName: string
): Promise<SlackConnection> {
  const { data, error } = await supabase
    .from('slack_connections')
    .update({
      default_channel_id: channelId,
      default_channel_name: channelName,
    })
    .select()
    .single();

  if (error) throw error;
  return data as SlackConnection;
}

export async function deleteSlackConnection(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase
    .from('slack_connections')
    .delete()
    .neq('id', 0); // Delete all for current user (RLS filters)

  if (error) throw error;
}

// Get all users with Slack connections (for cron job - uses service client)
export async function getAllSlackConnections(supabase: SupabaseClient): Promise<SlackConnection[]> {
  const { data, error } = await supabase
    .from('slack_connections')
    .select('*');

  if (error) throw error;
  return data as SlackConnection[];
}
