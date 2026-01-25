'use client';

import { format, differenceInDays } from 'date-fns';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useState, useEffect } from 'react';

interface Reminder {
  id: number;
  text: string;
  description: string | null;
  due_date: string;
  period_days: number;
  slack_webhook: string;
  delay_message: string | null;
  delay_webhooks: string[];
  automated_messages: Array<{
    id: string;
    days_before: number;
    title: string;
    description: string;
    webhook_url: string;
    sent: boolean;
    sent_at: string | null;
  }>;
  is_complete: boolean;
  last_sent: string | null;
  created_at: string;
}

interface SavedWebhook {
  id: number;
  name: string;
  webhook_url: string;
}

interface ReminderListProps {
  reminders: Reminder[];
  onComplete: (id: number) => void;
  onUpdateDueDate: (reminder: Reminder) => void;
  onEditDelayMessage: (reminder: Reminder) => void;
  onEditAutomatedMessages: (reminder: Reminder) => void;
}

export default function ReminderList({ reminders, onComplete, onUpdateDueDate, onEditDelayMessage, onEditAutomatedMessages }: ReminderListProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isSmallMobile = useMediaQuery('(max-width: 480px)');
  const [savedWebhooks, setSavedWebhooks] = useState<SavedWebhook[]>([]);

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

  const getWebhookName = (webhookUrl: string): string => {
    const webhook = savedWebhooks.find(wh => wh.webhook_url === webhookUrl);
    return webhook ? webhook.name : webhookUrl.substring(0, 30) + '...';
  };

  if (reminders.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: isMobile ? '2rem' : '3rem', color: '#666' }}>
        <p style={{ fontSize: isMobile ? '1rem' : '1.2rem' }}>No reminders yet. Create one above!</p>
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
      <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
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
                padding: isMobile ? '1rem' : '1.5rem',
                border: `2px solid ${reminder.is_complete ? '#4ade80' : isOverdue ? '#f87171' : '#e5e7eb'}`,
                borderRadius: '8px',
                background: reminder.is_complete ? '#f0fdf4' : isOverdue ? '#fef2f2' : '#f9fafb',
                opacity: reminder.is_complete ? 0.7 : 1,
              }}
            >
              <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'stretch' : 'flex-start', 
                gap: '1rem',
                marginBottom: '1rem' 
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    fontSize: isMobile ? '1rem' : '1.2rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    textDecoration: reminder.is_complete ? 'line-through' : 'none',
                    wordBreak: 'break-word',
                  }}>
                    {reminder.text}
                  </h3>
                  {reminder.description && (
                    <p style={{
                      fontSize: isMobile ? '0.875rem' : '0.95rem',
                      color: '#666',
                      marginBottom: '0.5rem',
                      lineHeight: '1.5',
                      wordBreak: 'break-word',
                    }}>
                      {reminder.description}
                    </p>
                  )}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: isSmallMobile ? 'column' : 'row',
                    flexWrap: 'wrap', 
                    gap: '0.75rem', 
                    fontSize: isMobile ? '0.8rem' : '0.9rem', 
                    color: '#666' 
                  }}>
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
                    {reminder.last_sent && !isSmallMobile && (
                      <span>
                        📤 Last sent: <strong>{format(new Date(reminder.last_sent), 'MMM dd, yyyy HH:mm')}</strong>
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: isSmallMobile ? 'column' : 'row',
                  gap: '0.5rem', 
                  flexShrink: 0, 
                  flexWrap: 'wrap',
                  width: isMobile ? '100%' : 'auto',
                }}>
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
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          cursor: 'pointer',
                          fontWeight: '500',
                          flex: isSmallMobile ? '1' : '0',
                          minWidth: isSmallMobile ? '0' : 'auto',
                        }}
                      >
                        {isSmallMobile ? 'Update Date' : 'Update Due Date'}
                      </button>
                      <button
                        onClick={() => onEditDelayMessage(reminder)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#8b5cf6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          cursor: 'pointer',
                          fontWeight: '500',
                          flex: isSmallMobile ? '1' : '0',
                          minWidth: isSmallMobile ? '0' : 'auto',
                        }}
                      >
                        {isSmallMobile ? 'Edit Delay' : 'Edit Delay Message'}
                      </button>
                      <button
                        onClick={() => onEditAutomatedMessages(reminder)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          cursor: 'pointer',
                          fontWeight: '500',
                          flex: isSmallMobile ? '1' : '0',
                          minWidth: isSmallMobile ? '0' : 'auto',
                        }}
                      >
                        {isSmallMobile ? 'Auto Msgs' : 'Automated Messages'}
                      </button>
                      <button
                        onClick={() => onComplete(reminder.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          cursor: 'pointer',
                          fontWeight: '500',
                          flex: isSmallMobile ? '1' : '0',
                          minWidth: isSmallMobile ? '0' : 'auto',
                        }}
                      >
                        {isSmallMobile ? 'Complete' : 'Mark Complete'}
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
                🔗 Webhook: <strong>{getWebhookName(reminder.slack_webhook)}</strong>
              </div>
              {reminder.automated_messages && reminder.automated_messages.length > 0 && (
                <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.25rem' }}>
                  🤖 {reminder.automated_messages.length} automated message{reminder.automated_messages.length !== 1 ? 's' : ''} configured
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
