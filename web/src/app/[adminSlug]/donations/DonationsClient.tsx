'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import {
  addDonationTrackingAction,
  bulkAllocateCampaignFundsAction,
  getCampaignFundSummaryAction,
} from '../_actions/adminActions';
import { AdminModal } from '../_components/AdminModal';
import { buildNavHref } from '@/lib/nav';
import type { CampaignFundSummary, CampaignRow, DonationAdminRow, DonationFilters } from '@/types/admin';

const BULK_PRESETS = [10_000, 25_000, 50_000, 100_000] as const;

function formatBdt(value: number) {
  return `৳${Math.round(value).toLocaleString()}`;
}

function buildQuery(slug: string, filters: DonationFilters) {
  const p = new URLSearchParams();
  if (filters.status) p.set('status', filters.status);
  if (filters.campaignId) p.set('campaign', filters.campaignId);
  if (filters.dateFrom) p.set('from', filters.dateFrom);
  if (filters.dateTo) p.set('to', filters.dateTo);
  const qs = p.toString();
  const path = buildNavHref(slug, '/donations');
  return qs ? `${path}?${qs}` : path;
}

export default function DonationsClient({
  slug,
  rows,
  campaigns,
  filters,
}: {
  slug: string;
  rows: DonationAdminRow[];
  campaigns: CampaignRow[];
  filters: DonationFilters;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [summaryPending, startSummaryTransition] = useTransition();
  const [trackingTarget, setTrackingTarget] = useState<DonationAdminRow | null>(null);
  const [trackingForm, setTrackingForm] = useState({
    status: 'Allocated',
    description: '',
    proof_url: '',
    amount: '',
  });
  const [draft, setDraft] = useState({
    status: filters.status ?? '',
    from: filters.dateFrom ?? '',
    to: filters.dateTo ?? '',
  });

  const [bulkCampaignId, setBulkCampaignId] = useState(filters.campaignId ?? campaigns[0]?.id ?? '');
  const [bulkSummary, setBulkSummary] = useState<CampaignFundSummary | null>(null);
  const [bulkForm, setBulkForm] = useState({
    amount: '',
    status: 'Allocated',
    description: '',
    proof_url: '',
  });

  const applyHref = useMemo(
    () =>
      buildQuery(slug, {
        status: draft.status || undefined,
        dateFrom: draft.from || undefined,
        dateTo: draft.to || undefined,
      }),
    [draft, slug],
  );

  const run = (fn: () => Promise<void>, successMessage = 'Saved') => {
    startTransition(async () => {
      try {
        await fn();
        toast.success(successMessage);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Request failed');
      }
    });
  };

  const refreshSummary = (campaignId: string) => {
    if (!campaignId) {
      setBulkSummary(null);
      return;
    }
    startSummaryTransition(async () => {
      try {
        const summary = await getCampaignFundSummaryAction(campaignId);
        setBulkSummary(summary);
      } catch (e) {
        setBulkSummary(null);
        toast.error(e instanceof Error ? e.message : 'Could not load campaign fund summary');
      }
    });
  };

  useEffect(() => {
    refreshSummary(bulkCampaignId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkCampaignId]);

  const bulkAmount = Number(bulkForm.amount.replace(/,/g, '')) || 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Donation Tracking</h1>
        <p className="text-sm text-ink-muted mt-1">Audit donations and allocate campaign funds in bulk.</p>
      </header>

      <section className="rounded-xl border border-surface-border bg-surface shadow-card p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-base">Bulk fund allocation</h2>
          <p className="text-sm text-ink-muted mt-1">
            Allocate a lump sum to a campaign in one step. Funds are applied across paid donations
            oldest-first.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-ink-muted">Campaign</span>
            <select
              className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              value={bulkCampaignId}
              onChange={(e) => setBulkCampaignId(e.target.value)}
            >
              <option value="">Select campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                  {c.status ? ` (${c.status})` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-ink-muted">Allocation status</span>
            <select
              className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              value={bulkForm.status}
              onChange={(e) => setBulkForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="Allocated">Allocated</option>
              <option value="Used">Used</option>
            </select>
          </label>
        </div>

        {summaryPending && bulkCampaignId ? (
          <p className="text-sm text-ink-muted">Loading fund summary…</p>
        ) : bulkSummary ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-surface-border bg-surface-muted/40 p-3">
              <div className="text-xs uppercase tracking-wide text-ink-muted">Collected</div>
              <div className="text-lg font-bold mt-1">{formatBdt(bulkSummary.collected)}</div>
            </div>
            <div className="rounded-lg border border-surface-border bg-surface-muted/40 p-3">
              <div className="text-xs uppercase tracking-wide text-ink-muted">Already allocated</div>
              <div className="text-lg font-bold mt-1">{formatBdt(bulkSummary.allocated)}</div>
            </div>
            <div className="rounded-lg border border-brand/30 bg-brand/5 p-3">
              <div className="text-xs uppercase tracking-wide text-brand">Available</div>
              <div className="text-lg font-bold mt-1 text-brand">{formatBdt(bulkSummary.available)}</div>
            </div>
          </div>
        ) : bulkCampaignId ? (
          <p className="text-sm text-ink-muted">No paid donations yet for this campaign.</p>
        ) : null}

        <div>
          <span className="text-sm font-medium text-ink-muted">Amount to allocate</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {BULK_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  bulkAmount === preset
                    ? 'border-brand bg-brand text-white'
                    : 'border-surface-border bg-surface hover:border-brand/40'
                }`}
                onClick={() => setBulkForm((f) => ({ ...f, amount: String(preset) }))}
              >
                {formatBdt(preset)}
              </button>
            ))}
            {bulkSummary && bulkSummary.available > 0 ? (
              <button
                type="button"
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  bulkAmount === bulkSummary.available
                    ? 'border-brand bg-brand text-white'
                    : 'border-surface-border bg-surface hover:border-brand/40'
                }`}
                onClick={() =>
                  setBulkForm((f) => ({ ...f, amount: String(Math.round(bulkSummary.available)) }))
                }
              >
                All available
              </button>
            ) : null}
          </div>
          <input
            type="number"
            min={1}
            className="mt-3 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
            placeholder="Custom amount (e.g. 50000)"
            value={bulkForm.amount}
            onChange={(e) => setBulkForm((f) => ({ ...f, amount: e.target.value }))}
          />
        </div>

        <textarea
          className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm min-h-[72px]"
          placeholder="Description (optional) — e.g. Rice & medicine procurement for Sylhet"
          value={bulkForm.description}
          onChange={(e) => setBulkForm((f) => ({ ...f, description: e.target.value }))}
        />
        <input
          className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
          placeholder="Proof image URL (optional)"
          value={bulkForm.proof_url}
          onChange={(e) => setBulkForm((f) => ({ ...f, proof_url: e.target.value }))}
        />

        <button
          type="button"
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          disabled={
            pending ||
            !bulkCampaignId ||
            !bulkSummary ||
            bulkSummary.available <= 0 ||
            bulkAmount <= 0 ||
            bulkAmount > bulkSummary.available
          }
          onClick={() => {
            startTransition(async () => {
              try {
                const result = await bulkAllocateCampaignFundsAction(bulkCampaignId, {
                  amount: bulkAmount,
                  status: bulkForm.status,
                  description: bulkForm.description || undefined,
                  proof_url: bulkForm.proof_url || null,
                });
                setBulkForm((f) => ({ ...f, amount: '', description: '', proof_url: '' }));
                refreshSummary(bulkCampaignId);
                toast.success(
                  `Allocated ${formatBdt(result.amountAllocated)} across ${result.entriesCreated} donation${result.entriesCreated === 1 ? '' : 's'}.`,
                );
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Request failed');
              }
            });
          }}
        >
          Allocate {bulkAmount > 0 ? formatBdt(bulkAmount) : 'funds'}
        </button>
      </section>

      <div className="rounded-xl border border-surface-border bg-surface shadow-card p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <select
            className="rounded-lg border border-surface-border px-3 py-2 text-sm"
            value={draft.status}
            onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
          >
            <option value="">All payment statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <input
            type="date"
            className="rounded-lg border border-surface-border px-3 py-2 text-sm"
            value={draft.from}
            onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
          />
          <input
            type="date"
            className="rounded-lg border border-surface-border px-3 py-2 text-sm"
            value={draft.to}
            onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <Link href={applyHref} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
            Apply
          </Link>
          <Link href={buildNavHref(slug, '/donations')} className="rounded-lg border border-surface-border px-4 py-2 text-sm font-medium">
            Reset
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm text-left">
            <thead className="bg-surface-muted text-ink-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 font-medium">Tracking ID</th>
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Donor</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Transaction</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-muted/60 align-top">
                  <td className="px-4 py-3 font-mono text-xs">{row.donation_code ?? '—'}</td>
                  <td className="px-4 py-3">{row.campaigns?.title ?? '—'}</td>
                  <td className="px-4 py-3">{row.anonymous ? 'Anonymous' : row.donor_name}</td>
                  <td className="px-4 py-3">{formatBdt(Number(row.amount))}</td>
                  <td className="px-4 py-3 capitalize">{row.payment_status}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.transaction_id?.slice(0, 16) ?? '—'}</td>
                  <td className="px-4 py-3">{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {row.payment_status === 'paid' && (
                      <button
                        type="button"
                        className="rounded border border-surface-border px-2 py-1 text-xs"
                        onClick={() => {
                          setTrackingTarget(row);
                          setTrackingForm({
                            status: 'Allocated',
                            description: '',
                            proof_url: '',
                            amount: String(Math.round(Number(row.amount))),
                          });
                        }}
                      >
                        Add tracking
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-ink-muted">
                    No donations match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminModal
        open={!!trackingTarget}
        title={`Track donation ${trackingTarget?.donation_code ?? ''}`}
        onClose={() => setTrackingTarget(null)}
      >
        <div className="space-y-3">
          <select
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
            value={trackingForm.status}
            onChange={(e) => setTrackingForm((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="Received">Received</option>
            <option value="Allocated">Allocated</option>
            <option value="Used">Used</option>
          </select>
          <input
            type="number"
            min={1}
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
            placeholder="Amount (BDT)"
            value={trackingForm.amount}
            onChange={(e) => setTrackingForm((f) => ({ ...f, amount: e.target.value }))}
          />
          <textarea
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm min-h-[80px]"
            placeholder="Description"
            value={trackingForm.description}
            onChange={(e) => setTrackingForm((f) => ({ ...f, description: e.target.value }))}
          />
          <input
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
            placeholder="Proof image URL"
            value={trackingForm.proof_url}
            onChange={(e) => setTrackingForm((f) => ({ ...f, proof_url: e.target.value }))}
          />
          <button
            type="button"
            className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={pending || !trackingTarget}
            onClick={() =>
              run(async () => {
                if (!trackingTarget) return;
                const amount = Number(trackingForm.amount.replace(/,/g, ''));
                await addDonationTrackingAction(trackingTarget.id, {
                  ...trackingForm,
                  amount: Number.isFinite(amount) && amount > 0 ? amount : null,
                });
                setTrackingTarget(null);
                setTrackingForm({ status: 'Allocated', description: '', proof_url: '', amount: '' });
                if (bulkCampaignId === trackingTarget.campaign_id) refreshSummary(bulkCampaignId);
              })
            }
          >
            Save tracking entry
          </button>
        </div>
      </AdminModal>
    </div>
  );
}
