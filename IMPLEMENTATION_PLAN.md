# Reminders App Commercialization Strategy

A comprehensive plan for transforming the single-user Reminders app into a multi-tenant SaaS product with multi-channel notifications and interactive Slack features.

---

## Executive Summary

This document outlines the implementation plan covering:
1. **Multi-User Architecture** - Authentication and data isolation
2. **Gmail Email Notifications** - Each user connects their own Gmail via OAuth
3. **Slack OAuth App with Interactive Messages** - One-click Slack connect + mark complete from Slack

---

## 1. Multi-User Architecture

### Authentication: Supabase Auth

Since you're already using Supabase, use **Supabase Auth** for the fastest integration with Row-Level Security.

**Implementation Steps:**

### 1.1 Enable Auth in Supabase

```sql
-- Run in Supabase SQL Editor

-- Add user_id to all user-owned tables
ALTER TABLE reminders ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE saved_webhooks ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Enable Row-Level Security
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE due_date_update_logs ENABLE ROW LEVEL SECURITY;

-- Policies for reminders
CREATE POLICY "Users can view own reminders"
ON reminders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reminders"
ON reminders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
ON reminders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
ON reminders FOR DELETE
USING (auth.uid() = user_id);

-- Similar policies for saved_webhooks
CREATE POLICY "Users can manage own webhooks"
ON saved_webhooks FOR ALL
USING (auth.uid() = user_id);

-- Logs policy (via reminder ownership)
CREATE POLICY "Users can view logs for own reminders"
ON due_date_update_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM reminders 
    WHERE reminders.id = due_date_update_logs.reminder_id 
    AND reminders.user_id = auth.uid()
  )
);
```

### 1.2 Frontend Auth Components

```typescript
// lib/supabase-client.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// components/AuthProvider.tsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase-client';

const AuthContext = createContext<{ user: User | null; session: Session | null }>({
  user: null,
  session: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### 1.3 Login/Signup Page

```typescript
// app/login/page.tsx
'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Check your email for the login link!');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Magic Link'}
      </button>
      {message && <p>{message}</p>}
    </form>
  );
}
```

---

## 2. Gmail Email Notifications (Per-User OAuth)

Each user connects their own Gmail account. Reminder emails are sent FROM the user's own email address. This means:
- No shared sending account
- Better deliverability (emails come from user's actual Gmail)
- Each user's daily limit is independent (500/day personal, 2000/day Workspace)

### Architecture

```
1. User Connects Gmail (One-time)
   User → YourApp → Google OAuth → User authorizes → YourApp stores refresh_token (encrypted)

2. Sending Reminder (Cron Job)
   YourApp → Get user's refresh_token → Refresh access token → Gmail API → Email sent from user's address
```

### 2.1 Google Cloud Setup

1. **Create a Google Cloud Project:**
   - Go to https://console.cloud.google.com
   - Create new project: "Reminders App"

2. **Enable Gmail API:**
   - APIs & Services → Enable APIs → Search "Gmail API" → Enable

3. **Configure OAuth Consent Screen:**
   - APIs & Services → OAuth consent screen
   - Choose "External"
   - App name: "Reminders App"
   - Support email: your email
   - Add scope: `https://www.googleapis.com/auth/gmail.send`
   - Add test users for development
   
   > **IMPORTANT:** For production with external users, you'll need to submit for Google verification. During development, add test users manually.

4. **Create OAuth Credentials:**
   - APIs & Services → Credentials → Create Credentials → OAuth Client ID
   - Application type: "Web application"
   - Authorized redirect URIs:
     - `https://your-app.vercel.app/api/gmail/oauth-callback` (production - use for all testing)
   - Download the JSON credentials

### 2.2 Database Schema for Gmail Connections

```sql
-- Store user Gmail connections (tokens are encrypted)
CREATE TABLE gmail_connections (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email VARCHAR(255) NOT NULL,
    refresh_token TEXT NOT NULL, -- Encrypted!
    access_token TEXT, -- Cached, optional
    token_expiry TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE gmail_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own Gmail connection"
ON gmail_connections FOR ALL
USING (auth.uid() = user_id);
```

### 2.3 Environment Variables

```env
# .env.local
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
ENCRYPTION_KEY="your-32-byte-encryption-key-here" # For encrypting refresh tokens
```

### 2.4 Token Encryption Utility

```typescript
// lib/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes = 64 hex chars

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### 2.5 Gmail OAuth Flow

```typescript
// app/api/gmail/oauth/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/gmail/oauth-callback`;
  const scope = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email';
  
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId!);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('access_type', 'offline'); // Required for refresh_token
  authUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh_token
  
  return NextResponse.redirect(authUrl.toString());
}

