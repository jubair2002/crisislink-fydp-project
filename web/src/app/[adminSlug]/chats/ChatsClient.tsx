'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { Megaphone, MessageSquare, Pencil, Radio, Trash2 } from 'lucide-react';
import {
  deleteBroadcastAction,
  sendBroadcastAction,
  updateBroadcastAction,
} from '../_actions/adminActions';
import { AdminModal } from '../_components/AdminModal';
import type { BroadcastAdminRow, BroadcastTargetType, CampaignRow, ChatMonitorRow } from '@/types/admin';

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function targetLabel(t: BroadcastTargetType, campaignId: string | null) {
  if (t === 'all') return 'All users';
  if (t === 'volunteers') return 'All volunteers';
  if (t === 'campaign') return campaignId ? `Campaign ${campaignId.slice(0, 8)}…` : 'Campaign';
  return t;
}

export default function ChatsClient({
  broadcasts,
  chats,
  campaigns,
}: {
  broadcasts: BroadcastAdminRow[];
  chats: ChatMonitorRow[];
  campaigns: CampaignRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sendOpen, setSendOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BroadcastAdminRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BroadcastAdminRow | null>(null);
  const [form, setForm] = useState({
    target_type: 'all' as BroadcastTargetType,
    title: '',
    message: '',
    target_campaign_id: '',
  });
  const [editForm, setEditForm] = useState({ title: '', message: '' });

  const run = (fn: () => Promise<void>, success = 'Saved') => {
    startTransition(async () => {
      try {
        await fn();
        toast.success(success);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Request failed');
      }
    });
  };

  const handleSend = () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required.');
      return;
    }
    if (form.target_type === 'campaign' && !form.target_campaign_id) {
      toast.error('Select a campaign.');
      return;
    }
    run(async () => {
      await sendBroadcastAction({
        target_type: form.target_type,
        title: form.title.trim(),
        message: form.message.trim(),
        target_campaign_id:
          form.target_type === 'campaign' ? form.target_campaign_id : null,
      });
      setSendOpen(false);
      setForm({ target_type: 'all', title: '', message: '', target_campaign_id: '' });
    }, 'Broadcast sent');
  };

  const openEdit = (b: BroadcastAdminRow) => {
    setEditTarget(b);
    setEditForm({ title: b.title, message: b.message });
  };

  const handleEdit = () => {
    if (!editTarget) return;
    if (!editForm.title.trim() || !editForm.message.trim()) {
      toast.error('Title and message are required.');
      return;
    }
    run(async () => {
      await updateBroadcastAction({
        id: editTarget.id,
        title: editForm.title.trim(),
        message: editForm.message.trim(),
      });
      setEditTarget(null);
    }, 'Broadcast updated');
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    run(async () => {
      await deleteBroadcastAction(deleteTarget.id);
      setDeleteTarget(null);
    }, 'Broadcast deleted');
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chat Monitoring</h1>
          <p className="text-sm text-ink-muted mt-1">
            Send admin broadcasts, monitor active rooms, and review announcement history.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={pending}
          onClick={() => setSendOpen(true)}
        >
          <Megaphone className="w-4 h-4" />
          Send broadcast
        </button>
      </header>

      <section className="rounded-xl border border-surface-border bg-surface shadow-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-surface-border px-4 py-3">
          <Radio className="w-4 h-4 text-brand" />
          <h2 className="text-sm font-semibold">Recent broadcasts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted/50 text-left text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Sent</th>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Audience</th>
                <th className="px-4 py-2 font-medium">Recipients</th>
                <th className="px-4 py-2 font-medium">Preview</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                    No broadcasts sent yet.
                  </td>
                </tr>
              ) : (
                broadcasts.map((b) => (
                  <tr key={b.id} className="border-t border-surface-border">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-ink-muted">
                      {formatWhen(b.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium">{b.title}</td>
                    <td className="px-4 py-3">{targetLabel(b.target_type, b.target_campaign_id)}</td>
                    <td className="px-4 py-3">{b.recipient_count ?? '—'}</td>
                    <td className="px-4 py-3 max-w-xs truncate text-ink-muted">{b.message}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-surface-border px-2.5 py-1.5 text-xs hover:bg-surface-muted/60 disabled:opacity-50"
                          disabled={pending}
                          onClick={() => openEdit(b)}
                          title="Edit broadcast"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-1.5 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                          disabled={pending}
                          onClick={() => setDeleteTarget(b)}
                          title="Delete broadcast"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-surface shadow-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-surface-border px-4 py-3">
          <MessageSquare className="w-4 h-4 text-brand" />
          <h2 className="text-sm font-semibold">Active chat rooms</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted/50 text-left text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Room</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Members</th>
                <th className="px-4 py-2 font-medium">Last activity</th>
                <th className="px-4 py-2 font-medium">Last message</th>
              </tr>
            </thead>
            <tbody>
              {chats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-muted">
                    No chat rooms found.
                  </td>
                </tr>
              ) : (
                chats.map((c) => (
                  <tr key={c.id} className="border-t border-surface-border">
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.name}</div>
                      {c.description ? (
                        <div className="text-xs text-ink-muted truncate max-w-[200px]">{c.description}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 capitalize">{c.type}</td>
                    <td className="px-4 py-3">{c.member_count}</td>
                    <td className="px-4 py-3 text-xs text-ink-muted whitespace-nowrap">
                      {c.last_message_at ? formatWhen(c.last_message_at) : '—'}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-ink-muted">
                      {c.last_message_preview ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AdminModal open={sendOpen} onClose={() => setSendOpen(false)} title="Send broadcast">
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Delivers a push-style notification to the mobile app and posts to #announcements.
          </p>
          <div>
            <label className="text-xs font-medium text-ink-muted">Audience</label>
            <select
              className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              value={form.target_type}
              onChange={(e) =>
                setForm((f) => ({ ...f, target_type: e.target.value as BroadcastTargetType }))
              }
            >
              <option value="all">All users</option>
              <option value="volunteers">All volunteers</option>
              <option value="campaign">Specific campaign</option>
            </select>
          </div>
          {form.target_type === 'campaign' ? (
            <div>
              <label className="text-xs font-medium text-ink-muted">Campaign</label>
              <select
                className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
                value={form.target_campaign_id}
                onChange={(e) => setForm((f) => ({ ...f, target_campaign_id: e.target.value }))}
              >
                <option value="">Select campaign…</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label className="text-xs font-medium text-ink-muted">Title</label>
            <input
              className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Emergency update"
              maxLength={120}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">Message</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm min-h-[120px]"
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="Your announcement to the field teams…"
              maxLength={2000}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-lg border border-surface-border px-4 py-2 text-sm"
              onClick={() => setSendOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              onClick={handleSend}
            >
              {pending ? 'Sending…' : 'Send broadcast'}
            </button>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit broadcast"
      >
        {editTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">
              Updates the notification on all recipient devices and the #announcements post.
              Audience ({targetLabel(editTarget.target_type, editTarget.target_campaign_id)}) cannot be changed.
            </p>
            <div>
              <label className="text-xs font-medium text-ink-muted">Title</label>
              <input
                className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                maxLength={120}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-muted">Message</label>
              <textarea
                className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm min-h-[120px]"
                value={editForm.message}
                onChange={(e) => setEditForm((f) => ({ ...f, message: e.target.value }))}
                maxLength={2000}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="rounded-lg border border-surface-border px-4 py-2 text-sm"
                onClick={() => setEditTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                onClick={handleEdit}
              >
                {pending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        ) : null}
      </AdminModal>

      <AdminModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete broadcast"
      >
        {deleteTarget ? (
          <div className="space-y-3 text-sm">
            <p className="text-ink-muted">
              Removes this broadcast from the admin history, deletes all related mobile notifications,
              and removes the #announcements post.
            </p>
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-900">
              <p className="font-medium">{deleteTarget.title}</p>
              <p className="text-xs mt-1 line-clamp-3">{deleteTarget.message}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-surface-border px-4 py-2 text-sm"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={pending}
                onClick={handleDelete}
              >
                Delete permanently
              </button>
            </div>
          </div>
        ) : null}
      </AdminModal>
    </div>
  );
}
