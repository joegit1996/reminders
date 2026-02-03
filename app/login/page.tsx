'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { neoStyles, neoColors, buttonVariants } from '@/lib/neoBrutalismStyles';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setMessage('');
    setIsError(false);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
      setIsError(true);
      setGoogleLoading(false);
    }
    // If successful, user will be redirected to Google
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsError(false);

    if (isSignUp) {
      // Sign up with email and password
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMessage(error.message);
        setIsError(true);
      } else {
        setMessage('Check your email to confirm your account!');
        setIsError(false);
      }
    } else {
      // Sign in with email and password
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        setIsError(true);
      } else {
        router.push('/');
      }
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
          {isSignUp ? 'Create an account' : 'Sign in to manage your reminders'}
        </p>

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          style={{
            ...neoStyles.button,
            padding: '1rem',
            fontSize: '1rem',
            width: '100%',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            opacity: googleLoading ? 0.7 : 1,
            cursor: googleLoading ? 'not-allowed' : 'pointer',
            marginBottom: '1.5rem',
          }}
          onMouseEnter={(e) => {
            if (!googleLoading) {
              Object.assign(e.currentTarget.style, neoStyles.buttonHover);
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)';
            e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
          }}
        >
          {/* Google Icon */}
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {googleLoading ? 'CONNECTING...' : 'SIGN IN WITH GOOGLE'}
        </button>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ flex: 1, height: '3px', background: '#000000' }} />
          <span style={{ fontWeight: '700', fontSize: '0.875rem' }}>OR</span>
          <div style={{ flex: 1, height: '3px', background: '#000000' }} />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

          <div>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                fontSize: '0.875rem',
              }}
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignUp ? 'Create a password (min 6 chars)' : 'Enter your password'}
              required
              minLength={6}
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
              marginTop: '0.5rem',
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
            {loading ? 'PLEASE WAIT...' : isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
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

        {/* Toggle Sign In / Sign Up */}
        <div
          style={{
            marginTop: '1.5rem',
            textAlign: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage('');
            }}
            style={{
              background: 'none',
              border: 'none',
              fontWeight: '700',
              fontSize: '0.875rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              color: '#000000',
            }}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
