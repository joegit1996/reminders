import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { deleteSlackConnection } from '@/lib/db';

export async function POST() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteSlackConnection(supabase);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SLACK DISCONNECT] Error disconnecting:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Slack' },
      { status: 500 }
    );
  }
}
