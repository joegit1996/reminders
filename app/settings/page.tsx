'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { neoStyles, neoColors, buttonVariants } from '@/lib/neoBrutalismStyles';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import SlackConnection from '@/components/SlackConnection';

function SettingsContent() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Check for Slack OAuth result messages
    const slackConnected = searchParams.get('slack_connected');
    const slackError = searchParams.get('slack_error');

    if (slackConnected === 'true') {
      setMessage({ type: 'success', text: 'Slack connected successfully!' });
      // Clean URL
      router.replace('/settings', { scroll: false });
    } else if (slackError) {
      setMessage({ type: 'error', text: `Slack connection failed: ${slackError}` });
      router.replace('/settings', { scroll: false });
    }
  }, [searchParams, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: neoColors.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <p style={{ fontWeight: '700', fontSize: '1.25rem' }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: neoColors.background,
      padding: isMobile ? '1rem' : '2rem',
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <h1 style={{ ...neoStyles.heading, fontSize: isMobile ? '1.5rem' : '2rem', margin: 0 }}>
            SETTINGS
          </h1>
          <button
            onClick={() => router.push('/')}
            style={{
              ...neoStyles.button,
              ...buttonVariants.primary,
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
            }}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, neoStyles.buttonHover)}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)';
              e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
            }}
          >
            ← BACK TO REMINDERS
          </button>
        </div>

        {/* Status Message */}
        {message && (
          <div style={{
            ...neoStyles.card,
            marginBottom: '1.5rem',
            padding: '1rem',
            background: message.type === 'success' ? neoColors.success : neoColors.secondary,
          }}>
            <p style={{ fontWeight: '700', margin: 0 }}>{message.text}</p>
          </div>
        )}

        {/* Account Section */}
        <div style={{
          ...neoStyles.card,
          marginBottom: '1.5rem',
          padding: isMobile ? '1rem' : '1.5rem',
        }}>
          <h2 style={{ ...neoStyles.heading, fontSize: '1.25rem', marginBottom: '1rem' }}>
            ACCOUNT
          </h2>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontWeight: '600', margin: 0, color: '#666', fontSize: '0.875rem' }}>
              SIGNED IN AS
            </p>
            <p style={{ fontWeight: '700', margin: '0.25rem 0 0 0' }}>
              {user.email}
            </p>
          </div>
          <button
            onClick={handleSignOut}
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
            SIGN OUT
          </button>
        </div>

        {/* Slack Connection Section */}
        <SlackConnection />

        {/* Help Section */}
        <div style={{
          ...neoStyles.card,
          marginTop: '1.5rem',
          padding: isMobile ? '1rem' : '1.5rem',
        }}>
          <h2 style={{ ...neoStyles.heading, fontSize: '1.25rem', marginBottom: '1rem' }}>
            HOW IT WORKS
          </h2>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: '1.8' }}>
            <li><strong>Connect Slack</strong> - Click "Add to Slack" to authorize the app</li>
            <li><strong>Select a Channel</strong> - Choose where reminders should be sent</li>
            <li><strong>Create Reminders</strong> - Go back to the main page and create reminders</li>
            <li><strong>Receive Notifications</strong> - Get reminders in Slack with interactive buttons</li>
            <li><strong>Mark Complete</strong> - Click the button in Slack to mark a reminder done</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: neoColors.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <p style={{ fontWeight: '700', fontSize: '1.25rem' }}>Loading...</p>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
