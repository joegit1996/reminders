# Architecture

**Analysis Date:** 2026-02-04

## Pattern Overview

**Overall:** Next.js 14 Full-Stack Application with Layered API & UI

**Key Characteristics:**
- Server Components + Client Components (Next.js App Router)
- RESTful API routes for CRUD operations
- Middleware-based authentication via Supabase
- Scheduled cron jobs for reminder dispatch
- Multi-user support with Row Level Security (RLS)
- Dual messaging strategy: Slack webhooks + Slack API (interactive)
- AI assistant powered by OpenRouter (DeepSeek/OpenAI-compatible)

## Layers

**Presentation Layer (UI):**
- Purpose: React components for user interface, modal dialogs, forms
- Location: `src/app/` (Next.js pages), `src/components/` (React components)
- Contains: Page components (`page.tsx`), Form components, Modal components, Chat UI
- Depends on: Hooks, lib utilities, Next.js primitives
- Used by: End users via browser

**API Layer:**
- Purpose: HTTP endpoints for CRUD, authentication, integrations
- Location: `src/app/api/`
- Contains: Route handlers for reminders, webhooks, Slack oauth, cron jobs, agent
- Depends on: `lib/db.ts` (data layer), `lib/slack.ts`, `lib/supabase-server.ts`
- Used by: UI layer (client-side fetch), external cron services, Slack webhooks

**Data Access Layer (Database):**
- Purpose: Supabase query functions, types, business logic
- Location: `src/lib/db.ts`
- Contains: CRUD functions for reminders, webhooks, Slack connections; reminder queries for cron
- Depends on: Supabase client SDK, RLS policies
- Used by: API routes, cron job handlers

**Integration Layer (Slack):**
- Purpose: Slack API communication (webhooks and chat.postMessage)
- Location: `src/lib/slack.ts` (webhook fallback), `src/lib/slack-interactive.ts` (interactive API)
- Contains: Message formatting, API calls, channel/user lookups
- Depends on: Slack API credentials, user access tokens
- Used by: Reminder creation API, cron job dispatcher, delay message handler

**AI Agent Layer:**
- Purpose: Natural language interface for reminder management
- Location: `src/app/api/agent/route.ts`, `src/components/AgentChat.tsx`
- Contains: OpenRouter client, function definitions, tool implementations
- Depends on: All data and Slack layers, date parsing
- Used by: `/agent` page

**Authentication Layer:**
- Purpose: User session management, protected routes
- Location: `src/middleware.ts`, `src/components/AuthProvider.tsx`, `src/lib/supabase-server.ts`, `src/lib/supabase-client.ts`
- Contains: Supabase auth client initialization, session listeners, route protection
- Depends on: Supabase Auth service, Next.js middleware
- Used by: All protected routes and APIs

## Data Flow

**Reminder Creation Flow:**

1. User fills form in `app/page.tsx` or via AI agent chat
2. Form submits POST to `/api/reminders`
3. API route validates auth, validates inputs, checks Slack connection
4. `db.ts:createReminder()` inserts to Supabase `reminders` table
5. If Slack channel configured: `slack-interactive.ts:sendInteractiveReminder()` posts message via Slack API
6. If webhook configured: `slack.ts:sendSlackReminder()` posts via webhook
7. `db.ts:updateLastSent()` timestamps the reminder
8. Response returned to client, UI refreshes list

**Cron Job Dispatch Flow:**

1. External cron service (Vercel crons, external scheduler) hits `/api/cron/send-reminders`
2. Route verifies authentication via CRON_SECRET or Vercel headers
3. Uses service client to bypass RLS
4. `db.ts:getRemindersToSend()` queries overdue reminders
5. For each reminder: tries `slack-interactive.ts` first (if connection exists), falls back to `slack.ts` webhook
6. `db.ts:updateLastSent()` updates timestamp
7. `db.ts:getAutomatedMessagesToSend()` finds scheduled messages
8. Same dispatch pattern as reminders
9. Returns summary stats

**Delay Message Flow (on due date update):**

1. User updates due date in modal
2. Modal POSTs to `/api/reminders/[id]` with action `update-due-date`
3. `db.ts:updateReminderDueDate()` updates database
4. Checks for `delay_message` + `delay_slack_channel_id` configured
5. First tries `slack-interactive.ts:sendDelayNotificationViaApi()` with Slack API
6. Falls back to webhook if API fails
7. Returns updated reminder and log entry

**State Management:**

