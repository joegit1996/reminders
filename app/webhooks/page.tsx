'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useMediaQuery } from '@/hooks/useMediaQuery';

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
          alignItems: isMobile ? 'flex-start' : 'center', 
          gap: '1rem',
          marginBottom: '1.5rem' 
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
              🔗 Saved Webhooks
            </h1>
            <p style={{ color: '#666', fontSize: isMobile ? '0.875rem' : '1rem' }}>Manage your saved Slack webhooks</p>
          </div>
          <Link
            href="/"
            style={{
              padding: '0.75rem 1.5rem',
              background: '#e5e7eb',
              color: '#374151',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: '500',
              fontSize: isMobile ? '0.875rem' : '1rem',
              alignSelf: isMobile ? 'stretch' : 'auto',
              textAlign: 'center',
            }}
          >
            ← Back to Reminders
          </Link>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '6px',
            color: '#c33',
            marginBottom: '1rem',
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
            padding: '0.75rem 1.5rem',
            background: showAddForm ? '#e5e7eb' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: showAddForm ? '#374151' : 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '1.5rem',
          }}
        >
          {showAddForm ? 'Cancel' : '+ Add New Webhook'}
        </button>

        {showAddForm && (
          <form onSubmit={handleSubmit} style={{
            padding: '1.5rem',
            background: '#f9fafb',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '1px solid #e5e7eb',
          }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: '600' }}>
              {editingId ? 'Edit Webhook' : 'Add New Webhook'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Webhook Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Project Updates Channel"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem',
                  }}
                />
              </div>
              <div>
                <label htmlFor="webhookUrl" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Webhook URL *
                </label>
                <input
                  type="url"
                  id="webhookUrl"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                  required
                  placeholder="https://hooks.slack.com/services/..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem',
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {editingId ? 'Update Webhook' : 'Save Webhook'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>Loading webhooks...</p>
        ) : webhooks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            background: '#f9fafb',
            borderRadius: '8px',
            border: '1px dashed #e5e7eb',
          }}>
            <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '0.5rem' }}>
              No saved webhooks yet
            </p>
            <p style={{ color: '#999', fontSize: '0.9rem' }}>
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
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  background: 'white',
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
                    fontWeight: '600', 
                    marginBottom: '0.5rem',
                    wordBreak: 'break-word',
                  }}>
                    {webhook.name}
                  </h3>
                  <p style={{ color: '#666', fontSize: isMobile ? '0.8rem' : '0.9rem', wordBreak: 'break-all' }}>
                    {webhook.webhook_url}
                  </p>
                  <p style={{ color: '#999', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    Created: {new Date(webhook.created_at).toLocaleDateString()}
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
                      padding: '0.5rem 1rem',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: isMobile ? '0.75rem' : '0.875rem',
                      cursor: 'pointer',
                      fontWeight: '500',
                      flex: isMobile ? '1' : '0',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(webhook.id)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: isMobile ? '0.75rem' : '0.875rem',
                      cursor: 'pointer',
                      fontWeight: '500',
                      flex: isMobile ? '1' : '0',
                    }}
                  >
                    Delete
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
