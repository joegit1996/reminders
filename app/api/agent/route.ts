import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAllReminders, getReminderById, createReminder, markReminderComplete, updateReminderDueDate } from '@/lib/db';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Function definitions for Gemini
const functionDefinitions = [
  {
    name: 'create_reminder',
    description: 'Create a new reminder with text, due date, period, and webhook',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The reminder text/title',
        },
        description: {
          type: 'string',
          description: 'Optional description for the reminder',
        },
        dueDate: {
          type: 'string',
          description: 'Due date in YYYY-MM-DD format',
        },
        periodDays: {
          type: 'number',
          description: 'Number of days between reminders (minimum 1)',
        },
        slackWebhook: {
          type: 'string',
          description: 'Slack webhook URL (must start with https://hooks.slack.com/)',
        },
        delayMessage: {
          type: 'string',
          description: 'Optional message sent when due date is updated',
        },
        delayWebhooks: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional array of webhook URLs for delay messages',
        },
        automatedMessages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              days_before: { type: 'number', description: 'Days before due date to send' },
              title: { type: 'string', description: 'Message title' },
              description: { type: 'string', description: 'Message description' },
              webhook_url: { type: 'string', description: 'Webhook URL to send to' },
            },
            required: ['days_before', 'title', 'description', 'webhook_url'],
          },
          description: 'Optional array of automated messages to send before due date',
        },
      },
      required: ['text', 'dueDate', 'periodDays', 'slackWebhook'],
    },
  },
  {
    name: 'update_delay_config',
    description: 'Update delay message and webhooks for a reminder',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The reminder ID',
        },
        delayMessage: {
          type: 'string',
          description: 'Message sent when due date is updated (will include new due date automatically)',
        },
        delayWebhooks: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of webhook URLs for delay messages',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_automated_messages',
    description: 'Update automated messages for a reminder',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The reminder ID',
        },
        automatedMessages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              days_before: { type: 'number', description: 'Days before due date to send' },
              title: { type: 'string', description: 'Message title' },
              description: { type: 'string', description: 'Message description' },
              webhook_url: { type: 'string', description: 'Webhook URL to send to' },
            },
            required: ['days_before', 'title', 'description', 'webhook_url'],
          },
          description: 'Array of automated messages to send before due date',
        },
      },
      required: ['id', 'automatedMessages'],
    },
  },
  {
    name: 'list_reminders',
    description: 'Get all reminders, optionally filtered',
    parameters: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'Optional filter: "active" (incomplete only), "completed", or "all"',
          enum: ['active', 'completed', 'all'],
        },
      },
    },
  },
  {
    name: 'get_reminder',
    description: 'Get details of a specific reminder by ID',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The reminder ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_reminder_due_date',
    description: 'Update the due date of a reminder',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The reminder ID',
        },
        dueDate: {
          type: 'string',
          description: 'New due date in YYYY-MM-DD format',
        },
      },
      required: ['id', 'dueDate'],
    },
  },
  {
    name: 'complete_reminder',
    description: 'Mark a reminder as complete',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The reminder ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_webhooks',
    description: 'Get all saved webhooks with their names',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'search_reminders',
    description: 'Search reminders by text or filter by webhook name',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to find reminders by text',
        },
        webhookName: {
          type: 'string',
          description: 'Filter by webhook name',
        },
      },
    },
  },
  {
    name: 'delete_reminder',
    description: 'Delete a reminder permanently',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The reminder ID to delete',
        },
      },
      required: ['id'],
    },
  },
];

