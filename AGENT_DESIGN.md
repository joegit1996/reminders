# AI Agent Design for Reminders App

## Available Actions

### 1. **Create Reminder**
- **Endpoint**: `POST /api/reminders`
- **Required Fields**: 
  - `text` (string): Reminder text
  - `dueDate` (string): Due date (YYYY-MM-DD format)
  - `periodDays` (number): Days between reminders (min: 1)
  - `slackWebhook` (string): Slack webhook URL
- **Optional Fields**:
  - `description` (string): Additional description
  - `delayMessage` (string): Message sent when due date is updated
  - `delayWebhooks` (string[]): Webhooks for delay messages
  - `automatedMessages` (array): Pre-due-date automated messages

### 2. **List Reminders**
- **Endpoint**: `GET /api/reminders`
- Returns all reminders

### 3. **Get Reminder Details**
- **Endpoint**: `GET /api/reminders/[id]`
- Returns specific reminder details

### 4. **Update Reminder**
- **Endpoint**: `PATCH /api/reminders/[id]`
- **Actions**:
  - `complete`: Mark reminder as complete
  - `update-due-date`: Update the due date
  - `update-delay-config`: Update delay message and webhooks
  - `update-automated-messages`: Update automated messages

### 5. **Get Reminder Update Logs**
- **Endpoint**: `GET /api/reminders/[id]/logs`
- Returns history of due date updates

### 6. **List Saved Webhooks**
- **Endpoint**: `GET /api/webhooks`
- Returns all saved webhooks with names

### 7. **Create/Update/Delete Webhook**
- **Endpoints**: `POST /api/webhooks`, `PATCH /api/webhooks/[id]`, `DELETE /api/webhooks/[id]`

## Natural Language Examples

- "Create a reminder to review the project proposal due on February 15th, remind me every 3 days"
- "Show me all reminders"
- "Mark reminder #5 as complete"
- "Update the due date for 'test reminder' to March 1st"
- "What reminders are due this week?"
- "Delete reminder #3"

## Implementation Plan

1. **API Endpoint**: `/api/agent` - Accepts natural language, uses Gemini to parse and execute
2. **Gemini Integration**: Use Google's Gemini API with function calling
3. **UI Component**: Chat interface for interacting with the agent
4. **Function Definitions**: Define available functions for Gemini to call
