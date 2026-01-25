'use client';

import { useState, useEffect } from 'react';

interface SavedWebhook {
  id: number;
  name: string;
  webhook_url: string;
}

interface ReminderFormProps {
  onReminderCreated: () => void;
}

export default function ReminderForm({ onReminderCreated }: ReminderFormProps) {
  const [formData, setFormData] = useState({
    text: '',
    dueDate: '',
    periodDays: '1',
    slackWebhook: '',
    delayMessage: '',
    delayWebhooks: [] as string[],
  });
  const [savedWebhooks, setSavedWebhooks] = useState<SavedWebhook[]>([]);
  const [showDelayConfig, setShowDelayConfig] = useState(false);
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
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
          dueDate: formData.dueDate,
          periodDays: parseInt(formData.periodDays),
          slackWebhook: formData.slackWebhook,
          delayMessage: formData.delayMessage || null,
          delayWebhooks: formData.delayWebhooks.length > 0 ? formData.delayWebhooks : [],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create reminder');
      }

      // Reset form
      setFormData({
        text: '',
        dueDate: '',
        periodDays: '1',
        slackWebhook: '',
        delayMessage: '',
        delayWebhooks: [],
      });
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
        <label htmlFor="text" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Reminder Text *
        </label>
        <input
          type="text"
          id="text"
          value={formData.text}
          onChange={(e) => setFormData({ ...formData, text: e.target.value })}
          required
          placeholder="e.g., Get fkautoparts ready and released"
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
        <label htmlFor="dueDate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Due Date *
        </label>
        <input
          type="date"
          id="dueDate"
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          required
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
        <label htmlFor="periodDays" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Period (days between reminders) *
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
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '1rem',
          }}
        />
      </div>

      <div>
        <label htmlFor="slackWebhook" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Reminder Webhook URL * (for periodic reminders)
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
          id="slackWebhook"
          value={formData.slackWebhook}
          onChange={(e) => setFormData({ ...formData, slackWebhook: e.target.value })}
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
        <button
          type="button"
          onClick={() => setShowAddWebhook(!showAddWebhook)}
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem 1rem',
            background: '#e5e7eb',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          {showAddWebhook ? 'Cancel' : '+ Save New Webhook'}
        </button>
        {showAddWebhook && (
          <div style={{ marginTop: '0.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
            <form onSubmit={handleAddWebhook} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Webhook name"
                value={newWebhookName}
                onChange={(e) => setNewWebhookName(e.target.value)}
                required
                style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <input
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                required
                style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <button
                type="submit"
                style={{
                  padding: '0.5rem',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Save Webhook
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
            width: '100%',
            padding: '0.75rem',
            background: showDelayConfig ? '#e5e7eb' : '#f3f4f6',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            fontWeight: '500',
          }}
        >
          {showDelayConfig ? '▼ Hide' : '▶ Show'} Delay Notification Settings (Optional)
        </button>
        {showDelayConfig && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="delayMessage" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Delay Message Template
              </label>
              <input
                type="text"
                id="delayMessage"
                value={formData.delayMessage}
                onChange={(e) => setFormData({ ...formData, delayMessage: e.target.value })}
                placeholder='e.g., Unfortunately the FKAutoparts release will be delayed, the new expected due date is DD.MM.YYYY'
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '1rem',
                }}
              />
              <small style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginTop: '0.25rem' }}>
                Use DD.MM.YYYY as a placeholder for the new due date
              </small>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Delay Notification Webhooks (select multiple - separate from reminder webhook)
              </label>
              <small style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
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
                <p style={{ color: '#666', fontSize: '0.875rem' }}>No saved webhooks. Add one above to use delay notifications.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          padding: '0.75rem',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '6px',
          color: '#c33',
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '0.75rem 1.5rem',
          background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'opacity 0.2s',
        }}
      >
        {loading ? 'Creating...' : 'Create Reminder'}
      </button>
    </form>
  );
}
