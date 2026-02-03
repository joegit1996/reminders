import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/login`);
    }

    const clientId = process.env.SLACK_CLIENT_ID;
    if (!clientId) {
      console.error('[SLACK OAUTH] SLACK_CLIENT_ID not configured');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/settings?slack_error=not_configured`);
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/slack/oauth-callback`;
    
    // Bot scopes for sending messages
    const botScopes = 'chat:write,channels:read,groups:read,users:read';
    
    // User scopes for reading the user's own conversations (DMs, MPIMs, private channels)
    // User tokens can see all conversations the user is part of
    const userScopes = 'channels:read,groups:read,im:read,mpim:read';
    
    // Build Slack OAuth URL
    const slackOAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
    slackOAuthUrl.searchParams.set('client_id', clientId);
    slackOAuthUrl.searchParams.set('scope', botScopes);
    slackOAuthUrl.searchParams.set('user_scope', userScopes);
    slackOAuthUrl.searchParams.set('redirect_uri', redirectUri);
    
    return NextResponse.redirect(slackOAuthUrl.toString());
  } catch (error) {
    console.error('[SLACK OAUTH] Error starting OAuth flow:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/settings?slack_error=unknown`);
  }
}
