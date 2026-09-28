'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  Loader2,
  AlertCircle,
  X,
  ArrowRight,
  ArrowLeft,
  Upload,
  CheckCircle2,
  FileText,
  FileCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/auth';

interface VolunteerProfileFormProps {
  userId: string;
  initialProfile: Profile | null;
  onSuccess: () => void;
}

const TOTAL_STEPS = 5;

const SKILL_ITEMS = [
  { id: 'medical_assistance', label: 'Medical Assistance', icon: '🏥' },
  { id: 'search_rescue', label: 'Search & Rescue', icon: '🔍' },
  { id: 'food_distribution', label: 'Food Distribution', icon: '🍱' },
  { id: 'logistics_support', label: 'Logistics Support', icon: '🚛' },
  { id: 'engineering_support', label: 'Engineering Support', icon: '🔧' },
  { id: 'psychological_support', label: 'Psychological Support', icon: '🧠' },
  { id: 'other', label: 'Other', icon: '📦' },
];

const DISASTER_TYPES = [
  { id: 'flood', label: 'Flood' },
  { id: 'fire', label: 'Fire' },
  { id: 'earthquake', label: 'Earthquake' },
  { id: 'cyclone', label: 'Cyclone' },
  { id: 'landslide', label: 'Landslide' },
  { id: 'building_collapse', label: 'Building Collapse' },
  { id: 'accident', label: 'Accident' },
  { id: 'other', label: 'Any / Other' },
];

