import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getSlackConnection, updateSlackConnectionChannel } from '@/lib/db';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await getSlackConnection(supabase);
    if (!connection) {
      return NextResponse.json({ error: 'Slack not connected' }, { status: 400 });
    }

    // Fetch public channels
    const publicChannelsResponse = await fetch(
      'https://slack.com/api/conversations.list?types=public_channel&limit=200',
      {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
        },
      }
    );

    const publicChannelsData = await publicChannelsResponse.json();

    // Fetch private channels (groups)
    const privateChannelsResponse = await fetch(
      'https://slack.com/api/conversations.list?types=private_channel&limit=200',
      {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
        },
      }
    );

    const privateChannelsData = await privateChannelsResponse.json();

    // Combine channels
    const channels = [
      ...(publicChannelsData.ok ? publicChannelsData.channels : []),
      ...(privateChannelsData.ok ? privateChannelsData.channels : []),
    ].map((channel: any) => ({
      id: channel.id,
      name: channel.name,
      is_private: channel.is_private,
      is_member: channel.is_member,
    })).sort((a: any, b: any) => a.name.localeCompare(b.name));

    return NextResponse.json({
      channels,
      default_channel_id: connection.default_channel_id,
    });
  } catch (error) {
    console.error('[SLACK CHANNELS] Error fetching channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

// Set default channel
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { channelId, channelName } = body;

    if (!channelId || !channelName) {
      return NextResponse.json(
        { error: 'channelId and channelName are required' },
        { status: 400 }
      );
    }

    const connection = await getSlackConnection(supabase);
    if (!connection) {
      return NextResponse.json({ error: 'Slack not connected' }, { status: 400 });
    }

    const updatedConnection = await updateSlackConnectionChannel(
      supabase,
      channelId,
      channelName
    );

    return NextResponse.json({
      success: true,
      default_channel_id: updatedConnection.default_channel_id,
      default_channel_name: updatedConnection.default_channel_name,
    });
  } catch (error) {
    console.error('[SLACK CHANNELS] Error setting default channel:', error);
    return NextResponse.json(
      { error: 'Failed to set default channel' },
      { status: 500 }
    );
  }
}
