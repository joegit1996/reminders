import { supabase } from './supabase';

export interface Reminder {
  id: number;
  text: string;
  due_date: string;
  period_days: number;
  slack_webhook: string;
  delay_message: string | null;
  delay_webhooks: string[];
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
  delayMessage?: string | null,
  delayWebhooks?: string[]
): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .insert({
      text,
      due_date: dueDate,
      period_days: periodDays,
      slack_webhook: slackWebhook,
      delay_message: delayMessage || null,
      delay_webhooks: delayWebhooks || [],
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