- Client state: React hooks (useState) in components
- Server state: Supabase database (reminders, saved_webhooks, slack_connections, due_date_update_logs)
- Session state: Supabase Auth sessions (managed in cookies via middleware)
- No centralized Redux/Zustand; component-level state suffices

## Key Abstractions

**Reminder:**
- Purpose: Core domain model representing a task with recurrence
- Examples: `app/page.tsx` (line 15), `lib/db.ts` (line 15)
- Pattern: TypeScript interface with full schema including nested arrays (automated_messages)

**SlackConnection:**
- Purpose: Represents OAuth token pair for a user's Slack workspace
- Examples: `lib/db.ts` (line 57)
- Pattern: Stores bot token (for app messages) and user token (for DM/regular messages)

**AutomatedMessage:**
- Purpose: Scheduled message to send N days before reminder due date
- Examples: `lib/db.ts` (line 3), `app/page.tsx` (line 29)
- Pattern: Nested array within Reminder; includes sent timestamp and status

**SavedWebhook:**
- Purpose: Reusable Slack webhook URL stored by user
- Examples: `lib/db.ts` (line 41)
- Pattern: Simple record with name and URL, user-scoped via RLS

## Entry Points

**Web UI:**
- Location: `app/page.tsx`
- Triggers: Browser navigation to `/`
- Responsibilities: Renders reminder list, forms, modals; fetches and manages reminders

**Slack OAuth:**
- Location: `app/api/slack/oauth/route.ts`
- Triggers: User clicks "Connect Slack" in settings
- Responsibilities: Redirects to Slack OAuth consent screen with appropriate scopes

**Slack Interactive Events:**
- Location: `app/api/slack/interactions/route.ts`
- Triggers: Slack user clicks button in reminder message
- Responsibilities: Handles "Mark Complete" button, updates reminder status

**Cron Dispatcher:**
- Location: `app/api/cron/send-reminders/route.ts`
- Triggers: External scheduler (Vercel crons) every interval
- Responsibilities: Finds overdue reminders, sends them via Slack API or webhook

**AI Agent:**
- Location: `app/api/agent/route.ts` + `app/agent/page.tsx`
- Triggers: User navigates to `/agent` and sends chat message
- Responsibilities: Processes natural language, routes to functions, executes reminder operations

**Login Page:**
- Location: `app/login/page.tsx`
- Triggers: Unauthenticated user accesses protected route
- Responsibilities: Supabase OAuth/email signup

**Auth Callback:**
- Location: `app/auth/callback/route.ts`
- Triggers: Supabase OAuth redirect
- Responsibilities: Exchanges auth code for session, redirects to home

## Error Handling

**Strategy:** Try-catch blocks at API route level, fallback patterns for Slack delivery

**Patterns:**
- API routes: Catch errors, log to console, return JSON error response with status codes
- Database errors: Throw from `lib/db.ts`, caught in route handlers
- Slack API failures: Log warning, fall back to webhook method
- Webhook failures: Log error, continue (don't fail reminder creation)
- Cron job failures: Return 500 error with details for monitoring

**Specific Examples:**
- `app/api/reminders/route.ts` (line 177-183): Database error caught, returned as 500 with details
- `app/api/cron/send-reminders/route.ts` (line 117-126): Interactive API fails, fallback to webhook
- `lib/db.ts` (line 223-225): Slack API error logged, execution continues

## Cross-Cutting Concerns

**Logging:**
- No structured logging framework; uses `console.log()` and `console.error()`
- Cron jobs prefixed with `[CRON]`, Slack operations prefixed with `[SLACK]`, API errors prefixed with `[REMINDERS API]`
- Located throughout route handlers and integration functions

**Validation:**
- API route level: Input validation before database operations (`app/api/reminders/route.ts` lines 60-140)
- Webhook URL format validation: Must start with `https://hooks.slack.com/`
- Period days validation: Must be >= 1
- Automated message validation: Must have required fields and at least one delivery method

**Authentication:**
- Middleware enforces login on all routes except `/login`, `/auth/callback`, `/api/cron/*`, `/api/slack/interactions`
- Cron jobs authenticated via CRON_SECRET header or Vercel cron headers
- RLS policies on Supabase tables ensure users only see/modify their own data
- Service client used for cron jobs to bypass RLS

**Authorization:**
- Row Level Security (RLS) on `reminders`, `saved_webhooks`, `due_date_update_logs`, `slack_connections`
- All tables filtered by `user_id` matching `auth.uid()`
- See `migrations/001-auth-multi-user.sql` for policy definitions

---

*Architecture analysis: 2026-02-04*
