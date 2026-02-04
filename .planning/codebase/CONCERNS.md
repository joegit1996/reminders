# Codebase Concerns

**Analysis Date:** 2026-02-04

## Tech Debt

**Hardcoded Fallback URLs:**
- Issue: Default Vercel app URLs are hardcoded as fallbacks in multiple locations instead of using environment variables consistently
- Files: `app/api/agent/route.ts` (line 310), `app/api/reminders/route.ts` (line 195), `lib/slack.ts` (line 29), `app/api/cron/send-reminders/route.ts` (line 109)
- Impact: If the app domain changes, multiple places need updates. Risk of incorrect URLs being used in production.
- Fix approach: Create a utility function that consistently returns the base URL with proper fallback logic, use it everywhere. Store in `lib/config.ts`.

**Agent Route Complexity:**
- Issue: `/app/api/agent/route.ts` is 1206 lines long with nested function definitions, complex control flow with multiple approval flows, and fallback model logic
- Files: `app/api/agent/route.ts`
- Impact: Difficult to test, maintain, and debug. High risk of logic errors in approval/rejection flows.
- Fix approach: Extract approval flow logic to separate function, extract fallback model handler to `lib/openrouter-client.ts`, move function definitions to `lib/agent-functions.ts`.

**Inconsistent Error Details Exposure:**
- Issue: Some API routes expose raw error details to clients (e.g., `details: String(error)`), others don't
- Files: `app/api/reminders/route.ts` (lines 180-181, 237-238), `app/api/agent/route.ts` (lines 651-656)
- Impact: Information disclosure risk - error messages may contain sensitive implementation details
- Fix approach: Remove `details` field from error responses, log full errors server-side only. Create consistent error response format.

**Dynamic Imports in Route Handlers:**
- Issue: Function handlers use `await import()` for db, slack, and slack-interactive functions instead of importing at top
- Files: `app/api/agent/route.ts` (lines 272-274, 361, 214, 230, 297, 314), `lib/slack.ts`, `lib/slack-interactive.ts`
- Impact: Harder to understand dependencies, potential circular import issues, slightly slower at runtime
- Fix approach: Use static imports at module level for all standard dependencies.

## Known Bugs

**Slack DM User Resolution Incomplete:**
- Symptoms: When using AI agent to create reminders for DMs, if user name can't be resolved from the users.list response, the DM won't be included in channel list
- Files: `app/api/agent/route.ts` (lines 415-426)
- Trigger: Users without proper `display_name`, `real_name`, or `name` fields in Slack profile; bot token missing users:read scope
- Workaround: Ensure Slack app has users:read scope and user profiles have display names set
- Root cause: Only adding DMs where `userMapForAgent.get(dm.user)` succeeds; no fallback for missing user names

**Hardcoded Primary Model String:**
- Symptoms: OpenRouter model reference uses 'z-ai/glm-4.5-air:free' which may not be available if the model is deprecated
- Files: `app/api/agent/route.ts` (line 554)
- Trigger: Model becomes unavailable or deprecated on OpenRouter
- Workaround: Update fallback model to be checked first, manually update model strings in code
- Root cause: Model names hardcoded instead of configurable via environment

## Security Considerations

**Slack Webhook URL Validation Too Permissive:**
- Risk: Webhook URL validation only checks prefix `https://hooks.slack.com/` but doesn't validate full format or attempt to verify ownership
- Files: `app/api/reminders/route.ts` (lines 83-87, 92-99, 118-122, 134-138)
- Current mitigation: Basic prefix check, HTTPS required
- Recommendations:
  - Validate webhook URL format more strictly
  - Consider storing webhook URLs encrypted at rest
  - Add rate limiting on webhook POST operations
  - Log all webhook creation/deletion with timestamps

**Missing CSRF Protection on Non-API Endpoints:**
- Risk: Middleware allows authenticated users on protected routes but doesn't verify Origin/Referer headers on state-changing operations
- Files: `middleware.ts`
- Current mitigation: Supabase session tokens provide some protection, RLS policies on database
- Recommendations:
  - Add Origin header validation on POST/PUT/DELETE endpoints
  - Verify request came from same domain

**OPENROUTER_API_KEY Not Validated Until Runtime:**
- Risk: If API key is missing or empty string, error only surfaced when agent endpoint called
- Files: `app/api/agent/route.ts` (line 543-547)
- Current mitigation: Error returned with status 500
- Recommendations:
  - Validate all critical env vars at server startup (create `lib/validate-env.ts`)
  - Fail fast on missing configuration
  - Add health check endpoint that verifies all dependencies

