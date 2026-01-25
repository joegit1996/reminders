'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import Link from 'next/link';
import { useMediaQuery } from '@/hooks/useMediaQuery';

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

interface SavedWebhook {
  id: number;
  name: string;
  webhook_url: string;
}

export default function CalendarPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [savedWebhooks, setSavedWebhooks] = useState<SavedWebhook[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedWebhookFilter, setSelectedWebhookFilter] = useState<string>('all');
  const [hoveredReminder, setHoveredReminder] = useState<{ reminder: Reminder; x: number; y: number } | null>(null);
  const [showShareLinks, setShowShareLinks] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [remindersRes, webhooksRes] = await Promise.all([
        fetch('/api/reminders'),
        fetch('/api/webhooks'),
      ]);

      if (remindersRes.ok) {
        const remindersData = await remindersRes.json();
        setReminders(remindersData);
      }

      if (webhooksRes.ok) {
        const webhooksData = await webhooksRes.json();
        setSavedWebhooks(webhooksData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWebhookName = (webhookUrl: string): string => {
    const webhook = savedWebhooks.find(wh => wh.webhook_url === webhookUrl);
    return webhook ? webhook.name : webhookUrl.substring(0, 30) + '...';
  };

  const getRemindersForDate = (date: Date): Reminder[] => {
    return reminders.filter(reminder => {
      if (reminder.is_complete) return false;
      const dueDate = new Date(reminder.due_date);
      const matchesDate = isSameDay(dueDate, date);
      
      // Apply webhook filter
      if (selectedWebhookFilter !== 'all') {
        const matchesWebhook = reminder.slack_webhook === selectedWebhookFilter;
        return matchesDate && matchesWebhook;
      }
      
      return matchesDate;
    });
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '1rem' : '2rem', width: '100%' }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          textAlign: 'center',
        }}>
          <p style={{ color: '#666' }}>Loading calendar...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '1rem' : '2rem', width: '100%' }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: isMobile ? '1rem' : '2rem',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        marginBottom: '2rem',
      }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'center', 
          gap: '1rem',
          marginBottom: '2rem' 
        }}>
          <div>
            <h1 style={{
              fontSize: isMobile ? '1.75rem' : '2.5rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              📅 Calendar View
            </h1>
            <p style={{ color: '#666', fontSize: isMobile ? '0.875rem' : '1rem' }}>
              View all reminders by due date
            </p>
          </div>
          <Link
            href="/"
            style={{
              padding: '0.75rem 1.5rem',
              background: '#e5e7eb',
              color: '#374151',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: '500',
              fontSize: '0.9rem',
              alignSelf: isMobile ? 'stretch' : 'auto',
              textAlign: 'center',
            }}
          >
            ← Back to Reminders
          </Link>
        </div>

        {/* Share Calendar Section */}
        <div style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1rem',
          }}>
            📤 Share Calendar Links
          </h3>
          <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Copy these links to share a public calendar view. Anyone with the link can view reminders.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* All Webhooks Link */}
            <div style={{
              padding: '1rem',
              background: 'white',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                    All Webhooks
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#666',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                    background: '#f3f4f6',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    marginTop: '0.5rem',
                  }}>
                    {typeof window !== 'undefined' ? `${window.location.origin}/calendar/public` : '/calendar/public'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const url = typeof window !== 'undefined' ? `${window.location.origin}/calendar/public` : '/calendar/public';
                    navigator.clipboard.writeText(url);
                    alert('Link copied to clipboard!');
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Copy Link
                </button>
              </div>
            </div>

            {/* Individual Webhook Links */}
            {savedWebhooks.map(webhook => {
              const shareUrl = typeof window !== 'undefined' 
                ? `${window.location.origin}/calendar/public?webhook=${encodeURIComponent(webhook.webhook_url)}`
                : `/calendar/public?webhook=${encodeURIComponent(webhook.webhook_url)}`;
              
              return (
                <div
                  key={webhook.id}
                  style={{
                    padding: '1rem',
                    background: 'white',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                        {webhook.name}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#666',
                        wordBreak: 'break-all',
                        fontFamily: 'monospace',
                        background: '#f3f4f6',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        marginTop: '0.5rem',
                      }}>
                        {shareUrl}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(shareUrl);
                        alert('Link copied to clipboard!');
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Calendar Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={goToPreviousMonth}
              style={{
                padding: '0.5rem 1rem',
                background: '#e5e7eb',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              ←
            </button>
            <button
              onClick={goToToday}
              style={{
                padding: '0.5rem 1rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: isMobile ? '0.875rem' : '1rem',
                fontWeight: '500',
              }}
            >
              Today
            </button>
            <button
              onClick={goToNextMonth}
              style={{
                padding: '0.5rem 1rem',
                background: '#e5e7eb',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              →
            </button>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <h2 style={{
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              fontWeight: '600',
              margin: 0,
            }}>
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="webhookFilter" style={{
                fontSize: isMobile ? '0.875rem' : '1rem',
                fontWeight: '500',
                color: '#374151',
              }}>
                Filter:
              </label>
              <select
                id="webhookFilter"
                value={selectedWebhookFilter}
                onChange={(e) => setSelectedWebhookFilter(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: isMobile ? '0.875rem' : '1rem',
                  background: 'white',
                  cursor: 'pointer',
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

        {/* Calendar Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '0.5rem',
        }}>
          {/* Day Headers */}
          {dayNames.map(day => (
            <div
              key={day}
              style={{
                padding: '0.75rem',
                textAlign: 'center',
                fontWeight: '600',
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                color: '#666',
                background: '#f9fafb',
                borderRadius: '6px',
              }}
            >
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarDays.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const dayReminders = getRemindersForDate(day);

            return (
              <div
                key={idx}
                onClick={() => setSelectedDate(day)}
                style={{
                  minHeight: isMobile ? '60px' : '100px',
                  padding: '0.5rem',
                  border: `2px solid ${isToday ? '#3b82f6' : '#e5e7eb'}`,
                  borderRadius: '6px',
                  background: isCurrentMonth ? 'white' : '#f9fafb',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: isCurrentMonth ? 1 : 0.5,
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isCurrentMonth ? '#f3f4f6' : '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isCurrentMonth ? 'white' : '#f9fafb';
                }}
              >
                <div style={{
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  fontWeight: isToday ? '600' : '400',
                  color: isToday ? '#3b82f6' : '#374151',
                  marginBottom: '0.25rem',
                }}>
                  {format(day, 'd')}
                </div>
                {dayReminders.length > 0 && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                  }}>
                    {dayReminders.slice(0, isMobile ? 1 : 2).map(reminder => (
                      <div
                        key={reminder.id}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredReminder({
                            reminder,
                            x: rect.left,
                            y: rect.top,
                          });
                        }}
                        onMouseLeave={() => setHoveredReminder(null)}
                        style={{
                          fontSize: isMobile ? '0.65rem' : '0.75rem',
                          padding: '0.25rem 0.5rem',
                          background: '#667eea',
                          color: 'white',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontWeight: '500',
                          cursor: 'pointer',
                          position: 'relative',
                        }}
                      >
                        {reminder.text.substring(0, isMobile ? 8 : 15)}...
                      </div>
                    ))}
                    {dayReminders.length > (isMobile ? 1 : 2) && (
                      <div style={{
                        fontSize: isMobile ? '0.6rem' : '0.7rem',
                        color: '#666',
                        fontWeight: '500',
                      }}>
                        +{dayReminders.length - (isMobile ? 1 : 2)} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Hover Tooltip */}
        {hoveredReminder && (
          <div
            style={{
              position: 'fixed',
              left: `${hoveredReminder.x + 10}px`,
              top: `${hoveredReminder.y + 10}px`,
              background: 'white',
              padding: '1rem',
              borderRadius: '8px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              border: '1px solid #e5e7eb',
              zIndex: 1000,
              maxWidth: '300px',
              pointerEvents: 'none',
            }}
          >
            <div style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#374151',
            }}>
              {hoveredReminder.reminder.text}
            </div>
            {hoveredReminder.reminder.description && (
              <div style={{
                fontSize: '0.75rem',
                color: '#666',
                marginBottom: '0.5rem',
                lineHeight: '1.4',
              }}>
                {hoveredReminder.reminder.description}
              </div>
            )}
            <div style={{
              fontSize: '0.75rem',
              color: '#666',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}>
              <div>
                📅 Due: <strong>{format(new Date(hoveredReminder.reminder.due_date), 'MMM dd, yyyy')}</strong>
              </div>
              <div>
                🔄 Period: <strong>{hoveredReminder.reminder.period_days} day{hoveredReminder.reminder.period_days !== 1 ? 's' : ''}</strong>
              </div>
              <div>
                🔗 Webhook: <strong>{getWebhookName(hoveredReminder.reminder.slack_webhook)}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Selected Date Details */}
        {selectedDate && (
          <div style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: '1rem',
            }}>
              Reminders for {format(selectedDate, 'MMMM dd, yyyy')}
            </h3>
            {getRemindersForDate(selectedDate).length === 0 ? (
              <p style={{ color: '#666' }}>No reminders for this date{selectedWebhookFilter !== 'all' ? ` with selected webhook filter` : ''}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {getRemindersForDate(selectedDate).map(reminder => (
                  <div
                    key={reminder.id}
                    style={{
                      padding: '1rem',
                      background: 'white',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      marginBottom: '0.5rem',
                    }}>
                      {reminder.text}
                    </div>
                    {reminder.description && (
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#666',
                        marginBottom: '0.5rem',
                      }}>
                        {reminder.description}
                      </div>
                    )}
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#666',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '1rem',
                    }}>
                      <span>
                        🔄 Period: <strong>{reminder.period_days} day{reminder.period_days !== 1 ? 's' : ''}</strong>
                      </span>
                      <span>
                        🔗 Webhook: <strong>{getWebhookName(reminder.slack_webhook)}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setSelectedDate(null)}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                background: '#e5e7eb',
                color: '#374151',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
              }}
            >
              Close
            </button>
          </div>
        )}

        {/* Share Calendar Section */}
        <div style={{
          marginTop: '2rem',
        }}>
          <button
            type="button"
            onClick={() => setShowShareLinks(!showShareLinks)}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: showShareLinks ? '#e5e7eb' : '#f3f4f6',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontWeight: '500',
              marginBottom: showShareLinks ? '1rem' : '0',
            }}
          >
            {showShareLinks ? '▼ Hide' : '▶ Show'} Share Calendar Links
          </button>
          
          {showShareLinks && (
            <div style={{
              padding: '1.5rem',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}>
              <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Copy these links to share a public calendar view. Anyone with the link can view reminders.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* All Webhooks Link */}
                <div style={{
                  padding: '1rem',
                  background: 'white',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                        All Webhooks
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#666',
                        wordBreak: 'break-all',
                        fontFamily: 'monospace',
                        background: '#f3f4f6',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        marginTop: '0.5rem',
                      }}>
                        {typeof window !== 'undefined' ? `${window.location.origin}/calendar/public` : '/calendar/public'}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const url = typeof window !== 'undefined' ? `${window.location.origin}/calendar/public` : '/calendar/public';
                        navigator.clipboard.writeText(url);
                        alert('Link copied to clipboard!');
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Copy Link
                    </button>
                  </div>
                </div>

                {/* Individual Webhook Links */}
                {savedWebhooks.map(webhook => {
                  const shareUrl = typeof window !== 'undefined' 
                    ? `${window.location.origin}/calendar/public?webhook=${encodeURIComponent(webhook.webhook_url)}`
                    : `/calendar/public?webhook=${encodeURIComponent(webhook.webhook_url)}`;
                  
                  return (
                    <div
                      key={webhook.id}
                      style={{
                        padding: '1rem',
                        background: 'white',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                            {webhook.name}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#666',
                            wordBreak: 'break-all',
                            fontFamily: 'monospace',
                            background: '#f3f4f6',
                            padding: '0.5rem',
                            borderRadius: '4px',
                            marginTop: '0.5rem',
                          }}>
                            {shareUrl}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(shareUrl);
                            alert('Link copied to clipboard!');
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            fontWeight: '500',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Copy Link
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