// app/api/gmail/oauth-callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { encrypt } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/settings?gmail_error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/settings?gmail_error=no_code`);
  }

  // Exchange code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/gmail/oauth-callback`,
    }),
  });

  const tokens = await tokenResponse.json();

  if (tokens.error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/settings?gmail_error=${tokens.error}`);
  }

  // Get user's email from Google
  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userInfoResponse.json();

  // Get current user from Supabase session
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/login?error=not_authenticated`);
  }

  // Store encrypted refresh token
  const encryptedRefreshToken = encrypt(tokens.refresh_token);

  await supabase.from('gmail_connections').upsert({
    user_id: user.id,
    email: userInfo.email,
    refresh_token: encryptedRefreshToken,
    access_token: tokens.access_token,
    token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  });

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/settings?gmail_connected=true`);
}
```

### 2.6 Send Email Using User's Gmail

```typescript
// lib/gmail.ts
import { google } from 'googleapis';
import { decrypt } from './encryption';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role for cron jobs
);

interface GmailConnection {
  email: string;
  refresh_token: string;
  access_token: string | null;
  token_expiry: string | null;
}

async function getGmailClient(userId: string) {
  // Get user's Gmail connection
  const { data: connection, error } = await supabase
    .from('gmail_connections')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !connection) {
    throw new Error('Gmail not connected for this user');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  // Decrypt and set refresh token
  const refreshToken = decrypt(connection.refresh_token);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  // Get fresh access token
  const { credentials } = await oauth2Client.refreshAccessToken();
  
  // Update cached access token in DB
  await supabase.from('gmail_connections').update({
    access_token: credentials.access_token,
    token_expiry: credentials.expiry_date 
      ? new Date(credentials.expiry_date).toISOString() 
      : null,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);

  return {
    gmail: google.gmail({ version: 'v1', auth: oauth2Client }),
    senderEmail: connection.email,
  };
}

export async function sendReminderEmailForUser(
  userId: string,
  toEmail: string,
  reminderText: string,
  dueDate: string,
  daysRemaining: number
) {
  const { gmail, senderEmail } = await getGmailClient(userId);

  const statusEmoji = daysRemaining <= 0 ? '🚨' : daysRemaining <= 3 ? '⚠️' : '⏰';
  const statusColor = daysRemaining <= 0 ? '#dc2626' : daysRemaining <= 3 ? '#f59e0b' : '#22c55e';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${statusColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
        .days { font-size: 48px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${statusEmoji} Reminder</h1>
        </div>
        <div class="content">
          <h2>${reminderText}</h2>
          <p><strong>📅 Due:</strong> ${dueDate}</p>
          <p class="days">${Math.abs(daysRemaining)} days ${daysRemaining >= 0 ? 'remaining' : 'overdue'}</p>
        </div>
        <div class="footer">
          Sent from Reminders App via your Gmail account.
        </div>
      </div>
    </body>
    </html>
  `;

  const subject = `${statusEmoji} Reminder: ${reminderText} (${Math.abs(daysRemaining)} days ${daysRemaining >= 0 ? 'remaining' : 'overdue'})`;

  // Create email in base64 format
  const emailLines = [
    `From: ${senderEmail}`,
    `To: ${toEmail}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlContent,
  ];
  const email = emailLines.join('\r\n');
  const encodedEmail = Buffer.from(email).toString('base64url');

  // Send via Gmail API
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedEmail,
    },
  });

  return { success: true, sentFrom: senderEmail };
}
```

### 2.7 Gmail Connection UI Component

```typescript
// components/GmailConnection.tsx
'use client';
import { useState, useEffect } from 'react';

interface GmailConnectionStatus {
  connected: boolean;
  email?: string;
}

export default function GmailConnection() {
  const [status, setStatus] = useState<GmailConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    const res = await fetch('/api/gmail/status');
    const data = await res.json();
    setStatus(data);
    setLoading(false);
  };

  const handleDisconnect = async () => {
    if (confirm('Disconnect Gmail? You won\'t receive email reminders until you reconnect.')) {
      await fetch('/api/gmail/disconnect', { method: 'POST' });
      fetchStatus();
    }
  };

  if (loading) return <div>Loading...</div>;

  if (status?.connected) {
    return (
      <div className="gmail-connected">
        <div>
          <span className="status-icon">✅</span>
          <span>Connected as <strong>{status.email}</strong></span>
        </div>
        <p className="hint">Reminder emails will be sent from this address</p>
        <button onClick={handleDisconnect} className="disconnect-btn">
          Disconnect Gmail
        </button>
      </div>
    );
  }

  return (
    <div className="gmail-disconnected">
      <p>Connect your Gmail to receive reminder emails sent from your own address.</p>
      <a href="/api/gmail/oauth" className="google-btn">
        <svg>/* Google logo */</svg>
        Connect with Google
      </a>
    </div>
  );
}
```

### 2.8 Install Dependencies

```bash
npm install googleapis
```

---

## 3. Slack OAuth App with Interactive Messages

Users can connect their Slack workspace and mark reminders complete directly from Slack by clicking a button.

### Architecture

```
1. Connect Slack (One-time)
   User → YourApp → Slack OAuth → User authorizes → YourApp stores token in DB

2. Send Interactive Reminder
   YourApp → Slack API (chat.postMessage with buttons) → User sees message with buttons

3. User Clicks Button
   User clicks "Mark Complete" → Slack → POST /api/slack/interactions → Mark complete in DB → Update message
```

### 3.1 Create Slack App

1. **Go to https://api.slack.com/apps** → Create New App → From scratch

2. **Name:** "Reminders" (or your app name)

3. **Configure OAuth & Permissions:**
   - Navigate to "OAuth & Permissions"
   - Add Redirect URL: 
     - `https://your-app.vercel.app/api/slack/oauth-callback` (production - use for all testing)
   - Add Bot Token Scopes:
     - `chat:write` - Send messages
     - `channels:read` - List public channels
     - `groups:read` - List private channels (optional)
   - Save changes

4. **Enable Interactivity:**
   - Navigate to "Interactivity & Shortcuts"
   - Turn ON Interactivity
   - Request URL: `https://your-app.vercel.app/api/slack/interactions`
   - Save changes

5. **Copy Credentials:**
   - Basic Information → App Credentials
   - Copy: Client ID, Client Secret, Signing Secret

### 3.2 Environment Variables

```env
# .env.local
SLACK_CLIENT_ID="your-client-id"
SLACK_CLIENT_SECRET="your-client-secret"
SLACK_SIGNING_SECRET="your-signing-secret"
```

### 3.3 Database Schema for Slack Connections

```sql
-- Run in Supabase SQL Editor

CREATE TABLE slack_connections (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id VARCHAR(50) NOT NULL,
    team_name VARCHAR(255),
    access_token TEXT NOT NULL,
    bot_user_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, team_id)
);

-- Enable RLS
ALTER TABLE slack_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own Slack connections"
ON slack_connections FOR ALL
USING (auth.uid() = user_id);

-- Add default channel to reminders
ALTER TABLE reminders ADD COLUMN slack_channel_id VARCHAR(50);
```

### 3.4 OAuth Flow Implementation

```typescript
// app/api/slack/oauth/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/slack/oauth-callback`;
  const scopes = 'chat:write,channels:read,groups:read';
  
  const slackOAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  
  return NextResponse.redirect(slackOAuthUrl);
}