**Cron Secret Comparison Not Constant-Time:**
- Risk: String comparison on line 33 of cron route is not constant-time, vulnerable to timing attacks
- Files: `app/api/cron/send-reminders/route.ts` (line 33)
- Current mitigation: Cron runs as privileged endpoint
- Recommendations:
  - Use crypto.timingSafeEqual() for secret comparison
  - Consider adding request IP allowlist for additional protection

**Service Client Bypasses RLS Intentionally:**
- Risk: Service client in cron job bypasses RLS policies as design choice - if compromised could affect all users' data
- Files: `app/api/cron/send-reminders/route.ts` (line 62), `app/api/slack/interactions/route.ts` (line 41), `lib/db.ts` comment at line 341
- Current mitigation: Cron secret + Vercel cron headers required, Slack interaction uses signature verification
- Recommendations:
  - Minimize service client usage
  - Log all service client queries to audit trail
  - Consider using row-level policies even with service client (if possible with Supabase)

## Performance Bottlenecks

**N+1 Query Pattern in Automated Messages:**
- Problem: For each automated message, code calls getReminderById() separately instead of doing bulk fetch
- Files: `lib/db.ts` (lines 368-400) - getAutomatedMessagesToSend loops and processes each reminder individually
- Cause: getAutomatedMessagesToSend fetches all reminders then processes in memory
- Improvement path:
  - Add `get_reminders_with_automated_messages` database query that pre-filters
  - Cache automated message checks in separate table if frequency becomes issue

**Memory Inefficiency in Agent Conversation History:**
- Problem: Stores full conversation history in request body, limits to 10 messages but could still be large with long content
- Files: `app/api/agent/route.ts` (lines 680-688)
- Cause: No compression, full message objects stored with tool calls and results
- Improvement path:
  - Store conversation history server-side in database
  - Pass only conversation ID in subsequent requests
  - Implement message pagination/truncation

**Missing Database Indexes:**
- Problem: Common queries filter/order by `is_complete`, `due_date`, `user_id`, `created_at` without visible index definitions
- Files: `lib/db.ts` (lines 81-89, 93-101, 342-365)
- Cause: No index definitions in migration files found
- Improvement path:
  - Create indexes on `(user_id, is_complete)`, `(user_id, due_date)`, `(created_at)`
  - Add to migration file

**Cron Job Creates N Slack Connections Map:**
- Problem: For every cron run, all Slack connections fetched and mapped to memory
- Files: `app/api/cron/send-reminders/route.ts` (lines 79-82)
- Cause: Design choice to avoid per-reminder lookup
- Improvement path:
  - If >100 reminders, use faster index-based lookup instead of Map
  - Consider pre-filtering reminders by team_id

## Fragile Areas

**Slack Channel List Resolution:**
- Files: `app/api/agent/route.ts` (lines 359-432)
- Why fragile: Depends on multiple Slack API calls (users.list, conversations.list, conversations.list for DMs) with no retry logic. If any fails, entire list fails.
- Safe modification:
  - Add try-catch around each API call with partial results
  - Return available channels even if some calls fail
  - Test with invalid/revoked tokens
- Test coverage: No unit tests for this logic

**Approval Flow in Agent:**
- Files: `app/api/agent/route.ts` (lines 599-664, 1044-1115)
- Why fragile: Two separate approval flows (initial and follow-up) with similar but slightly different logic. Easy to accidentally diverge. No unit tests.
- Safe modification:
  - Extract common approval logic to shared function
  - Unit test approval flow independently
  - Add integration tests for multi-step approval scenarios

**Reminder Due Date Update Cascade:**
- Files: `lib/db.ts` (lines 169-258)
- Why fragile: Updating due date triggers: reminder update, log creation, delay message send (with fallback), automated message reset. Multiple failure points.
- Safe modification:
  - Wrap entire flow in transaction if Supabase supports it
  - Add explicit error logging for each step
  - Test with invalid channel IDs, revoked tokens, failed HTTP requests

**Slack Message Formatting with User Input:**
- Files: `lib/slack-interactive.ts` (lines 53-98), `lib/slack.ts` (lines 57-74)
- Why fragile: Reminder text and description inserted directly into Slack block text without sanitization
- Safe modification:
  - Escape markdown special characters in user input
  - Add input length limits
  - Test with malicious markdown/special characters

## Scaling Limits

