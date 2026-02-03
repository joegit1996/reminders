'use client';

import { useState, useEffect } from 'react';
import { neoStyles } from '@/lib/neoBrutalismStyles';

interface Channel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
}

interface ChannelSelectorProps {
  value: string | null;
  valueName: string | null;
  onChange: (channelId: string | null, channelName: string | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChannelSelector({
  value,
  valueName,
  onChange,
  label,
  placeholder = 'Select a channel...',
  disabled = false,
}: ChannelSelectorProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First check if Slack is connected
      const statusResponse = await fetch('/api/slack/status');
      const statusData = await statusResponse.json();
      
      if (!statusResponse.ok || !statusData.connected) {
        setIsConnected(false);
        setLoading(false);
        return;
      }
      
      setIsConnected(true);
      
      // Fetch channels
      const response = await fetch('/api/slack/channels');
      if (!response.ok) {
        throw new Error('Failed to fetch channels');
      }
      
      const data = await response.json();
      setChannels(data.channels || []);
    } catch (err) {
      console.error('Error fetching channels:', err);
      setError('Failed to load channels');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const channelId = e.target.value || null;
    const channel = channels.find(c => c.id === channelId);
    onChange(channelId, channel?.name || null);
  };

  if (!isConnected) {
    return (
      <div>
        {label && (
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
            {label}
          </label>
        )}
        <div style={{
          padding: '0.75rem',
          background: '#FFF3CD',
          border: '2px solid #000000',
          fontSize: '0.875rem',
          fontWeight: '600',
        }}>
          Connect Slack in <a href="/settings" style={{ color: '#4ECDC4', fontWeight: '700' }}>Settings</a> to select channels
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        {label && (
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
            {label}
          </label>
        )}
        <div style={{
          ...neoStyles.input,
          background: '#F3F4F6',
          color: '#666',
          cursor: 'wait',
        }}>
          Loading channels...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {label && (
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
            {label}
          </label>
        )}
        <div style={{
          padding: '0.75rem',
          background: '#FF6B6B',
          border: '2px solid #000000',
          fontSize: '0.875rem',
          fontWeight: '600',
        }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      {label && (
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
          {label}
        </label>
      )}
      <select
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
        style={{
          ...neoStyles.input,
          width: '100%',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
        onFocus={(e) => {
          e.target.style.boxShadow = neoStyles.inputFocus.boxShadow;
        }}
        onBlur={(e) => {
          e.target.style.boxShadow = 'none';
        }}
      >
        <option value="">{placeholder}</option>
        {channels.map((channel) => (
          <option key={channel.id} value={channel.id}>
            {channel.is_private ? '🔒 ' : '#'}{channel.name}
          </option>
        ))}
      </select>
      {value && valueName && (
        <small style={{ color: '#666', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
          Selected: #{valueName}
        </small>
      )}
    </div>
  );
}
