'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AgentChat from '@/components/AgentChat';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export default function AgentPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [remindersUpdated, setRemindersUpdated] = useState(0);

  const handleReminderUpdated = () => {
    setRemindersUpdated(prev => prev + 1);
  };

  return (
    <main style={{ 
      maxWidth: '1200px', 
      margin: '0 auto',
      width: '100%',
    }}>
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
          alignItems: isMobile ? 'flex-start' : 'center',
          marginBottom: '2rem',
          gap: '1rem',
        }}>
          <div>
            <h1 style={{
              fontSize: isMobile ? '1.75rem' : '2.5rem',
              fontWeight: '900',
              color: '#000000',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
            }}>
              🤖 AI ASSISTANT
            </h1>
            <p style={{ color: '#000000', fontSize: isMobile ? '0.875rem' : '1rem', fontWeight: '600' }}>
              Manage your reminders using natural language
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link
              href="/"
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
              ← BACK
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
          </div>
        </div>
        <AgentChat onReminderUpdated={handleReminderUpdated} />
      </div>
    </main>
  );
}
