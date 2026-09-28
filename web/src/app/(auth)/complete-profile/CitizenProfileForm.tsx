'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Camera, Loader2, AlertCircle, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/auth';

interface CitizenProfileFormProps {
  userId: string;
  initialProfile: Profile | null;
  onSuccess: () => void;
}

export default function CitizenProfileForm({
  userId,
  initialProfile,
  onSuccess,
}: CitizenProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phone, setPhone] = useState(initialProfile?.phone || '');
  const [address, setAddress] = useState(initialProfile?.address || '');
  const [city, setCity] = useState(initialProfile?.city || '');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(
    initialProfile?.profile_photo_url || '',
  );
  const [isDragging, setIsDragging] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePhotoSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Profile photo must be less than 5MB.');
      return;
    }
    setPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handlePhotoSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePhotoSelect(e.dataTransfer.files[0]);
    }
  };

  const validate = () => {
    const phoneRegex = /^01[3-9]\d{8}$/;
    if (!phoneRegex.test(phone.trim())) {
      setErrorMessage('Please enter a valid 11-digit phone number (e.g. 01712345678).');
      return false;
    }
    if (!address.trim()) {
      setErrorMessage('Address is required so emergency teams can locate your area.');
      return false;
    }
    if (!city.trim()) {
      setErrorMessage('Please enter your city/district.');
      return false;
    }
    if (emergencyPhone.trim() && !/^01[3-9]\d{8}$/.test(emergencyPhone.trim())) {
      setErrorMessage('Emergency contact phone must be a valid 11-digit number.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validate()) return;

    setSubmitting(true);
    const supabase = createClient();

    try {
      let uploadedPhotoUrl = initialProfile?.profile_photo_url || null;

      // 1. Upload photo if changed
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop() || 'jpg';
        const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, photoFile, { upsert: true });

        if (!uploadError) {
          const { data: publicData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          uploadedPhotoUrl = publicData.publicUrl;
        } else {
          console.warn('Avatar upload warning:', uploadError.message);
        }
      }

      // Combine emergency contact if provided
      let emergencyContactCombined = null;
      if (emergencyName.trim() || emergencyPhone.trim()) {
        emergencyContactCombined = emergencyName.trim()
          ? `${emergencyName.trim()} (${emergencyPhone.trim()})`
          : emergencyPhone.trim();
      }

      // 2. Update profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim(),
          emergency_contact: emergencyContactCombined,
          profile_photo_url: uploadedPhotoUrl,
          profile_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      toast.success('Profile complete! Welcome to DisasterResponse BD.');
      onSuccess();
      router.push('/citizen/dashboard');
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to update profile. Please try again.',
      );
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profile Photo Area */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Profile Photo (Optional)
        </label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-2xl p-4 transition flex items-center gap-4 ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50'
              : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Circle preview */}
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center border-2 border-white shadow-sm shrink-0">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoPreview}
                alt="Profile preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <Camera className="w-6 h-6 text-slate-400" />
            )}
          </div>

          <div className="text-left flex-1">
            <p className="text-sm font-semibold text-slate-800">
              {photoPreview ? 'Change profile picture' : 'Upload profile picture'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Drag &amp; drop or click to browse. JPG, PNG up to 5MB.
            </p>
          </div>

          {photoPreview && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPhotoFile(null);
                setPhotoPreview('');
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-white transition"
              title="Remove photo"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Phone Number */}
      <div>
        <label
          htmlFor="phone"
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
        >
          Phone Number <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
            placeholder="01XXXXXXXXX"
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">11 digits starting with 01 (e.g. 01712345678)</p>
      </div>

      {/* City */}
      <div>
        <label
          htmlFor="city"
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
        >
          City / District <span className="text-red-500">*</span>
        </label>
        <input
          id="city"
          type="text"
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            if (errorMessage) setErrorMessage('');
          }}
          placeholder="e.g. Dhaka, Sylhet, Chittagong"
          required
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
        />
      </div>

      {/* Address */}
      <div>
        <label
          htmlFor="address"
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
        >
          Address <span className="text-red-500">*</span>
        </label>
        <textarea
          id="address"
          rows={3}
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            if (errorMessage) setErrorMessage('');
          }}
          placeholder="Your local area, street or village name"
          required
          className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition resize-none"
        />
      </div>

      {/* Emergency Contact */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
          Emergency Contact (Optional)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="emergencyName"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              Contact Name
            </label>
            <input
              id="emergencyName"
              type="text"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              placeholder="e.g. Relative / Friend"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
          </div>
          <div>
            <label
              htmlFor="emergencyPhone"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              Contact Phone
            </label>
            <input
              id="emergencyPhone"
              type="tel"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
          </div>
        </div>
      </div>

      {/* Inline Error Message */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-md shadow-blue-500/10 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Completing Profile…</span>
          </>
        ) : (
          'Complete Profile'
        )}
      </button>
    </form>
  );
}
