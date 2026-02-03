import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAllReminders, getRemindersToSend } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allReminders = await getAllReminders(supabase);
    const remindersToSend = await getRemindersToSend(supabase);
    const now = new Date();

    const remindersWithStatus = allReminders.map(reminder => {
      let calendarDaysSinceLastSent: number | null = null;
      
      if (reminder.last_sent) {
        const lastSent = new Date(reminder.last_sent);
        const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        const lastSentUTC = Date.UTC(lastSent.getUTCFullYear(), lastSent.getUTCMonth(), lastSent.getUTCDate());
        calendarDaysSinceLastSent = Math.floor((nowUTC - lastSentUTC) / (1000 * 60 * 60 * 24));
      }
      
      const shouldSend = !reminder.is_complete && (!reminder.last_sent || (calendarDaysSinceLastSent !== null && calendarDaysSinceLastSent >= reminder.period_days));

      return {
        id: reminder.id,
        text: reminder.text,
        is_complete: reminder.is_complete,
        period_days: reminder.period_days,
        last_sent: reminder.last_sent,
        calendarDaysSinceLastSent,
        shouldSend,
        due_date: reminder.due_date,
      };
    });

    return NextResponse.json({
      currentTime: now.toISOString(),
      totalReminders: allReminders.length,
      remindersToSend: remindersToSend.length,
      reminders: remindersWithStatus,
      cronSchedule: '0 10 * * * (10:00 AM UTC = 12:00 PM Egypt time)',
    });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reminders', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