// Function implementations
async function executeFunction(name: string, args: any) {
  switch (name) {
    case 'create_reminder':
      const reminder = await createReminder(
        args.text,
        args.dueDate,
        args.periodDays,
        args.slackWebhook,
        args.description || null,
        args.delayMessage || null,
        args.delayWebhooks || [],
        []
      );
      // Send immediate reminder
      const { sendSlackReminder } = await import('@/lib/slack');
      await sendSlackReminder(reminder);
      const { updateLastSent } = await import('@/lib/db');
      await updateLastSent(reminder.id);
      return { success: true, reminder };
    
    case 'list_reminders':
      const allReminders = await getAllReminders();
      if (args.filter === 'active') {
        return { reminders: allReminders.filter(r => !r.is_complete) };
      } else if (args.filter === 'completed') {
        return { reminders: allReminders.filter(r => r.is_complete) };
      }
      return { reminders: allReminders };
    
    case 'get_reminder':
      const reminderById = await getReminderById(args.id);
      if (!reminderById) {
        return { error: 'Reminder not found' };
      }
      return { reminder: reminderById };
    
    case 'update_reminder_due_date':
      const result = await updateReminderDueDate(args.id, args.dueDate);
      return { success: true, reminder: result.reminder };
    
    case 'complete_reminder':
      const completed = await markReminderComplete(args.id);
      return { success: true, reminder: completed };
    
    case 'list_webhooks':
      const webhooksRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/webhooks`);
      const webhooks = await webhooksRes.json();
      return { webhooks };
    
    case 'search_reminders':
      const allRemindersForSearch = await getAllReminders();
      let filtered = allRemindersForSearch;
      
      if (args.query) {
        filtered = filtered.filter(r => 
          r.text.toLowerCase().includes(args.query.toLowerCase()) ||
          (r.description && r.description.toLowerCase().includes(args.query.toLowerCase()))
        );
      }
      
      if (args.webhookName) {
        const webhooksRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/webhooks`);
        const webhooks = await webhooksRes.json();
        const webhook = webhooks.find((w: any) => w.name.toLowerCase().includes(args.webhookName.toLowerCase()));
        if (webhook) {
          filtered = filtered.filter(r => r.slack_webhook === webhook.webhook_url);
        }
      }
      
      return { reminders: filtered };
    
    case 'delete_reminder':
      const deleteResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/reminders/${args.id}`, {
        method: 'DELETE',
      });
      if (!deleteResponse.ok) {
        const error = await deleteResponse.json();
        return { error: error.error || 'Failed to delete reminder' };
      }
      return { success: true, message: 'Reminder deleted successfully' };
    
    case 'update_delay_config':
      const delayConfigResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/reminders/${args.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-delay-config',
          delayMessage: args.delayMessage || null,
          delayWebhooks: args.delayWebhooks || [],
        }),
      });
      if (!delayConfigResponse.ok) {
        const error = await delayConfigResponse.json();
        return { error: error.error || 'Failed to update delay config' };
      }
      const delayConfigResult = await delayConfigResponse.json();
      return { success: true, reminder: delayConfigResult };
    
    case 'update_automated_messages':
      // Process automated messages - generate IDs if not provided
      const processedMessages = args.automatedMessages.map((msg: any) => ({
        id: msg.id || `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        days_before: msg.days_before,
        title: msg.title,
        description: msg.description,
        webhook_url: msg.webhook_url,
        sent: msg.sent || false,
        sent_at: msg.sent_at || null,
      }));
      
      const automatedMessagesResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/reminders/${args.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-automated-messages',
          automatedMessages: processedMessages,
        }),
      });
      if (!automatedMessagesResponse.ok) {
        const error = await automatedMessagesResponse.json();
        return { error: error.error || 'Failed to update automated messages' };
      }
      const automatedMessagesResult = await automatedMessagesResponse.json();
      return { success: true, reminder: automatedMessagesResult };
    
    default:
      return { error: `Unknown function: ${name}` };
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Initialize the model with function calling
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro',
      tools: [{ 
        functionDeclarations: functionDefinitions as any 
      }],
    });

    // Build conversation history
    // Filter out the initial welcome message and ensure first message is from user
    const filteredHistory = conversationHistory.filter((msg: any, index: number) => {
      // Skip the first message if it's from assistant (welcome message)
      if (index === 0 && msg.role === 'assistant') {
        return false;
      }
      return true;
    });

    // Ensure we have at least one user message, or start fresh
    const history = filteredHistory.length > 0 && filteredHistory[0].role === 'user'
      ? filteredHistory.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        }))
      : [];

    const chat = model.startChat({
      history: history,
    });

    // Send the user message
    const result = await chat.sendMessage(message);
    const response = result.response;

    // Check if the model wants to call a function
    const functionCalls = response.functionCalls();
    
    if (functionCalls && functionCalls.length > 0) {
      const functionResults = [];
      
      for (const functionCall of functionCalls) {
        const functionName = functionCall.name;
        const functionArgs = functionCall.args;
        
        // Execute the function
        const functionResult = await executeFunction(functionName, functionArgs);
        functionResults.push({
          functionResponse: {
            name: functionName,
            response: functionResult,
          },
        });
      }

      // Send function results back to the model
      const finalResult = await chat.sendMessage(functionResults);
      const finalResponse = finalResult.response;
      
      return NextResponse.json({
        response: finalResponse.text(),
        functionCalls: functionCalls.map((fc: any) => ({
          name: fc.name,
          args: fc.args,
        })),
      });
    }

    // No function calls, just return the text response
    return NextResponse.json({
      response: response.text(),
    });
  } catch (error) {
    console.error('Error in agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}
