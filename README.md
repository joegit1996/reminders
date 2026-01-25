# Reminders - Slack Task Reminder System

A web application for managing reminders that automatically sends notifications to Slack channels at specified intervals.

## Features

- ✅ Create reminders with custom text, due dates, and reminder periods
- ✅ Automatic Slack notifications with days remaining count
- ✅ Immediate reminder on creation
- ✅ Periodic reminders based on configured interval
- ✅ Update due dates with full history logging
- ✅ Mark reminders as complete to stop notifications
- ✅ Continue reminders even after due date passes (shows negative days)

## Tech Stack

- **Frontend**: Next.js 14 with React and TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Scheduling**: Vercel Cron Jobs

## Setup Instructions

### 1. Clone and Install

```bash
git clone https://github.com/joegit1996/reminders.git
cd reminders
npm install
```

### 2. Set Up Supabase Database

1. Go to [Supabase](https://supabase.com) and sign up/login
2. Create a new project (choose a name and database password)
3. Wait for the project to be set up (takes ~2 minutes)
4. Go to **Project Settings** → **API**
5. Copy your **Project URL** and **anon/public key**
6. Go to **SQL Editor** → **New Query**
7. Copy and paste the contents of `supabase-setup.sql` → **Run**

### 3. Configure Environment Variables

**For Vercel Deployment:**
1. Go to your project in [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL (from step 2)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key (from step 2)
   - `CRON_SECRET` - Generate a random secret: `openssl rand -hex 16`

**For Local Development:**
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
CRON_SECRET="your-random-secret-here"
```

### 4. Deploy to Vercel

✅ **Already deployed!** The app has been pushed to GitHub and deployed to Vercel.

**Next Steps:**
1. Set up Supabase database (see step 2)
2. Run the SQL setup script in Supabase SQL Editor (see `supabase-setup.sql`)
3. Add environment variables in Vercel Dashboard (see step 3)
4. Redeploy to apply environment variables:
   ```bash
   vercel --prod
   ```

### 5. Configure Cron Job

The cron job is configured in `vercel.json` to run daily at 9 AM UTC (Hobby plan compatible):

```json
{
  "crons": [
    {
      "path": "/api/cron/send-reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**Note:** Hobby accounts are limited to daily cron jobs. To run more frequently, upgrade to Pro plan.

Cron schedule format: `minute hour day month weekday`
- `0 9 * * *` = Daily at 9 AM UTC (current)
- `0 12 * * *` = Daily at 12 PM UTC
- For Pro plan: `0 */6 * * *` = Every 6 hours

## Usage

1. **Create a Reminder**:
   - Enter reminder text (e.g., "Get fkautoparts ready and released")
   - Set due date
   - Set period (days between reminders)
   - Add Slack webhook URL

2. **Get Slack Webhook URL**:
   - Go to your Slack workspace
   - Create a new Slack App or use existing one
   - Enable Incoming Webhooks
   - Create a webhook and copy the URL

3. **Manage Reminders**:
   - View all reminders on the main page
   - Update due dates (history is logged)
   - Mark reminders as complete to stop notifications

## API Endpoints

- `GET /api/reminders` - Get all reminders
- `POST /api/reminders` - Create a new reminder
- `GET /api/reminders/[id]` - Get a specific reminder
- `PATCH /api/reminders/[id]` - Update reminder (complete or update due date)
- `GET /api/reminders/[id]/logs` - Get update history for a reminder
- `GET /api/cron/send-reminders` - Cron job endpoint (called automatically)

## Database Schema

### reminders
- `id` (SERIAL PRIMARY KEY)
- `text` (TEXT)
- `due_date` (DATE)
- `period_days` (INTEGER)
- `slack_webhook` (TEXT)
- `is_complete` (BOOLEAN)
- `last_sent` (TIMESTAMP)
- `created_at` (TIMESTAMP)

### due_date_update_logs
- `id` (SERIAL PRIMARY KEY)
- `reminder_id` (INTEGER, FK to reminders)
- `old_due_date` (DATE)
- `new_due_date` (DATE)
- `updated_at` (TIMESTAMP)

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Notes

- Reminders are sent immediately upon creation
- Reminders continue even after the due date passes (shows negative days)
- The cron job checks for reminders that need to be sent based on the `period_days` interval
- All due date updates are logged in the `due_date_update_logs` table
