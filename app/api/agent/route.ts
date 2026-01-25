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
  console.log('Executing function:', name, 'with args:', args);
  
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
      const webhooks = await getAllSavedWebhooks();
      // Ensure all webhook data is serializable (convert Date objects to strings)
      const serializableWebhooks = webhooks.map((w: any) => ({
        id: w.id,
        name: w.name,
        webhook_url: w.webhook_url,
        created_at: typeof w.created_at === 'string' ? w.created_at : (w.created_at?.toISOString?.() || String(w.created_at)),
      }));
      return { 
        webhooks: serializableWebhooks,
        message: `Found ${serializableWebhooks.length} saved webhooks. Available webhooks: ${serializableWebhooks.map((w: any) => `"${w.name}" (${w.webhook_url})`).join(', ')}`
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
      // Delete reminder directly from database
      const reminderToDelete = await getReminderById(args.id);
      if (!reminderToDelete) {
        return { error: 'Reminder not found' };
      }
      const { supabase } = await import('@/lib/supabase');
      const { error: deleteError } = await supabase
        .from('reminders')
        .delete()
        .eq('id', args.id);
      if (deleteError) {
        return { error: deleteError.message || 'Failed to delete reminder' };
      }
      return { success: true, message: 'Reminder deleted successfully' };
    
    case 'update_delay_config':
      // Update delay config directly
      const reminderForDelay = await getReminderById(args.id);
      if (!reminderForDelay) {
        return { error: 'Reminder not found' };
      }
      const { supabase: supabaseDelay } = await import('@/lib/supabase');
      const { data: updatedDelay, error: delayError } = await supabaseDelay
        .from('reminders')
        .update({
          delay_message: args.delayMessage || null,
          delay_webhooks: args.delayWebhooks || [],
        })
        .eq('id', args.id)
        .select()
        .single();
      if (delayError) {
        return { error: delayError.message || 'Failed to update delay config' };
      }
      return { success: true, reminder: updatedDelay };
    
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
      
      // Update automated messages directly
      const reminderForAuto = await getReminderById(args.id);
      if (!reminderForAuto) {
        return { error: 'Reminder not found' };
      }
      const { supabase: supabaseAuto } = await import('@/lib/supabase');
      const { data: updatedAuto, error: autoError } = await supabaseAuto
        .from('reminders')
        .update({
          automated_messages: processedMessages,
        })
        .eq('id', args.id)
        .select()
        .single();
      if (autoError) {
        return { error: autoError.message || 'Failed to update automated messages' };
      }
      return { success: true, reminder: updatedAuto };
    
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

    // Model configuration with fallback
    const primaryModel = 'meta-llama/llama-3.3-70b-instruct:free';
    const fallbackModel = 'glm-4.5-air:free';
    
    // Helper function to try API call with fallback models
    async function callWithFallback(
      createCall: (model: string) => Promise<any>,
      errorContext: string
    ): Promise<any> {
      let lastError: any = null;
      
      // Try primary model first
      try {
        console.log(`[AGENT] Trying ${errorContext} with primary model: ${primaryModel}`);
        return await createCall(primaryModel);
      } catch (primaryError: any) {
        lastError = primaryError;
        const isRetryable = primaryError?.status === 400 || 
                           primaryError?.status === 502 || 
                           primaryError?.status === 503 || 
                           primaryError?.status === 504 ||
                           primaryError?.code === 400 ||
                           primaryError?.code === 502 ||
                           primaryError?.code === 503 ||
                           primaryError?.code === 504;
        
        if (isRetryable) {
          console.log(`[AGENT] Primary model failed, trying fallback model: ${fallbackModel}`);
          try {
            return await createCall(fallbackModel);
          } catch (fallbackError: any) {
            console.error(`[AGENT] Fallback model also failed:`, fallbackError);
            throw fallbackError;
          }
        } else {
          // Non-retryable error, throw immediately
          throw primaryError;
        }
      }
    }

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

      const finalCompletion = await callWithFallback(
        (model) => openai.chat.completions.create({
          model: model,
          messages: finalMessages as any,
          stream: false,
        }),
        'approval flow final completion'
      );

      if (!finalCompletion.choices || finalCompletion.choices.length === 0) {
        console.error('[AGENT] No choices in finalCompletion (approval flow):', finalCompletion);
        return NextResponse.json({
          response: 'Sorry, I encountered an error processing your approval. Please try again.',
          functionCalls: functionCallsData,
          approved: true,
        });
      }

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

    // Limit conversation history to last 10 messages to avoid token limits and JSON issues
    const limitedHistory = filteredHistory.slice(-10);

    // Convert to OpenAI message format and validate
    const messages = limitedHistory.map((msg: any) => {
      // Ensure content is a string
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      return {
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: content,
      };
    });

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
      const completion = await callWithFallback(
        (model) => openai.chat.completions.create({
          model: model,
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
          stream: false,
        }),
        'initial completion'
      );

      if (!completion.choices || completion.choices.length === 0) {
        console.error('[AGENT] No choices in completion:', completion);
        return NextResponse.json({
          response: 'Sorry, I encountered an error processing your request. Please try again.',
        });
      }

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

        const finalCompletion = await callWithFallback(
          (model) => openai.chat.completions.create({
            model: model,
            messages: finalMessages as any,
            stream: false,
          }),
          'approval flow duplicate completion'
        );

        if (!finalCompletion.choices || finalCompletion.choices.length === 0) {
          console.error('[AGENT] No choices in finalCompletion (approval duplicate):', finalCompletion);
          return NextResponse.json({
            response: 'Sorry, I encountered an error processing your approval. Please try again.',
            functionCalls: functionCallsData,
            approved: true,
          });
        }

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
        console.log('[AGENT] Total tool calls:', allToolCalls.length);
        
        const writeOperations = allToolCalls.filter((tc: any) => {
          const funcName = tc.type === 'function' ? tc.function?.name : null;
          const isWrite = funcName && !readOnlyOperations.includes(funcName);
          if (isWrite) {
            console.log('[AGENT] Write operation detected:', funcName);
          }
          return isWrite;
        });
        const readOperations = allToolCalls.filter((tc: any) => {
          const funcName = tc.type === 'function' ? tc.function?.name : null;
          const isRead = funcName && readOnlyOperations.includes(funcName);
          if (isRead) {
            console.log('[AGENT] Read operation detected:', funcName);
          }
          return isRead;
        });
        
        console.log('[AGENT] Write operations:', writeOperations.length, 'Read operations:', readOperations.length);

        // If there are write operations, require approval
        if (writeOperations.length > 0) {
          console.log('[AGENT] REQUIRING APPROVAL for', writeOperations.length, 'write operation(s)');
          
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
              
              try {
                const functionResult = await executeFunction(functionName, functionArgs, request);
                
                // Safely serialize the result
                let serializedResult: string;
                try {
                  serializedResult = JSON.stringify(functionResult);
                } catch (serializeError) {
                  console.error('[AGENT] Error serializing read result:', serializeError, functionResult);
                  serializedResult = JSON.stringify({
                    error: 'Failed to serialize result',
                    message: functionResult?.message || 'Function executed but result could not be serialized',
                  });
                }
                
                readResults.push({
                  role: 'tool' as const,
                  tool_call_id: toolCall.id,
                  content: serializedResult,
                });
              } catch (execError) {
                console.error('[AGENT] Error executing read function:', execError);
                readResults.push({
                  role: 'tool' as const,
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ error: execError instanceof Error ? execError.message : 'Function execution failed' }),
                });
              }
            }
          }

          // Store the response message for later execution
          return NextResponse.json({
            response: responseMessage.content || 'I need your approval to proceed with the following actions:',
            pendingActions: pendingActions,
            requiresApproval: true,
            responseMessage: responseMessage, // Store full response for execution
            readResults: readResults, // Include results of immediate read operations
          });
        }

        // All operations are read-only, execute immediately
        const functionResults = [];
        const functionCallsData: Array<{ name: string; args: any }> = [];
        
        for (const toolCall of allToolCalls) {
          if (toolCall.type === 'function') {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
            
            try {
              // Execute the function
              const functionResult = await executeFunction(functionName, functionArgs, request);
              
              // Safely serialize the result
              let serializedResult: string;
              try {
                serializedResult = JSON.stringify(functionResult);
              } catch (serializeError) {
                console.error('[AGENT] Error serializing function result:', serializeError, functionResult);
                // Fallback: create a safe serializable version
                serializedResult = JSON.stringify({
                  error: 'Failed to serialize result',
                  message: functionResult?.message || 'Function executed but result could not be serialized',
                });
              }
              
              functionResults.push({
                role: 'tool' as const,
                tool_call_id: toolCall.id,
                content: serializedResult,
              });
              
              functionCallsData.push({
                name: functionName,
                args: functionArgs,
              });
            } catch (execError) {
              console.error('[AGENT] Error executing function:', execError);
              functionResults.push({
                role: 'tool' as const,
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: execError instanceof Error ? execError.message : 'Function execution failed' }),
              });
            }
          }
        }

        // Validate and sanitize function results before adding to messages
        const sanitizedFunctionResults = functionResults.map((fr: any) => {
          // Ensure content is a valid JSON string
          let content = fr.content;
          if (typeof content !== 'string') {
            try {
              content = JSON.stringify(content);
            } catch (e) {
              console.error('[AGENT] Failed to stringify function result:', e);
              content = JSON.stringify({ error: 'Failed to serialize function result' });
            }
          } else {
            // Validate that the string is valid JSON
            try {
              JSON.parse(content);
            } catch (e) {
              console.error('[AGENT] Function result content is not valid JSON:', content.substring(0, 200));
              // Try to fix it by wrapping in an object
              content = JSON.stringify({ raw: content });
            }
          }
          return {
            role: fr.role,
            tool_call_id: fr.tool_call_id,
            content: content,
          };
        });

        // Validate responseMessage content
        let responseMessageContent = responseMessage.content;
        if (responseMessageContent && typeof responseMessageContent !== 'string') {
          try {
            responseMessageContent = JSON.stringify(responseMessageContent);
          } catch (e) {
            console.error('[AGENT] Failed to stringify responseMessage content:', e);
            responseMessageContent = '';
          }
        }

        // Create sanitized response message
        const sanitizedResponseMessage = {
          ...responseMessage,
          content: responseMessageContent || '',
        };

        // Add function results to messages and get final response
        const finalMessages = [
          ...messages,
          sanitizedResponseMessage,
          ...sanitizedFunctionResults,
        ];

        // Log the messages being sent for debugging
        console.log('[AGENT] Sending follow-up request with', finalMessages.length, 'messages');
        console.log('[AGENT] Function results count:', sanitizedFunctionResults.length);
        if (sanitizedFunctionResults.length > 0) {
          console.log('[AGENT] First function result content preview:', sanitizedFunctionResults[0].content?.substring(0, 200));
        }

        // Validate final messages array before sending
        try {
          JSON.stringify(finalMessages);
        } catch (e) {
          console.error('[AGENT] Final messages array is not serializable:', e);
          return NextResponse.json({
            response: 'Sorry, I encountered an error preparing the request. Please try again.',
            functionCalls: functionCallsData,
          });
        }

        // Retry logic for API calls (up to 3 attempts)
        let finalCompletion;
        let lastError: any = null;
        const maxRetries = 3;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            finalCompletion = await callWithFallback(
              (model) => openai.chat.completions.create({
                model: model,
                messages: finalMessages as any,
                tools: functionDefinitions.map(fn => ({
                  type: 'function',
                  function: {
                    name: fn.name,
                    description: fn.description,
                    parameters: fn.parameters,
                  },
                })),
                tool_choice: 'auto',
                stream: false,
              }),
              `follow-up completion (attempt ${attempt})`
            );
            // Success, break out of retry loop
            break;
          } catch (apiError: any) {
            lastError = apiError;
            const isRetryable = apiError?.status === 502 || apiError?.status === 503 || apiError?.status === 504;
            
            if (isRetryable && attempt < maxRetries) {
              const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
              console.log(`[AGENT] API call failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            } else {
              // Not retryable or max retries reached
              console.error('[AGENT] Error in follow-up API call:', apiError);
              console.error('[AGENT] Error details:', JSON.stringify(apiError, null, 2));
              
              // If it's a 502/503/504 and we've exhausted retries, return a helpful message
              if (isRetryable) {
                return NextResponse.json({
                  response: 'The AI service is temporarily unavailable. Please try again in a moment.',
                  functionCalls: functionCallsData,
                });
              }
              
              // For other errors, return a generic error message
              return NextResponse.json({
                response: 'Sorry, I encountered an error processing the webhook information. Please try again.',
                functionCalls: functionCallsData,
              });
            }
          }
        }
        
        // If we exhausted retries and still no success
        if (!finalCompletion) {
          return NextResponse.json({
            response: 'The AI service is temporarily unavailable. Please try again in a moment.',
            functionCalls: functionCallsData,
          });
        }

        if (!finalCompletion.choices || finalCompletion.choices.length === 0) {
          console.error('[AGENT] No choices in finalCompletion:', finalCompletion);
          return NextResponse.json({
            response: 'Sorry, I encountered an error processing your request. Please try again.',
            functionCalls: functionCallsData,
          });
        }

        const finalResponseMessage = finalCompletion.choices[0].message;

        // Check if the follow-up response has tool calls (write operations)
        if (finalResponseMessage.tool_calls && finalResponseMessage.tool_calls.length > 0) {
          // Define read-only operations that don't require approval
          const readOnlyOperations = ['list_reminders', 'get_reminder', 'search_reminders', 'list_webhooks'];
          
          // Separate read and write operations in the follow-up response
          const followUpToolCalls = finalResponseMessage.tool_calls.filter((tc: any) => tc.type === 'function');
          console.log('[AGENT] Follow-up tool calls:', followUpToolCalls.length);
          
          const followUpWriteOperations = followUpToolCalls.filter((tc: any) => {
            const funcName = tc.type === 'function' ? tc.function?.name : null;
            const isWrite = funcName && !readOnlyOperations.includes(funcName);
            if (isWrite) {
              console.log('[AGENT] Follow-up write operation detected:', funcName);
            }
            return isWrite;
          });
          const followUpReadOperations = followUpToolCalls.filter((tc: any) => {
            const funcName = tc.type === 'function' ? tc.function?.name : null;
            return funcName && readOnlyOperations.includes(funcName);
          });
          
          console.log('[AGENT] Follow-up write operations:', followUpWriteOperations.length, 'Read operations:', followUpReadOperations.length);

          // If there are write operations in the follow-up, require approval
          if (followUpWriteOperations.length > 0) {
            console.log('[AGENT] REQUIRING APPROVAL for', followUpWriteOperations.length, 'follow-up write operation(s)');
            
            const pendingActions = followUpWriteOperations.map((tc: any) => {
              const funcName = tc.type === 'function' ? tc.function?.name : '';
              const funcDef = functionDefinitions.find(fn => fn.name === funcName);
              return {
                id: tc.id,
                name: funcName,
                args: JSON.parse((tc.type === 'function' ? tc.function?.arguments : '{}') || '{}'),
                description: funcDef?.description || '',
                parameters: funcDef?.parameters || {},
                toolCall: tc,
              };
            });

            // Execute follow-up read operations immediately
            const followUpReadResults = [];
            for (const toolCall of followUpReadOperations) {
              if (toolCall.type === 'function') {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
                
                try {
                  const functionResult = await executeFunction(functionName, functionArgs, request);
                  
                  // Safely serialize the result
                  let serializedResult: string;
                  try {
                    serializedResult = JSON.stringify(functionResult);
                  } catch (serializeError) {
                    console.error('[AGENT] Error serializing follow-up read result:', serializeError, functionResult);
                    serializedResult = JSON.stringify({
                      error: 'Failed to serialize result',
                      message: functionResult?.message || 'Function executed but result could not be serialized',
                    });
                  }
                  
                  followUpReadResults.push({
                    role: 'tool' as const,
                    tool_call_id: toolCall.id,
                    content: serializedResult,
                  });
                } catch (execError) {
                  console.error('[AGENT] Error executing follow-up read function:', execError);
                  followUpReadResults.push({
                    role: 'tool' as const,
                    tool_call_id: toolCall.id,
                    content: JSON.stringify({ error: execError instanceof Error ? execError.message : 'Function execution failed' }),
                  });
                }
              }
            }

            // Combine all read results (from first call and follow-up)
            const allReadResults = [...functionResults, ...followUpReadResults];

            // Store the response message for later execution
            return NextResponse.json({
              response: finalResponseMessage.content || 'I need your approval to proceed with the following actions:',
              pendingActions: pendingActions,
              requiresApproval: true,
              responseMessage: finalResponseMessage,
              readResults: allReadResults,
            });
          }

          // Follow-up has only read operations, execute them and get final response
          const followUpFunctionResults = [];
          const followUpFunctionCallsData: Array<{ name: string; args: any }> = [];
          
          for (const toolCall of followUpToolCalls) {
            if (toolCall.type === 'function') {
              const functionName = toolCall.function.name;
              const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
              
              try {
                const functionResult = await executeFunction(functionName, functionArgs, request);
                
                // Safely serialize the result
                let serializedResult: string;
                try {
                  serializedResult = JSON.stringify(functionResult);
                } catch (serializeError) {
                  console.error('[AGENT] Error serializing follow-up function result:', serializeError, functionResult);
                  serializedResult = JSON.stringify({
                    error: 'Failed to serialize result',
                    message: functionResult?.message || 'Function executed but result could not be serialized',
                  });
                }
                
                followUpFunctionResults.push({
                  role: 'tool' as const,
                  tool_call_id: toolCall.id,
                  content: serializedResult,
                });
                followUpFunctionCallsData.push({
                  name: functionName,
                  args: functionArgs,
                });
              } catch (execError) {
                console.error('[AGENT] Error executing follow-up function:', execError);
                followUpFunctionResults.push({
                  role: 'tool' as const,
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ error: execError instanceof Error ? execError.message : 'Function execution failed' }),
                });
              }
            }
          }

          // Make one more API call with follow-up results to get final text response
          const finalMessagesWithResults = [
            ...finalMessages,
            finalResponseMessage,
            ...followUpFunctionResults,
          ];

          const finalTextCompletion = await callWithFallback(
            (model) => openai.chat.completions.create({
              model: model,
              messages: finalMessagesWithResults as any,
              stream: false,
            }),
            'final text completion'
          );

          if (!finalTextCompletion.choices || finalTextCompletion.choices.length === 0) {
            console.error('[AGENT] No choices in finalTextCompletion:', finalTextCompletion);
            return NextResponse.json({
              response: 'Sorry, I encountered an error processing your request. Please try again.',
              functionCalls: [...functionCallsData, ...followUpFunctionCallsData],
            });
          }

          return NextResponse.json({
            response: finalTextCompletion.choices[0].message.content || '',
            functionCalls: [...functionCallsData, ...followUpFunctionCallsData],
          });
        }

        return NextResponse.json({
          response: finalResponseMessage.content || '',
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