// app/api/slack/oauth-callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/settings?slack_error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/settings?slack_error=no_code`);
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

  if (!tokenData.ok) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/settings?slack_error=${tokenData.error}`);
  }

  // Get current user from Supabase session
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/login?error=not_authenticated`);
  }

  // Store Slack connection
  await supabase.from('slack_connections').upsert({
    user_id: user.id,
    team_id: tokenData.team.id,
    team_name: tokenData.team.name,
    access_token: tokenData.access_token,
    bot_user_id: tokenData.bot_user_id,
  });

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/settings?slack_connected=true`);
}
```

### 3.5 Interactive Message with "Mark Complete" Button

```typescript
// lib/slack-interactive.ts
import crypto from 'crypto';

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: Array<{
    type: string;
    text?: { type: string; text: string; emoji?: boolean };
    action_id?: string;
    value?: string;
    style?: string;
  }>;
}

export async function sendInteractiveReminder(
  accessToken: string,
  channelId: string,
  reminderId: number,
  reminderText: string,
  dueDate: string,
  daysRemaining: number
) {
  const statusEmoji = daysRemaining <= 0 ? '🚨' : daysRemaining <= 3 ? '⚠️' : '⏰';
  const statusText = daysRemaining <= 0 
    ? `*${Math.abs(daysRemaining)} days overdue!*` 
    : `*${daysRemaining} days remaining*`;

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${statusEmoji} Reminder`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${reminderText}*\n\n📅 Due: ${dueDate}\n${statusText}`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '✅ Mark Complete',
            emoji: true,
          },
          action_id: 'mark_complete',
          value: String(reminderId),
          style: 'primary',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '📅 Postpone',
            emoji: true,
          },
          action_id: 'postpone_reminder',
          value: String(reminderId),
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '🔗 Open App',
            emoji: true,
          },
          action_id: 'open_app',
          value: String(reminderId),
        },
      ],
    },
  ];

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      channel: channelId,
      blocks,
      text: `${statusEmoji} Reminder: ${reminderText}`, // Fallback for notifications
    }),
  });

  return response.json();
}

// Verify Slack request signature
export function verifySlackRequest(
  signingSecret: string,
  requestBody: string,
  timestamp: string,
  signature: string
): boolean {
  const baseString = `v0:${timestamp}:${requestBody}`;
  const hmac = crypto.createHmac('sha256', signingSecret);
  hmac.update(baseString);
  const expectedSignature = `v0=${hmac.digest('hex')}`;
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
}
```

