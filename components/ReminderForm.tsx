'use client';

import { useState, useEffect } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { neoStyles, neoColors, buttonVariants } from '@/lib/neoBrutalismStyles';
import ChannelSelector from './ChannelSelector';

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
  
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [formData, setFormData] = useState({
    text: '',
    description: '',
    dueDate: getTodayDate(),
    scheduleType: 'period_days' as 'period_days' | 'days_of_week' | 'days_of_month',
    periodDays: '1',
    selectedDays: [] as number[],
    slackWebhook: '',
    slackChannelId: null as string | null,
    slackChannelName: null as string | null,
    delayMessage: '',
    delayWebhooks: [] as string[],
    delaySlackChannelId: null as string | null,
    delaySlackChannelName: null as string | null,
    automatedMessages: [] as Array<{
      id: string;
      days_before: number;
      title: string;
      description: string;
      webhook_url: string;
      slack_channel_id: string | null;
      slack_channel_name: string | null;
      sent: boolean;
      sent_at: string | null;
    }>,
    completionTitle: '',
    completionDescription: '',
    completionWebhook: '',
    completionSlackChannelId: null as string | null,
    completionSlackChannelName: null as string | null,
    nudgeEnabled: true,
  });
  const [savedWebhooks, setSavedWebhooks] = useState<SavedWebhook[]>([]);
  const [showDelayConfig, setShowDelayConfig] = useState(false);
  const [showAutomatedMessages, setShowAutomatedMessages] = useState(false);
  const [showCompletionConfig, setShowCompletionConfig] = useState(false);
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [automatedMessageForm, setAutomatedMessageForm] = useState({
    days_before: '',
    title: '',
    description: '',
    webhook_url: '',
    slack_channel_id: null as string | null,
    slack_channel_name: null as string | null,
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
          scheduleType: formData.scheduleType,
          scheduleConfig: formData.scheduleType === 'period_days'
            ? { period_days: parseInt(formData.periodDays) }
            : { days: formData.selectedDays },
          slackWebhook: formData.slackWebhook,
          slackChannelId: formData.slackChannelId,
          slackChannelName: formData.slackChannelName,
          delayMessage: formData.delayMessage || null,
          delayWebhooks: formData.delayWebhooks.length > 0 ? formData.delayWebhooks : [],
          delaySlackChannelId: formData.delaySlackChannelId,
          delaySlackChannelName: formData.delaySlackChannelName,
          automatedMessages: formData.automatedMessages,
          completionMessage: formData.completionTitle || formData.completionDescription ? {
            title: formData.completionTitle || null,
            description: formData.completionDescription || null,
          } : null,
          completionWebhook: formData.completionWebhook || null,
          completionSlackChannelId: formData.completionSlackChannelId,
          completionSlackChannelName: formData.completionSlackChannelName,
          nudgeEnabled: formData.nudgeEnabled,
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
        dueDate: getTodayDate(),
        scheduleType: 'period_days',
        periodDays: '1',
        selectedDays: [],
        slackWebhook: '',
        slackChannelId: null,
        slackChannelName: null,
        delayMessage: '',
        delayWebhooks: [],
        delaySlackChannelId: null,
        delaySlackChannelName: null,
        automatedMessages: [],
        completionTitle: '',
        completionDescription: '',
        completionWebhook: '',
        completionSlackChannelId: null,
        completionSlackChannelName: null,
        nudgeEnabled: true,
      });
      setAutomatedMessageForm({
        days_before: '',
        title: '',
        description: '',
        webhook_url: '',
        slack_channel_id: null,
        slack_channel_name: null,
      });
      setShowAutomatedMessages(false);
      setShowDelayConfig(false);
      setShowCompletionConfig(false);

      onReminderCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
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

      <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
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
            maxWidth: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
            WebkitAppearance: 'none',
            appearance: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
          onFocus={(e) => {
            e.target.style.boxShadow = neoStyles.inputFocus.boxShadow;
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="checkbox"
          id="nudgeEnabled"
          checked={formData.nudgeEnabled}
          onChange={(e) => setFormData({ ...formData, nudgeEnabled: e.target.checked })}
          style={{ width: '1.25rem', height: '1.25rem', accentColor: '#000000' }}
        />
        <label htmlFor="nudgeEnabled" style={{ fontWeight: '600', color: '#000000', fontSize: '0.875rem' }}>
          Send a nudge 2 days before the due date
        </label>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
          SCHEDULE *
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {([
            { value: 'period_days', label: 'EVERY N DAYS' },
            { value: 'days_of_week', label: 'DAYS OF WEEK' },
            { value: 'days_of_month', label: 'DAY OF MONTH' },
          ] as const).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFormData({ ...formData, scheduleType: option.value, selectedDays: [] })}
              style={{
                ...neoStyles.button,
                ...(formData.scheduleType === option.value ? buttonVariants.primary : buttonVariants.neutral),
                padding: '0.5rem 0.75rem',
                fontSize: '0.75rem',
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
              {option.label}
            </button>
          ))}
        </div>

        {formData.scheduleType === 'period_days' && (
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
        )}

        {formData.scheduleType === 'days_of_week' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const).map((day, index) => {
              const isSelected = formData.selectedDays.includes(index);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    const days = isSelected
                      ? formData.selectedDays.filter((d) => d !== index)
                      : [...formData.selectedDays, index];
                    setFormData({ ...formData, selectedDays: days });
                  }}
                  style={{
                    ...neoStyles.button,
                    ...(isSelected ? buttonVariants.primary : buttonVariants.neutral),
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8rem',
                    minWidth: isMobile ? 'calc(25% - 0.375rem)' : 'auto',
                    flex: isMobile ? '0 0 calc(25% - 0.375rem)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    Object.assign(e.currentTarget.style, neoStyles.buttonHover);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translate(0, 0)';
                    e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        )}

        {formData.scheduleType === 'days_of_month' && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(5, 1fr)' : 'repeat(7, 1fr)',
              gap: '0.375rem',
            }}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                const isSelected = formData.selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      const days = isSelected
                        ? formData.selectedDays.filter((d) => d !== day)
                        : [...formData.selectedDays, day];
                      setFormData({ ...formData, selectedDays: days });
                    }}
                    style={{
                      ...neoStyles.button,
                      ...(isSelected ? buttonVariants.primary : buttonVariants.neutral),
                      padding: '0.4rem',
                      fontSize: '0.8rem',
                    }}
                    onMouseEnter={(e) => {
                      Object.assign(e.currentTarget.style, neoStyles.buttonHover);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translate(0, 0)';
                      e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <small style={{ color: '#666', fontSize: '0.75rem', display: 'block', marginTop: '0.375rem' }}>
              Months without a selected day will be skipped.
            </small>
          </>
        )}
      </div>

      <div>
        <ChannelSelector
          value={formData.slackChannelId}
          valueName={formData.slackChannelName}
          onChange={(channelId, channelName) => setFormData({ ...formData, slackChannelId: channelId, slackChannelName: channelName })}
          label="REMINDER SLACK CHANNEL *"
          placeholder="Select channel for reminders..."
        />
        <small style={{ color: '#666', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
          Reminders will be sent to this channel with interactive buttons.
        </small>
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
              <ChannelSelector
                value={formData.delaySlackChannelId}
                valueName={formData.delaySlackChannelName}
                onChange={(channelId, channelName) => setFormData({ ...formData, delaySlackChannelId: channelId, delaySlackChannelName: channelName })}
                label="DELAY MESSAGE SLACK CHANNEL"
                placeholder="Select channel for delay messages..."
              />
              <small style={{ color: '#666', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                This channel will receive a notification when the due date is updated.
              </small>
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
                  <ChannelSelector
                    value={automatedMessageForm.slack_channel_id}
                    valueName={automatedMessageForm.slack_channel_name}
                    onChange={(channelId, channelName) => setAutomatedMessageForm({ ...automatedMessageForm, slack_channel_id: channelId, slack_channel_name: channelName })}
                    label="SLACK CHANNEL *"
                    placeholder="Select channel for this message..."
                  />
                  <small style={{ color: '#666', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
                    This message will be sent to the selected channel.
                  </small>
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
                            slack_channel_id: automatedMessageForm.slack_channel_id,
                            slack_channel_name: automatedMessageForm.slack_channel_name,
                            sent: false,
                            sent_at: null,
                          };
                          setFormData({ ...formData, automatedMessages: updated });
                          setAutomatedMessageForm({ days_before: '', title: '', description: '', webhook_url: '', slack_channel_id: null, slack_channel_name: null });
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
                          setAutomatedMessageForm({ days_before: '', title: '', description: '', webhook_url: '', slack_channel_id: null, slack_channel_name: null });
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
                        if (!automatedMessageForm.days_before || !automatedMessageForm.title || !automatedMessageForm.description) {
                          setError('Days before, title, and description are required');
                          return;
                        }
                        if (!automatedMessageForm.slack_channel_id) {
                          setError('Please select a Slack channel');
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
                          slack_channel_id: automatedMessageForm.slack_channel_id,
                          slack_channel_name: automatedMessageForm.slack_channel_name,
                          sent: false,
                          sent_at: null,
                        };
                        setFormData({ ...formData, automatedMessages: [...formData.automatedMessages, newMessage] });
                        setAutomatedMessageForm({ days_before: '', title: '', description: '', webhook_url: '', slack_channel_id: null, slack_channel_name: null });
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
                            {msg.slack_channel_name && <span>📢 {msg.slack_channel_name}</span>}
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
                                slack_channel_id: msg.slack_channel_id,
                                slack_channel_name: msg.slack_channel_name,
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

      <div>
        <button
          type="button"
          onClick={() => setShowCompletionConfig(!showCompletionConfig)}
          style={{
            ...neoStyles.button,
            ...buttonVariants.info,
            width: '100%',
            padding: '0.75rem',
            fontSize: '0.875rem',
            background: showCompletionConfig ? '#E5E5E5' : buttonVariants.info.background,
          }}
          onMouseEnter={(e) => {
            Object.assign(e.currentTarget.style, neoStyles.buttonHover);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)';
            e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
          }}
        >
          {showCompletionConfig ? '▼ HIDE' : '▶ SHOW'} COMPLETION MESSAGE SETTINGS (OPTIONAL)
        </button>

        {showCompletionConfig && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: neoStyles.card.background,
            border: '3px solid #000000',
            borderRadius: neoStyles.card.borderRadius,
            boxShadow: '4px 4px 0px 0px #000000',
          }}>
            <p style={{ fontSize: '0.875rem', fontWeight: '700', marginBottom: '1rem', color: '#000000' }}>
              Configure a message to be sent when this reminder is marked as complete.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="completionTitle" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
                COMPLETION MESSAGE TITLE
              </label>
              <input
                type="text"
                id="completionTitle"
                value={formData.completionTitle}
                onChange={(e) => setFormData({ ...formData, completionTitle: e.target.value })}
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

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="completionDescription" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
                COMPLETION MESSAGE DESCRIPTION
              </label>
              <textarea
                id="completionDescription"
                value={formData.completionDescription}
                onChange={(e) => setFormData({ ...formData, completionDescription: e.target.value })}
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

            <div style={{ marginBottom: '1rem' }}>
              <ChannelSelector
                value={formData.completionSlackChannelId}
                valueName={formData.completionSlackChannelName}
                onChange={(channelId, channelName) => setFormData({ ...formData, completionSlackChannelId: channelId, completionSlackChannelName: channelName })}
                label="COMPLETION MESSAGE SLACK CHANNEL"
                placeholder="Select channel for completion message..."
              />
              <small style={{ color: '#666', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                This channel will receive a notification when the reminder is completed.
              </small>
            </div>

            <p style={{ fontSize: '0.75rem', fontWeight: '700', marginTop: '1rem', color: '#666666' }}>
              This will ONLY be sent when the reminder is marked as complete. It is completely separate from the reminder and delay messages.
            </p>
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
