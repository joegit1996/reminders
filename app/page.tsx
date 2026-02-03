'use client';

import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import Link from 'next/link';
import ReminderForm from '@/components/ReminderForm';
import SlackMigrationBanner from '@/components/SlackMigrationBanner';
import ReminderList from '@/components/ReminderList';
import UpdateDueDateModal from '@/components/UpdateDueDateModal';
import EditDelayMessageModal from '@/components/EditDelayMessageModal';
import EditAutomatedMessagesModal from '@/components/EditAutomatedMessagesModal';
import EditCompletionModal from '@/components/EditCompletionModal';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export interface Reminder {
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

export default function Home() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [showAutomatedMessagesModal, setShowAutomatedMessagesModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isSmallMobile = useMediaQuery('(max-width: 480px)');

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const response = await fetch('/api/reminders');
      if (response.ok) {
        const data = await response.json();
        setReminders(data);
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReminderCreated = () => {
    fetchReminders();
  };

  const handleComplete = async (id: number) => {
    try {
      const response = await fetch(`/api/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });

      if (response.ok) {
        fetchReminders();
      }
    } catch (error) {
      console.error('Error completing reminder:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/reminders/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchReminders();
      } else {
        const error = await response.json();
        alert(`Failed to delete: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting reminder:', error);
      alert('Failed to delete reminder');
    }
  };

  const handleUpdateDueDate = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setShowUpdateModal(true);
  };

  const handleDueDateUpdated = () => {
    setShowUpdateModal(false);
    setSelectedReminder(null);
    fetchReminders();
  };

  const handleEditDelayMessage = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setShowDelayModal(true);
  };

  const handleDelayMessageUpdated = () => {
    setShowDelayModal(false);
    setSelectedReminder(null);
    fetchReminders();
  };

  const handleEditAutomatedMessages = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setShowAutomatedMessagesModal(true);
  };

  const handleAutomatedMessagesUpdated = () => {
    setShowAutomatedMessagesModal(false);
    setSelectedReminder(null);
    fetchReminders();
  };

  const handleEditCompletion = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setShowCompletionModal(true);
  };

  const handleCompletionUpdated = () => {
    setShowCompletionModal(false);
    setSelectedReminder(null);
    fetchReminders();
  };

  return (
    <main style={{ 
      maxWidth: '1200px', 
      margin: '0 auto',
      width: '100%',
    }}>
      <SlackMigrationBanner />
      
      <div style={{
        background: '#FFFFFF',
        borderRadius: '0',
        padding: isMobile ? '1.5rem' : '2rem',
        border: '4px solid #000000',
        boxShadow: '8px 8px 0px 0px #000000',
        marginBottom: isMobile ? '1.5rem' : '2rem',
      }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'flex-start', 
          gap: '1rem',
          marginBottom: '2rem' 
        }}>
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: isMobile ? '1.75rem' : '2.5rem',
              fontWeight: '900',
              marginBottom: '0.5rem',
              color: '#000000',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
            }}>
              📋 ZANAN PRO MAX
            </h1>
            <p style={{ color: '#000000', fontSize: isMobile ? '0.875rem' : '1rem', fontWeight: '600' }}>
              Manage your Slack reminders and never miss a deadline
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link
            href="/agent"
            style={{
              padding: '0.75rem 1.5rem',
              background: '#95E1D3',
              color: '#000000',
              textDecoration: 'none',
              borderRadius: '0',
              border: '3px solid #000000',
              fontWeight: '700',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              boxShadow: '4px 4px 0px 0px #000000',
              transition: 'all 0.1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(2px, 2px)';
              e.currentTarget.style.boxShadow = '2px 2px 0px 0px #000000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)';
              e.currentTarget.style.boxShadow = '4px 4px 0px 0px #000000';
            }}
          >
            🤖 AI ASSISTANT
          </Link>
          <Link
            href="/calendar"
            style={{
              padding: '0.75rem 1.5rem',
              background: '#4ECDC4',
              color: '#000000',
              textDecoration: 'none',
              borderRadius: '0',
              border: '3px solid #000000',
              fontWeight: '700',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              boxShadow: '4px 4px 0px 0px #000000',
              transition: 'all 0.1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(2px, 2px)';
              e.currentTarget.style.boxShadow = '2px 2px 0px 0px #000000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)';
              e.currentTarget.style.boxShadow = '4px 4px 0px 0px #000000';
            }}
          >
            📅 CALENDAR
          </Link>
          <Link
            href="/webhooks"
            style={{
              padding: '0.75rem 1.5rem',
              background: '#FF6B6B',
              color: '#000000',
              textDecoration: 'none',
              borderRadius: '0',
              border: '3px solid #000000',
              fontWeight: '700',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              boxShadow: '4px 4px 0px 0px #000000',
              transition: 'all 0.1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(2px, 2px)';
              e.currentTarget.style.boxShadow = '2px 2px 0px 0px #000000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)';
              e.currentTarget.style.boxShadow = '4px 4px 0px 0px #000000';
            }}
          >
            🔗 WEBHOOKS
          </Link>
          <Link
            href="/settings"
            style={{
              padding: '0.75rem 1.5rem',
              background: '#FFD93D',
              color: '#000000',
              textDecoration: 'none',
              borderRadius: '0',
              border: '3px solid #000000',
              fontWeight: '700',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              boxShadow: '4px 4px 0px 0px #000000',
              transition: 'all 0.1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(2px, 2px)';
              e.currentTarget.style.boxShadow = '2px 2px 0px 0px #000000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)';
              e.currentTarget.style.boxShadow = '4px 4px 0px 0px #000000';
            }}
          >
            ⚙️ SETTINGS
          </Link>
          </div>
        </div>
        <ReminderForm onReminderCreated={handleReminderCreated} />
      </div>

      <div style={{
        background: '#FFFFFF',
        borderRadius: '0',
        padding: isMobile ? '1.5rem' : '2rem',
        border: '4px solid #000000',
        boxShadow: '8px 8px 0px 0px #000000',
      }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#666' }}>Loading reminders...</p>
        ) : (
          <ReminderList
            reminders={reminders}
            onComplete={handleComplete}
            onUpdateDueDate={handleUpdateDueDate}
            onEditDelayMessage={handleEditDelayMessage}
            onEditAutomatedMessages={handleEditAutomatedMessages}
            onEditCompletion={handleEditCompletion}
            onDelete={handleDelete}
          />
        )}
      </div>

        {showUpdateModal && selectedReminder && (
        <UpdateDueDateModal
          reminder={selectedReminder}
          onClose={() => {
            setShowUpdateModal(false);
            setSelectedReminder(null);
          }}
          onUpdated={handleDueDateUpdated}
        />
      )}

      {showDelayModal && selectedReminder && (
        <EditDelayMessageModal
          reminder={selectedReminder}
          onClose={() => {
            setShowDelayModal(false);
            setSelectedReminder(null);
          }}
          onUpdated={handleDelayMessageUpdated}
        />
      )}

      {showAutomatedMessagesModal && selectedReminder && (
        <EditAutomatedMessagesModal
          reminder={selectedReminder}
          onClose={() => {
            setShowAutomatedMessagesModal(false);
            setSelectedReminder(null);
          }}
          onUpdated={handleAutomatedMessagesUpdated}
        />
      )}

      {showCompletionModal && selectedReminder && (
        <EditCompletionModal
          reminder={selectedReminder}
          onClose={() => {
            setShowCompletionModal(false);
            setSelectedReminder(null);
          }}
          onUpdated={handleCompletionUpdated}
        />
      )}
    </main>
  );
}
