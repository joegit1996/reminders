'use client';

import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import Link from 'next/link';
import ReminderForm from '@/components/ReminderForm';
import ReminderList from '@/components/ReminderList';
import UpdateDueDateModal from '@/components/UpdateDueDateModal';
import EditDelayMessageModal from '@/components/EditDelayMessageModal';
import EditAutomatedMessagesModal from '@/components/EditAutomatedMessagesModal';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export interface Reminder {
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

export default function Home() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [showAutomatedMessagesModal, setShowAutomatedMessagesModal] = useState(false);
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

  return (
    <main style={{ 
      maxWidth: '1200px', 
      margin: '0 auto',
      width: '100%',
    }}>
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
          alignItems: isMobile ? 'flex-start' : 'flex-start', 
          gap: '1rem',
          marginBottom: '2rem' 
        }}>
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: isMobile ? '1.75rem' : '2.5rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              📋 Reminders
            </h1>
            <p style={{ color: '#666', fontSize: isMobile ? '0.875rem' : '1rem' }}>
              Manage your Slack reminders and never miss a deadline
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link
              href="/calendar"
              style={{
                padding: '0.75rem 1.5rem',
                background: '#e5e7eb',
                color: '#374151',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: '500',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                textAlign: 'center',
              }}
            >
              📅 Calendar
            </Link>
            <Link
              href="/webhooks"
              style={{
                padding: '0.75rem 1.5rem',
                background: '#e5e7eb',
                color: '#374151',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: '500',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                textAlign: 'center',
              }}
            >
              🔗 Manage Webhooks
            </Link>
          </div>
        </div>
        <ReminderForm onReminderCreated={handleReminderCreated} />
      </div>

      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: isMobile ? '1rem' : '2rem',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
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
    </main>
  );
}
