'use client';

import { useState, useRef, useEffect } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { neoStyles, neoColors, buttonVariants } from '@/lib/neoBrutalismStyles';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  functionCalls?: Array<{ name: string; args: any }>;
}

interface AgentChatProps {
  onReminderUpdated?: () => void;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }

      const data = await response.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        functionCalls: data.functionCalls,
      }]);

      // Refresh reminders if a function was called
      if (data.functionCalls && data.functionCalls.length > 0) {
        onReminderUpdated?.();
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
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '0.5rem',
        marginBottom: '1rem',
        background: '#F9FAFB',
        border: '2px solid #000000',
        borderRadius: '0',
      }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
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
