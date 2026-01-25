'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Reminder {
  id: number;
  text: string;
  due_date: string;
  period_days: number;
  slack_webhook: string;
  delay_message: string | null;
  delay_webhooks: string[];
  is_complete: boolean;
  last_sent: string | null;
  created_at: string;
}

interface UpdateDueDateModalProps {
  reminder: Reminder;
  onClose: () => void;
  onUpdated: () => void;
}

export default function UpdateDueDateModal({ reminder, onClose, onUpdated }: UpdateDueDateModalProps) {
  const [newDueDate, setNewDueDate] = useState(reminder.due_date);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updateLogs, setUpdateLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchUpdateLogs();
  }, []);

  const fetchUpdateLogs = async () => {
    try {
      const response = await fetch(`/api/reminders/${reminder.id}/logs`);
      if (response.ok) {
        const logs = await response.json();
        setUpdateLogs(logs);
      }
    } catch (error) {
      console.error('Error fetching update logs:', error);
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
          action: 'update-due-date',
          dueDate: newDueDate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update due date');
      }

      const result = await response.json();
      await fetchUpdateLogs();
      
      if (result.delayMessageSent) {
        alert('Due date updated and delay message sent successfully!');
      }
      
      onUpdated();
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
          padding: '2rem',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
          Update Due Date
        </h2>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          <strong>{reminder.text}</strong>
        </p>

        <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="currentDueDate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Current Due Date
            </label>
            <input
              type="text"
              id="currentDueDate"
              value={format(new Date(reminder.due_date), 'yyyy-MM-dd')}
              disabled
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: '#f5f5f5',
                color: '#666',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="newDueDate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              New Due Date *
            </label>
            <input
              type="date"
              id="newDueDate"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
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

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#e5e7eb',
                color: '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: 'pointer',
                fontWeight: '500',
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
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '500',
              }}
            >
              {loading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>

        {updateLogs.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
              Update History
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {updateLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '0.75rem',
                    background: '#f9fafb',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>
                      <strong>{format(new Date(log.old_due_date), 'MMM dd, yyyy')}</strong> →{' '}
                      <strong>{format(new Date(log.new_due_date), 'MMM dd, yyyy')}</strong>
                    </span>
                    <span style={{ color: '#666' }}>
                      {format(new Date(log.updated_at), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
