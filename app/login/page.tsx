'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { neoStyles, neoColors, buttonVariants } from '@/lib/neoBrutalismStyles';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsError(false);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
      setIsError(true);
    } else {
      setMessage('Check your email for the login link!');
      setIsError(false);
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: neoColors.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '1rem' : '2rem',
      }}
    >
      <div
        style={{
          ...neoStyles.card,
          maxWidth: '450px',
          width: '100%',
          padding: isMobile ? '1.5rem' : '2.5rem',
        }}
      >
        <h1
          style={{
            ...neoStyles.heading,
            fontSize: isMobile ? '1.5rem' : '2rem',
            marginBottom: '0.5rem',
            textAlign: 'center',
          }}
        >
          ZANAN PRO MAX
        </h1>
        <p
          style={{
            textAlign: 'center',
            fontWeight: '600',
            marginBottom: '2rem',
            color: '#666',
          }}
        >
          Sign in to manage your reminders
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                fontSize: '0.875rem',
              }}
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                ...neoStyles.input,
                width: '100%',
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = neoStyles.inputFocus.boxShadow;
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...neoStyles.button,
              ...buttonVariants.primary,
              padding: '1rem',
              fontSize: '1rem',
              width: '100%',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                Object.assign(e.currentTarget.style, neoStyles.buttonHover);
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)';
              e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
            }}
          >
            {loading ? 'SENDING...' : 'SEND MAGIC LINK'}
          </button>

          {message && (
            <div
              style={{
                padding: '1rem',
                background: isError ? '#FF6B6B' : '#6BCB77',
                border: '3px solid #000000',
                boxShadow: '4px 4px 0px 0px #000000',
                fontWeight: '700',
                textAlign: 'center',
              }}
            >
              {message}
            </div>
          )}
        </form>

        <div
          style={{
            marginTop: '2rem',
            padding: '1rem',
            background: '#f5f5f5',
            border: '2px solid #000000',
          }}
        >
          <p style={{ fontWeight: '700', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            HOW IT WORKS:
          </p>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: '1.6' }}>
            <li>Enter your email address</li>
            <li>Click "Send Magic Link"</li>
            <li>Check your inbox for the login email</li>
            <li>Click the link to sign in - no password needed!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
