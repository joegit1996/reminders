import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAllReminders, getReminderById, createReminder, markReminderComplete, updateReminderDueDate, getAllSavedWebhooks } from '@/lib/db';

// Initialize OpenRouter (OpenAI-compatible API)
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    'X-Title': 'Reminders App',
  },
});

// Function definitions for OpenRouter/DeepSeek (OpenAI-compatible format)
const functionDefinitions = [
  {
    name: 'create_reminder',
    description: 'Create a new reminder. CRITICAL: Always call list_webhooks first, then match webhook names from user prompt.',
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
          description: 'Slack webhook URL from list_webhooks. Match name to user reference (e.g., "for youssef" = webhook named "youssef").',
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
async function executeFunction(name: string, args: any, req: NextRequest) {
  // Get base URL from headers for server-side fetch calls
  const protocol = req.headers.get('x-forwarded-proto') || 'http';
  const host = req.headers.get('host') || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;
  
  console.log('Executing function:', name, 'with args:', args, 'baseUrl:', baseUrl);
  
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
      return { 
        webhooks,
        message: `Found ${webhooks.length} saved webhooks. Available webhooks: ${webhooks.map((w: any) => `"${w.name}" (${w.webhook_url})`).join(', ')}`
      };
    
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
        const webhooks = await getAllSavedWebhooks();
        const webhook = webhooks.find((w: any) => w.name.toLowerCase().includes(args.webhookName.toLowerCase()));
        if (webhook) {
          filtered = filtered.filter(r => r.slack_webhook === webhook.webhook_url);
        }
      }
      
      return { reminders: filtered };
    
    case 'delete_reminder':
      const deleteResponse = await fetch(`${baseUrl}/api/reminders/${args.id}`, {
        method: 'DELETE',
      });
      if (!deleteResponse.ok) {
        const error = await deleteResponse.json();
        return { error: error.error || 'Failed to delete reminder' };
      }
      return { success: true, message: 'Reminder deleted successfully' };
    
    case 'update_delay_config':
      const delayConfigResponse = await fetch(`${baseUrl}/api/reminders/${args.id}`, {
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
      
      const automatedMessagesResponse = await fetch(`${baseUrl}/api/reminders/${args.id}`, {
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
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { message, conversationHistory = [], approveActions, pendingActionId, responseMessage: storedResponseMessage } = body;

    // Use Llama 3.3 70B Instruct free model from OpenRouter (supports function calling)
    // Free tier model that supports tool use which is required for function calling
    const modelName = 'meta-llama/llama-3.3-70b-instruct:free';

    // If this is an approval request, execute the stored response message's tool calls
    if (approveActions && storedResponseMessage && storedResponseMessage.tool_calls) {
      const functionResults = [];
      const functionCallsData: Array<{ name: string; args: any }> = [];
      
      for (const toolCall of storedResponseMessage.tool_calls) {
        if (toolCall.type === 'function') {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
          
                // Execute the function
                const functionResult = await executeFunction(functionName, functionArgs, request);
          functionResults.push({
            role: 'tool' as const,
            tool_call_id: toolCall.id,
            content: JSON.stringify(functionResult),
          });
          
          functionCallsData.push({
            name: functionName,
            args: functionArgs,
          });
        }
      }

      // Build conversation history for final response
      const filteredHistory = conversationHistory.filter((msg: any, index: number) => {
        if (index === 0 && msg.role === 'assistant') {
          return false;
        }
        return true;
      });

      const historyMessages = filteredHistory.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));

      // Add function results to messages and get final response
      const finalMessages = [
        ...historyMessages,
        storedResponseMessage,
        ...functionResults,
      ];

      const finalCompletion = await openai.chat.completions.create({
        model: modelName,
        messages: finalMessages as any,
      });

      return NextResponse.json({
        response: finalCompletion.choices[0].message.content || '',
        functionCalls: functionCallsData,
        approved: true,
      });
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Build messages array (OpenAI format)
    // Filter out the initial welcome message and ensure first message is from user
    const filteredHistory = conversationHistory.filter((msg: any, index: number) => {
      // Skip the first message if it's from assistant (welcome message)
      if (index === 0 && msg.role === 'assistant') {
        return false;
      }
      return true;
    });

    // Convert to OpenAI message format
    const messages = filteredHistory.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    // Add current user message
    messages.push({
      role: 'user',
      content: message,
    });

    // System message to guide the AI
    const systemMessage = {
      role: 'system' as const,
      content: `You are a helpful AI assistant for managing reminders.

CRITICAL INSTRUCTIONS FOR WEBHOOK SELECTION:
1. ALWAYS call list_webhooks FIRST before creating any reminder
2. When user says "for [name]" (e.g., "for youssef", "for mina"), match it to the webhook with that exact name
3. Use ONLY the actual webhook URLs returned by list_webhooks - NEVER use placeholder/example URLs
4. If no name match is found, ask the user which webhook to use

DESCRIPTION GUIDELINES:
- Keep descriptions concise and relevant
- Focus on the core task
- Match the user's tone

Example workflow:
User: "create reminder for youssef about X"
1. Call list_webhooks
2. Find webhook named "youssef" 
3. Use that webhook's URL in create_reminder`,
    };

    try {
      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: [systemMessage, ...messages] as any,
        tools: functionDefinitions.map(fn => ({
          type: 'function',
          function: {
            name: fn.name,
            description: fn.description,
            parameters: fn.parameters,
          },
        })),
        tool_choice: 'auto',
      });

      const responseMessage = completion.choices[0].message;

      // If this is an approval request, execute the stored response message's tool calls
      if (approveActions && storedResponseMessage && storedResponseMessage.tool_calls) {
        const functionResults = [];
        const functionCallsData: Array<{ name: string; args: any }> = [];
        
        for (const toolCall of storedResponseMessage.tool_calls) {
          if (toolCall.type === 'function') {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
            
                // Execute the function
                const functionResult = await executeFunction(functionName, functionArgs, request);
            functionResults.push({
              role: 'tool' as const,
              tool_call_id: toolCall.id,
              content: JSON.stringify(functionResult),
            });
            
            functionCallsData.push({
              name: functionName,
              args: functionArgs,
            });
          }
        }

        // Add function results to messages and get final response
        const finalMessages = [
          ...messages,
          storedResponseMessage,
          ...functionResults,
        ];

        const finalCompletion = await openai.chat.completions.create({
          model: modelName,
          messages: finalMessages as any,
        });

        return NextResponse.json({
          response: finalCompletion.choices[0].message.content || '',
          functionCalls: functionCallsData,
          approved: true,
        });
      }

      // Check if the model wants to call a function
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        // Define read-only operations that don't require approval
        const readOnlyOperations = ['list_reminders', 'get_reminder', 'search_reminders', 'list_webhooks'];
        
        // Separate read and write operations
        const allToolCalls = responseMessage.tool_calls.filter((tc: any) => tc.type === 'function');
        const writeOperations = allToolCalls.filter((tc: any) => {
          const funcName = tc.type === 'function' ? tc.function?.name : null;
          return funcName && !readOnlyOperations.includes(funcName);
        });
        const readOperations = allToolCalls.filter((tc: any) => {
          const funcName = tc.type === 'function' ? tc.function?.name : null;
          return funcName && readOnlyOperations.includes(funcName);
        });

        // If there are write operations, require approval
        if (writeOperations.length > 0) {
          const pendingActions = writeOperations.map((tc: any) => {
            const funcName = tc.type === 'function' ? tc.function?.name : '';
            const funcDef = functionDefinitions.find(fn => fn.name === funcName);
            return {
              id: tc.id,
              name: funcName,
              args: JSON.parse((tc.type === 'function' ? tc.function?.arguments : '{}') || '{}'),
              description: funcDef?.description || '',
              parameters: funcDef?.parameters || {}, // Include parameter schema for form generation
              toolCall: tc, // Store full tool call for execution
            };
          });

          // Execute read operations immediately (no approval needed)
          const readResults = [];
          for (const toolCall of readOperations) {
              if (toolCall.type === 'function') {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
                const functionResult = await executeFunction(functionName, functionArgs, request);
              readResults.push({
                role: 'tool' as const,
                tool_call_id: toolCall.id,
                content: JSON.stringify(functionResult),
              });
            }
          }

          // Store the response message for later execution
          return NextResponse.json({
            response: responseMessage.content || 'I need your approval to proceed with the following actions:',
            pendingActions: pendingActions,
            requiresApproval: true,
            responseMessage: responseMessage, // Store full response for execution
          });
        }

        // All operations are read-only, execute immediately
        const functionResults = [];
        const functionCallsData: Array<{ name: string; args: any }> = [];
        
        for (const toolCall of allToolCalls) {
          if (toolCall.type === 'function') {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
            
                // Execute the function
                const functionResult = await executeFunction(functionName, functionArgs, request);
            functionResults.push({
              role: 'tool' as const,
              tool_call_id: toolCall.id,
              content: JSON.stringify(functionResult),
            });
            
            functionCallsData.push({
              name: functionName,
              args: functionArgs,
            });
          }
        }

        // Add function results to messages and get final response
        const finalMessages = [
          ...messages,
          responseMessage,
          ...functionResults,
        ];

        const finalCompletion = await openai.chat.completions.create({
          model: modelName,
          messages: finalMessages as any,
        });

        return NextResponse.json({
          response: finalCompletion.choices[0].message.content || '',
          functionCalls: functionCallsData,
        });
      }

      // No function calls, just return the text response
      return NextResponse.json({
        response: responseMessage.content || '',
      });
    } catch (error: any) {
      console.error('Error calling OpenRouter:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}
