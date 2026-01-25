'use client';

import { useState } from 'react';

interface ReminderFormProps {
  onReminderCreated: () => void;
}

export default function ReminderForm({ onReminderCreated }: ReminderFormProps) {
  const [formData, setFormData] = useState({
    text: '',
    dueDate: '',
    periodDays: '1',
    slackWebhook: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      });

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
          Slack Webhook URL *
        </label>
        <input
          type="url"
          id="slackWebhook"
          value={formData.slackWebhook}
          onChange={(e) => setFormData({ ...formData, slackWebhook: e.target.value })}
          required
          placeholder="https://hooks.slack.com/services/..."
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '1rem',
          }}
        />
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
