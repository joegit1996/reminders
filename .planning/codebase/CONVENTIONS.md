# Coding Conventions

**Analysis Date:** 2026-02-04

## Naming Patterns

**Files:**
- PascalCase for components: `ReminderForm.tsx`, `ChannelSelector.tsx`, `UpdateDueDateModal.tsx`
- camelCase for utilities and hooks: `useMediaQuery.ts`, `slack.ts`, `db.ts`
- kebab-case for API routes: `oauth-callback`, `send-reminders`, `slack-interactive` (module names, not files)
- Index files use `page.tsx` for Next.js routes: `app/page.tsx`, `app/agent/page.tsx`

**Functions:**
- camelCase for all functions: `fetchReminders()`, `handleSubmit()`, `markReminderComplete()`
- Async functions follow same naming: `fetchConversations()`, `createReminder()`
- Event handlers use `handle` prefix: `handleComplete()`, `handleDelete()`, `handleReminderCreated()`
- Fetch functions use `fetch` prefix: `fetchReminders()`, `fetchSavedWebhooks()`

**Variables:**
- camelCase for local variables: `isMobile`, `isOpen`, `selectedReminder`, `formData`
- Constants in UPPER_SNAKE_CASE when defined at module level (rarely used; mostly inline)
- Boolean variables use descriptive names: `isComplete`, `showDelayConfig`, `hideCompleted`, `needsReconnect`
- State setters follow React convention: `const [reminders, setReminders] = useState([])`

**Types:**
- PascalCase for interfaces and types: `Reminder`, `SavedWebhook`, `SlackConnection`, `ReminderListProps`
- Suffix `Props` for component prop interfaces: `ReminderFormProps`, `ChannelSelectorProps`
- Suffix for specific types: `ReminderListProps`, `ActionFormFieldsProps`
- Database types often include suffix like `Log`, `Message`: `DueDateUpdateLog`, `AutomatedMessage`

## Code Style

**Formatting:**
- No explicit formatter config detected (no `.prettierrc`, `eslint.config.js`, or `biome.json`)
- Implied style based on codebase:
  - 2-space indentation (observed in components)
  - Semicolons used at end of statements
  - Single quotes for strings in most cases (e.g., `'use client'`, `'text'`)
  - Double quotes in JSX attributes
  - Trailing commas in objects/arrays when multiline

**Linting:**
- `eslint` and `eslint-config-next` installed in devDependencies
- Run via `npm run lint` (calls `next lint`)
- No custom eslint config file found; uses Next.js defaults
- TypeScript strict mode enabled (`"strict": true` in tsconfig.json)

## Import Organization

**Order:**
1. React and Next.js built-in imports
2. Third-party libraries (date-fns, openai, @supabase/supabase-js)
3. Aliased imports from `@/` (lib, components, hooks)
4. Type imports (rarely separated)

**Examples from codebase:**

```typescript
// app/page.tsx
import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import Link from 'next/link';
import ReminderForm from '@/components/ReminderForm';
import { useMediaQuery } from '@/hooks/useMediaQuery';
```

```typescript
// components/ReminderForm.tsx
import { useState, useEffect } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { neoStyles, neoColors, buttonVariants } from '@/lib/neoBrutalismStyles';
import ChannelSelector from './ChannelSelector';
```

```typescript
// app/api/reminders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAllReminders, createReminder } from '@/lib/db';
```

**Path Aliases:**
- `@/*` maps to root directory (configured in tsconfig.json)
- Used for: `@/components/`, `@/lib/`, `@/hooks/`, `@/app/`
- Relative imports used within same directory (e.g., `import ChannelSelector from './ChannelSelector'`)

## Error Handling

**Patterns:**
- Try-catch blocks in async functions with specific error handling
- Console.error() for logging errors: `console.error('Error fetching reminders:', error)`
- Error context in logs: `console.error('[REMINDERS API] Error:', error)` with prefix in square brackets
- NextResponse.json with status codes for API errors: `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`
- Validation errors return 400 status; authorization errors return 401; server errors return 500
- Error messages passed to user via response: `{ error: 'Failed to fetch reminders' }`
- User alerts via `alert()` or state for display (e.g., `setError()`)

**Examples:**

```typescript
// Component error handling
try {
  const response = await fetch('/api/reminders');
  if (response.ok) {
    const data = await response.json();
    setReminders(data);
  }
} catch (error) {
  console.error('Error fetching reminders:', error);
}
```

```typescript
// API route validation
if (!text || !dueDate || !periodDays) {
  return NextResponse.json(
    { error: 'Missing required fields (text, dueDate, periodDays)' },
    { status: 400 }
  );
}
```

