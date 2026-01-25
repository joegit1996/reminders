'use client';

import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import ReminderForm from '@/components/ReminderForm';
import ReminderList from '@/components/ReminderList';
import UpdateDueDateModal from '@/components/UpdateDueDateModal';

export interface Reminder {
  id: number;
  text: string;
  due_date: string;
  period_days: number;
  slack_webhook: string;
  is_complete: boolean;
  last_sent: string | null;
  created_at: string;
}

export default function Home() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

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

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        marginBottom: '2rem',
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          📋 Reminders
        </h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          Manage your Slack reminders and never miss a deadline
        </p>
        <ReminderForm onReminderCreated={handleReminderCreated} />
      </div>

      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
      }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#666' }}>Loading reminders...</p>
        ) : (
          <ReminderList
            reminders={reminders}
            onComplete={handleComplete}
            onUpdateDueDate={handleUpdateDueDate}
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
    </main>
  );
}
