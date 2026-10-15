'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Clock,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showToast } from '@/components/Toast';

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function formatTimeAgo(dateString?: string) {
  if (!dateString) return 'recently';
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function CitizenNotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'disasters' | 'donations'>('all');

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;

    async function loadNotifications() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false });

        if (!error && data && isMounted) {
          setNotifications(data as NotificationRow[]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadNotifications();

    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationRow;
          setNotifications((prev) => [newNotif, ...prev]);
          toast.success(newNotif.title, { position: 'top-right' });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (!error) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        showToast.success('All notifications marked as read.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif: NotificationRow) => {
    if (!notif.is_read) {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notif.id);

        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      } catch (err) {
        console.error(err);
      }
    }

    const t = (notif.type || '').toLowerCase();
    const m = (notif.message || '').toLowerCase();

    if (t.includes('disaster') || m.includes('disaster')) {
      router.push('/citizen/map');
    } else if (t.includes('donation') || m.includes('donation')) {
      router.push('/citizen/donations');
    } else if (t.includes('aid') || m.includes('aid')) {
      router.push('/citizen/aid-request');
    } else {
      router.push('/citizen/dashboard');
    }
  };

  const filtered = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.is_read;
    if (activeTab === 'disasters') {
      const t = (n.type || '').toLowerCase();
      const m = (n.message || '').toLowerCase();
      return t.includes('disaster') || m.includes('disaster');
    }
    if (activeTab === 'donations') {
      const t = (n.type || '').toLowerCase();
      const m = (n.message || '').toLowerCase();
      return t.includes('donation') || m.includes('donation');
    }
    return true;
  });

  const unreadTotal = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight">Notifications & Alerts</h1>
          <p className="text-xs text-ink-muted">
            Emergency broadcasts, aid dispatch notices, and donation receipts.
          </p>
        </div>

        {unreadTotal > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="px-3.5 py-2 rounded-lg border border-surface-border bg-surface hover:bg-surface-muted text-xs font-medium text-ink transition shadow-card flex items-center gap-1.5 self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-brand" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-surface-border pb-2">
        {[
          { key: 'all', label: 'All', count: notifications.length },
          { key: 'unread', label: 'Unread', count: unreadTotal },
          {
            key: 'disasters',
            label: 'Disasters',
            count: notifications.filter((n) => (n.type || '').includes('disaster')).length,
          },
          {
            key: 'donations',
            label: 'Donations',
            count: notifications.filter((n) => (n.type || '').includes('donation')).length,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'bg-brand text-white shadow-xs'
                : 'text-ink-muted hover:text-ink hover:bg-surface-muted'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-surface-muted text-ink-muted'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-surface border border-surface-border animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-ink-muted bg-surface rounded-lg border border-surface-border">
            {activeTab === 'unread' ? "You're all caught up!" : 'No notifications found.'}
          </div>
        ) : (
          filtered.map((n) => {
            const isUnread = !n.is_read;
            return (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3.5 rounded-lg border transition cursor-pointer flex items-start justify-between gap-3 ${
                  isUnread
                    ? 'bg-surface border-l-4 border-l-brand border-surface-border shadow-card'
                    : 'bg-surface-muted/60 border-l-4 border-l-transparent border-surface-border text-ink-muted hover:bg-surface'
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs font-bold ${isUnread ? 'text-ink' : 'text-ink-muted'}`}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-ink-muted shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(n.created_at)}
                    </span>
                  </div>
                  <p className={`text-xs ${isUnread ? 'text-ink' : 'text-ink-muted'}`}>{n.message}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-ink-muted shrink-0 self-center" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
