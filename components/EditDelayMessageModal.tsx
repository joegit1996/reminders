'use client';

import { useState, useEffect } from 'react';
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
  delay_message: string | null;
  delay_webhooks: string[];
  delay_slack_channel_id: string | null;
  delay_slack_channel_name: string | null;
  is_complete: boolean;
  last_sent: string | null;
  created_at: string;
}

interface SavedWebhook {
  id: number;
  name: string;
  webhook_url: string;
}

interface EditDelayMessageModalProps {
  reminder: Reminder;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditDelayMessageModal({ reminder, onClose, onUpdated }: EditDelayMessageModalProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [delayMessage, setDelayMessage] = useState(reminder.delay_message || '');
  const [delayWebhooks, setDelayWebhooks] = useState<string[]>(reminder.delay_webhooks || []);
  const [delaySlackChannelId, setDelaySlackChannelId] = useState<string | null>(reminder.delay_slack_channel_id || null);
  const [delaySlackChannelName, setDelaySlackChannelName] = useState<string | null>(reminder.delay_slack_channel_name || null);
  const [savedWebhooks, setSavedWebhooks] = useState<SavedWebhook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSavedWebhooks();
  }, []);

  const fetchSavedWebhooks = async () => {
    try {
      const response = await fetch('/api/webhooks');
      if (response.ok) {
        const data = await response.json();
        setSavedWebhooks(data);
      }
    } catch (error) {
      console.error('Error fetching saved webhooks:', error);
    }
  };

  const handleDelayWebhookToggle = (webhookUrl: string) => {
    const current = delayWebhooks;
    if (current.includes(webhookUrl)) {
      setDelayWebhooks(current.filter(w => w !== webhookUrl));
    } else {
      setDelayWebhooks([...current, webhookUrl]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/reminders/${reminder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-delay-config',
          delayMessage: delayMessage || null,
          delayWebhooks: delayWebhooks,
          delaySlackChannelId: delaySlackChannelId,
          delaySlackChannelName: delaySlackChannelName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update delay configuration');
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
        background: neoStyles.modalOverlay.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: neoStyles.modalContent.background,
          border: neoStyles.modalContent.border,
          borderRadius: neoStyles.modalContent.borderRadius,
          boxShadow: neoStyles.modalContent.boxShadow,
          padding: isMobile ? '1.5rem' : '2rem',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '900', marginBottom: '1rem', color: '#000000', textTransform: 'uppercase' }}>
          EDIT DELAY NOTIFICATION SETTINGS
        </h2>
        <p style={{ color: '#000000', marginBottom: '1.5rem', fontWeight: '700' }}>
          <strong>{reminder.text}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="delayMessage" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
              DELAY MESSAGE TEMPLATE
            </label>
            <textarea
              id="delayMessage"
              value={delayMessage}
              onChange={(e) => setDelayMessage(e.target.value)}
              placeholder='e.g., Unfortunately the FKAutoparts release will be delayed'
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
            <small style={{ color: '#000000', fontSize: '0.875rem', display: 'block', marginTop: '0.25rem', fontWeight: '600' }}>
              The new due date will be automatically appended to your message when sent
            </small>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <ChannelSelector
              value={delaySlackChannelId}
              valueName={delaySlackChannelName}
              onChange={(channelId, channelName) => {
                setDelaySlackChannelId(channelId);
                setDelaySlackChannelName(channelName);
              }}
              label="DELAY MESSAGE SLACK CHANNEL"
              placeholder="Select channel for delay messages..."
            />
            <small style={{ color: '#666', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
              This channel will receive a notification when the due date is updated.
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
              marginBottom: '1rem',
              fontWeight: '700',
            }}>
              {error}
            </div>
          )}

          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            gap: '0.5rem', 
            justifyContent: 'flex-end' 
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                ...neoStyles.button,
                ...buttonVariants.neutral,
                padding: '0.75rem 1.5rem',
                fontSize: isMobile ? '0.9rem' : '1rem',
                width: isMobile ? '100%' : 'auto',
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
                ...buttonVariants.primary,
                padding: '0.75rem 1.5rem',
                fontSize: isMobile ? '0.9rem' : '1rem',
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
                width: isMobile ? '100%' : 'auto',
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
