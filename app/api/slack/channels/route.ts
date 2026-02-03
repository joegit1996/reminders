import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getSlackConnection, updateSlackConnectionChannel } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  profile?: {
    display_name?: string;
    real_name?: string;
  };
  is_bot?: boolean;
  deleted?: boolean;
}

interface ConversationItem {
  id: string;
  name: string;
  type: 'channel' | 'private_channel' | 'dm' | 'group_dm';
  is_private: boolean;
  is_member: boolean;
}

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

    const conversations: ConversationItem[] = [];
    
    // Use user token for reading conversations if available, otherwise fall back to bot token
    const readToken = connection.user_access_token || connection.access_token;
    const hasUserToken = !!connection.user_access_token;
    console.log('[SLACK CHANNELS] Using user token:', hasUserToken);

    // Fetch public channels (bot token is fine for this)
    const publicChannelsResponse = await fetch(
      'https://slack.com/api/conversations.list?types=public_channel&limit=500&exclude_archived=true',
      {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
        },
      }
    );
    const publicChannelsData = await publicChannelsResponse.json();
    
    if (publicChannelsData.ok && publicChannelsData.channels) {
      for (const channel of publicChannelsData.channels) {
        conversations.push({
          id: channel.id,
          name: channel.name,
          type: 'channel',
          is_private: false,
          is_member: channel.is_member || false,
        });
      }
    }

    // Fetch private channels (use user token to see user's private channels)
    const privateChannelsResponse = await fetch(
      'https://slack.com/api/conversations.list?types=private_channel&limit=500&exclude_archived=true',
      {
        headers: {
          Authorization: `Bearer ${readToken}`,
        },
      }
    );
    const privateChannelsData = await privateChannelsResponse.json();
    
    if (privateChannelsData.ok && privateChannelsData.channels) {
      for (const channel of privateChannelsData.channels) {
        conversations.push({
          id: channel.id,
          name: channel.name,
          type: 'private_channel',
          is_private: true,
          is_member: channel.is_member || false,
        });
      }
    }

    // Fetch DMs (use user token to see user's DMs)
    const dmsResponse = await fetch(
      'https://slack.com/api/conversations.list?types=im&limit=500',
      {
        headers: {
          Authorization: `Bearer ${readToken}`,
        },
      }
    );
    const dmsData = await dmsResponse.json();
    if (!dmsData.ok) {
      console.log('[SLACK CHANNELS] DMs fetch failed:', dmsData.error);
    }

    // Fetch group DMs (use user token to see user's MPIMs)
    const groupDmsResponse = await fetch(
      'https://slack.com/api/conversations.list?types=mpim&limit=500',
      {
        headers: {
          Authorization: `Bearer ${readToken}`,
        },
      }
    );
    const groupDmsData = await groupDmsResponse.json();
    console.log('[SLACK CHANNELS] MPIM response:', JSON.stringify({
      ok: groupDmsData.ok,
      error: groupDmsData.error,
      channelCount: groupDmsData.channels?.length || 0,
      channels: groupDmsData.channels?.slice(0, 3).map((c: { id: string; name: string; is_mpim: boolean }) => ({ 
        id: c.id, 
        name: c.name, 
        is_mpim: c.is_mpim 
      }))
    }));
    if (!groupDmsData.ok) {
      console.log('[SLACK CHANNELS] Group DMs fetch failed:', groupDmsData.error);
    }

    // Fetch users to get names for DMs
    const usersResponse = await fetch(
      'https://slack.com/api/users.list?limit=500',
      {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
        },
      }
    );
    const usersData = await usersResponse.json();
    if (!usersData.ok) {
      console.log('[SLACK CHANNELS] Users fetch failed:', usersData.error);
    }
    
    // Create a map of user IDs to names
    const userMap = new Map<string, string>();
    if (usersData.ok && usersData.members) {
      for (const user of usersData.members as SlackUser[]) {
        if (!user.deleted && !user.is_bot) {
          const displayName = user.profile?.display_name || user.profile?.real_name || user.real_name || user.name;
          userMap.set(user.id, displayName);
        }
      }
    }

    // Add DMs with user names - IMPORTANT: Use user ID (not channel ID) for sending
    if (dmsData.ok && dmsData.channels) {
      for (const dm of dmsData.channels) {
        const userName = userMap.get(dm.user) || 'Unknown User';
        conversations.push({
          id: dm.user,  // Use user ID so bot can send DMs via conversations.open
          name: userName,
          type: 'dm',
          is_private: true,
          is_member: true,
        });
      }
    }

    // Add group DMs
    if (groupDmsData.ok && groupDmsData.channels) {
      console.log(`[SLACK CHANNELS] Processing ${groupDmsData.channels.length} MPIMs`);
      for (const groupDm of groupDmsData.channels) {
        // Group DMs have a name like "mpdm-user1--user2--user3-1"
        // Try to get a friendly name from purpose or member names
        let name = groupDm.name || 'Group DM';
        
        // Try to get member names if available
        if (groupDm.members && groupDm.members.length > 0 && userMap.size > 0) {
          const memberNames = groupDm.members
            .filter((m: string) => m !== connection.bot_user_id)
            .map((m: string) => userMap.get(m) || m)
            .slice(0, 4)
            .join(', ');
          if (memberNames) {
            name = memberNames;
          }
        } else if (groupDm.purpose?.value) {
          name = groupDm.purpose.value;
        }
        
        console.log(`[SLACK CHANNELS] Adding MPIM: ${groupDm.id} -> ${name}`);
        conversations.push({
          id: groupDm.id,
          name: name,
          type: 'group_dm',
          is_private: true,
          is_member: true,
        });
      }
    } else {
      console.log('[SLACK CHANNELS] No MPIMs to add (ok:', groupDmsData.ok, ', channels:', !!groupDmsData.channels, ')');
    }

    // Also add individual users as options (for creating new DMs)
    const users: Array<{ id: string; name: string; type: 'user' }> = [];
    if (usersData.ok && usersData.members) {
      for (const slackUser of usersData.members as SlackUser[]) {
        if (!slackUser.deleted && !slackUser.is_bot && slackUser.id !== connection.bot_user_id) {
          const displayName = slackUser.profile?.display_name || slackUser.profile?.real_name || slackUser.real_name || slackUser.name;
          users.push({
            id: slackUser.id,
            name: displayName,
            type: 'user',
          });
        }
      }
    }

    // Sort conversations by type then name
    conversations.sort((a, b) => {
      const typeOrder = { channel: 0, private_channel: 1, group_dm: 2, dm: 3 };
      if (typeOrder[a.type] !== typeOrder[b.type]) {
        return typeOrder[a.type] - typeOrder[b.type];
      }
      return a.name.localeCompare(b.name);
    });

    // Sort users by name
    users.sort((a, b) => a.name.localeCompare(b.name));

    // Log summary for debugging
    const dmCount = conversations.filter(c => c.type === 'dm').length;
    const groupDmCount = conversations.filter(c => c.type === 'group_dm').length;
    const privateChannelCount = conversations.filter(c => c.type === 'private_channel').length;
    console.log(`[SLACK CHANNELS] Summary: ${conversations.length} total conversations (${dmCount} DMs, ${groupDmCount} group DMs, ${privateChannelCount} private channels), ${users.length} users`);
    
    // If no DMs/users/group DMs, likely missing scopes - user needs to reconnect
    const needsReconnect = dmCount === 0 && users.length === 0;
    
    return NextResponse.json({
      conversations,
      users,
      default_channel_id: connection.default_channel_id,
      needs_reconnect: needsReconnect,
      debug: {
        dm_count: dmCount,
        group_dm_count: groupDmCount,
        private_channel_count: privateChannelCount,
        user_count: users.length,
        errors: {
          dms: dmsData.ok ? null : dmsData.error,
          mpims: groupDmsData.ok ? null : groupDmsData.error,
          private_channels: privateChannelsData.ok ? null : privateChannelsData.error,
          users: usersData.ok ? null : usersData.error,
        }
      }
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
