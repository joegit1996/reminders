'use client';

import { useState, useEffect } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface AutomatedMessage {
  id: string;
  days_before: number;
  title: string;
  description: string;
  webhook_url: string;
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
    if (!formData.days_before || !formData.title || !formData.description || !formData.webhook_url) {
      setError('All fields are required');
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
      sent: false,
      sent_at: null,
    };

    setAutomatedMessages([...automatedMessages, newMessage]);
    setFormData({ days_before: '', title: '', description: '', webhook_url: '' });
    setError('');
  };

  const handleEdit = (index: number) => {
    const message = automatedMessages[index];
    setFormData({
      days_before: message.days_before.toString(),
      title: message.title,
      description: message.description,
      webhook_url: message.webhook_url,
    });
    setEditingIndex(index);
    setError('');
  };

  const handleUpdate = () => {
    if (editingIndex === null) return;

    if (!formData.days_before || !formData.title || !formData.description || !formData.webhook_url) {
      setError('All fields are required');
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
      sent: false, // Reset sent status when editing
      sent_at: null,
    };

    setAutomatedMessages(updated);
    setFormData({ days_before: '', title: '', description: '', webhook_url: '' });
    setEditingIndex(null);
    setError('');
  };

  const handleDelete = (index: number) => {
    setAutomatedMessages(automatedMessages.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    setFormData({ days_before: '', title: '', description: '', webhook_url: '' });
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
        background: 'rgba(0, 0, 0, 0.5)',
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
          background: 'white',
          borderRadius: '12px',
          padding: isMobile ? '1.5rem' : '2rem',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
          Edit Automated Messages
        </h2>
        <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: isMobile ? '0.875rem' : '1rem' }}>
          <strong>{reminder.text}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          {/* Add/Edit Form */}
          <div style={{
            padding: '1rem',
            background: '#f9fafb',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '1px solid #e5e7eb',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
              {editingIndex !== null ? 'Edit Message' : 'Add New Automated Message'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="days_before" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Days Before Due Date *
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
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem',
                  }}
                />
              </div>
              <div>
                <label htmlFor="title" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="e.g., Upcoming Task Reminder"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem',
                  }}
                />
              </div>
              <div>
                <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Description *
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={3}
                  placeholder="Message description..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>
              <div>
                <label htmlFor="webhook_url" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Webhook *
                </label>
                {savedWebhooks.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setFormData({ ...formData, webhook_url: e.target.value });
                      }
                    }}
                    value={formData.webhook_url}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <option value="">Select a saved webhook...</option>
                    {savedWebhooks.map((wh) => (
                      <option key={wh.id} value={wh.webhook_url}>
                        {wh.name}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="url"
                  id="webhook_url"
                  value={formData.webhook_url}
                  onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                  required
                  placeholder="https://hooks.slack.com/services/... or select from saved webhooks above"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {editingIndex !== null ? (
                  <>
                    <button
                      type="button"
                      onClick={handleUpdate}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        fontWeight: '500',
                        flex: 1,
                      }}
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#e5e7eb',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        fontWeight: '500',
                        flex: 1,
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleAdd}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      fontWeight: '500',
                      width: '100%',
                    }}
                  >
                    Add Message
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* List of Automated Messages */}
          {automatedMessages.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
                Automated Messages ({automatedMessages.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {automatedMessages.map((msg, index) => (
                  <div
                    key={msg.id}
                    style={{
                      padding: '1rem',
                      background: msg.sent ? '#f0fdf4' : 'white',
                      border: `1px solid ${msg.sent ? '#4ade80' : '#e5e7eb'}`,
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                          {msg.title}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                          {msg.description}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#999', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <span>📅 {msg.days_before} day{msg.days_before !== 1 ? 's' : ''} before due date</span>
                          <span>🔗 {getWebhookName(msg.webhook_url)}</span>
                          {msg.sent && msg.sent_at && (
                            <span>✓ Sent: {new Date(msg.sent_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!msg.sent && (
                          <button
                            type="button"
                            onClick={() => handleEdit(index)}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              cursor: 'pointer',
                              fontWeight: '500',
                            }}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(index)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            fontWeight: '500',
                          }}
                        >
                          Delete
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
              background: '#fee',
              border: '1px solid #fcc',
              borderRadius: '6px',
              color: '#c33',
              marginBottom: '1rem',
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
                padding: '0.75rem 1.5rem',
                background: '#e5e7eb',
                color: '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: isMobile ? '0.9rem' : '1rem',
                cursor: 'pointer',
                fontWeight: '500',
                width: isMobile ? '100%' : 'auto',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                background: loading ? '#ccc' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: isMobile ? '0.9rem' : '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                width: isMobile ? '100%' : 'auto',
              }}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
