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
  approvedActions?: Array<{ name: string; args: any }>; // Track approved actions
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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Modal state for approvals
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentActionIndex, setCurrentActionIndex] = useState(0);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(-1);
  const [allPendingActions, setAllPendingActions] = useState<PendingAction[]>([]);
  const [currentResponseMessage, setCurrentResponseMessage] = useState<any>(null);
  const [editedArgs, setEditedArgs] = useState<any[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle approving the current action in the modal (sequential approval)
  const handleApproveCurrentAction = async () => {
    if (currentActionIndex >= allPendingActions.length || currentMessageIndex === -1) return;
    
    setLoading(true);
    try {
      const messageWithActions = messages[currentMessageIndex];
      if (!messageWithActions || !currentResponseMessage) {
        console.error('Missing message or responseMessage');
        setLoading(false);
        return;
      }

      // Update edited args for current action
      const updatedArgs = [...editedArgs];
      
      // Filter conversation history up to the approval point
      const conversationHistory = messages.slice(0, currentMessageIndex).filter((msg, index) => {
        if (index === 0 && msg.role === 'assistant') {
          return false;
        }
        return true;
      });

      // Create a response message with ONLY the current action's tool call
      const currentAction = allPendingActions[currentActionIndex];
      const currentToolCall = currentResponseMessage.tool_calls.find((tc: any) => tc.id === currentAction.id);
      
      if (!currentToolCall) {
        throw new Error('Tool call not found for current action');
      }

      // Update the tool call with edited args
      const updatedToolCall = {
        ...currentToolCall,
        function: {
          ...currentToolCall.function,
          arguments: JSON.stringify(updatedArgs[currentActionIndex] || currentAction.args),
        },
      };

      // Create response message with only this tool call
      const responseMessageToSend = {
        ...currentResponseMessage,
        tool_calls: [updatedToolCall],
      };

      // Send approval for ONLY the current action
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `I approve action ${currentActionIndex + 1}: ${currentAction.name}`,
          conversationHistory: conversationHistory,
          approveActions: true,
          pendingActionId: currentAction.id,
          responseMessage: responseMessageToSend,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve action');
      }

      const data = await response.json();
      
      // Track approved actions
      const approvedActions = [...(messageWithActions.approvedActions || []), {
        name: currentAction.name,
        args: updatedArgs[currentActionIndex] || currentAction.args,
      }];

      // Move to next action or close modal if all approved
      const nextActionIndex = currentActionIndex + 1;
      
      if (nextActionIndex >= allPendingActions.length) {
        // All actions approved - update message and close modal
        const approvedActionNames = approvedActions.map(a => a.name).join(', ');
        setMessages(prev => {
          const updated = [...prev];
          const originalContent = updated[currentMessageIndex].content;
          updated[currentMessageIndex] = {
            ...updated[currentMessageIndex],
            pendingActions: undefined,
            requiresApproval: false,
            responseMessage: undefined,
            content: data.response || `${originalContent}\n\n✅ All actions approved and executed: ${approvedActionNames}`,
            functionCalls: [...(updated[currentMessageIndex].functionCalls || []), ...(data.functionCalls || [])],
            approved: true,
            approvedActions: approvedActions,
          };
          return updated;
        });

        // Close modal
        setShowApprovalModal(false);
        setCurrentActionIndex(0);
        setCurrentMessageIndex(-1);
        setAllPendingActions([]);
        setCurrentResponseMessage(null);
        setEditedArgs([]);

        // Refresh reminders if a function was called
        if (data.functionCalls && data.functionCalls.length > 0) {
          onReminderUpdated?.();
        }
      } else {
        // Move to next action
        setCurrentActionIndex(nextActionIndex);
        
        // Update message to show progress
        setMessages(prev => {
          const updated = [...prev];
          updated[currentMessageIndex] = {
            ...updated[currentMessageIndex],
            functionCalls: [...(updated[currentMessageIndex].functionCalls || []), ...(data.functionCalls || [])],
            approvedActions: approvedActions,
          };
          return updated;
        });

        // Refresh reminders if a function was called
        if (data.functionCalls && data.functionCalls.length > 0) {
          onReminderUpdated?.();
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to approve action'}`,
      }]);
      setShowApprovalModal(false);
    } finally {
      setLoading(false);
    }
  };

  // Handle rejecting the current action
  const handleRejectCurrentAction = () => {
    if (currentMessageIndex === -1) return;
    
    setMessages(prev => {
      const updated = [...prev];
      updated[currentMessageIndex] = {
        ...updated[currentMessageIndex],
        pendingActions: undefined,
        requiresApproval: false,
        responseMessage: undefined,
        content: updated[currentMessageIndex].content + '\n\n❌ Actions rejected by user.',
      };
      return updated;
    });
    
    // Close modal
    setShowApprovalModal(false);
    setCurrentActionIndex(0);
    setCurrentMessageIndex(-1);
    setAllPendingActions([]);
    setCurrentResponseMessage(null);
    setEditedArgs([]);
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
      
      // If this requires approval, show modal
      if (data.requiresApproval && data.pendingActions) {
        const newMessage: Message = {
          role: 'assistant',
          content: data.response,
          pendingActions: data.pendingActions,
          requiresApproval: true,
          responseMessage: data.responseMessage, // Store for execution
        };
        setMessages(prev => [...prev, newMessage]);
        
        // Show approval modal
        setAllPendingActions(data.pendingActions);
        setCurrentMessageIndex(messages.length); // Index of the new message
        setCurrentActionIndex(0);
        setCurrentResponseMessage(data.responseMessage);
        setEditedArgs(data.pendingActions.map((a: PendingAction) => ({ ...a.args })));
        setShowApprovalModal(true);
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
      height: isMobile ? '600px' : '800px',
      maxHeight: '95vh',
    }}>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        style={{
          flex: '1 1 0',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch' as any,
          display: 'block',
          padding: '0.5rem',
          marginBottom: '1rem',
          background: '#F9FAFB',
          border: '2px solid #000000',
          borderRadius: '0',
          minHeight: 0,
        }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
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
            {/* Show indicator if actions need approval */}
            {msg.pendingActions && msg.pendingActions.length > 0 && (
              <div style={{
                marginTop: '0.5rem',
                padding: '0.5rem',
                background: '#FFF9C4',
                border: '2px solid #000000',
                borderRadius: '0',
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                fontWeight: '700',
              }}>
                ⚠️ {msg.pendingActions.length} action(s) pending approval
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

      {/* Approval Modal */}
      {showApprovalModal && allPendingActions.length > 0 && currentActionIndex < allPendingActions.length && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: neoStyles.modalOverlay.background,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={(e) => {
            // Don't close on overlay click - require explicit action
            e.stopPropagation();
          }}
        >
          <div
            style={{
              background: neoStyles.modalContent.background,
              border: neoStyles.modalContent.border,
              borderRadius: neoStyles.modalContent.borderRadius,
              boxShadow: neoStyles.modalContent.boxShadow,
              padding: isMobile ? '1.5rem' : '2rem',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
            }}>
              <h2 style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '900',
                color: '#000000',
                textTransform: 'uppercase',
                margin: 0,
              }}>
                ⚠️ APPROVAL REQUIRED
              </h2>
              <div style={{
                fontSize: isMobile ? '0.875rem' : '1rem',
                fontWeight: '700',
                color: '#666',
              }}>
                {currentActionIndex + 1} of {allPendingActions.length}
              </div>
            </div>

            {allPendingActions[currentActionIndex] && (
              <>
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  background: '#FFFFFF',
                  border: '2px solid #000000',
                  borderRadius: '0',
                }}>
                  <div style={{
                    fontWeight: '700',
                    marginBottom: '0.5rem',
                    fontSize: isMobile ? '1rem' : '1.125rem',
                  }}>
                    {allPendingActions[currentActionIndex].name}
                  </div>
                  {allPendingActions[currentActionIndex].description && (
                    <div style={{
                      fontSize: isMobile ? '0.875rem' : '1rem',
                      marginBottom: '1rem',
                      color: '#666',
                    }}>
                      {allPendingActions[currentActionIndex].description}
                    </div>
                  )}
                  <div style={{ marginTop: '1rem' }}>
                    <ActionFormFields
                      action={{
                        ...allPendingActions[currentActionIndex],
                        args: editedArgs[currentActionIndex] || allPendingActions[currentActionIndex].args,
                      }}
                      onArgsChange={(newArgs) => {
                        const updated = [...editedArgs];
                        updated[currentActionIndex] = newArgs;
                        setEditedArgs(updated);
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={handleApproveCurrentAction}
                    disabled={loading}
                    style={{
                      ...neoStyles.button,
                      ...buttonVariants.success,
                      padding: isMobile ? '0.75rem 1.5rem' : '1rem 2rem',
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
                    ✓ APPROVE {currentActionIndex < allPendingActions.length - 1 ? '& NEXT' : ''}
                  </button>
                  <button
                    onClick={handleRejectCurrentAction}
                    disabled={loading}
                    style={{
                      ...neoStyles.button,
                      ...buttonVariants.danger,
                      padding: isMobile ? '0.75rem 1.5rem' : '1rem 2rem',
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
                    ✗ REJECT ALL
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
