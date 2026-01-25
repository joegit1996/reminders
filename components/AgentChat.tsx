'use client';

import { useState, useRef, useEffect } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { neoStyles, neoColors, buttonVariants } from '@/lib/neoBrutalismStyles';
import ActionFormFields from './ActionFormFields';

interface PendingAction {
  id: string;
  name: string;
  args: any;
  description: string;
  toolCall: any; // Store the full tool call for execution
  parameters?: any; // Store parameter schema for form generation
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  functionCalls?: Array<{ name: string; args: any }>;
  pendingActions?: PendingAction[];
  requiresApproval?: boolean;
  approved?: boolean;
  responseMessage?: any; // Store the original response message for execution
}

interface AgentChatProps {
  onReminderUpdated?: () => void;
}

// Component for pending actions form
function PendingActionsForm({
  pendingActions,
  messageIndex,
  onApprove,
  onReject,
  loading,
  isMobile,
}: {
  pendingActions: PendingAction[];
  messageIndex: number;
  onApprove: (actions: PendingAction[], idx: number, editedArgs?: any[]) => void;
  onReject: (idx: number) => void;
  loading: boolean;
  isMobile: boolean;
}) {
  const [editedArgs, setEditedArgs] = useState<any[]>(pendingActions.map(a => ({ ...a.args })));

  const handleArgChange = (actionIdx: number, newArgs: any) => {
    const updated = [...editedArgs];
    updated[actionIdx] = newArgs;
    setEditedArgs(updated);
  };

  return (
    <div style={{
      marginTop: '1rem',
      padding: '1rem',
      background: '#FFF9C4',
      border: '3px solid #000000',
      borderRadius: '0',
      boxShadow: '4px 4px 0px 0px #000000',
      width: '100%',
    }}>
      <div style={{
        fontWeight: '900',
        fontSize: isMobile ? '0.875rem' : '1rem',
        marginBottom: '0.75rem',
        textTransform: 'uppercase',
      }}>
        ⚠️ APPROVAL REQUIRED
      </div>
      {pendingActions.map((action, actionIdx) => (
        <div key={actionIdx} style={{
          marginBottom: '0.75rem',
          padding: '0.75rem',
          background: '#FFFFFF',
          border: '2px solid #000000',
          borderRadius: '0',
        }}>
          <div style={{ fontWeight: '700', marginBottom: '0.5rem', fontSize: isMobile ? '0.875rem' : '1rem' }}>
            {action.name}
          </div>
          {action.description && (
            <div style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', marginBottom: '0.5rem', color: '#666' }}>
              {action.description}
            </div>
          )}
          <div style={{ marginTop: '0.75rem' }}>
            <ActionFormFields
              action={{ ...action, args: editedArgs[actionIdx] }}
              onArgsChange={(newArgs) => handleArgChange(actionIdx, newArgs)}
            />
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <button
          onClick={() => onApprove(pendingActions, messageIndex, editedArgs)}
          disabled={loading}
          style={{
            ...neoStyles.button,
            ...buttonVariants.success,
            padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
            fontSize: isMobile ? '0.875rem' : '1rem',
            flex: 1,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              Object.assign(e.currentTarget.style, neoStyles.buttonHover);
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)';
            e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
          }}
        >
          ✓ APPROVE
        </button>
        <button
          onClick={() => onReject(messageIndex)}
          disabled={loading}
          style={{
            ...neoStyles.button,
            ...buttonVariants.danger,
            padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
            fontSize: isMobile ? '0.875rem' : '1rem',
            flex: 1,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              Object.assign(e.currentTarget.style, neoStyles.buttonHover);
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)';
            e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
          }}
        >
          ✗ REJECT
        </button>
      </div>
    </div>
  );
}

export default function AgentChat({ onReminderUpdated }: AgentChatProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. I can help you create, update, and manage reminders. Try saying things like:\n\n• "Create a reminder to review the proposal due on February 15th"\n• "Show me all reminders"\n• "Mark reminder #1 as complete"\n• "Update the due date for test reminder to March 1st"',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleApproveActions = async (pendingActions: PendingAction[], messageIndex: number, editedArgs?: any[]) => {
    setLoading(true);
    try {
      // Find the message with pending actions
      const messageWithActions = messages[messageIndex];
      if (!messageWithActions.pendingActions || !messageWithActions.responseMessage) {
        console.error('Missing pendingActions or responseMessage', messageWithActions);
        setLoading(false);
        return;
      }

      // Filter conversation history up to the approval point (excluding the pending message)
      const conversationHistory = messages.slice(0, messageIndex).filter((msg, index) => {
        if (index === 0 && msg.role === 'assistant') {
          return false;
        }
        return true;
      });

      // If editedArgs provided, update the stored response message with edited values
      let responseMessageToSend = messageWithActions.responseMessage;
      if (editedArgs && editedArgs.length > 0) {
        responseMessageToSend = {
          ...responseMessageToSend,
          tool_calls: responseMessageToSend.tool_calls.map((tc: any, idx: number) => {
            if (idx < editedArgs.length && editedArgs[idx]) {
              return {
                ...tc,
                function: {
                  ...tc.function,
                  arguments: JSON.stringify(editedArgs[idx]),
                },
              };
            }
            return tc;
          }),
        };
      }

      // Send approval with the stored response message (potentially edited)
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `I approve the following actions: ${pendingActions.map(a => a.name).join(', ')}`,
          conversationHistory: conversationHistory,
          approveActions: true,
          pendingActionId: pendingActions[0]?.id,
          responseMessage: responseMessageToSend, // Send the (potentially edited) response message
        }),
      });

      console.log('Approval response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve actions');
      }

      const data = await response.json();
      
      // Update the message to remove pending actions and show result
      setMessages(prev => {
        const updated = [...prev];
        updated[messageIndex] = {
          ...updated[messageIndex],
          pendingActions: undefined,
          requiresApproval: false,
          content: data.response,
          functionCalls: data.functionCalls,
          approved: true,
        };
        return updated;
      });

      // Refresh reminders if a function was called
      if (data.functionCalls && data.functionCalls.length > 0) {
        onReminderUpdated?.();
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to approve actions'}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectActions = (messageIndex: number) => {
    setMessages(prev => {
      const updated = [...prev];
      updated[messageIndex] = {
        ...updated[messageIndex],
        pendingActions: undefined,
        requiresApproval: false,
        content: updated[messageIndex].content + '\n\n❌ Actions rejected by user.',
      };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Filter out the initial welcome message when sending to API
      // Gemini requires the first message to be from 'user'
      const conversationHistory = messages.filter((msg, index) => {
        // Skip the first message if it's the welcome message from assistant
        if (index === 0 && msg.role === 'assistant') {
          return false;
        }
        return true;
      });

      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: conversationHistory,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }

      const data = await response.json();
      
      // If this requires approval, show pending actions
      if (data.requiresApproval && data.pendingActions) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          pendingActions: data.pendingActions,
          requiresApproval: true,
          responseMessage: data.responseMessage, // Store for execution
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          functionCalls: data.functionCalls,
          approved: data.approved,
        }]);

        // Refresh reminders if a function was called
        if (data.functionCalls && data.functionCalls.length > 0) {
          onReminderUpdated?.();
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Something went wrong'}`,
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div style={{
      ...neoStyles.card,
      display: 'flex',
      flexDirection: 'column',
      height: isMobile ? '500px' : '600px',
      maxHeight: '90vh',
    }}>
      <h2 style={{
        fontSize: isMobile ? '1.25rem' : '1.5rem',
        fontWeight: '900',
        marginBottom: '1rem',
        color: '#000000',
        textTransform: 'uppercase',
      }}>
        🤖 AI ASSISTANT
      </h2>

      {/* Messages */}
      <div 
        ref={(el) => {
          if (el) {
            // Ensure scroll container is properly set up
            el.style.overflowY = 'auto';
            el.style.overflowX = 'hidden';
            el.style.WebkitOverflowScrolling = 'touch';
          }
        }}
        style={{
          flex: '1 1 auto',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          padding: '0.5rem',
          marginBottom: '1rem',
          background: '#F9FAFB',
          border: '2px solid #000000',
          borderRadius: '0',
          minHeight: 0,
          maxHeight: '100%',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              width: '100%',
            }}
          >
            <div style={{
              padding: '0.75rem 1rem',
              background: msg.role === 'user' ? '#4ECDC4' : '#FFFFFF',
              border: '3px solid #000000',
              borderRadius: '0',
              boxShadow: '4px 4px 0px 0px #000000',
              color: '#000000',
              fontWeight: '600',
              fontSize: isMobile ? '0.875rem' : '1rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {msg.content}
            </div>
            {/* Pending Actions Approval UI */}
            {msg.pendingActions && msg.pendingActions.length > 0 && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: '#FFF9C4',
                border: '3px solid #000000',
                borderRadius: '0',
                boxShadow: '4px 4px 0px 0px #000000',
                width: '100%',
              }}>
                <div style={{
                  fontWeight: '900',
                  fontSize: isMobile ? '0.875rem' : '1rem',
                  marginBottom: '0.75rem',
                  textTransform: 'uppercase',
                }}>
                  ⚠️ APPROVAL REQUIRED
                </div>
                {msg.pendingActions.map((action, actionIdx) => (
                  <div key={actionIdx} style={{
                    marginBottom: '0.75rem',
                    padding: '0.75rem',
                    background: '#FFFFFF',
                    border: '2px solid #000000',
                    borderRadius: '0',
                  }}>
                    <div style={{ fontWeight: '700', marginBottom: '0.5rem', fontSize: isMobile ? '0.875rem' : '1rem' }}>
                      {action.name}
                    </div>
                    {action.description && (
                      <div style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', marginBottom: '0.5rem', color: '#666' }}>
                        {action.description}
                      </div>
                    )}
                    <div style={{ marginTop: '0.75rem' }}>
                      <ActionFormFields
                        action={action}
                        onArgsChange={(newArgs) => {
                          // Update args in pendingActions
                          const updatedActions = [...msg.pendingActions!];
                          updatedActions[actionIdx] = { ...updatedActions[actionIdx], args: newArgs };
                          setMessages(prev => {
                            const updated = [...prev];
                            updated[idx] = {
                              ...updated[idx],
                              pendingActions: updatedActions,
                            };
                            return updated;
                          });
                        }}
                      />
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    onClick={() => {
                      const editedArgs = msg.pendingActions?.map(a => a.args) || [];
                      handleApproveActions(msg.pendingActions!, idx, editedArgs);
                    }}
                    disabled={loading}
                    style={{
                      ...neoStyles.button,
                      ...buttonVariants.success,
                      padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
                      fontSize: isMobile ? '0.875rem' : '1rem',
                      flex: 1,
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        Object.assign(e.currentTarget.style, neoStyles.buttonHover);
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translate(0, 0)';
                      e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
                    }}
                  >
                    ✓ APPROVE
                  </button>
                  <button
                    onClick={() => handleRejectActions(idx)}
                    disabled={loading}
                    style={{
                      ...neoStyles.button,
                      ...buttonVariants.danger,
                      padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
                      fontSize: isMobile ? '0.875rem' : '1rem',
                      flex: 1,
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        Object.assign(e.currentTarget.style, neoStyles.buttonHover);
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translate(0, 0)';
                      e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
                    }}
                  >
                    ✗ REJECT
                  </button>
                </div>
              </div>
            )}
            
            {msg.functionCalls && msg.functionCalls.length > 0 && (
              <div style={{
                fontSize: '0.75rem',
                color: '#000000',
                marginTop: '0.25rem',
                fontWeight: '700',
                fontStyle: 'italic',
              }}>
                ✓ Executed: {msg.functionCalls.map(fc => fc.name).join(', ')}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            padding: '0.75rem 1rem',
            background: '#FFFFFF',
            border: '3px solid #000000',
            borderRadius: '0',
            boxShadow: '4px 4px 0px 0px #000000',
            color: '#000000',
            fontWeight: '600',
          }}>
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me to create, update, or manage reminders..."
          rows={isMobile ? 2 : 3}
          style={{
            ...neoStyles.input,
            flex: 1,
            fontFamily: 'inherit',
            resize: 'none',
            minHeight: isMobile ? '60px' : '80px',
          }}
          onFocus={(e) => {
            e.target.style.boxShadow = neoStyles.inputFocus.boxShadow;
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = 'none';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            ...neoStyles.button,
            ...buttonVariants.primary,
            padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
            fontSize: isMobile ? '0.875rem' : '1rem',
            alignSelf: 'flex-end',
            opacity: loading || !input.trim() ? 0.6 : 1,
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!loading && input.trim()) {
              Object.assign(e.currentTarget.style, neoStyles.buttonHover);
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)';
            e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
          }}
        >
          {loading ? '...' : 'SEND'}
        </button>
      </form>
    </div>
  );
}