**Agent Route Single Request Processing:**
- Current capacity: Single agent request processes entire conversation history + new message
- Limit: ~10 message history limit could be insufficient for long conversations; no pagination/streaming
- Scaling path:
  - Implement server-side conversation storage with IDs
  - Add message pagination/summarization for long histories
  - Consider WebSocket streaming for real-time responses

**Reminder Batch Size in Cron:**
- Current capacity: All active reminders fetched and processed in memory
- Limit: If >10K reminders, memory and processing time become problematic
- Scaling path:
  - Implement batch processing (process 100 reminders at a time)
  - Add database cursor/offset pagination
  - Consider separate cron jobs by date ranges

**Slack API Rate Limits:**
- Current capacity: No rate limiting on outbound Slack messages
- Limit: Slack workspace may hit rate limits if >100 reminders sent in single cron run
- Scaling path:
  - Add queuing system for Slack message delivery
  - Implement exponential backoff on rate limit errors
  - Add per-user rate limiting

## Dependencies at Risk

**OpenRouter API Dependency:**
- Risk: Hard dependency on OpenRouter/DeepSeek for AI agent. If service down, agent unusable.
- Impact: Agent page becomes non-functional, but app core reminder functionality still works
- Migration plan:
  - Make model provider configurable via env var
  - Support multiple LLM providers (OpenRouter, OpenAI, Anthropic)
  - Gracefully degrade to webhook-only reminders if agent fails

**Supabase Version Pinning:**
- Risk: `@supabase/supabase-js` at ^2.39.3 could have breaking changes in minor/patch
- Impact: Potential RLS policy issues, API changes, security patches delayed
- Migration plan:
  - Pin to exact version in production (2.39.3)
  - Test major updates in staging before deploying
  - Set up dependabot alerts

**date-fns Dependency:**
- Risk: Sole dependency for date manipulation, only used in a few places
- Impact: If abandoned/compromised, could affect date parsing accuracy
- Migration plan:
  - Could migrate to native Date APIs or date-fns-tz if needed
  - Currently low risk as package is stable and widely used

## Missing Critical Features

**No Persistence of Failed Slack Messages:**
- Problem: If Slack message send fails (bad token, deleted channel), no record kept for retry
- Blocks: Can't reliably re-send to failed channels, no audit trail of failures
- Recommendation: Add `failed_sends` table tracking failed reminder sends with reason and retry count

**No Webhook Signature Validation:**
- Problem: When app sends completion/delay messages to customer webhooks, no way for customer to verify messages came from app
- Blocks: Customers vulnerable to message spoofing
- Recommendation: Add HMAC signature header (like Slack does) for all outbound webhook POSTs

**No Rate Limiting on API Routes:**
- Problem: No per-user or per-IP rate limiting on reminder creation, deletion, updates
- Blocks: Potential for abuse, DoS attacks
- Recommendation: Add middleware for rate limiting (e.g., using Upstash Redis)

**No Audit Trail:**
- Problem: No logging of user actions (create/delete/update reminders, Slack connections)
- Blocks: Can't investigate user issues, detect unauthorized access, or meet compliance requirements
- Recommendation: Add `audit_logs` table, log all user mutations with timestamps and user IDs

## Test Coverage Gaps

**No Unit Tests:**
- What's not tested: Database functions (`lib/db.ts`), Slack utilities (`lib/slack.ts`, `lib/slack-interactive.ts`), agent function execution logic
- Files: All lib/*.ts files and critical routes
- Risk: Refactoring breaks functionality silently, edge cases in date calculation or message formatting uncaught
- Priority: HIGH - agent route and db functions are critical path

**No Integration Tests:**
- What's not tested: Slack OAuth flow, agent with actual Slack API calls (mocked), cron job end-to-end
- Files: `app/api/slack/oauth-callback/route.ts`, `app/api/agent/route.ts`, `app/api/cron/send-reminders/route.ts`
- Risk: OAuth flow could have silent failures, agent approval flow logic could diverge
- Priority: HIGH - OAuth and agent are user-facing

**No E2E Tests:**
- What's not tested: Full user journey (create reminder → cron sends → mark complete → completion message)
- Risk: Multiple components could be broken without detection
- Priority: MEDIUM - less critical than unit/integration but still important

**No Error Scenario Tests:**
- What's not tested: Slack API failures, network timeouts, invalid tokens, rate limits, database errors
- Risk: Error handling paths never tested, could fail in production
- Priority: MEDIUM - error handling is critical but often overlooked

---

*Concerns audit: 2026-02-04*
