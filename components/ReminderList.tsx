'use client';

import { format, differenceInDays } from 'date-fns';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { neoStyles, neoColors, buttonVariants } from '@/lib/neoBrutalismStyles';
import { useState, useEffect } from 'react';

interface Reminder {
  id: number;
  user_id: string;
  text: string;
  description: string | null;
  due_date: string;
  period_days: number;
  slack_webhook: string;
  slack_channel_id: string | null;
  slack_channel_name: string | null;
  delay_message: string | null;
  delay_webhooks: string[];
  delay_slack_channel_id: string | null;
  delay_slack_channel_name: string | null;
  automated_messages: Array<{
    id: string;
    days_before: number;
    title: string;
    description: string;
    webhook_url: string;
    slack_channel_id: string | null;
    slack_channel_name: string | null;
    sent: boolean;
    sent_at: string | null;
  }>;
  completion_message: string | null;
  completion_webhook: string | null;
  completion_slack_channel_id: string | null;
  completion_slack_channel_name: string | null;
  is_complete: boolean;
  completed_at: string | null;
  days_remaining_at_completion: number | null;
  last_sent: string | null;
  created_at: string;
}


interface ReminderListProps {
  reminders: Reminder[];
  onComplete: (id: number) => void;
  onUpdateDueDate: (reminder: Reminder) => void;
  onEditDelayMessage: (reminder: Reminder) => void;
  onEditAutomatedMessages: (reminder: Reminder) => void;
  onEditCompletion: (reminder: Reminder) => void;
  onDelete?: (id: number) => void;
}

