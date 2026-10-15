'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  User,
  Phone,
  MapPin,
  Bell,
  Lock,
  Save,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from '@/lib/authService';
import { showToast } from '@/components/Toast';

export default function CitizenSettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const [notifyDisasters, setNotifyDisasters] = useState(true);
  const [notifyDonations, setNotifyDonations] = useState(true);
  const [notifyAidUpdates, setNotifyAidUpdates] = useState(true);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setCity(profile.city || '');
      setAddress(profile.address || '');
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!name.trim()) {
      showToast.error('Please enter your full name.');
      return;
    }

    setSaving(true);
    try {
      const res = await updateProfile(user.id, {
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim(),
        address: address.trim(),
      });

      if (res.error) {
        showToast.error('Failed to update profile', res.error);
      } else {
        await refreshProfile();
        showToast.success('Profile updated successfully.');
      }
    } catch (err: any) {
      showToast.error('Error saving settings', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-ink tracking-tight">Account & Preferences</h1>
        <p className="text-xs text-ink-muted">
          Manage your personal citizen identity, emergency contact coordinates, and alert delivery.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-1 rounded-lg bg-surface border border-surface-border shadow-card p-5 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-lg bg-brand text-white font-bold text-xl grid place-items-center">
            {(name || user?.email || 'C').charAt(0).toUpperCase()}
          </div>

          <div>
            <h3 className="text-sm font-bold text-ink">{name || 'Citizen User'}</h3>
            <p className="text-xs text-ink-muted">{user?.email}</p>
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-brand/10 text-brand mt-1.5">
              Verified Citizen
            </span>
          </div>

          <div className="w-full pt-3 border-t border-surface-border space-y-2">
            <Link
              href="/update-password"
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-surface-border hover:bg-surface-muted text-xs font-medium text-ink transition"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Change Password</span>
            </Link>

            <button
              type="button"
              onClick={() => signOut()}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-brand-danger/30 bg-brand-danger/5 hover:bg-brand-danger/10 text-brand-danger text-xs font-medium transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Form Details */}
        <div className="md:col-span-2 space-y-6">
          <form
            onSubmit={handleSaveProfile}
            className="rounded-lg bg-surface border border-surface-border shadow-card p-5 space-y-4"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-2">
              <User className="w-4 h-4 text-brand" />
              <span>Personal Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-surface-border text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ink">Phone Number (BD)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3 py-1.5 rounded-lg border border-surface-border text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ink">District / City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Dhaka, Sylhet"
                  className="w-full px-3 py-1.5 rounded-lg border border-surface-border text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ink">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Village, union, road"
                  className="w-full px-3 py-1.5 rounded-lg border border-surface-border text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-brand hover:bg-brand/90 text-white text-xs font-medium transition shadow-card flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </form>

          {/* Preferences */}
          <div className="rounded-lg bg-surface border border-surface-border shadow-card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand" />
              <span>Notification Preferences</span>
            </h3>

            <div className="space-y-2">
              {[
                {
                  label: 'Disaster Emergency Alerts',
                  desc: 'High & critical verified disaster alerts',
                  checked: notifyDisasters,
                  toggle: () => setNotifyDisasters(!notifyDisasters),
                },
                {
                  label: 'Aid Request Updates',
                  desc: 'Status updates when relief responders accept requests',
                  checked: notifyAidUpdates,
                  toggle: () => setNotifyAidUpdates(!notifyAidUpdates),
                },
                {
                  label: 'Donation Impact Receipts',
                  desc: 'Transparency tracking codes for your donations',
                  checked: notifyDonations,
                  toggle: () => setNotifyDonations(!notifyDonations),
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border border-surface-border bg-surface-muted/40"
                >
                  <div>
                    <p className="text-xs font-semibold text-ink">{item.label}</p>
                    <p className="text-[11px] text-ink-muted">{item.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={item.toggle}
                    className={`w-9 h-5 rounded-full transition-colors relative ${
                      item.checked ? 'bg-brand' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        item.checked ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
