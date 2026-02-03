'use client';

import { useState, useEffect } from 'react';
import { neoStyles, neoColors, buttonVariants } from '@/lib/neoBrutalismStyles';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface SlackConnectionStatus {
  connected: boolean;
  team_id?: string;
  team_name?: string;
}

export default function SlackConnection() {
  const [status, setStatus] = useState<SlackConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/slack/status');
      const data = await res.json();
      setStatus(data);
      setError('');
    } catch (err) {
      console.error('Error fetching Slack status:', err);
      setError('Failed to fetch Slack status');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Slack? You won\'t receive Slack reminders until you reconnect.')) {
      return;
    }

    try {
      await fetch('/api/slack/disconnect', { method: 'POST' });
      fetchStatus();
    } catch (err) {
      console.error('Error disconnecting Slack:', err);
      setError('Failed to disconnect Slack');
    }
  };

  if (loading) {
    return (
      <div style={{
        ...neoStyles.card,
        padding: isMobile ? '1rem' : '1.5rem',
      }}>
        <p style={{ fontWeight: '700' }}>Loading Slack status...</p>
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div style={{
        ...neoStyles.card,
        padding: isMobile ? '1rem' : '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>✅</span>
          <div>
            <p style={{ fontWeight: '900', margin: 0, textTransform: 'uppercase' }}>
              SLACK CONNECTED
            </p>
            <p style={{ fontWeight: '600', margin: 0, color: '#666' }}>
              Workspace: <strong>{status.team_name}</strong>
            </p>
          </div>
        </div>

        <div style={{
          padding: '0.75rem',
          background: '#E8F5E9',
          border: '2px solid #000',
          marginBottom: '1rem',
        }}>
          <p style={{ fontWeight: '700', margin: 0, fontSize: '0.875rem' }}>
            ✓ READY TO SEND REMINDERS
          </p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#666' }}>
            Select channels when creating reminders. You can send to public channels, private channels, DMs, and group DMs.
          </p>
        </div>

        <button
          onClick={handleDisconnect}
          style={{
            ...neoStyles.button,
            ...buttonVariants.danger,
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
          }}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, neoStyles.buttonHover)}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)';
            e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
          }}
        >
          DISCONNECT SLACK
        </button>

        {error && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: neoColors.secondary,
            border: '2px solid #000',
            fontWeight: '700',
          }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  // Not connected
  return (
    <div style={{
      ...neoStyles.card,
      padding: isMobile ? '1rem' : '1.5rem',
    }}>
      <h3 style={{ ...neoStyles.heading, fontSize: '1.25rem', marginBottom: '1rem' }}>
        CONNECT SLACK
      </h3>

      <p style={{ fontWeight: '600', marginBottom: '1rem', lineHeight: '1.6' }}>
        Connect your Slack workspace to receive reminders directly in Slack. 
        You'll be able to mark reminders as complete with a single click!
      </p>

      <a
        href="/api/slack/oauth"
        style={{
          ...neoStyles.button,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1.5rem',
          background: '#4A154B', // Slack purple
          color: '#FFFFFF',
          textDecoration: 'none',
        }}
        onMouseEnter={(e) => Object.assign(e.currentTarget.style, neoStyles.buttonHover)}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translate(0, 0)';
          e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
        }}
      >
        <svg width="20" height="20" viewBox="0 0 123 123" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M25.8 77.6C25.8 84.7 20 90.5 12.9 90.5C5.8 90.5 0 84.7 0 77.6C0 70.5 5.8 64.7 12.9 64.7H25.8V77.6Z" fill="#E01E5A"/>
          <path d="M32.3 77.6C32.3 70.5 38.1 64.7 45.2 64.7C52.3 64.7 58.1 70.5 58.1 77.6V110.1C58.1 117.2 52.3 123 45.2 123C38.1 123 32.3 117.2 32.3 110.1V77.6Z" fill="#E01E5A"/>
          <path d="M45.2 25.8C38.1 25.8 32.3 20 32.3 12.9C32.3 5.8 38.1 0 45.2 0C52.3 0 58.1 5.8 58.1 12.9V25.8H45.2Z" fill="#36C5F0"/>
          <path d="M45.2 32.3C52.3 32.3 58.1 38.1 58.1 45.2C58.1 52.3 52.3 58.1 45.2 58.1H12.9C5.8 58.1 0 52.3 0 45.2C0 38.1 5.8 32.3 12.9 32.3H45.2Z" fill="#36C5F0"/>
          <path d="M97 45.2C97 38.1 102.8 32.3 109.9 32.3C117 32.3 122.8 38.1 122.8 45.2C122.8 52.3 117 58.1 109.9 58.1H97V45.2Z" fill="#2EB67D"/>
          <path d="M90.5 45.2C90.5 52.3 84.7 58.1 77.6 58.1C70.5 58.1 64.7 52.3 64.7 45.2V12.9C64.7 5.8 70.5 0 77.6 0C84.7 0 90.5 5.8 90.5 12.9V45.2Z" fill="#2EB67D"/>
          <path d="M77.6 97C84.7 97 90.5 102.8 90.5 109.9C90.5 117 84.7 122.8 77.6 122.8C70.5 122.8 64.7 117 64.7 109.9V97H77.6Z" fill="#ECB22E"/>
          <path d="M77.6 90.5C70.5 90.5 64.7 84.7 64.7 77.6C64.7 70.5 70.5 64.7 77.6 64.7H110.1C117.2 64.7 123 70.5 123 77.6C123 84.7 117.2 90.5 110.1 90.5H77.6Z" fill="#ECB22E"/>
        </svg>
        ADD TO SLACK
      </a>

      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: '#f5f5f5',
        border: '2px solid #000',
      }}>
        <p style={{ fontWeight: '700', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          WHAT PERMISSIONS ARE NEEDED?
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: '1.6' }}>
          <li><strong>chat:write</strong> - Send reminder messages</li>
          <li><strong>channels:read</strong> - List public channels</li>
          <li><strong>groups:read</strong> - List private channels</li>
          <li><strong>im:read/write</strong> - Read and send direct messages</li>
          <li><strong>mpim:read/write</strong> - Read and send group messages</li>
          <li><strong>users:read</strong> - List users for DM selection</li>
        </ul>
      </div>

      {error && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: neoColors.secondary,
          border: '2px solid #000',
          fontWeight: '700',
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
