'use client';

import { useState, useEffect } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { neoStyles, neoColors, buttonVariants } from '@/lib/neoBrutalismStyles';

interface SavedWebhook {
  id: number;
  name: string;
  webhook_url: string;
}

interface ReminderFormProps {
  onReminderCreated: () => void;
}

export default function ReminderForm({ onReminderCreated }: ReminderFormProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [formData, setFormData] = useState({
    text: '',
    description: '',
    dueDate: '',
    periodDays: '1',
    slackWebhook: '',
    delayMessage: '',
    delayWebhooks: [] as string[],
    automatedMessages: [] as Array<{
      id: string;
      days_before: number;
      title: string;
      description: string;
      webhook_url: string;
      sent: boolean;
      sent_at: string | null;
    }>,
  });
  const [savedWebhooks, setSavedWebhooks] = useState<SavedWebhook[]>([]);
  const [showDelayConfig, setShowDelayConfig] = useState(false);
  const [showAutomatedMessages, setShowAutomatedMessages] = useState(false);
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [automatedMessageForm, setAutomatedMessageForm] = useState({
    days_before: '',
    title: '',
    description: '',
    webhook_url: '',
  });
  const [editingAutomatedMessageIndex, setEditingAutomatedMessageIndex] = useState<number | null>(null);
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
      } else {
        console.error('Failed to fetch webhooks:', response.status);
      }
    } catch (error) {
      console.error('Error fetching saved webhooks:', error);
    }
  };

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWebhookName,
          webhookUrl: newWebhookUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add webhook');
      }

      await fetchSavedWebhooks();
      setNewWebhookName('');
      setNewWebhookUrl('');
      setShowAddWebhook(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add webhook');
    }
  };

  const handleWebhookSelect = (webhookUrl: string) => {
    setFormData({ ...formData, slackWebhook: webhookUrl });
  };

  const handleDelayWebhookToggle = (webhookUrl: string) => {
    const current = formData.delayWebhooks;
    if (current.includes(webhookUrl)) {
      setFormData({ ...formData, delayWebhooks: current.filter(w => w !== webhookUrl) });
    } else {
      setFormData({ ...formData, delayWebhooks: [...current, webhookUrl] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: formData.text,
          description: formData.description || null,
          dueDate: formData.dueDate,
          periodDays: parseInt(formData.periodDays),
          slackWebhook: formData.slackWebhook,
          delayMessage: formData.delayMessage || null,
          delayWebhooks: formData.delayWebhooks.length > 0 ? formData.delayWebhooks : [],
          automatedMessages: formData.automatedMessages,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create reminder');
      }

      // Reset form
      setFormData({
        text: '',
        description: '',
        dueDate: '',
        periodDays: '1',
        slackWebhook: '',
        delayMessage: '',
        delayWebhooks: [],
        automatedMessages: [],
      });
      setAutomatedMessageForm({
        days_before: '',
        title: '',
        description: '',
        webhook_url: '',
      });
      setShowAutomatedMessages(false);
      setShowDelayConfig(false);

      onReminderCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label htmlFor="text" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
          REMINDER TEXT *
        </label>
        <input
          type="text"
          id="text"
          value={formData.text}
          onChange={(e) => setFormData({ ...formData, text: e.target.value })}
          required
          placeholder="e.g., Get fkautoparts ready and released"
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
          DESCRIPTION (OPTIONAL)
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Add additional details about this reminder..."
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
        <label htmlFor="dueDate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
          DUE DATE *
        </label>
        <input
          type="date"
          id="dueDate"
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          required
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
        <label htmlFor="periodDays" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
          PERIOD (DAYS BETWEEN REMINDERS) *
        </label>
        <input
          type="number"
          id="periodDays"
          value={formData.periodDays}
          onChange={(e) => setFormData({ ...formData, periodDays: e.target.value })}
          required
          min="1"
          placeholder="e.g., 3"
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
        <label htmlFor="slackWebhook" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
          REMINDER WEBHOOK URL * (FOR PERIODIC REMINDERS)
        </label>
        {savedWebhooks.length > 0 && (
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleWebhookSelect(e.target.value);
              }
            }}
            value={formData.slackWebhook}
            style={{
              ...neoStyles.input,
              width: '100%',
              marginBottom: '0.5rem',
            }}
            onFocus={(e) => {
              e.target.style.boxShadow = neoStyles.inputFocus.boxShadow;
            }}
            onBlur={(e) => {
              e.target.style.boxShadow = 'none';
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
          id="slackWebhook"
          value={formData.slackWebhook}
          onChange={(e) => setFormData({ ...formData, slackWebhook: e.target.value })}
          required
          placeholder="https://hooks.slack.com/services/... or select from saved webhooks above"
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
        <button
          type="button"
          onClick={() => setShowAddWebhook(!showAddWebhook)}
          style={{
            ...neoStyles.button,
            ...buttonVariants.neutral,
            marginTop: '0.5rem',
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
          {showAddWebhook ? 'CANCEL' : '+ SAVE NEW WEBHOOK'}
        </button>
        {showAddWebhook && (
          <div style={{ marginTop: '0.5rem', padding: '1rem', background: neoStyles.card.background, border: '3px solid #000000', borderRadius: neoStyles.card.borderRadius, boxShadow: '4px 4px 0px 0px #000000' }}>
            <form onSubmit={handleAddWebhook} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Webhook name"
                value={newWebhookName}
                onChange={(e) => setNewWebhookName(e.target.value)}
                required
                style={{ ...neoStyles.input, padding: '0.5rem' }}
                onFocus={(e) => {
                  e.target.style.boxShadow = neoStyles.inputFocus.boxShadow;
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none';
                }}
              />
              <input
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                required
                style={{ ...neoStyles.input, padding: '0.5rem' }}
                onFocus={(e) => {
                  e.target.style.boxShadow = neoStyles.inputFocus.boxShadow;
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="submit"
                style={{
                  ...neoStyles.button,
                  ...buttonVariants.primary,
                  padding: '0.5rem',
                }}
                onMouseEnter={(e) => {
                  Object.assign(e.currentTarget.style, neoStyles.buttonHover);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translate(0, 0)';
                  e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
                }}
              >
                SAVE WEBHOOK
              </button>
            </form>
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowDelayConfig(!showDelayConfig)}
          style={{
            ...neoStyles.button,
            ...buttonVariants.neutral,
            width: '100%',
            padding: '0.75rem',
            fontSize: '0.875rem',
            background: showDelayConfig ? '#E5E5E5' : '#F3F4F6',
          }}
          onMouseEnter={(e) => {
            Object.assign(e.currentTarget.style, neoStyles.buttonHover);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)';
            e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
          }}
        >
          {showDelayConfig ? '▼ HIDE' : '▶ SHOW'} DELAY NOTIFICATION SETTINGS (OPTIONAL)
        </button>
        {showDelayConfig && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: neoStyles.card.background, border: '3px solid #000000', borderRadius: neoStyles.card.borderRadius, boxShadow: '4px 4px 0px 0px #000000' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="delayMessage" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
                DELAY MESSAGE TEMPLATE
              </label>
              <input
                type="text"
                id="delayMessage"
                value={formData.delayMessage}
                onChange={(e) => setFormData({ ...formData, delayMessage: e.target.value })}
                placeholder='e.g., Unfortunately the FKAutoparts release will be delayed, the new expected due date is DD.MM.YYYY'
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
              <small style={{ color: '#000000', fontSize: '0.875rem', display: 'block', marginTop: '0.25rem', fontWeight: '600' }}>
                The new due date will be automatically appended to your message when sent
              </small>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
                DELAY NOTIFICATION WEBHOOKS (SELECT MULTIPLE - SEPARATE FROM REMINDER WEBHOOK)
              </label>
              <small style={{ color: '#000000', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                These webhooks will ONLY receive delay messages when the due date is updated. They are completely separate from the reminder webhook above.
              </small>
              {savedWebhooks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {savedWebhooks.map((wh) => (
                    <label key={wh.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.delayWebhooks.includes(wh.webhook_url)}
                        onChange={() => handleDelayWebhookToggle(wh.webhook_url)}
                      />
                      <span>{wh.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#000000', fontSize: '0.875rem', fontWeight: '600' }}>No saved webhooks. Add one above to use delay notifications.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowAutomatedMessages(!showAutomatedMessages)}
          style={{
            ...neoStyles.button,
            ...buttonVariants.neutral,
            width: '100%',
            padding: '0.75rem',
            fontSize: '0.875rem',
            background: showAutomatedMessages ? '#E5E5E5' : '#F3F4F6',
          }}
          onMouseEnter={(e) => {
            Object.assign(e.currentTarget.style, neoStyles.buttonHover);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)';
            e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
          }}
        >
          {showAutomatedMessages ? '▼ HIDE' : '▶ SHOW'} AUTOMATED MESSAGES (OPTIONAL)
        </button>
        {showAutomatedMessages && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: neoStyles.card.background, border: '3px solid #000000', borderRadius: neoStyles.card.borderRadius, boxShadow: '4px 4px 0px 0px #000000' }}>
            <p style={{ fontSize: '0.875rem', color: '#000000', marginBottom: '1rem', fontWeight: '600' }}>
              Send automated messages N days before the due date. Each message is sent only once.
            </p>
            
            {/* Add/Edit Form */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: neoStyles.card.background, border: '3px solid #000000', borderRadius: neoStyles.card.borderRadius, boxShadow: '4px 4px 0px 0px #000000' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '900', marginBottom: '1rem', color: '#000000', textTransform: 'uppercase' }}>
                {editingAutomatedMessageIndex !== null ? 'EDIT AUTOMATED MESSAGE' : 'ADD NEW AUTOMATED MESSAGE'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label htmlFor="auto_days_before" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
                    DAYS BEFORE DUE DATE *
                  </label>
                  <input
                    type="number"
                    id="auto_days_before"
                    value={automatedMessageForm.days_before}
                    onChange={(e) => setAutomatedMessageForm({ ...automatedMessageForm, days_before: e.target.value })}
                    min="1"
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
                  <label htmlFor="auto_title" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
                    TITLE *
                  </label>
                  <input
                    type="text"
                    id="auto_title"
                    value={automatedMessageForm.title}
                    onChange={(e) => setAutomatedMessageForm({ ...automatedMessageForm, title: e.target.value })}
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
                  <label htmlFor="auto_description" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
                    DESCRIPTION *
                  </label>
                  <textarea
                    id="auto_description"
                    value={automatedMessageForm.description}
                    onChange={(e) => setAutomatedMessageForm({ ...automatedMessageForm, description: e.target.value })}
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
                  <label htmlFor="auto_webhook" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
                    WEBHOOK *
                  </label>
                  {savedWebhooks.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setAutomatedMessageForm({ ...automatedMessageForm, webhook_url: e.target.value });
                        }
                      }}
                      value={automatedMessageForm.webhook_url}
                      style={{
                        ...neoStyles.input,
                        width: '100%',
                        marginBottom: '0.5rem',
                      }}
                      onFocus={(e) => {
                        e.target.style.boxShadow = neoStyles.inputFocus.boxShadow;
                      }}
                      onBlur={(e) => {
                        e.target.style.boxShadow = 'none';
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
                    id="auto_webhook"
                    value={automatedMessageForm.webhook_url}
                    onChange={(e) => setAutomatedMessageForm({ ...automatedMessageForm, webhook_url: e.target.value })}
                    placeholder="https://hooks.slack.com/services/... or select from saved webhooks above"
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
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {editingAutomatedMessageIndex !== null ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...formData.automatedMessages];
                          updated[editingAutomatedMessageIndex] = {
                            id: updated[editingAutomatedMessageIndex].id,
                            days_before: parseInt(automatedMessageForm.days_before),
                            title: automatedMessageForm.title,
                            description: automatedMessageForm.description,
                            webhook_url: automatedMessageForm.webhook_url,
                            sent: false,
                            sent_at: null,
                          };
                          setFormData({ ...formData, automatedMessages: updated });
                          setAutomatedMessageForm({ days_before: '', title: '', description: '', webhook_url: '' });
                          setEditingAutomatedMessageIndex(null);
                        }}
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
                        onClick={() => {
                          setAutomatedMessageForm({ days_before: '', title: '', description: '', webhook_url: '' });
                          setEditingAutomatedMessageIndex(null);
                        }}
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
                      onClick={() => {
                        if (!automatedMessageForm.days_before || !automatedMessageForm.title || !automatedMessageForm.description || !automatedMessageForm.webhook_url) {
                          setError('All automated message fields are required');
                          return;
                        }
                        const daysBefore = parseInt(automatedMessageForm.days_before);
                        if (isNaN(daysBefore) || daysBefore < 1) {
                          setError('Days before must be at least 1');
                          return;
                        }
                        const newMessage = {
                          id: Date.now().toString(),
                          days_before: daysBefore,
                          title: automatedMessageForm.title,
                          description: automatedMessageForm.description,
                          webhook_url: automatedMessageForm.webhook_url,
                          sent: false,
                          sent_at: null,
                        };
                        setFormData({ ...formData, automatedMessages: [...formData.automatedMessages, newMessage] });
                        setAutomatedMessageForm({ days_before: '', title: '', description: '', webhook_url: '' });
                        setError('');
                      }}
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
                      ADD AUTOMATED MESSAGE
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* List of Automated Messages */}
            {formData.automatedMessages.length > 0 && (
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: '900', marginBottom: '1rem', color: '#000000', textTransform: 'uppercase' }}>
                  CONFIGURED AUTOMATED MESSAGES ({formData.automatedMessages.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {formData.automatedMessages.map((msg, index) => {
                    const webhookName = savedWebhooks.find(wh => wh.webhook_url === msg.webhook_url)?.name || msg.webhook_url.substring(0, 30) + '...';
                    return (
                      <div
                        key={msg.id}
                        style={{
                          padding: '1rem',
                          background: '#FFFFFF',
                          border: '3px solid #000000',
                          borderRadius: '0',
                          boxShadow: '4px 4px 0px 0px #000000',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '700', marginBottom: '0.25rem', color: '#000000' }}>
                            {msg.title}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#000000', marginBottom: '0.5rem', fontWeight: '600' }}>
                            {msg.description}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#000000', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontWeight: '600' }}>
                            <span>📅 {msg.days_before} day{msg.days_before !== 1 ? 's' : ''} before</span>
                            <span>🔗 {webhookName}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setAutomatedMessageForm({
                                days_before: msg.days_before.toString(),
                                title: msg.title,
                                description: msg.description,
                                webhook_url: msg.webhook_url,
                              });
                              setEditingAutomatedMessageIndex(index);
                            }}
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
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                automatedMessages: formData.automatedMessages.filter((_, i) => i !== index),
                              });
                            }}
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
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
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

      <button
        type="submit"
        disabled={loading}
        style={{
          ...neoStyles.button,
          ...buttonVariants.success,
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
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
        {loading ? 'CREATING...' : 'CREATE REMINDER'}
      </button>
    </form>
  );
}
