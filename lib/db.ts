import { supabase } from './supabase';

export interface AutomatedMessage {
  id: string; // Unique ID for this automated message
  days_before: number;
  title: string;
  description: string;
  webhook_url: string;
  sent: boolean;
  sent_at: string | null;
}

export interface Reminder {
  id: number;
  text: string;
  description: string | null;
  due_date: string;
  period_days: number;
  slack_webhook: string;
  delay_message: string | null;
  delay_webhooks: string[];
  automated_messages: AutomatedMessage[];
  is_complete: boolean;
  last_sent: string | null;
  created_at: string;
}

export interface SavedWebhook {
  id: number;
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

// Initialize database tables
// Note: Tables should be created via Supabase SQL Editor using supabase-setup.sql
// This function is kept for compatibility but tables must be created manually
export async function initDatabase() {
  // Tables are created via Supabase SQL Editor
  // See supabase-setup.sql for the schema
  console.log('Database tables should be created via Supabase SQL Editor');
}

// Get all active reminders
export async function getActiveReminders(): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('is_complete', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Reminder[];
}

// Get all reminders (including completed)
export async function getAllReminders(): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Reminder[];
}

// Get reminder by ID
export async function getReminderById(id: number): Promise<Reminder | null> {
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
  text: string,
  dueDate: string,
  periodDays: number,
  slackWebhook: string,
  description?: string | null,
  delayMessage?: string | null,
  delayWebhooks?: string[],
  automatedMessages?: AutomatedMessage[]
): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .insert({
      text,
      description: description || null,
      due_date: dueDate,
      period_days: periodDays,
      slack_webhook: slackWebhook,
      delay_message: delayMessage || null,
      delay_webhooks: delayWebhooks || [],
      automated_messages: automatedMessages || [],
      is_complete: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Reminder;
}

// Update reminder due date
export async function updateReminderDueDate(
  id: number,
  newDueDate: string
): Promise<{ reminder: Reminder; log: DueDateUpdateLog; delayMessageSent: boolean }> {
  // Get current reminder
  const reminder = await getReminderById(id);
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
  if (updatedReminder.delay_message && updatedReminder.delay_webhooks && updatedReminder.delay_webhooks.length > 0) {
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
export async function markReminderComplete(id: number): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .update({ is_complete: true })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Reminder;
}

// Update last_sent timestamp
export async function updateLastSent(id: number): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .update({ last_sent: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// Get reminders that need to be sent
export async function getRemindersToSend(): Promise<Reminder[]> {
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
    const daysSinceLastSent = Math.floor(
      (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceLastSent >= reminder.period_days;
  });

  return remindersToSend;
}

// Get automated messages that need to be sent
export async function getAutomatedMessagesToSend(): Promise<Array<{ reminder: Reminder; automatedMessage: AutomatedMessage }>> {
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
      // Only send if:
      // 1. Not already sent
      // 2. Days until due equals days_before
      // 3. At least N days remaining
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
  reminderId: number,
  automatedMessageId: string
): Promise<void> {
  const reminder = await getReminderById(reminderId);
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
export async function getUpdateLogs(reminderId: number): Promise<DueDateUpdateLog[]> {
  const { data, error } = await supabase
    .from('due_date_update_logs')
    .select('*')
    .eq('reminder_id', reminderId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as DueDateUpdateLog[];
}

// Saved Webhooks CRUD operations
export async function getAllSavedWebhooks(): Promise<SavedWebhook[]> {
  const { data, error } = await supabase
    .from('saved_webhooks')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as SavedWebhook[];
}

export async function createSavedWebhook(name: string, webhookUrl: string): Promise<SavedWebhook> {
  const { data, error } = await supabase
    .from('saved_webhooks')
    .insert({
      name,
      webhook_url: webhookUrl,
    })
    .select()
    .single();

  if (error) throw error;
  return data as SavedWebhook;
}

export async function updateSavedWebhook(id: number, name: string, webhookUrl: string): Promise<SavedWebhook> {
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

export async function deleteSavedWebhook(id: number): Promise<void> {
  const { error } = await supabase
    .from('saved_webhooks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
