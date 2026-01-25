'use client';

import { format, differenceInDays } from 'date-fns';

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

interface ReminderListProps {
  reminders: Reminder[];
  onComplete: (id: number) => void;
  onUpdateDueDate: (reminder: Reminder) => void;
}

export default function ReminderList({ reminders, onComplete, onUpdateDueDate }: ReminderListProps) {
  if (reminders.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
        <p style={{ fontSize: '1.2rem' }}>No reminders yet. Create one above!</p>
      </div>
    );
  }

  const calculateDaysRemaining = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return differenceInDays(due, today);
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
        Your Reminders ({reminders.length})
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {reminders.map((reminder) => {
          const daysRemaining = calculateDaysRemaining(reminder.due_date);
          const isOverdue = daysRemaining < 0;

          return (
            <div
              key={reminder.id}
              style={{
                padding: '1.5rem',
                border: `2px solid ${reminder.is_complete ? '#4ade80' : isOverdue ? '#f87171' : '#e5e7eb'}`,
                borderRadius: '8px',
                background: reminder.is_complete ? '#f0fdf4' : isOverdue ? '#fef2f2' : '#f9fafb',
                opacity: reminder.is_complete ? 0.7 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: '1.2rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    textDecoration: reminder.is_complete ? 'line-through' : 'none',
                  }}>
                    {reminder.text}
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.9rem', color: '#666' }}>
                    <span>
                      📅 Due: <strong>{format(new Date(reminder.due_date), 'MMM dd, yyyy')}</strong>
                    </span>
                    <span>
                      ⏰ Days remaining: <strong style={{ color: isOverdue ? '#dc2626' : '#059669' }}>
                        {daysRemaining >= 0 ? daysRemaining : `-${Math.abs(daysRemaining)} (overdue)`}
                      </strong>
                    </span>
                    <span>
                      🔄 Period: <strong>{reminder.period_days} day{reminder.period_days !== 1 ? 's' : ''}</strong>
                    </span>
                    {reminder.last_sent && (
                      <span>
                        📤 Last sent: <strong>{format(new Date(reminder.last_sent), 'MMM dd, yyyy HH:mm')}</strong>
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  {!reminder.is_complete && (
                    <>
                      <button
                        onClick={() => onUpdateDueDate(reminder)}
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
                        Update Due Date
                      </button>
                      <button
                        onClick={() => onComplete(reminder.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          fontWeight: '500',
                        }}
                      >
                        Mark Complete
                      </button>
                    </>
                  )}
                  {reminder.is_complete && (
                    <span style={{
                      padding: '0.5rem 1rem',
                      background: '#4ade80',
                      color: 'white',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                    }}>
                      ✓ Complete
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.5rem' }}>
                Webhook: {reminder.slack_webhook.substring(0, 50)}...
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
