'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Hash,
  RefreshCw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showToast } from '@/components/Toast';

interface ChatChannel {
  id: string;
  name: string;
  description: string | null;
  type: string;
}

interface MessageItem {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  type: string;
  created_at: string;
  sender_name?: string;
  sender_role?: string;
}

function formatMessageTime(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function CitizenChatPage() {
  const { user, profile } = useAuth();
  const supabase = createClient();

  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Load real chat channels from DB
  useEffect(() => {
    async function loadChannels() {
      setLoadingChannels(true);
      try {
        const { data, error } = await supabase
          .from('chats')
          .select('id, name, description, type')
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          setChannels(data as ChatChannel[]);
          setActiveChannelId(data[0].id);
        }
      } catch (err) {
        console.error('Error loading channels:', err);
      } finally {
        setLoadingChannels(false);
      }
    }
    loadChannels();
  }, []);

  // 2. Load real messages when active channel changes
  useEffect(() => {
    if (!activeChannelId) return;
    let isMounted = true;

    async function loadMessages() {
      setLoadingMessages(true);
      try {
        const { data: rawMessages, error } = await supabase
          .from('messages')
          .select('id, chat_id, sender_id, content, type, created_at')
          .eq('chat_id', activeChannelId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) throw error;

        // Fetch sender profiles for sender names
        const senderIds = Array.from(
          new Set((rawMessages || []).map((m) => m.sender_id).filter(Boolean))
        );

        let profileMap = new Map<string, { name: string; role: string }>();
        if (senderIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, name, role')
            .in('user_id', senderIds);

          profileMap = new Map(
            (profiles || []).map((p) => [p.user_id, { name: p.name, role: p.role }])
          );
        }

        if (isMounted) {
          const formatted: MessageItem[] = (rawMessages || []).map((m) => ({
            ...m,
            sender_name: profileMap.get(m.sender_id)?.name || 'Citizen',
            sender_role: profileMap.get(m.sender_id)?.role || 'citizen',
          }));
          setMessages(formatted);
        }
      } catch (err) {
        console.error('Error loading messages:', err);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    }

    loadMessages();

    // 3. Realtime subscription to new messages in this channel
    const channelSub = supabase
      .channel(`chat-room-${activeChannelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${activeChannelId}`,
        },
        async (payload) => {
          const newMsg = payload.new as MessageItem;
          // Fetch sender name
          const { data: senderProf } = await supabase
            .from('profiles')
            .select('name, role')
            .eq('user_id', newMsg.sender_id)
            .maybeSingle();

          setMessages((prev) => [
            ...prev,
            {
              ...newMsg,
              sender_name: senderProf?.name || 'Citizen',
              sender_role: senderProf?.role || 'citizen',
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channelSub);
    };
  }, [activeChannelId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message to real database
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user?.id || !activeChannelId) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: activeChannelId,
          sender_id: user.id,
          content: textToSend,
          type: 'text',
          status: 'sent',
        })
        .select()
        .single();

      if (error) {
        showToast.error('Failed to send message', error.message);
      }
    } catch (err: any) {
      showToast.error('Send error', err.message);
    } finally {
      setSending(false);
    }
  };

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-ink tracking-tight">
          Citizen Coordination Channels
        </h1>
        <p className="text-xs text-ink-muted">
          Real-time communications between citizens, regional responders, and field coordinators.
        </p>
      </div>

      {/* Chat Layout Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 rounded-lg border border-surface-border shadow-card bg-surface overflow-hidden h-[calc(100vh-210px)] min-h-[550px]">
        {/* CHANNELS SIDEBAR (4 cols) */}
        <div className="lg:col-span-4 border-r border-surface-border flex flex-col bg-surface-muted/40">
          <div className="p-3.5 border-b border-surface-border">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Live Channels
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingChannels ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-surface rounded-md animate-pulse" />
                ))}
              </div>
            ) : channels.length === 0 ? (
              <p className="p-4 text-xs text-ink-muted text-center">No active channels found.</p>
            ) : (
              channels.map((chan) => {
                const isActive = chan.id === activeChannelId;
                return (
                  <button
                    key={chan.id}
                    type="button"
                    onClick={() => setActiveChannelId(chan.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition flex items-center gap-2.5 ${
                      isActive
                        ? 'bg-brand text-white font-semibold shadow-xs'
                        : 'text-ink-muted hover:text-ink hover:bg-surface'
                    }`}
                  >
                    <Hash className="w-4 h-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{chan.name}</p>
                      {chan.description && (
                        <p
                          className={`text-[10px] truncate ${
                            isActive ? 'text-white/80' : 'text-ink-muted'
                          }`}
                        >
                          {chan.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* MESSAGES THREAD (8 cols) */}
        <div className="lg:col-span-8 flex flex-col h-full bg-surface">
          {/* Thread Header */}
          <div className="p-3.5 border-b border-surface-border flex items-center justify-between bg-surface-muted/30">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-brand" />
              <div>
                <h3 className="text-xs font-bold text-ink">{activeChannel?.name || 'Channel'}</h3>
                {activeChannel?.description && (
                  <p className="text-[11px] text-ink-muted">{activeChannel.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-brand bg-brand/10 px-2 py-0.5 rounded-md font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
              <span>Realtime</span>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-muted/20">
            {loadingMessages ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-surface rounded-lg animate-pulse" />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
                <MessageSquare className="w-8 h-8 text-ink-muted opacity-40" />
                <p className="text-xs font-medium text-ink">No messages in this channel yet</p>
                <p className="text-[11px] text-ink-muted max-w-xs">
                  Be the first to share an update or coordinate relief assistance.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender_id === user?.id;
                const isCoordinator = m.sender_role === 'volunteer' || m.sender_role === 'admin';

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] text-ink-muted">
                      <span className="font-semibold text-ink">{isMe ? 'You' : m.sender_name}</span>
                      {isCoordinator && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-brand/10 text-brand">
                          {m.sender_role}
                        </span>
                      )}
                      <span>•</span>
                      <span>{formatMessageTime(m.created_at)}</span>
                    </div>

                    <div
                      className={`max-w-md p-3 rounded-lg text-xs leading-relaxed ${
                        isMe
                          ? 'bg-brand text-white shadow-xs'
                          : 'bg-surface border border-surface-border text-ink shadow-xs'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Box */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-surface-border bg-surface flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${activeChannel?.name || 'channel'}...`}
              className="flex-1 px-3.5 py-2 rounded-lg border border-surface-border bg-surface text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              className="px-4 py-2 rounded-lg bg-brand hover:bg-brand/90 text-white text-xs font-medium transition shadow-card flex items-center gap-1.5 disabled:opacity-50"
            >
              {sending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
