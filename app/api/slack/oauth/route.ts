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
    
    // Bot scopes for sending messages and reading channels, DMs, and users
    const scopes = 'chat:write,channels:read,groups:read,im:read,mpim:read,users:read';
    
    // Build Slack OAuth URL
    const slackOAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
    slackOAuthUrl.searchParams.set('client_id', clientId);
    slackOAuthUrl.searchParams.set('scope', scopes);
    slackOAuthUrl.searchParams.set('redirect_uri', redirectUri);
    
    return NextResponse.redirect(slackOAuthUrl.toString());
  } catch (error) {
    console.error('[SLACK OAUTH] Error starting OAuth flow:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/settings?slack_error=unknown`);
  }
}
