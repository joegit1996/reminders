'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { neoStyles, neoColors, buttonVariants } from '@/lib/neoBrutalismStyles';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface SlackStatus {
  connected: boolean;
  default_channel_id?: string;
  team_name?: string;
}

export default function SlackMigrationBanner() {
  const [status, setStatus] = useState<SlackStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    // Check if user has dismissed the banner in this session
    const wasDismissed = sessionStorage.getItem('slack_banner_dismissed');
    if (wasDismissed === 'true') {
      setDismissed(true);
      setLoading(false);
      return;
    }

    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/slack/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching Slack status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('slack_banner_dismissed', 'true');
  };

  // Don't show if loading, dismissed, or Slack is connected
  if (loading || dismissed || status?.connected) {
    return null;
  }

  return (
    <div style={{
      background: '#4A154B', // Slack purple
      color: '#FFFFFF',
      border: '4px solid #000000',
      boxShadow: '8px 8px 0px 0px #000000',
      padding: isMobile ? '1rem' : '1.5rem',
      marginBottom: isMobile ? '1.5rem' : '2rem',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center',
      justifyContent: 'space-between',
      gap: '1rem',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🔔</span>
          <h3 style={{ 
            margin: 0, 
            fontWeight: '900', 
            textTransform: 'uppercase',
            fontSize: isMobile ? '1rem' : '1.1rem',
          }}>
            CONNECT SLACK FOR BETTER EXPERIENCE
          </h3>
        </div>
        <p style={{ 
          margin: 0, 
          fontSize: isMobile ? '0.875rem' : '0.9rem',
          opacity: 0.9,
        }}>
          Connect your Slack workspace to receive interactive reminders you can complete with a single click!
        </p>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '0.75rem', 
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        <Link
          href="/settings"
          style={{
            ...neoStyles.button,
            background: '#FFFFFF',
            color: '#000000',
            padding: '0.75rem 1.25rem',
            textDecoration: 'none',
            fontSize: '0.875rem',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, neoStyles.buttonHover)}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)';
            e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
          }}
        >
          CONNECT SLACK
        </Link>
        <button
          onClick={handleDismiss}
          style={{
            ...neoStyles.button,
            background: 'transparent',
            color: '#FFFFFF',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            border: '2px solid rgba(255,255,255,0.5)',
            boxShadow: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          DISMISS
        </button>
      </div>
    </div>
  );
}
