'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { neoStyles, neoColors, buttonVariants } from '@/lib/neoBrutalismStyles';

interface SavedWebhook {
  id: number;
  name: string;
  webhook_url: string;
  created_at: string;
}

export default function WebhooksPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [webhooks, setWebhooks] = useState<SavedWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    webhookUrl: '',
  });

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/webhooks');
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data);
      } else {
        setError('Failed to fetch webhooks');
      }
    } catch (err) {
      setError('Error loading webhooks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingId) {
        // Update existing
        const response = await fetch(`/api/webhooks/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            webhookUrl: formData.webhookUrl,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update webhook');
        }
      } else {
        // Create new
        const response = await fetch('/api/webhooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            webhookUrl: formData.webhookUrl,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create webhook');
        }
      }

      setFormData({ name: '', webhookUrl: '' });
      setShowAddForm(false);
      setEditingId(null);
      fetchWebhooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleEdit = (webhook: SavedWebhook) => {
    setFormData({
      name: webhook.name,
      webhookUrl: webhook.webhook_url,
    });
    setEditingId(webhook.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete webhook');
      }

      fetchWebhooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete webhook');
    }
  };

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '1rem' : '2rem', width: '100%' }}>
      <div style={{
        ...neoStyles.card,
        marginBottom: '2rem',
      }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'center', 
          gap: '1rem',
          marginBottom: '1.5rem' 
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
              🔗 SAVED WEBHOOKS
            </h1>
            <p style={{ color: '#000000', fontSize: isMobile ? '0.875rem' : '1rem', fontWeight: '600' }}>Manage your saved Slack webhooks</p>
          </div>
          <Link
            href="/"
            style={{
              ...neoStyles.button,
              ...buttonVariants.neutral,
              padding: '0.75rem 1.5rem',
              fontSize: isMobile ? '0.875rem' : '1rem',
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
            ← BACK TO REMINDERS
          </Link>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem',
            background: '#FF6B6B',
            border: '3px solid #000000',
            borderRadius: '0',
            boxShadow: '4px 4px 0px 0px #000000',
            color: '#000000',
            marginBottom: '1rem',
            fontWeight: '700',
          }}>
            {error}
          </div>
        )}

        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingId(null);
            setFormData({ name: '', webhookUrl: '' });
          }}
          style={{
            ...neoStyles.button,
            ...(showAddForm ? buttonVariants.neutral : buttonVariants.primary),
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            marginBottom: '1.5rem',
          }}
          onMouseEnter={(e) => {
            Object.assign(e.currentTarget.style, neoStyles.buttonHover);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)';
            e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
          }}
        >
          {showAddForm ? 'CANCEL' : '+ ADD NEW WEBHOOK'}
        </button>

        {showAddForm && (
          <form onSubmit={handleSubmit} style={{
            padding: '1.5rem',
            background: '#FFFFFF',
            borderRadius: '0',
            marginBottom: '1.5rem',
            border: '3px solid #000000',
            boxShadow: '4px 4px 0px 0px #000000',
          }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: '900', color: '#000000', textTransform: 'uppercase' }}>
              {editingId ? 'EDIT WEBHOOK' : 'ADD NEW WEBHOOK'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
                  WEBHOOK NAME *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Project Updates Channel"
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
                <label htmlFor="webhookUrl" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
                  WEBHOOK URL *
                </label>
                <input
                  type="url"
                  id="webhookUrl"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                  required
                  placeholder="https://hooks.slack.com/services/..."
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
                style={{
                  ...neoStyles.button,
                  ...buttonVariants.success,
                  padding: '0.75rem 1.5rem',
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
                {editingId ? 'UPDATE WEBHOOK' : 'SAVE WEBHOOK'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p style={{ textAlign: 'center', color: '#000000', padding: '2rem', fontWeight: '700' }}>LOADING WEBHOOKS...</p>
        ) : webhooks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            background: '#FFFFFF',
            borderRadius: '0',
            border: '3px dashed #000000',
            boxShadow: '4px 4px 0px 0px #000000',
          }}>
            <p style={{ fontSize: '1.2rem', color: '#000000', marginBottom: '0.5rem', fontWeight: '700' }}>
              NO SAVED WEBHOOKS YET
            </p>
            <p style={{ color: '#000000', fontSize: '0.9rem', fontWeight: '600' }}>
              Click "Add New Webhook" above to create your first one
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                style={{
                  padding: isMobile ? '1rem' : '1.5rem',
                  border: '3px solid #000000',
                  borderRadius: '0',
                  background: '#FFFFFF',
                  boxShadow: '4px 4px 0px 0px #000000',
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between',
                  alignItems: isMobile ? 'stretch' : 'center',
                  gap: '1rem',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ 
                    fontSize: isMobile ? '1rem' : '1.2rem', 
                    fontWeight: '700', 
                    marginBottom: '0.5rem',
                    wordBreak: 'break-word',
                    color: '#000000',
                  }}>
                    {webhook.name}
                  </h3>
                  <p style={{ color: '#000000', fontSize: isMobile ? '0.8rem' : '0.9rem', wordBreak: 'break-all', fontWeight: '600' }}>
                    {webhook.webhook_url}
                  </p>
                  <p style={{ color: '#000000', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: '600' }}>
                    CREATED: {new Date(webhook.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: isMobile ? 'row' : 'row',
                  gap: '0.5rem',
                  width: isMobile ? '100%' : 'auto',
                }}>
                  <button
                    onClick={() => handleEdit(webhook)}
                    style={{
                      ...neoStyles.button,
                      ...buttonVariants.primary,
                      padding: '0.5rem 1rem',
                      fontSize: isMobile ? '0.75rem' : '0.875rem',
                      flex: isMobile ? '1' : '0',
                    }}
                    onMouseEnter={(e) => {
                      Object.assign(e.currentTarget.style, neoStyles.buttonHover);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translate(0, 0)';
                      e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
                    }}
                  >
                    EDIT
                  </button>
                  <button
                    onClick={() => handleDelete(webhook.id)}
                    style={{
                      ...neoStyles.button,
                      ...buttonVariants.danger,
                      padding: '0.5rem 1rem',
                      fontSize: isMobile ? '0.75rem' : '0.875rem',
                      flex: isMobile ? '1' : '0',
                    }}
                    onMouseEnter={(e) => {
                      Object.assign(e.currentTarget.style, neoStyles.buttonHover);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translate(0, 0)';
                      e.currentTarget.style.boxShadow = neoStyles.button.boxShadow;
                    }}
                  >
                    DELETE
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
