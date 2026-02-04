# Codebase Structure

**Analysis Date:** 2026-02-04

## Directory Layout

```
reminders/
├── app/                          # Next.js App Router (pages & API routes)
│   ├── api/                      # API routes (HTTP handlers)
│   │   ├── agent/                # AI assistant endpoint
│   │   ├── cron/send-reminders/  # Scheduled reminder dispatcher
│   │   ├── debug-reminders/      # Debug endpoint for testing
│   │   ├── reminders/            # Reminder CRUD operations
│   │   ├── slack/                # Slack integration endpoints
│   │   │   ├── oauth/            # OAuth initiation
│   │   │   ├── oauth-callback/   # OAuth callback handler
│   │   │   ├── channels/         # List user's Slack channels
│   │   │   ├── interactions/     # Handle Slack message buttons
│   │   │   ├── status/           # Check Slack connection status
│   │   │   └── disconnect/       # Disconnect Slack account
│   │   └── webhooks/             # Saved webhook CRUD
│   ├── agent/                    # AI assistant page
│   ├── auth/                     # Authentication pages
│   │   └── callback/             # Supabase auth callback
│   ├── calendar/                 # Calendar view page
│   ├── login/                    # Login/signup page
│   ├── settings/                 # User settings page
│   ├── webhooks/                 # Webhook management page
│   ├── layout.tsx                # Root layout (auth provider)
│   ├── page.tsx                  # Home page (reminder list & form)
│   └── globals.css               # Global styles
├── components/                   # React components
│   ├── ReminderForm.tsx          # Reminder creation form
│   ├── ReminderList.tsx          # Reminder list display
│   ├── AgentChat.tsx             # AI chat interface
│   ├── SlackConnection.tsx       # Slack connection UI
│   ├── AuthProvider.tsx          # Auth context provider
│   ├── ChannelSelector.tsx       # Slack channel picker
│   ├── EditAutomatedMessagesModal.tsx  # Automated message editor
│   ├── EditDelayMessageModal.tsx       # Delay message editor
│   ├── EditCompletionModal.tsx         # Completion message editor
│   ├── UpdateDueDateModal.tsx          # Due date update modal
│   ├── ActionFormFields.tsx            # Reusable form fields
│   └── SlackMigrationBanner.tsx        # Migration notice
├── lib/                          # Utilities & business logic
│   ├── db.ts                     # Database operations & types
│   ├── supabase-server.ts        # Server-side Supabase client
│   ├── supabase-client.ts        # Client-side Supabase client
│   ├── supabase.ts               # Shared Supabase utilities
│   ├── slack.ts                  # Slack webhook integration
│   ├── slack-interactive.ts      # Slack API integration
│   └── neoBrutalismStyles.ts     # UI styling utilities
├── hooks/                        # Custom React hooks
│   └── useMediaQuery.ts          # Responsive design hook
├── migrations/                   # SQL migrations for schema
│   ├── 001-auth-multi-user.sql   # RLS & user scoping
│   ├── 002-slack-connections.sql # Slack connection table
│   ├── 003-per-message-channels.sql    # Per-reminder channels
│   ├── 004-migrate-reminders-to-user.sql
│   ├── 005-add-user-access-token.sql   # User token support
│   └── 006-add-channel-columns.sql     # Additional channel fields
├── scripts/                      # Database setup scripts
│   ├── setup-database.js         # Initialize Supabase tables
│   ├── run-migration.js          # Apply migrations
│   └── [add-*-column.js]         # Column addition scripts
├── middleware.ts                 # Authentication middleware
├── tsconfig.json                 # TypeScript configuration
├── next.config.js                # Next.js configuration
├── package.json                  # Dependencies
├── .env.example                  # Environment variable template
└── .planning/                    # Planning documents (this file)
    └── codebase/
```

## Directory Purposes

