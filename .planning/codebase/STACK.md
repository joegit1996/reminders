# Technology Stack

**Analysis Date:** 2026-02-04

## Languages

**Primary:**
- TypeScript 5.5.3 - Full application codebase (React components, Next.js API routes, server utilities)
- JSX/TSX - React component authoring

**Secondary:**
- JavaScript - Configuration files (`next.config.js`, database setup scripts)
- SQL - Database schema and migrations (PostgreSQL via Supabase)

## Runtime

**Environment:**
- Node.js (version not explicitly pinned, inferred from typescript setup)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 14.2.15 - Full-stack framework (server-side rendering, API routes, middleware)
- React 18.3.1 - UI component framework
- React DOM 18.3.1 - DOM rendering

**Backend/Database:**
- @supabase/supabase-js 2.39.3 - PostgreSQL database client (Supabase)
- @supabase/ssr 0.8.0 - Server-side authentication and cookie management
- pg 8.17.2 (devDependency) - PostgreSQL client for database setup scripts

**Utilities:**
- date-fns 3.6.0 - Date parsing and formatting

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.39.3 - Core database and authentication. Provides client for user auth, data queries via PostgreSQL
- openai 6.16.0 - OpenAI SDK used for OpenRouter API calls (chat completions with function calling for AI agent)
- @google/generative-ai 0.24.1 - Google Generative AI SDK (imported but usage pattern not detected in examined files; likely for Gemini fallback)

**Infrastructure:**
- @supabase/ssr 0.8.0 - Server-side session management and cookie handling for Next.js SSR
- @types/node 20.14.10 - TypeScript definitions for Node.js
- @types/react 18.3.3 - TypeScript definitions for React
- @types/react-dom 18.3.0 - TypeScript definitions for React DOM

**Development:**
- eslint 8.57.0 - JavaScript linter
- eslint-config-next 14.2.5 - Next.js ESLint configuration
- typescript 5.5.3 - TypeScript compiler

## Configuration

**Environment:**
- `.env.local` file (not committed, contains runtime secrets)
- `.env.example` committed with template of required variables
- Environment variables include:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public)
  - `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin/cron operations (private)
  - `NEXT_PUBLIC_BASE_URL` - Application URL for redirects
  - `CRON_SECRET` - Secret for verifying cron requests
  - `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET` - Slack OAuth credentials
  - `OPENROUTER_API_KEY` - OpenRouter API key for AI agent
  - `DEEPSEEK_API_KEY` - DeepSeek API key (imported in .env.local)
  - `GEMINI_API_KEY` - Google Gemini API key
  - `POSTGRES_URL_NON_POOLING` - Direct PostgreSQL connection for schema setup (only in local setup script)

**Build:**
- `tsconfig.json` - TypeScript compiler configuration (strict mode enabled, target ES2020)
- `next.config.js` - Next.js configuration (reactStrictMode enabled)
- `vercel.json` - Vercel deployment configuration with cron job scheduling

## Platform Requirements

**Development:**
- Node.js environment with npm
- TypeScript support
- `.env.local` file with Supabase and Slack credentials
- PostgreSQL database (Supabase project)

**Production:**
- Deployment target: Vercel (configured via `vercel.json` and Vercel CLI integration)
- Cron job support: Vercel Cron (configured for `/api/cron/send-reminders` at `0 10 * * *` daily)
- Environment variables required at deploy time (Supabase URL, keys, Slack OAuth, API keys)

## Architecture Notes

**Next.js App Router:**
- Pages: `app/page.tsx`, `app/login/page.tsx`, `app/settings/page.tsx`, `app/agent/page.tsx`, etc.
- API Routes: `app/api/**/route.ts` (REST endpoints for reminders, Slack OAuth, webhooks, AI agent)
- Middleware: `middleware.ts` for session management

**Database:**
- Schema: PostgreSQL with tables for `reminders`, `saved_webhooks`, `due_date_update_logs`, `slack_connections`
- Auth: Supabase Auth (email/password, OAuth via Slack)
- RLS: Row-level security policies defined in schema

**AI Agent:**
- LLM Engine: OpenRouter (OpenAI-compatible API with fallback models)
- Primary Model: `z-ai/glm-4.5-air:free` with fallback to `meta-llama/llama-3.3-70b-instruct:free`
- Tool Calling: Function definitions for reminder CRUD, Slack channel listing, webhook management

---

*Stack analysis: 2026-02-04*
