'use client';

import { useState } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { neoStyles, neoColors, buttonVariants } from '@/lib/neoBrutalismStyles';
import ChannelSelector from './ChannelSelector';

interface Reminder {
  id: number;
  text: string;
  description: string | null;
  due_date: string;
  period_days: number;
  slack_webhook: string;
  completion_message: { title: string; description: string } | string | null;
  completion_webhook: string | null;
  completion_slack_channel_id: string | null;
  completion_slack_channel_name: string | null;
  is_complete: boolean;
  last_sent: string | null;
  created_at: string;
}

interface EditCompletionModalProps {
  reminder: Reminder;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditCompletionModal({ reminder, onClose, onUpdated }: EditCompletionModalProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const completionMsg = typeof reminder.completion_message === 'string' 
    ? { title: '', description: reminder.completion_message }
    : (reminder.completion_message || { title: '', description: '' });
  const [completionTitle, setCompletionTitle] = useState(completionMsg.title || '');
  const [completionDescription, setCompletionDescription] = useState(completionMsg.description || '');
  const [completionSlackChannelId, setCompletionSlackChannelId] = useState(reminder.completion_slack_channel_id || null);
  const [completionSlackChannelName, setCompletionSlackChannelName] = useState(reminder.completion_slack_channel_name || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/reminders/${reminder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-completion-config',
          completionMessage: completionTitle || completionDescription ? {
            title: completionTitle || null,
            description: completionDescription || null,
          } : null,
          completionSlackChannelId: completionSlackChannelId,
          completionSlackChannelName: completionSlackChannelName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update completion configuration');
      }

      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: isMobile ? '1rem' : '2rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          border: '4px solid #000000',
          borderRadius: '0',
          boxShadow: '8px 8px 0px 0px #000000',
          padding: isMobile ? '1rem' : '2rem',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: isMobile ? '1.25rem' : '1.5rem',
            fontWeight: '900',
            marginBottom: '1rem',
            color: '#000000',
            textTransform: 'uppercase',
          }}
        >
          EDIT COMPLETION MESSAGE
        </h2>

        <p style={{ fontSize: '0.875rem', fontWeight: '700', marginBottom: '1rem', color: '#000000' }}>
          Configure a message to be sent when this reminder is marked as complete.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="completionTitle" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
              COMPLETION MESSAGE TITLE
            </label>
            <input
              type="text"
              id="completionTitle"
              value={completionTitle}
              onChange={(e) => setCompletionTitle(e.target.value)}
              placeholder="e.g., Reminder Completed Successfully"
              style={{
                ...neoStyles.input,
                width: '100%',
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = neoStyles.inputFocus.boxShadow;
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div>
            <label htmlFor="completionDescription" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
              COMPLETION MESSAGE DESCRIPTION
            </label>
            <textarea
              id="completionDescription"
              value={completionDescription}
              onChange={(e) => setCompletionDescription(e.target.value)}
              placeholder="e.g., Great job! The reminder has been completed successfully."
              rows={3}
              style={{
                ...neoStyles.input,
                width: '100%',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = neoStyles.inputFocus.boxShadow;
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div>
            <ChannelSelector
              value={completionSlackChannelId}
              valueName={completionSlackChannelName}
              onChange={(channelId, channelName) => {
                setCompletionSlackChannelId(channelId);
                setCompletionSlackChannelName(channelName);
              }}
              label="COMPLETION MESSAGE SLACK CHANNEL"
              placeholder="Select channel for completion message..."
            />
            <small style={{ color: '#666', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
              This channel will receive a notification when the reminder is completed.
            </small>
          </div>

          {error && (
            <div style={{
              padding: '0.75rem',
              background: '#FF6B6B',
              border: '3px solid #000000',
              borderRadius: '0',
              boxShadow: '4px 4px 0px 0px #000000',
              color: '#000000',
              fontWeight: '700',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                ...neoStyles.button,
                ...buttonVariants.secondary,
                flex: 1,
                padding: '0.75rem 1rem',
              }}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, neoStyles.buttonHover);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translate(0, 0)';
                e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
              }}
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                ...neoStyles.button,
                ...buttonVariants.success,
                flex: 1,
                padding: '0.75rem 1rem',
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
              {loading ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
