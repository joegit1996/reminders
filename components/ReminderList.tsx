'use client';

import { format, differenceInDays } from 'date-fns';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { neoStyles, neoColors, buttonVariants } from '@/lib/neoBrutalismStyles';
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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [webhookFilter, setWebhookFilter] = useState<string>('all');

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
      <div style={{ textAlign: 'center', padding: isMobile ? '2rem' : '3rem', color: '#000000' }}>
        <p style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: '700' }}>NO REMINDERS YET. CREATE ONE ABOVE!</p>
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

  // Filter reminders by webhook
  const filteredReminders = webhookFilter === 'all' 
    ? reminders 
    : reminders.filter(reminder => reminder.slack_webhook === webhookFilter);

  // Sort reminders by due date
  const sortedReminders = [...filteredReminders].sort((a, b) => {
    const dateA = new Date(a.due_date).getTime();
    const dateB = new Date(b.due_date).getTime();
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
      }}>
        <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '900', color: '#000000', textTransform: 'uppercase', margin: 0 }}>
          YOUR REMINDERS ({sortedReminders.length})
        </h2>
        
        <div style={{ 
          display: 'flex', 
          gap: '0.75rem', 
          flexWrap: 'wrap',
          width: isMobile ? '100%' : 'auto',
        }}>
          {/* Sort Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="sortOrder" style={{ 
              fontSize: isMobile ? '0.75rem' : '0.875rem', 
              fontWeight: '700', 
              color: '#000000',
              whiteSpace: 'nowrap',
            }}>
              SORT:
            </label>
            <select
              id="sortOrder"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              style={{
                ...neoStyles.input,
                padding: '0.5rem 0.75rem',
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                cursor: 'pointer',
                minWidth: '120px',
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = neoStyles.inputFocus.boxShadow;
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="asc">Due Date ↑</option>
              <option value="desc">Due Date ↓</option>
            </select>
          </div>

          {/* Filter Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="webhookFilter" style={{ 
              fontSize: isMobile ? '0.75rem' : '0.875rem', 
              fontWeight: '700', 
              color: '#000000',
              whiteSpace: 'nowrap',
            }}>
              FILTER:
            </label>
            <select
              id="webhookFilter"
              value={webhookFilter}
              onChange={(e) => setWebhookFilter(e.target.value)}
              style={{
                ...neoStyles.input,
                padding: '0.5rem 0.75rem',
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                cursor: 'pointer',
                minWidth: '150px',
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = neoStyles.inputFocus.boxShadow;
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="all">All Webhooks</option>
              {savedWebhooks.map(webhook => (
                <option key={webhook.id} value={webhook.webhook_url}>
                  {webhook.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {sortedReminders.map((reminder) => {
          const daysRemaining = calculateDaysRemaining(reminder.due_date);
          const isOverdue = daysRemaining < 0;

          return (
            <div
              key={reminder.id}
              style={{
                padding: isMobile ? '1rem' : '1.5rem',
                border: `4px solid ${reminder.is_complete ? '#6BCB77' : isOverdue ? '#FF6B6B' : '#000000'}`,
                borderRadius: '0',
                background: '#FFFFFF',
                boxShadow: reminder.is_complete ? '4px 4px 0px 0px #6BCB77' : isOverdue ? '4px 4px 0px 0px #FF6B6B' : '8px 8px 0px 0px #000000',
                opacity: reminder.is_complete ? 0.8 : 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                width: '100%',
              }}
            >
              {/* Header: Title and Action Buttons */}
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'flex-start',
                gap: '1rem',
                width: '100%',
              }}>
                <h3 style={{
                  fontSize: isMobile ? '1rem' : '1.25rem',
                  fontWeight: '900',
                  textDecoration: reminder.is_complete ? 'line-through' : 'none',
                  wordBreak: 'break-word',
                  color: '#000000',
                  textTransform: 'uppercase',
                  lineHeight: '1.3',
                  margin: 0,
                  flex: isMobile ? 'none' : '1 1 auto',
                }}>
                  {reminder.text}
                </h3>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: isSmallMobile ? 'column' : 'row',
                  gap: isMobile ? '0.5rem' : '0.75rem', 
                  flexShrink: 0, 
                  flexWrap: 'wrap',
                  width: isMobile ? '100%' : 'auto',
                  alignItems: isMobile ? 'stretch' : 'flex-start',
                }}>
                  {!reminder.is_complete && (
                    <>
                      <button
                        onClick={() => onUpdateDueDate(reminder)}
                        style={{
                          ...neoStyles.button,
                          ...buttonVariants.primary,
                          padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.25rem',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          flex: isSmallMobile ? '1' : '0 1 auto',
                          minWidth: isMobile ? '0' : '140px',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                          Object.assign(e.currentTarget.style, neoStyles.buttonHover);
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translate(0, 0)';
                          e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
                        }}
                      >
                        {isSmallMobile ? 'UPDATE DATE' : 'UPDATE DUE DATE'}
                      </button>
                      <button
                        onClick={() => onEditDelayMessage(reminder)}
                        style={{
                          ...neoStyles.button,
                          background: '#A8E6CF',
                          color: '#000000',
                          padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.25rem',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          flex: isSmallMobile ? '1' : '0 1 auto',
                          minWidth: isMobile ? '0' : '140px',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                          Object.assign(e.currentTarget.style, neoStyles.buttonHover);
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translate(0, 0)';
                          e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
                        }}
                      >
                        {isSmallMobile ? 'EDIT DELAY' : 'EDIT DELAY MESSAGE'}
                      </button>
                      <button
                        onClick={() => onEditAutomatedMessages(reminder)}
                        style={{
                          ...neoStyles.button,
                          ...buttonVariants.warning,
                          padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.25rem',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          flex: isSmallMobile ? '1' : '0 1 auto',
                          minWidth: isMobile ? '0' : '160px',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                          Object.assign(e.currentTarget.style, neoStyles.buttonHover);
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translate(0, 0)';
                          e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
                        }}
                      >
                        {isSmallMobile ? 'AUTO MSGS' : 'AUTOMATED MESSAGES'}
                      </button>
                      <button
                        onClick={() => onComplete(reminder.id)}
                        style={{
                          ...neoStyles.button,
                          ...buttonVariants.success,
                          padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.25rem',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          flex: isSmallMobile ? '1' : '0 1 auto',
                          minWidth: isMobile ? '0' : '140px',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                          Object.assign(e.currentTarget.style, neoStyles.buttonHover);
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translate(0, 0)';
                          e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
                        }}
                      >
                        {isSmallMobile ? 'COMPLETE' : 'MARK COMPLETE'}
                      </button>
                    </>
                  )}
                  {reminder.is_complete && (
                    <span style={{
                      padding: '0.5rem 1rem',
                      background: '#6BCB77',
                      color: '#000000',
                      border: '3px solid #000000',
                      borderRadius: '0',
                      boxShadow: '4px 4px 0px 0px #000000',
                      fontSize: '0.875rem',
                      fontWeight: '700',
                    }}>
                      ✓ COMPLETE
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#000000', marginTop: '0.5rem', fontWeight: '600' }}>
                🔗 WEBHOOK: <strong>{getWebhookName(reminder.slack_webhook)}</strong>
              </div>
              {reminder.automated_messages && reminder.automated_messages.length > 0 && (
                <div style={{ fontSize: '0.8rem', color: '#000000', marginTop: '0.25rem', fontWeight: '600' }}>
                  🤖 {reminder.automated_messages.length} AUTOMATED MESSAGE{reminder.automated_messages.length !== 1 ? 'S' : ''} CONFIGURED
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
