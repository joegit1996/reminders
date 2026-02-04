# External Integrations

**Analysis Date:** 2026-02-04

## APIs & External Services

**AI/LLM:**
- OpenRouter - LLM API service (OpenAI-compatible)
  - What it's used for: AI agent chat completions with function calling for reminder management
  - SDK/Client: `openai` npm package v6.16.0 (configured with OpenRouter baseURL)
  - Auth: `OPENROUTER_API_KEY` environment variable
  - Implementation: `app/api/agent/route.ts`
  - Models: Primary `z-ai/glm-4.5-air:free`, fallback `meta-llama/llama-3.3-70b-instruct:free`

- Google Generative AI - Gemini LLM (fallback option)
  - What it's used for: Alternative LLM provider (imported but primary usage via OpenRouter)
  - SDK/Client: `@google/generative-ai` npm package v0.24.1
  - Auth: `GEMINI_API_KEY` environment variable
  - Status: Present in dependencies but not actively called in examined routes

- DeepSeek - LLM provider (fallback option)
  - What it's used for: Alternative LLM provider
  - Auth: `DEEPSEEK_API_KEY` environment variable
  - Status: Present in .env.local but not actively called in examined routes

**Messaging/Collaboration:**
- Slack - Messaging platform integration
  - What it's used for: Sending reminders to Slack channels/DMs, OAuth authentication, interactive messages (buttons)
  - SDK/Client: Native HTTP API calls via `fetch` (no SDK, direct REST calls)
  - Auth: Slack OAuth with workspace app credentials
    - `SLACK_CLIENT_ID` - OAuth client ID
    - `SLACK_CLIENT_SECRET` - OAuth client secret
    - `SLACK_SIGNING_SECRET` - Request signature verification
    - `access_token` - Bot token (stored per user in database)
    - `user_access_token` - User token for scoped operations
  - Implementation:
    - OAuth flow: `app/api/slack/oauth/route.ts`, `app/api/slack/oauth-callback/route.ts`
    - Channel/DM listing: `app/api/slack/channels/route.ts` (calls `conversations.list` and `users.list` APIs)
    - Interactive messages: `app/api/slack/interactions/route.ts` (handles button clicks for Mark Complete)
    - Status endpoint: `app/api/slack/status/route.ts`
    - Disconnect: `app/api/slack/disconnect/route.ts`
  - Endpoints called:
    - `https://slack.com/api/oauth.v2.access` - Token exchange
    - `https://slack.com/api/users.list` - List workspace users
    - `https://slack.com/api/conversations.list` - List channels and DMs
    - `https://slack.com/api/chat.postMessage` - Send messages (via `sendInteractiveReminder`)
    - `https://slack.com/api/chat.update` - Update message timestamps

## Data Storage

**Databases:**
- Supabase PostgreSQL
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public), `SUPABASE_SERVICE_ROLE_KEY` (private)
  - Client: `@supabase/supabase-js` v2.39.3
  - Client factories:
    - `createClient()` in `lib/supabase-server.ts` - SSR client with cookie management (uses anon key)
    - `createServiceClient()` in `lib/supabase-server.ts` - Service role client for cron jobs
    - `createBrowserClient()` in `lib/supabase-client.ts` - Browser client (unused in examined code)
  - Tables:
    - `reminders` - Reminder records with text, due_date, period_days, slack_channel_id, automated_messages array, etc.
    - `slack_connections` - User Slack OAuth tokens (access_token, user_access_token)
    - `saved_webhooks` - Legacy webhook storage for outgoing webhooks
    - `due_date_update_logs` - Audit trail of reminder due date changes
  - Auth: Supabase Auth (email/password signup, Slack OAuth)
  - RLS: Row-level security policies enabled on tables
  - Setup: SQL scripts in `supabase-setup.sql` and migrations in `migrations/` directory

**File Storage:**
- Not detected - Local filesystem only (no S3, Cloudinary, etc.)

**Caching:**
- Not detected - No Redis, Memcached, or caching layer

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (managed by Supabase)
  - Implementation: `@supabase/ssr` v0.8.0 for server-side session management
  - Approach: Cookie-based authentication with automatic refresh via middleware (`middleware.ts`)
  - Methods supported:
    - Email/password signup and login
    - Slack OAuth (workspace authentication)
  - Session flow: Middleware (`middleware.ts`) automatically refreshes and manages session cookies
  - Secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, LogRocket, or error tracking service

**Logs:**
- Console logging only (`console.log`, `console.error` throughout codebase)
- Log prefixes used: `[AGENT]`, `[SLACK]` for different subsystems
- Server-side errors logged to stdout (Vercel captures via platform)

## CI/CD & Deployment

**Hosting:**
- Vercel - Serverless Next.js hosting platform

**CI Pipeline:**
- Not detected in code - Likely configured in Vercel dashboard
- Deployment: Git-based (push to trigger builds)

**Cron Jobs:**
- Vercel Cron (configured in `vercel.json`)
- Job: `/api/cron/send-reminders` scheduled for `0 10 * * *` (daily at 10 AM UTC)
- Verification: `CRON_SECRET` environment variable for request signature validation

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public, used in browser)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (public, used in browser)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (private, server-only for cron jobs)
- `NEXT_PUBLIC_BASE_URL` - App URL for OAuth redirects
- `SLACK_CLIENT_ID` - Slack app client ID
- `SLACK_CLIENT_SECRET` - Slack app client secret
- `SLACK_SIGNING_SECRET` - For verifying Slack request signatures
- `OPENROUTER_API_KEY` - OpenRouter API key (for AI agent)
- `CRON_SECRET` - Secret for securing cron endpoint

**Optional env vars:**
- `DEEPSEEK_API_KEY` - DeepSeek LLM (fallback)
- `GEMINI_API_KEY` - Google Gemini API (fallback)
- `POSTGRES_URL_NON_POOLING` - Direct PostgreSQL connection (development database setup only)

**Secrets location:**
- Development: `.env.local` file (git-ignored)
- Production: Vercel Environment Variables (in project dashboard)
- All secrets loaded at runtime via `process.env`

## Webhooks & Callbacks

**Incoming:**
- Slack OAuth callback: `app/api/slack/oauth-callback/route.ts` - Receives `code` and `state` parameters
- Slack interactive callbacks: `app/api/slack/interactions/route.ts` - Receives button clicks and actions
- Cron webhook: `app/api/cron/send-reminders/route.ts` - Triggered by Vercel Cron (signature validated with `CRON_SECRET`)

**Outgoing:**
- Slack reminders: POST to `https://slack.com/api/chat.postMessage` with channel IDs
- Legacy webhooks: POST to saved webhook URLs (deprecated, Slack API preferred)
- Automated message webhooks: POST to saved webhook URLs at configured intervals before due date

## Third-Party Services Summary

| Service | Type | Used For | Auth Method |
|---------|------|----------|------------|
| Supabase | Database + Auth | Data storage, user authentication | Service role key, anon key |
| Slack | Messaging/OAuth | Reminders, user auth, interactions | OAuth tokens |
| OpenRouter | LLM | AI agent chat | API key |
| Vercel | Hosting | Deployment, cron jobs | Git integration |
| Google Generative AI | LLM | (Fallback, not primary) | API key |
| DeepSeek | LLM | (Fallback, not primary) | API key |

---

*Integration audit: 2026-02-04*