**app/**
- Purpose: Next.js App Router - defines all pages and API routes
- Contains: Page components (layout, page.tsx), API route handlers
- Key files: `page.tsx` (main UI), `api/*` (all endpoints), `layout.tsx` (root wrapper)

**app/api/**
- Purpose: REST API endpoints for all operations
- Contains: POST (create), GET (read), PATCH (update), DELETE operations
- Key files: `reminders/route.ts`, `cron/send-reminders/route.ts`, `slack/oauth/route.ts`

**components/**
- Purpose: Reusable React components
- Contains: Form components, modals, list views, provider wrappers
- Key files: `ReminderForm.tsx` (main form), `AuthProvider.tsx` (context), `AgentChat.tsx` (AI UI)

**lib/**
- Purpose: Business logic, data access, integration code
- Contains: Database functions, Slack integration, Supabase clients, utilities
- Key files: `db.ts` (all database operations), `slack.ts` (webhook), `slack-interactive.ts` (API)

**hooks/**
- Purpose: Custom React hooks for shared behavior
- Contains: Media query hook for responsive design
- Key files: `useMediaQuery.ts` (viewport detection)

**migrations/**
- Purpose: SQL schema and RLS policy definitions
- Contains: Multi-user auth setup, Slack connection schema, channel columns
- Key files: `001-auth-multi-user.sql` (foundational RLS)

**scripts/**
- Purpose: Database setup and migration utilities
- Contains: Node.js scripts for schema initialization
- Key files: `setup-database.js` (initial setup), migration runners

## Key File Locations

**Entry Points:**

- `app/layout.tsx`: Root layout - wraps app with AuthProvider
- `app/page.tsx`: Home page - main reminder list and creation form
- `app/agent/page.tsx`: AI assistant page
- `app/login/page.tsx`: Authentication page
- `middleware.ts`: Route protection - redirects unauthenticated users to /login

**Configuration:**

- `tsconfig.json`: TypeScript paths alias `@/*` maps to root directory
- `next.config.js`: Next.js build configuration
- `package.json`: Dependencies (React, Next, Supabase, OpenAI, date-fns)

**Core Logic:**

- `lib/db.ts`: All database CRUD and query functions (426 lines)
- `lib/slack.ts`: Slack webhook sender and message formatter
- `lib/slack-interactive.ts`: Slack API client for interactive messages
- `app/api/reminders/route.ts`: Main reminder CRUD endpoint
- `app/api/cron/send-reminders/route.ts`: Scheduled dispatcher

**Testing & Data:**

- No automated tests present
- SQL migrations in `migrations/` serve as source of truth for schema

## Naming Conventions

**Files:**

- Page components: `page.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Modals: `Edit[Feature]Modal.tsx` (PascalCase, "Modal" suffix)
- Forms: `[Feature]Form.tsx` (PascalCase, "Form" suffix)
- Utilities: `[feature].ts` (camelCase for files)
- Styles: `neoBrutalismStyles.ts` (descriptive name)

**Directories:**

- Feature-based: `components/`, `api/`, `auth/` organize by feature
- Resource-based: `api/reminders/`, `api/slack/`, `api/webhooks/` for REST resources
- Utility-based: `lib/`, `hooks/`, `scripts/` for shared code

**Functions:**

- Database: `get[Entity]()`, `create[Entity]()`, `update[Entity]()`, `delete[Entity]()` (query functions)
- Slack: `send[Message]()`, `sendInteractive()` (action verbs)
- Handlers: `handle[Event]()` (event names)

**Variables:**

- State: `[feature]` or `show[Feature]` (lowercase)
- Context/API response: `[entity]`, `[entities]` (singular/plural)
- Booleans: `is[State]`, `show[Feature]`, `loading` prefixes
- Supabase: `supabase`, `user`, `session` (common patterns)

## Where to Add New Code

**New Feature (e.g., "Reminders with tags"):**

- Primary code: `lib/db.ts` - add functions like `addTagToReminder()`, `getTagsByReminder()`
- UI: `components/ReminderForm.tsx` - add tag input field, `components/ReminderList.tsx` - display tags
- API: `app/api/reminders/[id]/route.ts` - add PATCH action for tag updates
- Database: `migrations/007-add-tags.sql` - add tags column and RLS policy
- Tests: `app/api/reminders/__tests__/tags.test.ts` (if tests added later)

**New Component:**

- Location: `components/[FeatureName].tsx`
- Style: Match existing patterns - 'use client' directive, useMediaQuery for responsive, export default function
- Props interface: Define at top, name as `[ComponentName]Props`
- Integration: Import in parent component, pass required props

**New API Endpoint (e.g., GET /api/stats):**

- Location: `app/api/stats/route.ts` (follows resource-based structure)
- Pattern: Import createClient, verify auth, use db functions, return JSON
- Auth: Check `const { data: { user } } = await supabase.auth.getUser()` at top
- Error handling: Try-catch, return error JSON with status codes

**New Database Functionality:**

- Location: `lib/db.ts`
- Export type interfaces at top (line 1-70)
- Export async functions mid-file with clear naming
- Pattern: Create Supabase query, handle errors, return typed result
- No RLS check in db functions - RLS enforced at database level

**New Hook:**

- Location: `hooks/use[Feature].ts`
- Pattern: Follow `useMediaQuery.ts` - export default function returning hook
- Export custom types if needed

**Utility Functions:**

- Slack utilities: `lib/slack.ts` or `lib/slack-interactive.ts`
- UI styles: `lib/neoBrutalismStyles.ts`
- Date/formatting: Add to relevant lib file or component

## Special Directories

**migrations/**
- Purpose: SQL schema definitions
- Generated: No
- Committed: Yes - source of truth for database schema
- Setup: Run via `npm run setup-db` which executes scripts that apply migrations
- Pattern: Numbered files (001, 002, etc.) applied in order

**scripts/**
- Purpose: One-time setup and database operations
- Generated: No
- Committed: Yes
- Usage: Run manually with Node.js, not part of normal app flow
- Examples: `setup-database.js` initializes Supabase tables

**.planning/codebase/**
- Purpose: Architecture and codebase analysis documents
- Generated: Yes - by GSD commands
- Committed: Yes - shared with team
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md

**.next/**
- Purpose: Next.js build output
- Generated: Yes - by `npm run build`
- Committed: No - in .gitignore

---

*Structure analysis: 2026-02-04*
