'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  User,
  Phone,
  MapPin,
  Building,
  UploadCloud,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ShieldCheck,
  HeartHandshake,
} from 'lucide-react';
import PublicShell from '@/components/PublicShell';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from '@/lib/authService';
import { createClient } from '@/lib/supabase/client';
import { showToast } from '@/components/Toast';

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, profile, isLoading, refreshProfile } = useAuth();

  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login?redirect=/complete-profile');
      } else if (profile && profile.profile_completed) {
        router.push('/citizen/dashboard');
      } else if (profile) {
        if (profile.phone) setPhone(profile.phone);
        if (profile.address) setAddress(profile.address);
        if (profile.city) setCity(profile.city);
        if (profile.emergency_contact) {
          // If stored as "Name - Phone" or JSON
          setEmergencyContactName(profile.emergency_contact);
        }
        if (profile.profile_photo_url) {
          setAvatarPreview(profile.profile_photo_url);
        }
      }
    }
  }, [user, profile, isLoading, router]);

  // Handle avatar file selection
  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size should be less than 5MB.');
      return;
    }

    setErrorMessage('');
    setAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!user) {
      router.push('/login');
      return;
    }

    const cleanPhone = phone.trim();
    // Validate Bangladesh mobile number: 11 digits, starts with 01
    const bdPhoneRegex = /^01[3-9]\d{8}$/;
    if (!bdPhoneRegex.test(cleanPhone)) {
      setErrorMessage('Please enter a valid Bangladesh mobile number (e.g. 01712345678).');
      return;
    }

    if (!address.trim() || !city.trim()) {
      setErrorMessage('Please provide your residential address and city.');
      return;
    }

    setSubmitting(true);

    try {
      let photoUrl = avatarPreview;

      // 1. Upload avatar if new file chosen
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.warn('[complete-profile] Avatar upload warning:', uploadError.message);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          photoUrl = publicUrlData?.publicUrl || null;
        }
      }

      // Format emergency contact
      let emergencyContactCombined: string | null = null;
      if (emergencyContactName.trim() || emergencyContactPhone.trim()) {
        emergencyContactCombined = `${emergencyContactName.trim()} (${emergencyContactPhone.trim()})`.trim();
      }

      // 2. Update profile
      const { error: updateError } = await updateProfile(user.id, {
        phone: cleanPhone,
        address: address.trim(),
        city: city.trim(),
        emergency_contact: emergencyContactCombined,
        profile_photo_url: photoUrl,
        profile_completed: true,
      });

      if (updateError) {
        setErrorMessage(updateError);
        setSubmitting(false);
        return;
      }

      await refreshProfile();
      showToast.success('Profile complete!', 'Welcome to CrisisLink Network.');
      router.push('/citizen/dashboard');
    } catch (err: unknown) {
      console.error('Complete profile error:', err);
      setErrorMessage('An unexpected error occurred while saving your profile.');
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <PublicShell>
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="bg-[#0F172A] text-white py-12 lg:py-16 border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-cyan-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Step 2 of 2 · Final Step</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Complete Your Citizen Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            Provide your verified contact and location details so emergency response coordinators
            can reach you accurately during localized disaster events.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-xl space-y-8">
          {/* Inline Error Alert */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Upload (Drag & Drop + Circular Preview) */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Profile Photo (Optional)
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Circular Preview */}
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-md flex-shrink-0 flex items-center justify-center text-slate-400">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-slate-300" />
                  )}
                </div>

                {/* Drag & Drop Box */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 w-full p-4 rounded-2xl border-2 border-dashed transition cursor-pointer text-center ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-800">
                    Click to upload or drag &amp; drop
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, or WEBP up to 5MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Mobile Number (01XXXXXXXXX) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01712345678"
                  required
                  maxLength={11}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Used to verify emergency aid deliveries and critical alerts.
              </p>
            </div>

            {/* City & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  City / District <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Sylhet, Dhaka, Chittagong"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Street / Area Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. House 14, Road 5, Block B"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact (Optional) */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Emergency Contact (Optional)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Family member or neighbor to notify in case of severe regional disaster.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="Contact Name (e.g. Rahim Ullah)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />

                <input
                  type="tel"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  placeholder="Contact Phone (e.g. 01800000000)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-blue-500/25 transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                <span>{submitting ? 'Saving Profile...' : 'Complete Profile & Enter Dashboard'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </PublicShell>
  );
}