export default function VolunteerProfileForm({
  userId,
  initialProfile,
  onSuccess,
}: VolunteerProfileFormProps) {
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // STEP 1 state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(
    initialProfile?.profile_photo_url || '',
  );
  const [phone, setPhone] = useState(initialProfile?.phone || '');
  const [address, setAddress] = useState(initialProfile?.address || '');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<string>('male');

  // STEP 2 state (Skills)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // STEP 3 state (Availability)
  const [availability, setAvailability] = useState<'full_time' | 'part_time' | 'emergency_only'>(
    'part_time',
  );
  const [workingHours, setWorkingHours] = useState('');
  const [selectedDisasters, setSelectedDisasters] = useState<string[]>(['flood']);

  // STEP 4 state (Experience)
  const [hasExperience, setHasExperience] = useState(false);
  const [yearsOfExperience, setYearsOfExperience] = useState('0');
  const [organization, setOrganization] = useState('');
  const [experienceDescription, setExperienceDescription] = useState('');

  // STEP 5 state (Documents)
  const [nidFile, setNidFile] = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [orgProofFile, setOrgProofFile] = useState<File | null>(null);

  // Validation per step
  const validateCurrentStep = (currentStep: number) => {
    setErrorMessage('');
    if (currentStep === 1) {
      const phoneRegex = /^01[3-9]\d{8}$/;
      if (!phoneRegex.test(phone.trim())) {
        setErrorMessage('Please enter a valid 11-digit phone number (e.g. 01712345678).');
        return false;
      }
      if (!address.trim()) {
        setErrorMessage('Please enter your full address.');
        return false;
      }
      const ageNum = Number(age);
      if (!age || Number.isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
        setErrorMessage('You must be at least 18 years old to register as an emergency volunteer.');
        return false;
      }
      if (!gender) {
        setErrorMessage('Please select your gender.');
        return false;
      }
    } else if (currentStep === 2) {
      if (selectedSkills.length === 0) {
        setErrorMessage('Please select at least one skill to proceed.');
        return false;
      }
    } else if (currentStep === 3) {
      if (!availability) {
        setErrorMessage('Please select your availability type.');
        return false;
      }
      if (!workingHours.trim()) {
        setErrorMessage('Please enter your general working/available hours.');
        return false;
      }
      if (selectedDisasters.length === 0) {
        setErrorMessage('Please pick at least one preferred disaster response type.');
        return false;
      }
    } else if (currentStep === 4) {
      if (hasExperience) {
        const yrs = Number(yearsOfExperience);
        if (Number.isNaN(yrs) || yrs < 0 || yrs > 50) {
          setErrorMessage('Please enter valid years of experience (0-50).');
          return false;
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep(step)) {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    }
  };

  const handleBack = () => {
    setErrorMessage('');
    setStep((s) => Math.max(s - 1, 1));
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId) ? prev.filter((s) => s !== skillId) : [...prev, skillId],
    );
  };

  const toggleDisaster = (disasterId: string) => {
    setSelectedDisasters((prev) =>
      prev.includes(disasterId) ? prev.filter((d) => d !== disasterId) : [...prev, disasterId],
    );
  };

  const handlePhotoSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be smaller than 5MB.');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // Helper to upload document to 'volunteer-docs' bucket
  const uploadDoc = async (file: File, prefix: string): Promise<string | null> => {
    const supabase = createClient();
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const path = `${userId}/${prefix}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('volunteer-docs')
        .upload(path, file, { upsert: true });

      if (error) {
        console.warn(`Doc upload warning (${prefix}):`, error.message);
        return null;
      }
      const { data } = supabase.storage.from('volunteer-docs').getPublicUrl(path);
      return data.publicUrl;
    } catch (e) {
      console.warn(`Doc upload exception (${prefix}):`, e);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep(step)) return;

    setSubmitting(true);
    const supabase = createClient();

    try {
      // 1. Upload photo if selected
      let uploadedPhotoUrl = initialProfile?.profile_photo_url || null;
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop() || 'jpg';
        const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;
        const { error: photoErr } = await supabase.storage
          .from('avatars')
          .upload(fileName, photoFile, { upsert: true });

        if (!photoErr) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
          uploadedPhotoUrl = data.publicUrl;
        }
      }

      // 2. Upload supporting documents
      let nidUrl: string | null = null;
      let certUrl: string | null = null;
      let orgProofUrl: string | null = null;

      if (nidFile) nidUrl = await uploadDoc(nidFile, 'nid');
      if (certFile) certUrl = await uploadDoc(certFile, 'cert');
      if (orgProofFile) orgProofUrl = await uploadDoc(orgProofFile, 'org_proof');

      // 3. Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          phone: phone.trim(),
          address: address.trim(),
          profile_photo_url: uploadedPhotoUrl,
          role: 'volunteer',
          profile_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // 4. Update volunteers table
      const volunteerPayload = {
        user_id: userId,
        age: Number(age),
        gender,
        skills: selectedSkills,
        availability,
        working_hours: workingHours.trim(),
        preferred_disaster_types: selectedDisasters,
        has_previous_experience: hasExperience,
        years_of_experience: hasExperience ? Number(yearsOfExperience) : 0,
        organization: hasExperience && organization.trim() ? organization.trim() : null,
        national_id_url: nidUrl,
        volunteer_cert_url: certUrl,
        org_proof_url: orgProofUrl,
        verification_status: 'pending',
      };

      const { error: volError } = await supabase
        .from('volunteers')
        .upsert(volunteerPayload, { onConflict: 'user_id' });

      if (volError) throw volError;

      // Inform user & redirect to dashboard
      sessionStorage.setItem('just_submitted_volunteer', 'true');
      toast.success('Volunteer application submitted successfully!');
      onSuccess();
      router.push('/volunteer/dashboard');
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to submit application. Please try again.',
      );
      setSubmitting(false);
    }
  };

  const progressPct = (step / TOTAL_STEPS) * 100;

  return (
    <div className="space-y-6">
      {/* Top Header with Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span>Step {step} of {TOTAL_STEPS}</span>
          <span className="text-blue-600 font-bold">{Math.round(progressPct)}% Complete</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* STEP 1: Personal Info */}
      {step === 1 && (
        <div className="space-y-5 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Personal Information</h3>
            <p className="text-xs text-slate-500">Provide your basic contact and demographic details.</p>
          </div>

          {/* Profile photo */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Profile Photo (Optional)
            </label>
            <div className="flex items-center gap-4">
              <div
                onClick={() => photoInputRef.current?.click()}
                className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 flex items-center justify-center cursor-pointer hover:border-blue-500 transition shrink-0"
              >
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {photoPreview ? 'Change Photo' : 'Upload Photo'}
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
            <p className="text-xs text-slate-500 mt-1">11 digits starting with 01</p>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="City, District, Area"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Age & Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Age (min 18) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="18"
                max="100"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="24"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Skills */}
      {step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-slate-900">What can you help with?</h3>
            <p className="text-xs text-slate-500">Pick at least one skill where you can contribute.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SKILL_ITEMS.map((sk) => {
              const selected = selectedSkills.includes(sk.id);
              return (
                <div
                  key={sk.id}
                  onClick={() => toggleSkill(sk.id)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition select-none flex flex-col items-center text-center justify-center gap-2 relative ${
                    selected
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  {selected && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600 absolute top-2 right-2" />
                  )}
                  <span className="text-2xl">{sk.icon}</span>
                  <span className="text-xs font-semibold leading-tight">{sk.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: Availability */}
      {step === 3 && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-slate-900">When can you volunteer?</h3>
            <p className="text-xs text-slate-500">Specify your commitment level and disaster preference.</p>
          </div>

          {/* 3 Large Radio Cards */}
          <div className="space-y-2.5">
            {[
              { id: 'full_time', label: 'Full-time', desc: 'Available most days and hours' },
              { id: 'part_time', label: 'Part-time', desc: 'Available certain days or hours' },
              { id: 'emergency_only', label: 'Emergency Only', desc: 'Only for critical emergencies' },
            ].map((opt) => (
              <label
                key={opt.id}
                onClick={() => setAvailability(opt.id as any)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition ${
                  availability === opt.id
                    ? 'border-blue-600 bg-blue-50/60'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="availability"
                  checked={availability === opt.id}
                  onChange={() => {}}
                  className="w-4 h-4 mt-0.5 text-blue-600"
                />
                <div>
                  <span className="font-semibold text-sm text-slate-900 block">{opt.label}</span>
                  <span className="text-xs text-slate-500">{opt.desc}</span>
                </div>
              </label>
            ))}
          </div>

          {/* Working hours input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Working hours <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={workingHours}
              onChange={(e) => setWorkingHours(e.target.value)}
              placeholder="e.g. Mon-Fri 9am-5pm or Weekends only"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Preferred disaster types */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Preferred disaster types
            </label>
            <div className="flex flex-wrap gap-2">
              {DISASTER_TYPES.map((dt) => {
                const active = selectedDisasters.includes(dt.id);
                return (
                  <button
                    key={dt.id}
                    type="button"
                    onClick={() => toggleDisaster(dt.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {dt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Experience */}
      {step === 4 && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Relief Experience</h3>
            <p className="text-xs text-slate-500">Have you performed disaster or rescue work in the past?</p>
          </div>

          {/* Toggle Switch */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">
              I have previous disaster relief experience
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={hasExperience}
                onChange={(e) => setHasExperience(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>

          {hasExperience && (
            <div className="space-y-4 pt-2 animate-fade-in">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Years of experience (0-30)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Organization name (Optional)
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. Red Crescent, Scout, Local Youth Club"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Brief description of past work (Optional)
                </label>
                <textarea
                  rows={3}
                  value={experienceDescription}
                  onChange={(e) => setExperienceDescription(e.target.value)}
                  placeholder="Tell us about the campaigns, floods, or relief ops you assisted with."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 5: Documents */}
      {step === 5 && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Upload Supporting Documents (Optional)</h3>
            <p className="text-xs text-slate-500">
              These help us verify your credentials and approve your profile faster.
            </p>
          </div>

          {/* 3 Upload areas */}
          <div className="space-y-3">
            {/* 1. National ID */}
            <DocumentUploadZone
              title="National ID / NID"
              subtitle="Upload front of your National ID card"
              file={nidFile}
              onSelect={setNidFile}
              onRemove={() => setNidFile(null)}
            />

            {/* 2. Volunteer Certificate */}
            <DocumentUploadZone
              title="Volunteer Certificate"
              subtitle="Any prior volunteer certification"
              file={certFile}
              onSelect={setCertFile}
              onRemove={() => setCertFile(null)}
            />

            {/* 3. Organization Proof */}
            <DocumentUploadZone
              title="Organization Proof"
              subtitle="Letter or ID from affiliated organization"
              file={orgProofFile}
              onSelect={setOrgProofFile}
              onRemove={() => setOrgProofFile(null)}
            />
          </div>
        </div>
      )}

      {/* Inline Error */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm animate-shake">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-3">
        {step > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            disabled={submitting}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        ) : (
          <div />
        )}

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={handleNext}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/10 transition flex items-center gap-1.5 ml-auto cursor-pointer"
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/10 transition flex items-center gap-2 ml-auto cursor-pointer disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting Application…</span>
              </>
            ) : (
              <span>Submit Application</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// Subcomponent for Document Upload Area
function DocumentUploadZone({
  title,
  subtitle,
  file,
  onSelect,
  onRemove,
}: {
  title: string;
  subtitle: string;
  file: File | null;
  onSelect: (f: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 5 * 1024 * 1024) {
        toast.error('File size must be under 5MB.');
        return;
      }
      onSelect(selected);
    }
  };

  return (
    <div className="border border-dashed border-slate-300 rounded-xl p-3.5 bg-slate-50/50 hover:bg-slate-50 transition">
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {file ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-800 truncate">{file.name}</p>
              <p className="text-[11px] text-slate-500">
                {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to upload
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-white transition shrink-0"
            title="Remove document"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-400 flex items-center justify-center shrink-0">
            <Upload className="w-4 h-4" />
          </div>
          <div className="text-left flex-1">
            <p className="text-xs font-semibold text-slate-800">{title}</p>
            <p className="text-[11px] text-slate-500">{subtitle}</p>
          </div>
          <span className="text-xs text-blue-600 font-medium px-2 py-1 bg-white rounded border border-slate-200">
            Browse
          </span>
        </div>
      )}
    </div>
  );
}
