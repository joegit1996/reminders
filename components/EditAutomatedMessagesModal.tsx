'use client';

import { useState, useEffect } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { neoStyles, neoColors, buttonVariants } from '@/lib/neoBrutalismStyles';
import ChannelSelector from './ChannelSelector';

interface AutomatedMessage {
  id: string;
  days_before: number;
  title: string;
  description: string;
  webhook_url: string;
  slack_channel_id: string | null;
  slack_channel_name: string | null;
  sent: boolean;
  sent_at: string | null;
}

interface Reminder {
  id: number;
  text: string;
  description: string | null;
  due_date: string;
  period_days: number;
  slack_webhook: string;
  delay_message: string | null;
  delay_webhooks: string[];
  automated_messages: AutomatedMessage[];
  is_complete: boolean;
  last_sent: string | null;
  created_at: string;
}

interface SavedWebhook {
  id: number;
  name: string;
  webhook_url: string;
}

interface EditAutomatedMessagesModalProps {
  reminder: Reminder;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditAutomatedMessagesModal({ reminder, onClose, onUpdated }: EditAutomatedMessagesModalProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [automatedMessages, setAutomatedMessages] = useState<AutomatedMessage[]>(
    reminder.automated_messages || []
  );
  const [savedWebhooks, setSavedWebhooks] = useState<SavedWebhook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    days_before: '',
    title: '',
    description: '',
    webhook_url: '',
    slack_channel_id: null as string | null,
    slack_channel_name: null as string | null,
  });

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

  const handleAdd = () => {
    if (!formData.days_before || !formData.title || !formData.description) {
      setError('Days before, title, and description are required');
      return;
    }
    
    if (!formData.slack_channel_id) {
      setError('Please select a Slack channel');
      return;
    }

    const daysBefore = parseInt(formData.days_before);
    if (isNaN(daysBefore) || daysBefore < 1) {
      setError('Days before must be at least 1');
      return;
    }

    const newMessage: AutomatedMessage = {
      id: Date.now().toString(),
      days_before: daysBefore,
      title: formData.title,
      description: formData.description,
      webhook_url: formData.webhook_url,
      slack_channel_id: formData.slack_channel_id,
      slack_channel_name: formData.slack_channel_name,
      sent: false,
      sent_at: null,
    };

    setAutomatedMessages([...automatedMessages, newMessage]);
    setFormData({ days_before: '', title: '', description: '', webhook_url: '', slack_channel_id: null, slack_channel_name: null });
    setError('');
  };

  const handleEdit = (index: number) => {
    const message = automatedMessages[index];
    setFormData({
      days_before: message.days_before.toString(),
      title: message.title,
      description: message.description,
      webhook_url: message.webhook_url,
      slack_channel_id: message.slack_channel_id,
      slack_channel_name: message.slack_channel_name,
    });
    setEditingIndex(index);
    setError('');
  };

  const handleUpdate = () => {
    if (editingIndex === null) return;

    if (!formData.days_before || !formData.title || !formData.description) {
      setError('Days before, title, and description are required');
      return;
    }
    
    if (!formData.slack_channel_id) {
      setError('Please select a Slack channel');
      return;
    }

    const daysBefore = parseInt(formData.days_before);
    if (isNaN(daysBefore) || daysBefore < 1) {
      setError('Days before must be at least 1');
      return;
    }

    const updated = [...automatedMessages];
    updated[editingIndex] = {
      ...updated[editingIndex],
      days_before: daysBefore,
      title: formData.title,
      description: formData.description,
      webhook_url: formData.webhook_url,
      slack_channel_id: formData.slack_channel_id,
      slack_channel_name: formData.slack_channel_name,
      sent: false, // Reset sent status when editing
      sent_at: null,
    };

    setAutomatedMessages(updated);
    setFormData({ days_before: '', title: '', description: '', webhook_url: '', slack_channel_id: null, slack_channel_name: null });
    setEditingIndex(null);
    setError('');
  };

  const handleDelete = (index: number) => {
    setAutomatedMessages(automatedMessages.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    setFormData({ days_before: '', title: '', description: '', webhook_url: '', slack_channel_id: null, slack_channel_name: null });
    setEditingIndex(null);
    setError('');
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
          action: 'update-automated-messages',
          automatedMessages: automatedMessages,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update automated messages');
      }

      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getWebhookName = (webhookUrl: string): string => {
    const webhook = savedWebhooks.find(wh => wh.webhook_url === webhookUrl);
    return webhook ? webhook.name : webhookUrl.substring(0, 30) + '...';
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
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '900', marginBottom: '1rem', color: '#000000', textTransform: 'uppercase' }}>
          EDIT AUTOMATED MESSAGES
        </h2>
        <p style={{ color: '#000000', marginBottom: '1.5rem', fontSize: isMobile ? '0.875rem' : '1rem', fontWeight: '700' }}>
          <strong>{reminder.text}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          {/* Add/Edit Form */}
          <div style={{
            padding: '1rem',
            background: '#FFFFFF',
            borderRadius: '0',
            marginBottom: '1.5rem',
            border: '3px solid #000000',
            boxShadow: '4px 4px 0px 0px #000000',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '900', marginBottom: '1rem', color: '#000000', textTransform: 'uppercase' }}>
              {editingIndex !== null ? 'EDIT MESSAGE' : 'ADD NEW AUTOMATED MESSAGE'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="days_before" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
                  DAYS BEFORE DUE DATE *
                </label>
                <input
                  type="number"
                  id="days_before"
                  value={formData.days_before}
                  onChange={(e) => setFormData({ ...formData, days_before: e.target.value })}
                  min="1"
                  required
                  placeholder="e.g., 7"
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
                <label htmlFor="title" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
                  TITLE *
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="e.g., Upcoming Task Reminder"
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
                <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
                  DESCRIPTION *
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={3}
                  placeholder="Message description..."
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
                  value={formData.slack_channel_id}
                  valueName={formData.slack_channel_name}
                  onChange={(channelId, channelName) => setFormData({ ...formData, slack_channel_id: channelId, slack_channel_name: channelName })}
                  label="SLACK CHANNEL *"
                  placeholder="Select channel for this message..."
                />
                <small style={{ color: '#666', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
                  This message will be sent to the selected channel.
                </small>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {editingIndex !== null ? (
                  <>
                    <button
                      type="button"
                      onClick={handleUpdate}
                      style={{
                        ...neoStyles.button,
                        ...buttonVariants.primary,
                        padding: '0.75rem 1.5rem',
                        fontSize: '1rem',
                        flex: 1,
                      }}
                      onMouseEnter={(e) => {
                        Object.assign(e.currentTarget.style, neoStyles.buttonHover);
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translate(0, 0)';
                        e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
                      }}
                    >
                      UPDATE
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      style={{
                        ...neoStyles.button,
                        ...buttonVariants.neutral,
                        padding: '0.75rem 1.5rem',
                        fontSize: '1rem',
                        flex: 1,
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
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleAdd}
                    style={{
                      ...neoStyles.button,
                      ...buttonVariants.success,
                      padding: '0.75rem 1.5rem',
                      fontSize: '1rem',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => {
                      Object.assign(e.currentTarget.style, neoStyles.buttonHover);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translate(0, 0)';
                      e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
                    }}
                  >
                    ADD MESSAGE
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* List of Automated Messages */}
          {automatedMessages.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '900', marginBottom: '1rem', color: '#000000', textTransform: 'uppercase' }}>
                AUTOMATED MESSAGES ({automatedMessages.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {automatedMessages.map((msg, index) => (
                  <div
                    key={msg.id}
                    style={{
                      padding: '1rem',
                      background: '#FFFFFF',
                      border: `3px solid ${msg.sent ? '#6BCB77' : '#000000'}`,
                      borderRadius: '0',
                      boxShadow: `4px 4px 0px 0px ${msg.sent ? '#6BCB77' : '#000000'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', marginBottom: '0.25rem', color: '#000000' }}>
                          {msg.title}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#000000', marginBottom: '0.5rem', fontWeight: '600' }}>
                          {msg.description}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#000000', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontWeight: '600' }}>
                          <span>📅 {msg.days_before} DAY{msg.days_before !== 1 ? 'S' : ''} BEFORE DUE DATE</span>
                          {msg.slack_channel_name && <span>📢 {msg.slack_channel_name}</span>}
                          {msg.sent && msg.sent_at && (
                            <span>✓ SENT: {new Date(msg.sent_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!msg.sent && (
                          <button
                            type="button"
                            onClick={() => handleEdit(index)}
                            style={{
                              ...neoStyles.button,
                              ...buttonVariants.primary,
                              padding: '0.5rem 1rem',
                              fontSize: '0.875rem',
                            }}
                            onMouseEnter={(e) => {
                              Object.assign(e.currentTarget.style, neoStyles.buttonHover);
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translate(0, 0)';
                              e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
                            }}
                          >
                            EDIT
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(index)}
                          style={{
                            ...neoStyles.button,
                            ...buttonVariants.danger,
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem',
                          }}
                          onMouseEnter={(e) => {
                            Object.assign(e.currentTarget.style, neoStyles.buttonHover);
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translate(0, 0)';
                            e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
                          }}
                        >
                          DELETE
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
