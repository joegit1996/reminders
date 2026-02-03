import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase-server';
import { 
  getAllReminders, 
  getReminderById, 
  createReminder, 
  markReminderComplete, 
  updateReminderDueDate, 
  getAllSavedWebhooks,
  updateLastSent,
} from '@/lib/db';
import type { SupabaseClient } from '@supabase/supabase-js';

// Initialize OpenRouter (OpenAI-compatible API)
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    'X-Title': 'ZANAN PRO MAX',
  },
});

// Function definitions for OpenRouter/DeepSeek (OpenAI-compatible format)
const functionDefinitions = [
  {
    name: 'create_reminder',
    description: 'Create a new reminder. CRITICAL: Always call list_slack_channels first to get available channels, then use the channel ID and name.',
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
        slackChannelId: {
          type: 'string',
          description: 'Slack channel/user ID from list_slack_channels. Match name to user reference (e.g., "for youssef" = channel/DM named "youssef").',
        },
        slackChannelName: {
          type: 'string',
          description: 'Display name of the Slack channel/DM (from list_slack_channels)',
        },
        delayMessage: {
          type: 'string',
          description: 'Optional message sent when due date is updated',
        },
        delaySlackChannelId: {
          type: 'string',
          description: 'Optional Slack channel ID for delay messages',
        },
        delaySlackChannelName: {
          type: 'string',
          description: 'Optional display name for delay message channel',
        },
        automatedMessages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              days_before: { type: 'number', description: 'Days before due date to send' },
              title: { type: 'string', description: 'Message title' },
              description: { type: 'string', description: 'Message description' },
              slack_channel_id: { type: 'string', description: 'Slack channel ID to send to' },
              slack_channel_name: { type: 'string', description: 'Display name of the channel' },
            },
            required: ['days_before', 'title', 'description', 'slack_channel_id'],
          },
          description: 'Optional array of automated messages to send before due date',
        },
        completionMessage: {
          type: 'string',
          description: 'Optional message sent when reminder is marked as complete',
        },
        completionSlackChannelId: {
          type: 'string',
          description: 'Optional Slack channel ID for completion message',
        },
        completionSlackChannelName: {
          type: 'string',
          description: 'Optional display name for completion message channel',
        },
      },
      required: ['text', 'dueDate', 'periodDays', 'slackChannelId', 'slackChannelName'],
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
    name: 'list_slack_channels',
    description: 'Get all available Slack channels, DMs, and users. ALWAYS call this first before creating a reminder.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_webhooks',
    description: 'LEGACY: Get all saved webhooks with their names (for old reminders only)',
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
async function executeFunction(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  args: any
) {
  console.log('Executing function:', name, 'with args:', args);
  
  switch (name) {
    case 'create_reminder':
      // Import required functions for Slack channel-based creation
      const { getSlackConnectionByUserId } = await import('@/lib/db');
      const { sendInteractiveReminder } = await import('@/lib/slack-interactive');
      const { differenceInDays, format } = await import('date-fns');
      
      // Validate Slack connection
      const connection = await getSlackConnectionByUserId(supabase, userId);
      if (!connection || !connection.access_token) {
        return { error: 'Slack not connected. Please connect Slack in Settings first.' };
      }
      
      // Calculate days remaining for the message
      const dueDateObj = new Date(args.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDateObj.setHours(0, 0, 0, 0);
      const daysRemaining = differenceInDays(dueDateObj, today);
      const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://reminders-liard.vercel.app';
      
      // Test sending the message FIRST
      const testResult = await sendInteractiveReminder({
        accessToken: connection.access_token,
        channelId: args.slackChannelId,
        reminderId: 0,
        reminderText: args.text,
        reminderDescription: args.description || null,
        dueDate: format(dueDateObj, 'MMM dd, yyyy'),
        daysRemaining,
        appUrl,
      });
      
      if (!testResult.ok) {
        return { error: `Failed to send Slack message: ${testResult.error}. Please check channel selection.` };
      }
      
      // Create the reminder with new Slack channel fields
      const reminder = await createReminder(
        supabase,
        userId,
        args.text,
        args.dueDate,
        args.periodDays,
        '', // No webhook - using channel
        args.description || null,
        args.delayMessage || null,
        [], // No delay webhooks
        args.automatedMessages || [],
        args.completionMessage || null,
        null, // No completion webhook
        args.slackChannelId || null,
        args.slackChannelName || null,
        args.delaySlackChannelId || null,
        args.delaySlackChannelName || null,
        args.completionSlackChannelId || null,
        args.completionSlackChannelName || null
      );
      
      // Update last sent since we already sent the message
      await updateLastSent(supabase, reminder.id);
      return { success: true, reminder };
    
    case 'list_reminders':
      const allReminders = await getAllReminders(supabase);
      if (args.filter === 'active') {
        return { reminders: allReminders.filter(r => !r.is_complete) };
      } else if (args.filter === 'completed') {
        return { reminders: allReminders.filter(r => r.is_complete) };
      }
      return { reminders: allReminders };
    
    case 'get_reminder':
      const reminderById = await getReminderById(supabase, args.id);
      if (!reminderById) {
        return { error: 'Reminder not found' };
      }
      return { reminder: reminderById };
    
    case 'update_reminder_due_date':
      const result = await updateReminderDueDate(supabase, args.id, args.dueDate);
      return { success: true, reminder: result.reminder };
    
    case 'complete_reminder':
      const completed = await markReminderComplete(supabase, args.id);
      return { success: true, reminder: completed };
    
    case 'list_slack_channels':
      // Fetch Slack connection for this user
      const { getSlackConnection } = await import('@/lib/db');
      const slackConn = await getSlackConnection(supabase);
      
      if (!slackConn || !slackConn.access_token) {
        return { error: 'Slack not connected. Please connect Slack in Settings first.' };
      }
      
      // Use the same logic as /api/slack/channels
      const readToken = slackConn.user_access_token || slackConn.access_token;
      
      // Fetch users first
      const usersResp = await fetch('https://slack.com/api/users.list?limit=200', {
        headers: { Authorization: `Bearer ${readToken}` },
      });
      const usersResult = await usersResp.json();
      const userMapForAgent = new Map<string, string>();
      if (usersResult.ok && usersResult.members) {
        for (const u of usersResult.members) {
          if (!u.deleted && !u.is_bot) {
            userMapForAgent.set(u.id, u.profile?.display_name || u.profile?.real_name || u.real_name || u.name);
          }
        }
      }
      
      // Fetch channels
      const channelsResp = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=100&exclude_archived=true', {
        headers: { Authorization: `Bearer ${readToken}` },
      });
      const channelsResult = await channelsResp.json();
      
      // Fetch DMs
      const dmsResp = await fetch('https://slack.com/api/conversations.list?types=im&limit=100', {
        headers: { Authorization: `Bearer ${readToken}` },
      });
      const dmsResult = await dmsResp.json();
      
      const channels: Array<{ id: string; name: string; type: string }> = [];
      
      if (channelsResult.ok && channelsResult.channels) {
        for (const ch of channelsResult.channels) {
          channels.push({
            id: ch.id,
            name: ch.is_private ? `🔒${ch.name}` : `#${ch.name}`,
            type: ch.is_private ? 'private_channel' : 'channel',
          });
        }
      }
      
      if (dmsResult.ok && dmsResult.channels) {
        for (const dm of dmsResult.channels) {
          const userName = userMapForAgent.get(dm.user) || 'Unknown';
          channels.push({
            id: dm.user, // Use user ID for DMs
            name: `@${userName}`,
            type: 'dm',
          });
        }
      }
      
      return {
        channels,
        message: `Found ${channels.length} Slack channels/DMs. Available: ${channels.slice(0, 20).map(c => `"${c.name}" (ID: ${c.id})`).join(', ')}${channels.length > 20 ? '...' : ''}`,
      };
    
    case 'list_webhooks':
      const webhooks = await getAllSavedWebhooks(supabase);
      const serializableWebhooks = webhooks.map((w: any) => ({
        id: w.id,
        name: w.name,
        webhook_url: w.webhook_url,
        created_at: typeof w.created_at === 'string' ? w.created_at : (w.created_at?.toISOString?.() || String(w.created_at)),
      }));
      return { 
        webhooks: serializableWebhooks,
        message: `LEGACY: Found ${serializableWebhooks.length} saved webhooks. Use list_slack_channels instead for new reminders.`
      };
    
    case 'search_reminders':
      const allRemindersForSearch = await getAllReminders(supabase);
      let filtered = allRemindersForSearch;
      
      if (args.query) {
        filtered = filtered.filter(r => 
          r.text.toLowerCase().includes(args.query.toLowerCase()) ||
          (r.description && r.description.toLowerCase().includes(args.query.toLowerCase()))
        );
      }
      
      if (args.webhookName) {
        const webhooksForSearch = await getAllSavedWebhooks(supabase);
        const webhook = webhooksForSearch.find((w: any) => w.name.toLowerCase().includes(args.webhookName.toLowerCase()));
        if (webhook) {
          filtered = filtered.filter(r => r.slack_webhook === webhook.webhook_url);
        }
      }
      
      return { reminders: filtered };
    
    case 'delete_reminder':
      const reminderToDelete = await getReminderById(supabase, args.id);
      if (!reminderToDelete) {
        return { error: 'Reminder not found' };
      }
      const { error: deleteError } = await supabase
        .from('reminders')
        .delete()
        .eq('id', args.id);
      if (deleteError) {
        return { error: deleteError.message || 'Failed to delete reminder' };
      }
      return { success: true, message: 'Reminder deleted successfully' };
    
    case 'update_delay_config':
      const reminderForDelay = await getReminderById(supabase, args.id);
      if (!reminderForDelay) {
        return { error: 'Reminder not found' };
      }
      const { data: updatedDelay, error: delayError } = await supabase
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
      const processedMessages = args.automatedMessages.map((msg: any) => ({
        id: msg.id || `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        days_before: msg.days_before,
        title: msg.title,
        description: msg.description,
        webhook_url: msg.webhook_url,
        sent: msg.sent || false,
        sent_at: msg.sent_at || null,
      }));
      
      const reminderForAuto = await getReminderById(supabase, args.id);
      if (!reminderForAuto) {
        return { error: 'Reminder not found' };
      }
      const { data: updatedAuto, error: autoError } = await supabase
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
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { message, conversationHistory = [], approveActions, pendingActionId, responseMessage: storedResponseMessage } = body;

    // Model configuration with fallback
    const primaryModel = 'z-ai/glm-4.5-air:free';
    const fallbackModel = 'meta-llama/llama-3.3-70b-instruct:free';
    
    // Helper function to try API call with fallback models
    async function callWithFallback(
      createCall: (model: string) => Promise<any>,
      errorContext: string
    ): Promise<any> {
      let lastError: any = null;
      
      try {
        console.log(`[AGENT] Trying ${errorContext} with primary model: ${primaryModel}`);
        return await createCall(primaryModel);
      } catch (primaryError: any) {
        lastError = primaryError;
        
        const errorCode = primaryError?.error?.code || primaryError?.code || primaryError?.status;
        const errorMessage = primaryError?.error?.message || primaryError?.message || '';
        
        console.log(`[AGENT] Primary model error - code: ${errorCode}, message: ${errorMessage}`);
        
        const isRetryable = errorCode === 400 || 
                           errorCode === 502 || 
                           errorCode === 503 || 
                           errorCode === 504 ||
                           errorMessage.includes('Invalid JSON') ||
                           errorMessage.includes('Upstream error') ||
                           errorMessage.includes('Provider returned error');
        
        if (isRetryable) {
          console.log(`[AGENT] Primary model failed (${errorCode}), trying fallback model: ${fallbackModel}`);
          try {
            return await createCall(fallbackModel);
          } catch (fallbackError: any) {
            const fallbackCode = fallbackError?.error?.code || fallbackError?.code || fallbackError?.status;
            console.error(`[AGENT] Fallback model also failed (${fallbackCode}):`, fallbackError);
            throw fallbackError;
          }
        } else {
          console.log(`[AGENT] Non-retryable error (${errorCode}), not trying fallback`);
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
          
          const functionResult = await executeFunction(supabase, user.id, functionName, functionArgs);
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

    const filteredHistory = conversationHistory.filter((msg: any, index: number) => {
      if (index === 0 && msg.role === 'assistant') {
        return false;
      }
      return true;
    });

    const limitedHistory = filteredHistory.slice(-10);

    const messages = limitedHistory.map((msg: any) => {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      return {
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: content,
      };
    });

    messages.push({
      role: 'user',
      content: message,
    });

    const systemMessage = {
      role: 'system' as const,
      content: `You are a helpful AI assistant for managing reminders.

CRITICAL INSTRUCTIONS FOR SLACK CHANNEL SELECTION:
1. ALWAYS call list_slack_channels FIRST before creating any reminder
2. When user says "for [name]" (e.g., "for youssef", "for mina"), match it to a DM with that name (look for @name)
3. Use the EXACT channel ID and name from list_slack_channels
4. If no name match is found, ask the user which channel/DM to use

DESCRIPTION GUIDELINES:
- Keep descriptions concise and relevant
- Focus on the core task
- Match the user's tone

Example workflow:
User: "create reminder for youssef about X"
1. Call list_slack_channels
2. Find DM named "@youssef" or similar
3. Use that channel's ID and name in create_reminder`,
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

      // Check if the model wants to call a function
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        const readOnlyOperations = ['list_reminders', 'get_reminder', 'search_reminders', 'list_webhooks', 'list_slack_channels'];
        
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
              parameters: funcDef?.parameters || {},
              toolCall: tc,
            };
          });

          // Execute read operations immediately
          const readResults = [];
          for (const toolCall of readOperations) {
            if (toolCall.type === 'function') {
              const functionName = toolCall.function.name;
              const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
              
              try {
                const functionResult = await executeFunction(supabase, user.id, functionName, functionArgs);
                
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

          return NextResponse.json({
            response: responseMessage.content || 'I need your approval to proceed with the following actions:',
            pendingActions: pendingActions,
            requiresApproval: true,
            responseMessage: responseMessage,
            readResults: readResults,
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
              const functionResult = await executeFunction(supabase, user.id, functionName, functionArgs);
              
              let serializedResult: string;
              try {
                serializedResult = JSON.stringify(functionResult);
              } catch (serializeError) {
                console.error('[AGENT] Error serializing function result:', serializeError, functionResult);
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

        const sanitizedFunctionResults = functionResults.map((fr: any) => {
          let content = fr.content;
          if (typeof content !== 'string') {
            try {
              content = JSON.stringify(content);
            } catch (e) {
              console.error('[AGENT] Failed to stringify function result:', e);
              content = JSON.stringify({ error: 'Failed to serialize function result' });
            }
          } else {
            try {
              JSON.parse(content);
            } catch (e) {
              console.error('[AGENT] Function result content is not valid JSON:', content.substring(0, 200));
              content = JSON.stringify({ raw: content });
            }
          }
          return {
            role: fr.role,
            tool_call_id: fr.tool_call_id,
            content: content,
          };
        });

        let responseMessageContent = responseMessage.content;
        if (responseMessageContent && typeof responseMessageContent !== 'string') {
          try {
            responseMessageContent = JSON.stringify(responseMessageContent);
          } catch (e) {
            console.error('[AGENT] Failed to stringify responseMessage content:', e);
            responseMessageContent = '';
          }
        }

        const sanitizedResponseMessage = {
          ...responseMessage,
          content: responseMessageContent || '',
        };

        const finalMessages = [
          ...messages,
          sanitizedResponseMessage,
          ...sanitizedFunctionResults,
        ];

        console.log('[AGENT] Sending follow-up request with', finalMessages.length, 'messages');
        console.log('[AGENT] Function results count:', sanitizedFunctionResults.length);

        try {
          JSON.stringify(finalMessages);
        } catch (e) {
          console.error('[AGENT] Final messages array is not serializable:', e);
          return NextResponse.json({
            response: 'Sorry, I encountered an error preparing the request. Please try again.',
            functionCalls: functionCallsData,
          });
        }

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
            break;
          } catch (apiError: any) {
            lastError = apiError;
            const isRetryable = apiError?.status === 502 || apiError?.status === 503 || apiError?.status === 504;
            
            if (isRetryable && attempt < maxRetries) {
              const delay = Math.pow(2, attempt) * 1000;
              console.log(`[AGENT] API call failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            } else {
              console.error('[AGENT] Error in follow-up API call:', apiError);
              
              if (isRetryable) {
                return NextResponse.json({
                  response: 'The AI service is temporarily unavailable. Please try again in a moment.',
                  functionCalls: functionCallsData,
                });
              }
              
              return NextResponse.json({
                response: 'Sorry, I encountered an error processing the webhook information. Please try again.',
                functionCalls: functionCallsData,
              });
            }
          }
        }
        
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

            const followUpReadResults = [];
            for (const toolCall of followUpReadOperations) {
              if (toolCall.type === 'function') {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
                
                try {
                  const functionResult = await executeFunction(supabase, user.id, functionName, functionArgs);
                  
                  let serializedResult: string;
                  try {
                    serializedResult = JSON.stringify(functionResult);
                  } catch (serializeError) {
                    serializedResult = JSON.stringify({
                      error: 'Failed to serialize result',
                    });
                  }
                  
                  followUpReadResults.push({
                    role: 'tool' as const,
                    tool_call_id: toolCall.id,
                    content: serializedResult,
                  });
                } catch (execError) {
                  followUpReadResults.push({
                    role: 'tool' as const,
                    tool_call_id: toolCall.id,
                    content: JSON.stringify({ error: execError instanceof Error ? execError.message : 'Function execution failed' }),
                  });
                }
              }
            }

            const allReadResults = [...functionResults, ...followUpReadResults];

            const combinedToolCalls = [
              ...(responseMessage.tool_calls || []).filter((tc: any) => {
                const funcName = tc.type === 'function' ? tc.function?.name : null;
                return funcName && !readOnlyOperations.includes(funcName);
              }),
              ...followUpWriteOperations,
            ];

            const combinedResponseMessage = {
              ...finalResponseMessage,
              tool_calls: combinedToolCalls.length > 0 ? combinedToolCalls : finalResponseMessage.tool_calls,
            };

            return NextResponse.json({
              response: finalResponseMessage.content || 'I need your approval to proceed with the following actions:',
              pendingActions: pendingActions,
              requiresApproval: true,
              responseMessage: combinedResponseMessage,
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
                const functionResult = await executeFunction(supabase, user.id, functionName, functionArgs);
                
                let serializedResult: string;
                try {
                  serializedResult = JSON.stringify(functionResult);
                } catch (serializeError) {
                  serializedResult = JSON.stringify({
                    error: 'Failed to serialize result',
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
                followUpFunctionResults.push({
                  role: 'tool' as const,
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ error: execError instanceof Error ? execError.message : 'Function execution failed' }),
                });
              }
            }
          }

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