### 3.6 Handle Button Interactions

```typescript
// app/api/slack/interactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifySlackRequest } from '@/lib/slack-interactive';
import { markReminderComplete, getReminderById } from '@/lib/db';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const timestamp = request.headers.get('x-slack-request-timestamp') || '';
  const signature = request.headers.get('x-slack-signature') || '';

  // Verify request is from Slack
  if (!verifySlackRequest(
    process.env.SLACK_SIGNING_SECRET!,
    rawBody,
    timestamp,
    signature
  )) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Parse the payload
  const params = new URLSearchParams(rawBody);
  const payload = JSON.parse(params.get('payload') || '{}');

  const { actions, response_url } = payload;
  const action = actions[0];

  if (action.action_id === 'mark_complete') {
    const reminderId = parseInt(action.value);
    
    try {
      // Mark the reminder as complete in the database
      await markReminderComplete(reminderId);
      const reminder = await getReminderById(reminderId);

      // Update the original message to show it's completed
      await fetch(response_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replace_original: true,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `~${reminder?.text}~\n\n✅ *Completed* by <@${payload.user.id}>`,
              },
            },
          ],
        }),
      });

      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error('Error marking complete:', error);
      
      // Send ephemeral error message
      await fetch(response_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_type: 'ephemeral',
          text: '❌ Failed to mark reminder as complete. Please try again.',
        }),
      });

      return NextResponse.json({ ok: false });
    }
  }

  if (action.action_id === 'postpone_reminder') {
    // TODO: Open a modal to select new due date
    return NextResponse.json({ ok: true });
  }

  if (action.action_id === 'open_app') {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
```

### 3.7 Slack Connection UI Component

```typescript
// components/SlackConnection.tsx
'use client';
import { useState, useEffect } from 'react';

interface SlackConnection {
  connected: boolean;
  team_name?: string;
}

export default function SlackConnection() {
  const [connection, setConnection] = useState<SlackConnection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConnection();
  }, []);

  const fetchConnection = async () => {
    const res = await fetch('/api/slack/status');
    const data = await res.json();
    setConnection(data);
    setLoading(false);
  };

  const handleDisconnect = async () => {
    if (confirm('Disconnect Slack? You won\'t receive Slack reminders until you reconnect.')) {
      await fetch('/api/slack/disconnect', { method: 'POST' });
      fetchConnection();
    }
  };

  if (loading) return <div>Loading...</div>;

  if (connection?.connected) {
    return (
      <div className="slack-connected">
        <div>
          <span className="status-icon">✅</span>
          <span>Connected to <strong>{connection.team_name}</strong></span>
        </div>
        <button onClick={handleDisconnect} className="disconnect-btn">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <a href="/api/slack/oauth" className="slack-connect-btn">
      <svg>/* Slack logo */</svg>
      Add to Slack
    </a>
  );
}
```

---

## 4. Complete Database Schema

```sql
-- Run all migrations in Supabase SQL Editor

-- 1. Gmail connections (per-user OAuth)
CREATE TABLE IF NOT EXISTS gmail_connections (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email VARCHAR(255) NOT NULL,
    refresh_token TEXT NOT NULL,
    access_token TEXT,
    token_expiry TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Slack connections (per-user OAuth)
CREATE TABLE IF NOT EXISTS slack_connections (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id VARCHAR(50) NOT NULL,
    team_name VARCHAR(255),
    access_token TEXT NOT NULL,
    bot_user_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, team_id)
);

-- 3. Modify reminders table for multi-user
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS slack_channel_id VARCHAR(50);
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS send_email BOOLEAN DEFAULT false;
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS email_recipient VARCHAR(255);

-- 4. Enable RLS on all tables
ALTER TABLE gmail_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_connections ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Users can manage own Gmail connection"
ON gmail_connections FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own Slack connections"
ON slack_connections FOR ALL USING (auth.uid() = user_id);
```

