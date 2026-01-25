# AI Agent Setup Guide

## Overview

The AI Agent feature allows you to interact with your reminders app using natural language. Powered by Google's Gemini AI, you can create, update, search, and manage reminders through conversational commands.

## Setup

### 1. Get a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Add Environment Variable

Add your Gemini API key to your environment variables:

**For local development** (`.env.local`):
```
GEMINI_API_KEY=your_gemini_api_key_here
```

**For Vercel deployment**:
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add `GEMINI_API_KEY` with your API key value
4. Redeploy your application

### 3. Set Base URL (for production)

If deploying to Vercel, also set:
```
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
```

This allows the agent to make internal API calls correctly.

## Available Actions

The agent can perform the following actions:

### 1. **Create Reminder**
- **Example**: "Create a reminder to review the project proposal due on February 15th, remind me every 3 days"
- **Example**: "Add a reminder called 'Team Meeting' due March 1st, send reminders every 2 days to webhook Youssef Emad"

### 2. **List Reminders**
- **Example**: "Show me all reminders"
- **Example**: "List all active reminders"
- **Example**: "Show completed reminders"

### 3. **Get Reminder Details**
- **Example**: "Show me details of reminder #5"
- **Example**: "What's reminder 3?"

### 4. **Update Due Date**
- **Example**: "Update the due date for reminder #1 to March 15th"
- **Example**: "Change the due date of 'test reminder' to February 20th"

### 5. **Complete Reminder**
- **Example**: "Mark reminder #2 as complete"
- **Example**: "Complete the reminder about the project proposal"

### 6. **Search Reminders**
- **Example**: "Find reminders about 'project'"
- **Example**: "Show reminders for webhook 'Youssef Emad'"
- **Example**: "Search for reminders containing 'meeting'"

### 7. **Delete Reminder**
- **Example**: "Delete reminder #3"
- **Example**: "Remove the reminder about the proposal"

### 8. **List Webhooks**
- **Example**: "Show me all saved webhooks"
- **Example**: "What webhooks do I have?"

### 9. **Update Delay Configuration**
- **Example**: "Set delay message for reminder #1 to 'Project delayed, new date: DD.MM.YYYY'"
- **Example**: "Configure delay webhooks for reminder #2"
- **Example**: "Update delay settings for reminder #3 with message 'Unfortunately delayed' and webhook [webhook-url]"

### 10. **Update Automated Messages**
- **Example**: "Add an automated message to reminder #1 that sends 7 days before due date"
- **Example**: "Set automated messages for reminder #2: send 'Project starting soon' 3 days before"
- **Example**: "Update automated messages for reminder #3 to send 'Final reminder' 1 day before"

## How It Works

1. **User Input**: You type a natural language command in the chat interface
2. **Gemini Processing**: The Gemini model analyzes your request and determines which function(s) to call
3. **Function Execution**: The agent calls the appropriate API endpoints to perform the action
4. **Response**: The agent provides a natural language response about what was done

## Function Calling

The agent uses Gemini's function calling capability to:
- Parse natural language into structured function calls
- Execute actions on your reminders
- Provide helpful responses about what was done

## Example Conversations

**Creating a reminder:**
```
You: Create a reminder to finish the quarterly report due on March 1st, remind me every 2 days

Agent: ✓ Executed: create_reminder
I've created a reminder "finish the quarterly report" due on March 1st. 
It will send reminders every 2 days to your Slack webhook.
```

**Creating a reminder with delay and automated messages:**
```
You: Create a reminder "Project Launch" due on April 1st, remind every 3 days, 
with delay message "Project delayed, new date: DD.MM.YYYY" sent to webhook [url],
and automated message "Project starting soon" sent 7 days before to webhook [url]

Agent: ✓ Executed: create_reminder
I've created the reminder with delay configuration and automated messages set up.
```

**Updating a reminder:**
```
You: Update reminder #1's due date to March 15th

Agent: ✓ Executed: update_reminder_due_date
I've updated reminder #1's due date to March 15th. 
If you have delay messages configured, they will be sent automatically.
```

**Searching reminders:**
```
You: Show me reminders about "report"

Agent: ✓ Executed: search_reminders
I found 2 reminders matching "report":
1. finish the quarterly report (Due: March 1st)
2. review annual report (Due: April 1st)
```

**Updating delay configuration:**
```
You: Set delay message for reminder #1 to "Unfortunately the project will be delayed, new expected due date is DD.MM.YYYY" 
and send it to webhook [url]

Agent: ✓ Executed: update_delay_config
I've updated the delay configuration for reminder #1. The delay message will be sent 
whenever the due date is updated.
```

**Updating automated messages:**
```
You: Add an automated message to reminder #1 that sends "Project starting soon" 
7 days before the due date to webhook [url]

Agent: ✓ Executed: update_automated_messages
I've updated the automated messages for reminder #1. The message will be sent 
7 days before the due date.
```

## Technical Details

### API Endpoint
- **Route**: `/api/agent`
- **Method**: `POST`
- **Body**: 
  ```json
  {
    "message": "your natural language command",
    "conversationHistory": [] // optional, for context
  }
  ```

### Function Definitions
The agent has access to 10 functions:
1. `create_reminder` - Create new reminders (supports delay config and automated messages)
2. `list_reminders` - Get all reminders (with filters)
3. `get_reminder` - Get specific reminder details
4. `update_reminder_due_date` - Update due dates
5. `complete_reminder` - Mark reminders as complete
6. `search_reminders` - Search by text or webhook
7. `delete_reminder` - Delete reminders
8. `list_webhooks` - Get saved webhooks
9. `update_delay_config` - Update delay message and webhooks
10. `update_automated_messages` - Update automated messages configuration

### Model Used
- **Model**: `gemini-1.5-pro`
- **Features**: Function calling, conversation history

## Troubleshooting

### "GEMINI_API_KEY not configured"
- Make sure you've added the API key to your environment variables
- Restart your development server after adding the key
- For production, ensure the key is set in Vercel environment variables

### Agent doesn't understand commands
- Try rephrasing your request
- Be specific about reminder IDs or names
- Include dates in a clear format (e.g., "March 15th" or "2024-03-15")

### Function calls fail
- Check that required fields are provided (webhook URL, due date, etc.)
- Ensure webhook URLs are valid Slack webhook URLs
- Verify reminder IDs exist before updating/deleting

## Security Considerations

- The agent runs server-side and has full access to your reminders
- API keys should be kept secret and never exposed to the client
- Consider adding authentication/authorization if needed
- The agent can delete reminders, so use with caution

## Future Enhancements

Potential improvements:
- Support for updating delay messages and automated messages via agent
- Bulk operations (e.g., "complete all reminders due this week")
- Natural language date parsing improvements
- Webhook name resolution from natural language
- Conversation memory across sessions