export default function ReminderList({ reminders, onComplete, onUpdateDueDate, onEditDelayMessage, onEditAutomatedMessages, onEditCompletion, onDelete }: ReminderListProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isSmallMobile = useMediaQuery('(max-width: 480px)');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [hideCompleted, setHideCompleted] = useState<boolean>(true);

  // Get unique channels from reminders
  const uniqueChannels = Array.from(new Set(
    reminders
      .filter(r => r.slack_channel_id && r.slack_channel_name)
      .map(r => JSON.stringify({ id: r.slack_channel_id, name: r.slack_channel_name }))
  )).map(s => JSON.parse(s) as { id: string; name: string });

  const getChannelDisplay = (reminder: Reminder): string => {
    if (reminder.slack_channel_name) {
      return reminder.slack_channel_name;
    }
    return 'No channel';
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

  // Filter reminders by channel and completion status
  const filteredReminders = reminders.filter(reminder => {
    // Filter by completion status
    if (hideCompleted && reminder.is_complete) {
      return false;
    }
    // Filter by channel
    if (channelFilter !== 'all' && reminder.slack_channel_id !== channelFilter) {
      return false;
    }
    return true;
  });

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
          {uniqueChannels.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="channelFilter" style={{ 
                fontSize: isMobile ? '0.75rem' : '0.875rem', 
                fontWeight: '700', 
                color: '#000000',
                whiteSpace: 'nowrap',
              }}>
                CHANNEL:
              </label>
              <select
                id="channelFilter"
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
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
                <option value="all">All Channels</option>
                {uniqueChannels.map(channel => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Hide Completed Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label 
              htmlFor="hideCompleted" 
              style={{ 
                fontSize: isMobile ? '0.75rem' : '0.875rem', 
                fontWeight: '700', 
                color: '#000000',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <input
                type="checkbox"
                id="hideCompleted"
                checked={hideCompleted}
                onChange={(e) => setHideCompleted(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: neoColors.primary,
                }}
              />
              HIDE COMPLETED
            </label>
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {sortedReminders.map((reminder) => {
          // Use frozen value for completed reminders, otherwise calculate dynamically
          const daysRemaining = reminder.is_complete && reminder.days_remaining_at_completion !== null
            ? reminder.days_remaining_at_completion
            : calculateDaysRemaining(reminder.due_date);
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
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr auto',
                gap: '1rem',
                width: '100%',
              }}
            >
              {/* Left Column: Content */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                minWidth: 0,
              }}>
                {/* Title */}
                <h3 style={{
                  fontSize: isMobile ? '1rem' : '1.25rem',
                  fontWeight: '900',
                  textDecoration: reminder.is_complete ? 'line-through' : 'none',
                  wordBreak: 'break-word',
                  color: '#000000',
                  textTransform: 'uppercase',
                  lineHeight: '1.3',
                  margin: 0,
                }}>
                  {reminder.text}
                </h3>

                {/* Description */}
                {reminder.description && (
                  <p style={{
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    color: '#000000',
                    lineHeight: '1.5',
                    wordBreak: 'break-word',
                    fontWeight: '600',
                    margin: 0,
                    columnCount: isMobile ? 1 : 'auto',
                    columnWidth: '250px',
                    columnGap: '2rem',
                    columnFill: 'auto',
                  }}>
                    {reminder.description}
                  </p>
                )}

                {/* Metadata */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'row',
                  flexWrap: 'wrap', 
                  gap: isMobile ? '0.5rem' : '1rem', 
                  fontSize: isMobile ? '0.75rem' : '0.875rem', 
                  color: '#000000',
                  fontWeight: '600',
                  lineHeight: '1.6',
                }}>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    📅 DUE: <strong>{format(new Date(reminder.due_date), 'MMM dd, yyyy')}</strong>
                  </span>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    ⏰ DAYS: <strong style={{ color: isOverdue ? '#FF6B6B' : '#6BCB77' }}>
                      {daysRemaining >= 0 ? daysRemaining : `-${Math.abs(daysRemaining)} (OVERDUE)`}
                    </strong>
                  </span>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    🔄 PERIOD: <strong>{reminder.period_days} DAY{reminder.period_days !== 1 ? 'S' : ''}</strong>
                  </span>
                  {reminder.last_sent && (
                    <span style={{ whiteSpace: 'nowrap' }}>
                      📤 SENT: <strong>{format(new Date(reminder.last_sent), 'MMM dd HH:mm')}</strong>
                    </span>
                  )}
                </div>

                {/* Channel and Automated Messages */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  fontSize: isMobile ? '0.75rem' : '0.8rem',
                  color: '#000000',
                  fontWeight: '600',
                }}>
                  <div>
                    💬 CHANNEL: <strong>{getChannelDisplay(reminder)}</strong>
                  </div>
                  {reminder.automated_messages && reminder.automated_messages.length > 0 && (
                    <div>
                      🤖 {reminder.automated_messages.length} AUTOMATED MESSAGE{reminder.automated_messages.length !== 1 ? 'S' : ''} CONFIGURED
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Action Buttons */}
              <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'row' : 'column',
                gap: '0.5rem', 
                flexShrink: 0,
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                justifyContent: isMobile ? 'flex-start' : 'flex-start',
              }}>
                {!reminder.is_complete && (
                  <>
                    <button
                      onClick={() => onUpdateDueDate(reminder)}
                      style={{
                        ...neoStyles.button,
                        ...buttonVariants.primary,
                        padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1rem',
                        fontSize: isMobile ? '0.7rem' : '0.875rem',
                        minWidth: isMobile ? 'auto' : '150px',
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
                      {isMobile ? 'UPDATE' : 'UPDATE DUE DATE'}
                    </button>
                    <button
                      onClick={() => onEditDelayMessage(reminder)}
                      style={{
                        ...neoStyles.button,
                        background: '#A8E6CF',
                        color: '#000000',
                        padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1rem',
                        fontSize: isMobile ? '0.7rem' : '0.875rem',
                        minWidth: isMobile ? 'auto' : '150px',
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
                      {isMobile ? 'DELAY' : 'EDIT DELAY MESSAGE'}
                    </button>
                    <button
                      onClick={() => onEditAutomatedMessages(reminder)}
                      style={{
                        ...neoStyles.button,
                        ...buttonVariants.warning,
                        padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1rem',
                        fontSize: isMobile ? '0.7rem' : '0.875rem',
                        minWidth: isMobile ? 'auto' : '150px',
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
                      {isMobile ? 'AUTO' : 'AUTOMATED MESSAGES'}
                    </button>
                    <button
                      onClick={() => onEditCompletion(reminder)}
                      style={{
                        ...neoStyles.button,
                        ...buttonVariants.info,
                        padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1rem',
                        fontSize: isMobile ? '0.7rem' : '0.875rem',
                        minWidth: isMobile ? 'auto' : '150px',
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
                      {isMobile ? 'COMPLETE MSG' : 'COMPLETION MESSAGE'}
                    </button>
                    <button
                      onClick={() => onComplete(reminder.id)}
                      style={{
                        ...neoStyles.button,
                        ...buttonVariants.success,
                        padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1rem',
                        fontSize: isMobile ? '0.7rem' : '0.875rem',
                        minWidth: isMobile ? 'auto' : '150px',
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
                      {isMobile ? 'COMPLETE' : 'MARK COMPLETE'}
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
                    textAlign: 'center',
                  }}>
                    ✓ COMPLETE
                  </span>
                )}
                {/* Delete Button */}
                {onDelete && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this reminder? This cannot be undone.')) {
                        onDelete(reminder.id);
                      }
                    }}
                    style={{
                      ...neoStyles.button,
                      background: '#FF6B6B',
                      color: '#000000',
                      padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1rem',
                      fontSize: isMobile ? '0.7rem' : '0.875rem',
                      minWidth: isMobile ? 'auto' : '150px',
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
                    {isMobile ? '🗑️' : '🗑️ DELETE'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
