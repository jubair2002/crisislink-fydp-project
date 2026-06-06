'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import {
  addCampaignUpdateAction,
  updateCampaignAction,
  updateCampaignStatusAction,
  upsertCampaignResourceAction,
} from '../../_actions/adminActions';
import { buildNavHref } from '@/lib/nav';
import type { CampaignDetailPayload } from '@/types/admin';

export default function CampaignDetailClient({
  slug,
  data,
}: {
  slug: string;
  data: CampaignDetailPayload;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { campaign, updates, resources, donations, disaster } = data;

  const [updateForm, setUpdateForm] = useState({ title: '', description: '', media_url: '' });
  const [resourceForm, setResourceForm] = useState({
    resource_type: '',
    quantity_pledged: '',
    quantity_purchased: '',
    purchase_amount: '',
    quantity_distributed: '',
  });

  const run = (fn: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await fn();
        toast.success('Saved');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Request failed');
      }
    });
  };

  const target = Math.max(1, Number(campaign.target_amount ?? 1));
  const pct = Math.min(100, Math.round((Number(campaign.collected_amount ?? 0) / target) * 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={buildNavHref(slug, '/campaigns')} className="text-sm text-brand">
          ← Campaigns
        </Link>
      </div>

      <header className="rounded-xl border border-surface-border bg-surface shadow-card p-5">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{campaign.title}</h1>
            <p className="text-sm text-ink-muted mt-1">{campaign.location ?? 'Nationwide'}</p>
            {disaster && (
              <p className="text-xs text-ink-muted mt-1">
                Linked disaster: {disaster.disaster_type} · {disaster.location_label}
              </p>
            )}
          </div>
          <select
            className="rounded-lg border border-surface-border px-3 py-2 text-sm capitalize h-fit"
            value={campaign.status ?? 'active'}
            onChange={(e) => run(() => updateCampaignStatusAction(campaign.id, e.target.value))}
            disabled={pending}
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>{pct}% funded</span>
            <span>
              ৳{Number(campaign.collected_amount ?? 0).toLocaleString()} / ৳
              {Number(campaign.target_amount ?? 0).toLocaleString()}
            </span>
          </div>
          <div className="h-3 rounded-full bg-surface-muted overflow-hidden">
            <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {campaign.description && <p className="mt-4 text-sm text-ink-muted leading-relaxed">{campaign.description}</p>}
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-surface-border bg-surface shadow-card p-5 space-y-4">
          <h2 className="font-semibold">Post campaign update</h2>
          <input
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
            placeholder="Update title"
            value={updateForm.title}
            onChange={(e) => setUpdateForm((f) => ({ ...f, title: e.target.value }))}
          />
          <textarea
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm min-h-[80px]"
            placeholder="Update description"
            value={updateForm.description}
            onChange={(e) => setUpdateForm((f) => ({ ...f, description: e.target.value }))}
          />
          <input
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
            placeholder="Image URL (optional)"
            value={updateForm.media_url}
            onChange={(e) => setUpdateForm((f) => ({ ...f, media_url: e.target.value }))}
          />
          <button
            type="button"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={pending || !updateForm.title.trim()}
            onClick={() =>
              run(async () => {
                await addCampaignUpdateAction(campaign.id, updateForm);
                setUpdateForm({ title: '', description: '', media_url: '' });
              })
            }
          >
            Publish update
          </button>

          <div className="border-t border-surface-border pt-4 space-y-3">
            <h3 className="text-sm font-semibold">Timeline</h3>
            {updates.length === 0 && <p className="text-sm text-ink-muted">No updates yet.</p>}
            {updates.map((u) => (
              <div key={u.id} className="rounded-lg border border-surface-border p-3">
                <div className="font-medium text-sm">{u.title}</div>
                <div className="text-xs text-ink-muted">
                  {u.created_at ? new Date(u.created_at).toLocaleString() : '—'}
                </div>
                {u.description && <p className="text-sm mt-2 text-ink-muted">{u.description}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-surface-border bg-surface shadow-card p-5 space-y-4">
          <h2 className="font-semibold">Resource transparency</h2>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="col-span-2 rounded-lg border border-surface-border px-3 py-2 text-sm"
              placeholder="Resource type (e.g. Rice bags)"
              value={resourceForm.resource_type}
              onChange={(e) => setResourceForm((f) => ({ ...f, resource_type: e.target.value }))}
            />
            <input
              className="rounded-lg border border-surface-border px-3 py-2 text-sm"
              placeholder="Pledged qty"
              value={resourceForm.quantity_pledged}
              onChange={(e) => setResourceForm((f) => ({ ...f, quantity_pledged: e.target.value }))}
            />
            <input
              className="rounded-lg border border-surface-border px-3 py-2 text-sm"
              placeholder="Purchased qty"
              value={resourceForm.quantity_purchased}
              onChange={(e) => setResourceForm((f) => ({ ...f, quantity_purchased: e.target.value }))}
            />
            <input
              className="rounded-lg border border-surface-border px-3 py-2 text-sm"
              placeholder="Purchase amount"
              value={resourceForm.purchase_amount}
              onChange={(e) => setResourceForm((f) => ({ ...f, purchase_amount: e.target.value }))}
            />
            <input
              className="rounded-lg border border-surface-border px-3 py-2 text-sm"
              placeholder="Distributed qty"
              value={resourceForm.quantity_distributed}
              onChange={(e) => setResourceForm((f) => ({ ...f, quantity_distributed: e.target.value }))}
            />
          </div>
          <button
            type="button"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={pending || !resourceForm.resource_type.trim()}
            onClick={() =>
              run(async () => {
                await upsertCampaignResourceAction(campaign.id, {
                  resource_type: resourceForm.resource_type,
                  quantity_pledged: Number(resourceForm.quantity_pledged) || 0,
                  quantity_purchased: Number(resourceForm.quantity_purchased) || 0,
                  purchase_amount: Number(resourceForm.purchase_amount) || 0,
                  quantity_distributed: Number(resourceForm.quantity_distributed) || 0,
                });
                setResourceForm({
                  resource_type: '',
                  quantity_pledged: '',
                  quantity_purchased: '',
                  purchase_amount: '',
                  quantity_distributed: '',
                });
              })
            }
          >
            Add resource
          </button>

          <div className="border-t border-surface-border pt-4 space-y-2">
            {resources.map((r) => (
              <div key={r.id} className="text-sm rounded-lg border border-surface-border p-3">
                <div className="font-medium">{r.resource_type}</div>
                <div className="text-xs text-ink-muted mt-1">
                  Pledged {r.quantity_pledged} · Purchased {r.quantity_purchased} · Distributed{' '}
                  {r.quantity_distributed} · ৳{Number(r.purchase_amount).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-surface-border bg-surface shadow-card p-5">
        <h2 className="font-semibold mb-3">Recent donations</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-ink-muted">
              <tr>
                <th className="py-2">Code</th>
                <th className="py-2">Donor</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
                <th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {donations.map((d) => (
                <tr key={d.id}>
                  <td className="py-2 font-mono text-xs">{d.donation_code ?? '—'}</td>
                  <td className="py-2">{d.anonymous ? 'Anonymous' : d.donor_name}</td>
                  <td className="py-2">৳{Number(d.amount).toLocaleString()}</td>
                  <td className="py-2 capitalize">{d.payment_status}</td>
                  <td className="py-2">{d.created_at ? new Date(d.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {donations.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-ink-muted">
                    No donations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Link href={buildNavHref(slug, '/donations')} className="inline-block mt-3 text-sm text-brand">
          View all donations →
        </Link>
      </section>
    </div>
  );
}