---

## 5. Implementation Roadmap

### Phase Checklist

#### Phase 1: Authentication (Week 1)
- [ ] Add Supabase Auth to the app
- [ ] Implement login/signup pages with magic link
- [ ] Add `user_id` to all tables with RLS policies
- [ ] Create AuthProvider and useAuth hook
- [ ] Protect routes requiring authentication
- [ ] Test user data isolation

#### Phase 2: Gmail OAuth (Week 1-2)
- [ ] Create Google Cloud project
- [ ] Enable Gmail API and configure OAuth consent screen
- [ ] Create OAuth credentials (Web application)
- [ ] Implement `/api/gmail/oauth` and `/api/gmail/oauth-callback`
- [ ] Create encryption utility for refresh tokens
- [ ] Implement `sendReminderEmailForUser` function
- [ ] Build Gmail connection UI component
- [ ] Test email sending on production

#### Phase 3: Slack OAuth (Week 2)
- [ ] Create Slack App
- [ ] Configure OAuth scopes and redirect URLs
- [ ] Implement `/api/slack/oauth` and `/api/slack/oauth-callback`
- [ ] Build Slack connection UI component
- [ ] Add channel selection (optional)
- [ ] Test OAuth flow on production

#### Phase 4: Interactive Slack Messages (Week 2-3)
- [ ] Enable Interactivity in Slack App
- [ ] Design Block Kit message with buttons
- [ ] Implement `sendInteractiveReminder` function
- [ ] Build `/api/slack/interactions` endpoint
- [ ] Handle "Mark Complete" button action
- [ ] Update original message when completed
- [ ] Test on production

#### Phase 5: Integration & Deploy (Week 3)
- [ ] Update cron job to:
  - Check user's Gmail connection before sending email
  - Check user's Slack connection before sending Slack message
  - Use user's tokens for sending
- [ ] Add settings page with connection management
- [ ] End-to-end testing
- [ ] Submit Slack app for review (if distributing publicly)
- [ ] Submit Google OAuth for verification (if going public)

---

## 6. Development Notes

### Generate Encryption Key

```bash
# Generate a 32-byte (256-bit) encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: 64 hex characters, use as ENCRYPTION_KEY
```

### Testing on Production

Since we're using production for all testing:

1. **Deploy frequently** - Push changes to Vercel to test OAuth flows
2. **Use Vercel logs** - Check function logs for debugging
3. **Add yourself as test user** in Google Cloud Console during development
4. **Create a test Slack workspace** for testing Slack integration

### Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Google/Gmail
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxx"

# Slack
SLACK_CLIENT_ID="xxx"
SLACK_CLIENT_SECRET="xxx"
SLACK_SIGNING_SECRET="xxx"

# App
NEXT_PUBLIC_BASE_URL="https://your-app.vercel.app"
ENCRYPTION_KEY="64-hex-char-key"
CRON_SECRET="your-cron-secret"
```

---

## 7. Testing Checklist

### Authentication
- [ ] User can sign up with email
- [ ] Magic link emails arrive
- [ ] User can log in
- [ ] User data is isolated (can't see other users' reminders)

### Gmail Connection
- [ ] "Connect with Google" opens OAuth flow
- [ ] User can authorize gmail.send scope
- [ ] Refresh token is stored (encrypted)
- [ ] Connection status shows correct email
- [ ] Disconnect removes connection

### Gmail Sending
- [ ] Cron job gets user's refresh token
- [ ] Access token is refreshed correctly
- [ ] Email is sent from user's own Gmail address
- [ ] Email template looks correct
- [ ] Handle case where Gmail is not connected

### Slack Connection
- [ ] "Add to Slack" opens OAuth flow
- [ ] User can authorize and select channel
- [ ] Token is stored correctly
- [ ] Connection status shows workspace name
- [ ] Disconnect removes connection

### Interactive Slack Messages
- [ ] Reminder messages appear with buttons
- [ ] "Mark Complete" button marks reminder complete in DB
- [ ] Original message updates to show completion
- [ ] User who clicked is mentioned in completion message
- [ ] Handle errors gracefully
