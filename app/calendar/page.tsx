'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import Link from 'next/link';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { neoStyles, neoColors, buttonVariants } from '@/lib/neoBrutalismStyles';

interface Reminder {
  id: number;
  text: string;
  description: string | null;
  due_date: string;
  period_days: number;
  slack_channel_id: string | null;
  slack_channel_name: string | null;
  delay_message: string | null;
  is_complete: boolean;
  last_sent: string | null;
  created_at: string;
}

export default function CalendarPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>('all');
  const [hoveredReminder, setHoveredReminder] = useState<{ reminder: Reminder; x: number; y: number } | null>(null);
  const [showShareLinks, setShowShareLinks] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Close selected date on scroll (mobile only)
  useEffect(() => {
    if (!isMobile || !selectedDate) return;

    const handleScroll = () => {
      setSelectedDate(null);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile, selectedDate]);

  const fetchData = async () => {
    try {
      const remindersRes = await fetch('/api/reminders');

      if (remindersRes.ok) {
        const remindersData = await remindersRes.json();
        setReminders(remindersData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const getRemindersForDate = (date: Date): Reminder[] => {
    return reminders.filter(reminder => {
      if (reminder.is_complete) return false;
      const dueDate = new Date(reminder.due_date);
      const matchesDate = isSameDay(dueDate, date);
      
      // Apply channel filter
      if (selectedChannelFilter !== 'all') {
        const matchesChannel = reminder.slack_channel_id === selectedChannelFilter;
        return matchesDate && matchesChannel;
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
          ...neoStyles.card,
          textAlign: 'center',
        }}>
          <p style={{ color: '#000000', fontWeight: '700' }}>LOADING CALENDAR...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '1rem' : '2rem', width: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <div style={{
        background: neoStyles.card.background,
        border: neoStyles.card.border,
        borderRadius: neoStyles.card.borderRadius,
        boxShadow: neoStyles.card.boxShadow,
        padding: isMobile ? '1.5rem' : '2rem',
        marginBottom: isMobile ? '1.5rem' : '2rem',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        boxSizing: 'border-box',
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
              fontWeight: '900',
              marginBottom: '0.5rem',
              color: '#000000',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
            }}>
              📅 CALENDAR VIEW
            </h1>
            <p style={{ color: '#000000', fontSize: isMobile ? '0.875rem' : '1rem', fontWeight: '600' }}>
              View all reminders by due date
            </p>
          </div>
          <Link
            href="/"
            style={{
              ...neoStyles.button,
              ...buttonVariants.neutral,
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              alignSelf: isMobile ? 'stretch' : 'auto',
              textAlign: 'center',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, neoStyles.buttonHover);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)';
              e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
            }}
          >
            ← BACK TO ZANAN PRO MAX
          </Link>
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
                ...neoStyles.button,
                ...buttonVariants.neutral,
                padding: '0.5rem 1rem',
                fontSize: '1rem',
              }}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, neoStyles.buttonHover);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translate(0, 0)';
                e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
              }}
            >
              ←
            </button>
            <button
              onClick={goToToday}
              style={{
                ...neoStyles.button,
                ...buttonVariants.primary,
                padding: '0.5rem 1rem',
                fontSize: isMobile ? '0.875rem' : '1rem',
              }}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, neoStyles.buttonHover);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translate(0, 0)';
                e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
              }}
            >
              TODAY
            </button>
            <button
              onClick={goToNextMonth}
              style={{
                ...neoStyles.button,
                ...buttonVariants.neutral,
                padding: '0.5rem 1rem',
                fontSize: '1rem',
              }}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, neoStyles.buttonHover);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translate(0, 0)';
                e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
              }}
            >
              →
            </button>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <h2 style={{
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              fontWeight: '900',
              margin: 0,
              color: '#000000',
              textTransform: 'uppercase',
            }}>
              {format(currentDate, 'MMMM yyyy').toUpperCase()}
            </h2>
            {uniqueChannels.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: isMobile ? '1 1 100%' : '0 1 auto', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}>
                <label htmlFor="channelFilter" style={{
                  fontSize: isMobile ? '0.875rem' : '1rem',
                  fontWeight: '700',
                  color: '#000000',
                  whiteSpace: 'nowrap',
                }}>
                  CHANNEL:
                </label>
                <select
                  id="channelFilter"
                  value={selectedChannelFilter}
                  onChange={(e) => setSelectedChannelFilter(e.target.value)}
                  style={{
                    ...neoStyles.input,
                    padding: '0.5rem 1rem',
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    cursor: 'pointer',
                    width: '100%',
                    maxWidth: '100%',
                    minWidth: 0,
                    boxSizing: 'border-box',
                    flex: '1 1 auto',
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
          </div>
        </div>

        {/* Calendar Grid */}
        <div 
          data-calendar-grid
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: isMobile ? '0.25rem' : '0.5rem',
            width: '100%',
            overflowX: 'auto',
          }}
        >
          {/* Day Headers */}
          {dayNames.map(day => (
            <div
              key={day}
              style={{
                padding: isMobile ? '0.5rem 0.25rem' : '0.75rem',
                textAlign: 'center',
                fontWeight: '900',
                fontSize: isMobile ? '0.65rem' : '0.875rem',
                color: '#000000',
                background: '#FFFFFF',
                border: isMobile ? '2px solid #000000' : '3px solid #000000',
                borderRadius: '0',
                boxShadow: isMobile ? '2px 2px 0px 0px #000000' : '4px 4px 0px 0px #000000',
                textTransform: 'uppercase',
                minWidth: 0,
                overflow: 'hidden',
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
                data-calendar-cell
                onClick={() => {
                  setSelectedDate(day);
                  setHoveredReminder(null); // Hide tooltip when clicking
                }}
                style={{
                  minHeight: isMobile ? '50px' : '100px',
                  padding: isMobile ? '0.25rem' : '0.5rem',
                  border: isMobile ? `2px solid ${isToday ? '#4ECDC4' : '#000000'}` : `3px solid ${isToday ? '#4ECDC4' : '#000000'}`,
                  borderRadius: '0',
                  background: isCurrentMonth ? '#FFFFFF' : '#FFFFFF',
                  boxShadow: isToday 
                    ? (isMobile ? '2px 2px 0px 0px #4ECDC4' : '4px 4px 0px 0px #4ECDC4')
                    : (isMobile ? '2px 2px 0px 0px #000000' : '4px 4px 0px 0px #000000'),
                  cursor: 'pointer',
                  opacity: isCurrentMonth ? 1 : 0.6,
                  position: 'relative',
                  minWidth: 0,
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = 'translate(2px, 2px)';
                    e.currentTarget.style.boxShadow = isToday ? '2px 2px 0px 0px #4ECDC4' : '2px 2px 0px 0px #000000';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = 'translate(0, 0)';
                    e.currentTarget.style.boxShadow = isToday 
                      ? (isMobile ? '2px 2px 0px 0px #4ECDC4' : '4px 4px 0px 0px #4ECDC4')
                      : (isMobile ? '2px 2px 0px 0px #000000' : '4px 4px 0px 0px #000000');
                  }
                }}
              >
                <div style={{
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  fontWeight: isToday ? '900' : '700',
                  color: isToday ? '#4ECDC4' : '#000000',
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
                          fontSize: isMobile ? '0.6rem' : '0.75rem',
                          padding: isMobile ? '0.15rem 0.25rem' : '0.25rem 0.5rem',
                          background: '#4ECDC4',
                          color: '#000000',
                          border: isMobile ? '1px solid #000000' : '2px solid #000000',
                          borderRadius: '0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontWeight: '700',
                          cursor: 'pointer',
                          position: 'relative',
                          lineHeight: '1.2',
                        }}
                      >
                        {reminder.text.substring(0, isMobile ? 8 : 15)}...
                      </div>
                    ))}
                    {dayReminders.length > (isMobile ? 1 : 2) && (
                      <div style={{
                        fontSize: isMobile ? '0.6rem' : '0.7rem',
                        color: '#000000',
                        fontWeight: '700',
                      }}>
                        +{dayReminders.length - (isMobile ? 1 : 2)} MORE
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Hover Tooltip - Only show when no date is selected */}
        {hoveredReminder && !selectedDate && (
          <div
            style={{
              position: 'fixed',
              left: `${hoveredReminder.x + 10}px`,
              top: `${hoveredReminder.y + 10}px`,
              background: '#FFFFFF',
              padding: '1rem',
              borderRadius: '0',
              boxShadow: '8px 8px 0px 0px #000000',
              border: '3px solid #000000',
              zIndex: 1000,
              maxWidth: '300px',
              pointerEvents: 'none',
            }}
          >
            <div style={{
              fontSize: '0.875rem',
              fontWeight: '900',
              marginBottom: '0.5rem',
              color: '#000000',
              textTransform: 'uppercase',
            }}>
              {hoveredReminder.reminder.text}
            </div>
            {hoveredReminder.reminder.description && (
              <div style={{
                fontSize: '0.75rem',
                color: '#000000',
                marginBottom: '0.5rem',
                lineHeight: '1.4',
                fontWeight: '600',
              }}>
                {hoveredReminder.reminder.description}
              </div>
            )}
            <div style={{
              fontSize: '0.75rem',
              color: '#000000',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              fontWeight: '600',
            }}>
              <div>
                📅 DUE: <strong>{format(new Date(hoveredReminder.reminder.due_date), 'MMM dd, yyyy')}</strong>
              </div>
              <div>
                🔄 PERIOD: <strong>{hoveredReminder.reminder.period_days} DAY{hoveredReminder.reminder.period_days !== 1 ? 'S' : ''}</strong>
              </div>
              <div>
                💬 CHANNEL: <strong>{getChannelDisplay(hoveredReminder.reminder)}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Selected Date Details Modal */}
        {selectedDate && (
          <div
            data-selected-date-section
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
              padding: isMobile ? '1rem' : '2rem',
            }}
            onClick={(e) => {
              // Close when clicking the overlay
              if (e.target === e.currentTarget) {
                setSelectedDate(null);
              }
            }}
          >
            <div
              style={{
                background: neoStyles.modalContent.background,
                border: neoStyles.modalContent.border,
                borderRadius: neoStyles.modalContent.borderRadius,
                boxShadow: neoStyles.modalContent.boxShadow,
                padding: isMobile ? '1.5rem' : '2rem',
                maxWidth: isMobile ? '100%' : '600px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1.5rem',
              }}>
                <h3 style={{
                  fontSize: isMobile ? '1.1rem' : '1.25rem',
                  fontWeight: '900',
                  color: '#000000',
                  textTransform: 'uppercase',
                  margin: 0,
                }}>
                  REMINDERS FOR {format(selectedDate, 'MMMM dd, yyyy').toUpperCase()}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  style={{
                    ...neoStyles.button,
                    ...buttonVariants.neutral,
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    minWidth: 'auto',
                  }}
                  onMouseEnter={(e) => {
                    Object.assign(e.currentTarget.style, neoStyles.buttonHover);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translate(0, 0)';
                    e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
                  }}
                >
                  ✕
                </button>
              </div>
              {getRemindersForDate(selectedDate).length === 0 ? (
                <p style={{ color: '#000000', fontWeight: '700', textAlign: 'center', padding: '2rem' }}>
                  NO REMINDERS FOR THIS DATE{selectedChannelFilter !== 'all' ? ` WITH SELECTED CHANNEL` : ''}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {getRemindersForDate(selectedDate).map(reminder => (
                    <div
                      key={reminder.id}
                      style={{
                        padding: '1rem',
                        background: '#FFFFFF',
                        borderRadius: '0',
                        border: '3px solid #000000',
                        boxShadow: '4px 4px 0px 0px #000000',
                      }}
                    >
                      <div style={{
                        fontSize: isMobile ? '0.9rem' : '1rem',
                        fontWeight: '900',
                        marginBottom: '0.5rem',
                        color: '#000000',
                        textTransform: 'uppercase',
                      }}>
                        {reminder.text}
                      </div>
                      {reminder.description && (
                        <div style={{
                          fontSize: isMobile ? '0.8rem' : '0.875rem',
                          color: '#000000',
                          marginBottom: '0.5rem',
                          fontWeight: '600',
                        }}>
                          {reminder.description}
                        </div>
                      )}
                      <div style={{
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        color: '#000000',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        fontWeight: '600',
                      }}>
                        <span>
                          🔄 PERIOD: <strong>{reminder.period_days} DAY{reminder.period_days !== 1 ? 'S' : ''}</strong>
                        </span>
                        <span>
                          💬 CHANNEL: <strong>{getChannelDisplay(reminder)}</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Share Calendar Section - Hidden (legacy webhook-based) */}
      </div>
    </main>
  );
}
