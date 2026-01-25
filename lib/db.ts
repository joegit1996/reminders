import { sql } from '@vercel/postgres';

export interface Reminder {
  id: number;
  text: string;
  due_date: string;
  period_days: number;
  slack_webhook: string;
  is_complete: boolean;
  last_sent: string | null;
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
export async function initDatabase() {
  try {
    // Create reminders table
    await sql`
      CREATE TABLE IF NOT EXISTS reminders (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        due_date DATE NOT NULL,
        period_days INTEGER NOT NULL,
        slack_webhook TEXT NOT NULL,
        is_complete BOOLEAN DEFAULT FALSE,
        last_sent TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create due_date_update_logs table
    await sql`
      CREATE TABLE IF NOT EXISTS due_date_update_logs (
        id SERIAL PRIMARY KEY,
        reminder_id INTEGER NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
        old_due_date DATE NOT NULL,
        new_due_date DATE NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Get all active reminders
export async function getActiveReminders(): Promise<Reminder[]> {
  const { rows } = await sql`
    SELECT * FROM reminders 
    WHERE is_complete = FALSE 
    ORDER BY created_at DESC;
  `;
  return rows as Reminder[];
}

// Get all reminders (including completed)
export async function getAllReminders(): Promise<Reminder[]> {
  const { rows } = await sql`
    SELECT * FROM reminders 
    ORDER BY created_at DESC;
  `;
  return rows as Reminder[];
}

// Get reminder by ID
export async function getReminderById(id: number): Promise<Reminder | null> {
  const { rows } = await sql`
    SELECT * FROM reminders WHERE id = ${id};
  `;
  return rows[0] as Reminder || null;
}

// Create a new reminder
export async function createReminder(
  text: string,
  dueDate: string,
  periodDays: number,
  slackWebhook: string
): Promise<Reminder> {
  const { rows } = await sql`
    INSERT INTO reminders (text, due_date, period_days, slack_webhook)
    VALUES (${text}, ${dueDate}, ${periodDays}, ${slackWebhook})
    RETURNING *;
  `;
  return rows[0] as Reminder;
}

// Update reminder due date
export async function updateReminderDueDate(
  id: number,
  newDueDate: string
): Promise<{ reminder: Reminder; log: DueDateUpdateLog }> {
  // Get current reminder
  const reminder = await getReminderById(id);
  if (!reminder) {
    throw new Error('Reminder not found');
  }

  // Update reminder
  const { rows: reminderRows } = await sql`
    UPDATE reminders 
    SET due_date = ${newDueDate}
    WHERE id = ${id}
    RETURNING *;
  `;

  // Log the update
  const { rows: logRows } = await sql`
    INSERT INTO due_date_update_logs (reminder_id, old_due_date, new_due_date)
    VALUES (${id}, ${reminder.due_date}, ${newDueDate})
    RETURNING *;
  `;

  return {
    reminder: reminderRows[0] as Reminder,
    log: logRows[0] as DueDateUpdateLog,
  };
}

// Mark reminder as complete
export async function markReminderComplete(id: number): Promise<Reminder> {
  const { rows } = await sql`
    UPDATE reminders 
    SET is_complete = TRUE
    WHERE id = ${id}
    RETURNING *;
  `;
  return rows[0] as Reminder;
}

// Update last_sent timestamp
export async function updateLastSent(id: number): Promise<void> {
  await sql`
    UPDATE reminders 
    SET last_sent = CURRENT_TIMESTAMP
    WHERE id = ${id};
  `;
}

// Get reminders that need to be sent
export async function getRemindersToSend(): Promise<Reminder[]> {
  const { rows } = await sql`
    SELECT * FROM reminders 
    WHERE is_complete = FALSE
    AND (
      last_sent IS NULL 
      OR last_sent < CURRENT_TIMESTAMP - INTERVAL '1 day' * period_days
    );
  `;
  return rows as Reminder[];
}

// Get update logs for a reminder
export async function getUpdateLogs(reminderId: number): Promise<DueDateUpdateLog[]> {
  const { rows } = await sql`
    SELECT * FROM due_date_update_logs 
    WHERE reminder_id = ${reminderId}
    ORDER BY updated_at DESC;
  `;
  return rows as DueDateUpdateLog[];
}
