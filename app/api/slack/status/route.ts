import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getSlackConnection } from '@/lib/db';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await getSlackConnection(supabase);

    if (connection) {
      return NextResponse.json({
        connected: true,
        team_id: connection.team_id,
        team_name: connection.team_name,
        default_channel_id: connection.default_channel_id,
        default_channel_name: connection.default_channel_name,
      });
    }

    return NextResponse.json({
      connected: false,
    });
  } catch (error) {
    console.error('[SLACK STATUS] Error fetching status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Slack status' },
      { status: 500 }
    );
  }
}
