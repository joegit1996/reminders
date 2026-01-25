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
- **Database**: Vercel Postgres
- **Deployment**: Vercel
- **Scheduling**: Vercel Cron Jobs

## Setup Instructions

### 1. Clone and Install

```bash
git clone https://github.com/joegit1996/reminders.git
cd reminders
npm install
```

### 2. Set Up Vercel Postgres Database

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your project (or create a new one)
3. Go to the **Storage** tab
4. Click **Create Database** → Select **Postgres**
5. Copy the connection strings provided

### 3. Configure Environment Variables

**For Vercel Deployment:**
1. Go to your project in [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:
   - `POSTGRES_URL` - From your Vercel Postgres database
   - `POSTGRES_PRISMA_URL` - From your Vercel Postgres database
   - `POSTGRES_URL_NON_POOLING` - From your Vercel Postgres database
   - `CRON_SECRET` - Generate a random secret: `openssl rand -hex 16`

**For Local Development:**
Create a `.env.local` file in the root directory:

```env
POSTGRES_URL="your_postgres_url"
POSTGRES_PRISMA_URL="your_prisma_url"
POSTGRES_URL_NON_POOLING="your_non_pooling_url"
CRON_SECRET="your-random-secret-here"
```

For local development, you can also use:
```env
DATABASE_URL="your_postgres_url"
```

### 4. Deploy to Vercel

✅ **Already deployed!** The app has been pushed to GitHub and deployed to Vercel.

**Next Steps:**
1. Set up Vercel Postgres database (see step 2)
2. Add environment variables in Vercel Dashboard (see step 3)
3. Redeploy to apply environment variables:
   ```bash
   vercel --prod
   ```

The app will auto-initialize the database tables on first API call.

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