```typescript
// API route try-catch with context
try {
  const reminder = await createReminder(/* params */);
} catch (dbError) {
  console.error('[REMINDERS API] Database error creating reminder:', dbError);
  return NextResponse.json(
    { error: 'Failed to save reminder to database', details: String(dbError) },
    { status: 500 }
  );
}
```

## Logging

**Framework:** `console` (no dedicated logging library)

**Patterns:**
- Prefix logs with component/route context: `[REMINDERS API]`, `[SLACK OAUTH]`, `[SLACK INTERACTIONS]`
- Errors logged with `console.error()`: `console.error('[SLACK OAUTH] Error:', error)`
- Warnings logged with `console.warn()`: `console.warn('[REMINDERS API] Failed to send Slack reminder via webhook')`
- Info/debug rarely used; some `console.log()` for output messages
- Errors always include context: what failed, where, and error details
- No sensitive data logged (tokens, webhook URLs not logged as-is)

**Examples from codebase:**

```typescript
console.error('[REMINDERS API] Unexpected error:', error);
console.error('Error sending delay message via Slack API:', error);
console.warn('[REMINDERS API] Failed to send Slack reminder via webhook');
console.log('[SLACK CHANNELS] Getting channels for user with missing access token');
```

## Comments

**When to Comment:**
- Rare in the codebase; code is generally self-documenting
- Comments used for explaining non-obvious logic or design decisions
- Comments used for marking work-in-progress or debugging aids

**JSDoc/TSDoc:**
- Not used extensively
- Type annotations provide most documentation
- Interface/type definitions include purpose in naming

**Examples:**

```typescript
// Get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

```typescript
// Use frozen value for completed reminders, otherwise calculate dynamically
const daysRemaining = reminder.is_complete && reminder.days_remaining_at_completion !== null
  ? reminder.days_remaining_at_completion
  : calculateDaysRemaining(reminder.due_date);
```

```typescript
// Reset automated messages sent status when due date is updated
if (updatedReminder.automated_messages && Array.isArray(updatedReminder.automated_messages)) {
```

## Function Design

**Size:**
- Functions are generally moderate length (20-100 lines in components)
- Longer functions appear in API routes where validation and db operations are inline
- Some functions exceed 600+ lines when including nested JSX rendering (e.g., `ReminderForm.tsx`)

**Parameters:**
- Named parameters preferred: functions accept explicit arguments
- Object destructuring used in prop patterns: `({ onReminderCreated }: ReminderFormProps)`
- Default parameters used for optional values: `placeholder = 'Search channels...'`, `disabled = false`
- Type annotations on all function parameters

**Return Values:**
- Explicit return statements (not relying on implicit returns)
- Async functions return promises typed appropriately
- Void functions used for event handlers and state setters
- API routes return `NextResponse.json()` with typed responses

**Examples:**

```typescript
// Component function with destructured props
export default function ReminderForm({ onReminderCreated }: ReminderFormProps) {
  // ...
}

// DB function with multiple parameters
export async function createReminder(
  supabase: SupabaseClient,
  userId: string,
  text: string,
  dueDate: string,
  periodDays: number,
  slackWebhook: string,
  description?: string | null,
): Promise<Reminder> {
  // ...
}

// Handler function with return type
const handleReminderCreated = () => {
  fetchReminders();
};
```

## Module Design

**Exports:**
- Named exports used for utilities and types: `export interface Reminder { ... }`
- Default exports used for React components: `export default function ReminderForm(...)`
- Default export for Next.js route handlers: `export async function GET()`, `export async function POST()`
- Barrel files used in lib: `export async function createReminder(...) { ... }`, `export async function markReminderComplete(...) { ... }`

**Barrel Files:**
- No explicit barrel files (index.ts) observed
- All exports directly from source files
- `lib/db.ts` acts as barrel file for all database operations (90+ function definitions)
- `lib/neoBrutalismStyles.ts` exports design system constants

**Patterns:**

```typescript
// lib/db.ts - large module with many exports
export async function getActiveReminders(supabase: SupabaseClient): Promise<Reminder[]> { ... }
export async function getAllReminders(supabase: SupabaseClient): Promise<Reminder[]> { ... }
export async function getReminderById(supabase: SupabaseClient, id: number): Promise<Reminder | null> { ... }
// ... many more functions
```

```typescript
// lib/neoBrutalismStyles.ts - constants export
export const neoColors = { ... };
export const neoStyles = { ... };
export const buttonVariants = { ... };
```

```typescript
// components/ReminderForm.tsx - default export
export default function ReminderForm({ onReminderCreated }: ReminderFormProps) { ... }
```

```typescript
// app/api/reminders/route.ts - handler exports
export async function GET() { ... }
export async function POST(request: NextRequest) { ... }
```

---

*Convention analysis: 2026-02-04*
