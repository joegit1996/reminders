import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getUpdateLogs, getReminderById } from '@/lib/db';

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
    
    // Verify the reminder belongs to the user (RLS should handle this, but explicit check is good)
    const reminder = await getReminderById(supabase, id);
    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    const logs = await getUpdateLogs(supabase, id);
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching update logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch update logs' },
      { status: 500 }
    );
  }
}
