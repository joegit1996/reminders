import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { upsertSlackConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const error = request.nextUrl.searchParams.get('error');

    if (error) {
      console.error('[SLACK CALLBACK] OAuth error:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/settings?slack_error=${error}`);
    }

    if (!code) {
      console.error('[SLACK CALLBACK] No code received');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/settings?slack_error=no_code`);
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[SLACK CALLBACK] User not authenticated');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/login?error=not_authenticated`);
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/slack/oauth-callback`,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    console.log('[SLACK CALLBACK] Token response keys:', Object.keys(tokenData));
    console.log('[SLACK CALLBACK] Has authed_user:', !!tokenData.authed_user);

    if (!tokenData.ok) {
      console.error('[SLACK CALLBACK] Token exchange failed:', tokenData.error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/settings?slack_error=${tokenData.error}`);
    }

    // Get user token if available (from user_scope)
    const userAccessToken = tokenData.authed_user?.access_token || null;
    console.log('[SLACK CALLBACK] User access token available:', !!userAccessToken);

    // Store Slack connection with both bot and user tokens
    await upsertSlackConnection(
      supabase,
      user.id,
      tokenData.team.id,
      tokenData.team.name,
      tokenData.access_token,  // bot token for sending messages
      tokenData.bot_user_id || null,
      userAccessToken  // user token for reading conversations
    );

    console.log('[SLACK CALLBACK] Successfully connected Slack workspace:', tokenData.team.name);
    
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/settings?slack_connected=true`);
  } catch (error) {
    console.error('[SLACK CALLBACK] Error processing callback:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/settings?slack_error=unknown`);
  }
}
