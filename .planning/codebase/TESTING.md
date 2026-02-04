# Testing Patterns

**Analysis Date:** 2026-02-04

## Test Framework

**Runner:**
- No test framework detected
- No test files found in codebase
- No jest, vitest, or testing-library dependencies in package.json
- No test configuration files (jest.config.js, vitest.config.ts)

**Status:** Not implemented

**Assertion Library:**
- Not applicable (no tests present)

**Run Commands:**
```bash
npm run lint              # ESLint only (no tests)
npm run dev              # Development server
npm run build            # Build for production
npm start                # Production server
```

## Test File Organization

**Location:**
- Not applicable - no tests present

**Naming:**
- Convention would likely follow: `ComponentName.test.tsx` or `functionName.test.ts`
- Recommended pattern based on Next.js conventions: co-located test files

**Structure:**
- Not established - tests are not implemented

## Test Structure

**Suite Organization:**
- Not applicable - no tests present

**Patterns:**
- Expected pattern (based on React/Next.js conventions):
  ```typescript
  describe('ReminderForm', () => {
    it('should render form fields', () => {
      // test code
    });

    it('should submit reminder on form submit', async () => {
      // test code
    });
  });
  ```

## Mocking

**Framework:**
- Not applicable - no tests present
- Would likely use Jest mocks (built into Jest/Vitest)

**Patterns:**
- Not established

**What to Mock:**
- Expected: API calls via `fetch()`
- Expected: Supabase client operations
- Expected: Next.js router navigation
- Expected: External services (Slack API)

**What NOT to Mock:**
- Expected: Component rendering logic
- Expected: Internal component state management
- Expected: Styling/CSS

## Fixtures and Factories

**Test Data:**
- Not applicable - no tests present

**Location:**
- Would typically live in: `__tests__/fixtures/` or `__tests__/factories/`

**Expected pattern for reminders:**
```typescript
const createMockReminder = (overrides?: Partial<Reminder>): Reminder => ({
  id: 1,
  user_id: 'user-123',
  text: 'Test reminder',
  description: null,
  due_date: '2026-02-05',
  period_days: 1,
  slack_webhook: '',
  slack_channel_id: null,
  slack_channel_name: null,
  // ... other fields with defaults
  ...overrides,
});
```

## Coverage

**Requirements:** Not enforced
- No coverage configuration present
- No CI/CD coverage checks configured

**View Coverage:**
- Not applicable - would use: `npm run test -- --coverage`

## Test Types

**Unit Tests:**
- Not implemented
- Scope would be:
  - Database functions in `lib/db.ts`
  - Utility functions in `lib/slack.ts`, `lib/slack-interactive.ts`
  - Hooks like `useMediaQuery.ts`
  - Component state logic

**Integration Tests:**
- Not implemented
- Scope would be:
  - API routes with database operations (e.g., `/api/reminders` with database)
  - Slack integration flows
  - Form submission end-to-end
  - Component interactions with API calls

**E2E Tests:**
- Not implemented
- Framework: Not selected (would use Playwright, Cypress, or similar)
- Scope would be:
  - User login flow
  - Creating reminders
  - Completing reminders
  - Slack integration flows
  - Calendar views

## Common Patterns

**Async Testing:**
- Not implemented
- Expected pattern with Jest/Vitest:
```typescript
it('should fetch reminders', async () => {
  const response = await fetch('/api/reminders');
  expect(response.ok).toBe(true);
});
```

**Error Testing:**
- Not implemented
- Expected pattern:
```typescript
it('should handle fetch errors', async () => {
  global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));
  // test error handling
});
```

## Testing Recommendations

**Critical Areas Without Tests:**

1. **API Routes** (`app/api/reminders/route.ts`, `app/api/agent/route.ts`)
   - POST/PATCH/DELETE request validation
   - Authentication/authorization checks
   - Database operation error handling
   - Response formatting

2. **Database Operations** (`lib/db.ts`)
   - CRUD operations on reminders, webhooks, Slack connections
   - Complex queries and filters
   - Transaction handling
   - Error propagation

3. **Slack Integration** (`lib/slack.ts`, `lib/slack-interactive.ts`)
   - Message formatting and sending
   - Request signature verification
   - Interactive button handling
   - Webhook vs API message routing

4. **Forms and Components** (`components/ReminderForm.tsx`, `components/ReminderList.tsx`)
   - Form field validation
   - State management
   - Event handler logic
   - Conditional rendering

5. **AI Agent Integration** (`app/api/agent/route.ts`)
   - Function definition parsing
   - OpenRouter API integration
   - Tool execution and results
   - Natural language date parsing

**Test Coverage Gap Analysis:**

| Module | Coverage | Risk |
|--------|----------|------|
| `app/api/reminders/route.ts` | 0% | High - core feature |
| `lib/db.ts` | 0% | High - all data operations |
| `lib/slack-interactive.ts` | 0% | High - user interactions |
| `components/ReminderForm.tsx` | 0% | Medium - user input |
| `components/ReminderList.tsx` | 0% | Medium - display logic |
| `lib/slack.ts` | 0% | Medium - message sending |
| `hooks/useMediaQuery.ts` | 0% | Low - utility hook |

**Recommended Implementation Order:**

1. **Unit Tests** - Start with utility functions and database operations
   - `lib/db.ts` - Database CRUD operations
   - `lib/slack.ts` - Slack message formatting
   - `hooks/useMediaQuery.ts` - Media query hook

2. **Integration Tests** - Test API routes with mocked database
   - `app/api/reminders/route.ts` - Reminder CRUD endpoints
   - `app/api/slack/interactions/route.ts` - Interactive button handling
   - Component + API integration tests

3. **E2E Tests** - Full user flows
   - User authentication and login
   - Create, update, complete reminders
   - Slack integration flows

---

*Testing analysis: 2026-02-04*
