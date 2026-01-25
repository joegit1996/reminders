'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { neoStyles, neoColors, buttonVariants } from '@/lib/neoBrutalismStyles';

interface Reminder {
  id: number;
  text: string;
  description: string | null;
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
  const isMobile = useMediaQuery('(max-width: 768px)');
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
          UPDATE DUE DATE
        </h2>
        <p style={{ color: '#000000', marginBottom: '1.5rem', fontWeight: '700' }}>
          <strong>{reminder.text}</strong>
        </p>

        <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="currentDueDate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
              CURRENT DUE DATE
            </label>
            <input
              type="text"
              id="currentDueDate"
              value={format(new Date(reminder.due_date), 'yyyy-MM-dd')}
              disabled
              style={{
                ...neoStyles.input,
                width: '100%',
                background: '#E5E5E5',
                opacity: 0.8,
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="newDueDate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
              NEW DUE DATE *
            </label>
            <input
              type="date"
              id="newDueDate"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
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
              {loading ? 'UPDATING...' : 'UPDATE'}
            </button>
          </div>
        </form>

        {updateLogs.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '900', marginBottom: '1rem', color: '#000000', textTransform: 'uppercase' }}>
              UPDATE HISTORY
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {updateLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '0.75rem',
                    background: '#FFFFFF',
                    border: '3px solid #000000',
                    borderRadius: '0',
                    boxShadow: '4px 4px 0px 0px #000000',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#000000',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>
                      <strong>{format(new Date(log.old_due_date), 'MMM dd, yyyy')}</strong> →{' '}
                      <strong>{format(new Date(log.new_due_date), 'MMM dd, yyyy')}</strong>
                    </span>
                    <span style={{ color: '#000000' }}>
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
