'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { neoStyles } from '@/lib/neoBrutalismStyles';

interface Conversation {
  id: string;
  name: string;
  type: 'channel' | 'private_channel' | 'dm' | 'group_dm';
  is_private: boolean;
  is_member: boolean;
}

interface SlackUser {
  id: string;
  name: string;
  type: 'user';
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
  placeholder = 'Search channels, DMs, or users...',
  disabled = false,
}: ChannelSelectorProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<SlackUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchConversations = async () => {
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
      
      // Fetch conversations and users
      const response = await fetch('/api/slack/channels');
      if (!response.ok) {
        throw new Error('Failed to fetch channels');
      }
      
      const data = await response.json();
      setConversations(data.conversations || []);
      setUsers(data.users || []);
      setNeedsReconnect(data.needs_reconnect || false);
    } catch (err) {
      console.error('Error fetching channels:', err);
      setError('Failed to load channels');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return { conversations, users };
    }

    return {
      conversations: conversations.filter(c => 
        c.name.toLowerCase().includes(query)
      ),
      users: users.filter(u => 
        u.name.toLowerCase().includes(query)
      ),
    };
  }, [conversations, users, searchQuery]);

  const handleSelect = (id: string, name: string, type: string) => {
    // For users, we need to open a DM conversation first
    if (type === 'user') {
      // The ID is the user ID, we'll use it directly - Slack API accepts user IDs
      // for chat.postMessage to open/send to a DM
      onChange(id, `@${name}`);
    } else {
      const prefix = type === 'channel' ? '#' : 
                    type === 'private_channel' ? '🔒' : 
                    type === 'dm' ? '@' : '👥';
      onChange(id, `${prefix}${name}`);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onChange(null, null);
    setSearchQuery('');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'channel': return '#';
      case 'private_channel': return '🔒';
      case 'dm': return '@';
      case 'group_dm': return '👥';
      case 'user': return '👤';
      default: return '#';
    }
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
    <div ref={containerRef} style={{ position: 'relative' }}>
      {label && (
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', color: '#000000' }}>
          {label}
        </label>
      )}
      
      {needsReconnect && (
        <div style={{
          padding: '0.5rem 0.75rem',
          background: '#FFF3CD',
          border: '2px solid #000000',
          marginBottom: '0.5rem',
          fontSize: '0.75rem',
          fontWeight: '600',
        }}>
          ⚠️ DMs and group messages unavailable. <a href="/settings" style={{ color: '#4ECDC4', fontWeight: '700' }}>Reconnect Slack</a> to enable them.
        </div>
      )}
      
      {/* Selected value display / Search input */}
      <div style={{ position: 'relative' }}>
        {value && valueName && !isOpen ? (
          <div
            onClick={() => !disabled && setIsOpen(true)}
            style={{
              ...neoStyles.input,
              width: '100%',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{valueName}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  lineHeight: 1,
                  padding: '0 0.25rem',
                }}
              >
                ×
              </button>
            )}
          </div>
        ) : (
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={() => !disabled && setIsOpen(true)}
            onFocus={() => !disabled && setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            style={{
              ...neoStyles.input,
              width: '100%',
              cursor: disabled ? 'not-allowed' : 'text',
              opacity: disabled ? 0.6 : 1,
            }}
          />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: '300px',
            overflowY: 'auto',
            background: '#FFFFFF',
            border: '3px solid #000000',
            boxShadow: '4px 4px 0px 0px #000000',
            zIndex: 9999,
            marginTop: '4px',
          }}
        >
          {/* Channels Section */}
          {filteredItems.conversations.filter(c => c.type === 'channel').length > 0 && (
            <>
              <div style={{ padding: '0.5rem 0.75rem', fontWeight: '700', fontSize: '0.75rem', background: '#F3F4F6', borderBottom: '1px solid #000000' }}>
                CHANNELS
              </div>
              {filteredItems.conversations.filter(c => c.type === 'channel').map(conv => (
                <div
                  key={conv.id}
                  onClick={() => handleSelect(conv.id, conv.name, conv.type)}
                  style={{
                    padding: '0.75rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid #E5E5E5',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                >
                  <span style={{ opacity: 0.6 }}>{getTypeIcon(conv.type)}</span>
                  <span>{conv.name}</span>
                </div>
              ))}
            </>
          )}

          {/* Private Channels Section */}
          {filteredItems.conversations.filter(c => c.type === 'private_channel').length > 0 && (
            <>
              <div style={{ padding: '0.5rem 0.75rem', fontWeight: '700', fontSize: '0.75rem', background: '#F3F4F6', borderBottom: '1px solid #000000' }}>
                PRIVATE CHANNELS
              </div>
              {filteredItems.conversations.filter(c => c.type === 'private_channel').map(conv => (
                <div
                  key={conv.id}
                  onClick={() => handleSelect(conv.id, conv.name, conv.type)}
                  style={{
                    padding: '0.75rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid #E5E5E5',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                >
                  <span style={{ opacity: 0.6 }}>{getTypeIcon(conv.type)}</span>
                  <span>{conv.name}</span>
                </div>
              ))}
            </>
          )}

          {/* Direct Messages Section */}
          {filteredItems.conversations.filter(c => c.type === 'dm').length > 0 && (
            <>
              <div style={{ padding: '0.5rem 0.75rem', fontWeight: '700', fontSize: '0.75rem', background: '#F3F4F6', borderBottom: '1px solid #000000' }}>
                DIRECT MESSAGES
              </div>
              {filteredItems.conversations.filter(c => c.type === 'dm').map(conv => (
                <div
                  key={conv.id}
                  onClick={() => handleSelect(conv.id, conv.name, conv.type)}
                  style={{
                    padding: '0.75rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid #E5E5E5',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                >
                  <span style={{ opacity: 0.6 }}>{getTypeIcon(conv.type)}</span>
                  <span>{conv.name}</span>
                </div>
              ))}
            </>
          )}

          {/* Group DMs Section */}
          {filteredItems.conversations.filter(c => c.type === 'group_dm').length > 0 && (
            <>
              <div style={{ padding: '0.5rem 0.75rem', fontWeight: '700', fontSize: '0.75rem', background: '#F3F4F6', borderBottom: '1px solid #000000' }}>
                GROUP MESSAGES
              </div>
              {filteredItems.conversations.filter(c => c.type === 'group_dm').map(conv => (
                <div
                  key={conv.id}
                  onClick={() => handleSelect(conv.id, conv.name, conv.type)}
                  style={{
                    padding: '0.75rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid #E5E5E5',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                >
                  <span style={{ opacity: 0.6 }}>{getTypeIcon(conv.type)}</span>
                  <span>{conv.name}</span>
                </div>
              ))}
            </>
          )}

          {/* Users Section (for sending DMs) */}
          {filteredItems.users.length > 0 && (
            <>
              <div style={{ padding: '0.5rem 0.75rem', fontWeight: '700', fontSize: '0.75rem', background: '#F3F4F6', borderBottom: '1px solid #000000' }}>
                SEND DM TO USER
              </div>
              {filteredItems.users.slice(0, 20).map(user => (
                <div
                  key={user.id}
                  onClick={() => handleSelect(user.id, user.name, user.type)}
                  style={{
                    padding: '0.75rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid #E5E5E5',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                >
                  <span style={{ opacity: 0.6 }}>{getTypeIcon(user.type)}</span>
                  <span>{user.name}</span>
                </div>
              ))}
              {filteredItems.users.length > 20 && (
                <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: '#666', textAlign: 'center' }}>
                  Type to search for more users...
                </div>
              )}
            </>
          )}

          {/* No results */}
          {filteredItems.conversations.length === 0 && filteredItems.users.length === 0 && (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
              No channels or users found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
