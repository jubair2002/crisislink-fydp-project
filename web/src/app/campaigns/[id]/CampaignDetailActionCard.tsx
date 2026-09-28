'use client';

import React, { useState } from 'react';
import { Heart, Share2, Check, Users, Calendar } from 'lucide-react';
import { ProgressBar } from '@/components/ProgressBar';
import { showToast } from '@/components/Toast';

interface CampaignDetailActionCardProps {
  campaignId: string;
  campaignTitle: string;
  collected: number;
  goal: number;
  percentage: number;
  donorCount: number;
  daysRemaining: number | null;
  isEndingSoon: boolean;
}

export function CampaignDetailActionCard({
  campaignId,
  campaignTitle,
  collected,
  goal,
  percentage,
  donorCount,
  daysRemaining,
  isEndingSoon,
}: CampaignDetailActionCardProps) {
  const [copied, setCopied] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showDonateDialog, setShowDonateDialog] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      showToast.success('Campaign link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast.info('URL: ' + window.location.href);
    }
  };

  const presetAmounts = [500, 1000, 2500, 5000];

  const handlePresetSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
    setSelectedAmount(0);
  };

  const finalDonationAmount = customAmount ? parseFloat(customAmount) || 0 : selectedAmount;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      {/* Financials */}
      <div>
        <div className="text-xs text-slate-500 font-medium">Raised so far</div>
        <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
          ৳{collected.toLocaleString('en-IN')}{' '}
          <span className="text-xs sm:text-sm font-normal text-slate-500">
            of ৳{goal.toLocaleString('en-IN')} goal
          </span>
        </div>
      </div>

      <ProgressBar current={collected} target={goal} color="blue" height="md" showPercentage />

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 py-2 border-y border-slate-100 text-xs">
        <div>
          <div className="text-slate-400 font-medium">Donors</div>
          <div className="font-semibold text-slate-900 mt-0.5">{donorCount} supporters</div>
        </div>
        <div>
          <div className="text-slate-400 font-medium">Timeline</div>
          <div
            className={`font-semibold mt-0.5 ${isEndingSoon ? 'text-red-600' : 'text-slate-900'}`}
          >
            {daysRemaining !== null ? `${daysRemaining} days remaining` : 'Ongoing'}
          </div>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-700 block">Select Amount (BDT)</label>
        <div className="grid grid-cols-4 gap-1.5">
          {presetAmounts.map((amt) => {
            const isSelected = selectedAmount === amt && !customAmount;
            return (
              <button
                key={amt}
                type="button"
                onClick={() => handlePresetSelect(amt)}
                className={`py-1.5 px-1 rounded-md text-xs font-medium transition ${
                  isSelected
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ৳{amt}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">৳</span>
          <input
            type="number"
            value={customAmount}
            onChange={handleCustomChange}
            placeholder="Other amount"
            className="w-full pl-7 pr-3 py-1.5 text-xs rounded-md border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-1">
        <button
          onClick={() => setShowDonateDialog(true)}
          className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition"
        >
          Donate ৳{finalDonationAmount.toLocaleString('en-IN')}
        </button>

        <button
          onClick={handleCopyLink}
          className="w-full py-2 rounded-lg border border-slate-200 text-slate-700 font-medium text-xs hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-600">Copied</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              Copy Campaign Link
            </>
          )}
        </button>
      </div>

      <div className="text-center text-[11px] text-slate-400">
        SSL Encrypted. Direct allocation to relief procurement.
      </div>

      {/* Donation Modal */}
      {showDonateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Confirm Donation</h3>
              <button
                onClick={() => setShowDonateDialog(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 text-xs space-y-1">
              <div className="text-slate-500">Campaign</div>
              <div className="font-semibold text-slate-900 truncate">{campaignTitle}</div>
              <div className="text-base font-bold text-blue-600 pt-1">
                ৳{finalDonationAmount.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700">Payment Gateway</label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {['bKash', 'Nagad', 'Card / SSL'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="p-2 rounded border border-slate-200 hover:border-blue-600 font-medium text-slate-700 text-center"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                showToast.success('Redirecting to payment gateway (Demo)');
                setTimeout(() => setShowDonateDialog(false), 1200);
              }}
              className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700"
            >
              Pay ৳{finalDonationAmount.toLocaleString('en-IN')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
