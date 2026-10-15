'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  ExternalLink,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Clock,
  AlertTriangle,
  HeartHandshake,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { showToast } from '@/components/Toast';

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function formatTimeAgo(dateString?: string) {
  if (!dateString) return '';
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function CitizenHeader() {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const supabase = createClient();

  // Page title mapping
  let pageTitle = 'Citizen Portal';
  let category = 'Overview';
  if (pathname === '/citizen/dashboard') {
    pageTitle = 'Dashboard Overview';
    category = 'Citizen Console';
  } else if (pathname === '/citizen/map') {
    pageTitle = 'Active Disasters Map';
    category = 'Geospatial Intelligence';
  } else if (pathname === '/citizen/report') {
    pageTitle = 'Report a Disaster';
    category = 'Incident Management';
  } else if (pathname === '/citizen/campaigns') {
    pageTitle = 'Relief Campaigns';
    category = 'Crowdfunding';
  } else if (pathname === '/citizen/donations') {
    pageTitle = 'My Donations & Receipts';
    category = 'Financial Transparency';
  } else if (pathname === '/citizen/aid-request') {
    pageTitle = 'Emergency Aid Request';
    category = 'Relief Dispatch';
  } else if (pathname === '/citizen/reports') {
    pageTitle = 'My Incident Reports';
    category = 'Incident History';
  } else if (pathname === '/citizen/chat') {
    pageTitle = 'Coordination Channels';
    category = 'Communications';
  } else if (pathname === '/citizen/settings') {
    pageTitle = 'Account & Preferences';
    category = 'Settings';
  } else if (pathname === '/citizen/notifications') {
    pageTitle = 'Notifications & Alerts';
    category = 'Alert System';
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;

    async function loadNotifications() {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!error && data && mounted) {
          setNotifications(data as NotificationItem[]);
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadNotifications();

    const channel = supabase
      .channel('user-notifications-header')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationItem;
          setNotifications((prev) => [newNotif, ...prev.slice(0, 4)]);
          showToast.info(newNotif.title, newNotif.message);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      showToast.success('Notifications marked as read.');
    } catch (err) {
      console.error(err);
    }
  };

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Citizen';

  return (
    <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur border-b border-surface-border">
      <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        {/* Page Title & Mobile Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/logo.svg"
            alt="CrisisLink"
            width={28}
            height={28}
            className="w-7 h-7 rounded-md lg:hidden shrink-0 shadow-sm"
          />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-ink-muted leading-none mb-0.5">{category}</p>
            <p className="text-sm font-semibold truncate text-ink leading-tight">{pageTitle}</p>
          </div>
        </div>

        {/* Right Actions: Notification Bell + Avatar Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setBellOpen(!bellOpen);
                setUserDropdownOpen(false);
              }}
              className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-danger ring-2 ring-surface animate-pulse" />
              )}
            </button>

            {bellOpen && (
              <div
                className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg bg-surface border border-surface-border shadow-card-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setBellOpen(false)}
              >
                <div className="px-3.5 py-2 border-b border-surface-border flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-ink">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-brand/10 text-brand">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-medium text-brand hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-surface-border">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-ink-muted">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 flex items-start gap-2.5 hover:bg-surface-muted/50 transition ${
                          !item.is_read ? 'bg-brand/5' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-semibold text-ink truncate">{item.title}</p>
                            <span className="text-[10px] text-ink-muted shrink-0">
                              {formatTimeAgo(item.created_at)}
                            </span>
                          </div>
                          <p className="text-[11px] text-ink-muted mt-0.5 line-clamp-2">
                            {item.message}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-3.5 pt-2 border-t border-surface-border text-center">
                  <Link
                    href="/citizen/notifications"
                    onClick={() => setBellOpen(false)}
                    className="text-xs font-medium text-brand hover:underline inline-flex items-center gap-1"
                  >
                    <span>View all notifications</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setUserDropdownOpen(!userDropdownOpen);
                setBellOpen(false);
              }}
              className="flex items-center gap-2.5 p-1.5 rounded-lg border border-surface-border bg-surface hover:bg-surface-muted transition"
            >
              <div className="w-7 h-7 rounded-md bg-brand text-white grid place-items-center text-xs font-semibold shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline-block text-xs font-medium text-ink max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-ink-muted hidden sm:inline-block" />
            </button>

            {userDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-lg bg-surface border border-surface-border shadow-card-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setUserDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 border-b border-surface-border">
                  <p className="text-xs font-semibold text-ink truncate">{displayName}</p>
                  <p className="text-[10px] text-ink-muted truncate">{user?.email}</p>
                </div>

                <div className="py-1">
                  <Link
                    href="/citizen/settings"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink hover:bg-surface-muted transition"
                  >
                    <User className="w-3.5 h-3.5 text-ink-muted" />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    href="/citizen/settings"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink hover:bg-surface-muted transition"
                  >
                    <Settings className="w-3.5 h-3.5 text-ink-muted" />
                    <span>Settings</span>
                  </Link>
                </div>

                <div className="border-t border-surface-border pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      setUserDropdownOpen(false);
                      try {
                        document.cookie = 'cl_role=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
                      } catch {}
                      await signOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-brand-danger hover:bg-brand-danger/10 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
