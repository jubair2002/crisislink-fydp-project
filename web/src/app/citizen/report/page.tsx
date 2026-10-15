'use client';

import React, { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  MapPin,
  Upload,
  X,
  CheckCircle2,
  FileText,
  Clock,
  ArrowRight,
  RefreshCw,
  Eye,
  Info,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showToast } from '@/components/Toast';
import type { DisasterRow } from '@/types/admin';

// Dynamically load Leaflet Map
const ReportLeafletMap = dynamic(
  () => import('@/components/citizen/ReportLeafletMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[350px] bg-surface-muted rounded-lg border border-surface-border flex items-center justify-center text-ink-muted text-xs font-medium">
        Loading map coordinates...
      </div>
    ),
  }
);

// Disaster Type Cards
const DISASTER_TYPES = [
  { id: 'flood', label: 'Flood', icon: '🌊' },
  { id: 'fire', label: 'Fire', icon: '🔥' },
  { id: 'earthquake', label: 'Earthquake', icon: '🏚' },
  { id: 'cyclone', label: 'Cyclone', icon: '🌀' },
  { id: 'landslide', label: 'Landslide', icon: '⛰' },
  { id: 'building_collapse', label: 'Building Collapse', icon: '🏗' },
  { id: 'accident', label: 'Accident', icon: '🚗' },
  { id: 'other', label: 'Other', icon: '⚠️' },
];

// Severity Cards (Clean square Admin style)
const SEVERITY_LEVELS = [
  { id: 'low', label: 'Low', description: 'Minor incident, no immediate danger' },
  { id: 'medium', label: 'Medium', description: 'Some injuries or property damage likely' },
  { id: 'high', label: 'High', description: 'Serious threat, casualties possible' },
  { id: 'critical', label: 'Critical', description: 'Mass casualties, immediate response needed' },
];

interface EvidenceFile {
  file: File;
  previewUrl: string;
  isVideo: boolean;
}

export default function CitizenReportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  // Form State
  const [selectedType, setSelectedType] = useState('flood');
  const [locationTab, setLocationTab] = useState<'map' | 'manual'>('map');
  const [latitude, setLatitude] = useState<number>(23.8103);
  const [longitude, setLongitude] = useState<number>(90.4125);
  const [address, setAddress] = useState<string>('Dhaka Sadar, Bangladesh');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [existingDisaster, setExistingDisaster] = useState<DisasterRow | null>(null);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePositionChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleFilesSelected = (filesList: FileList | null) => {
    if (!filesList) return;
    const newFiles: EvidenceFile[] = [];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      if (evidenceFiles.length + newFiles.length >= 5) {
        showToast.error('Maximum 5 files allowed.');
        break;
      }
      if (!allowedTypes.includes(file.type)) {
        showToast.error(`Unsupported format: ${file.name}`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast.error(`File too large: ${file.name}. Max 10MB.`);
        continue;
      }

      newFiles.push({
        file,
        previewUrl: URL.createObjectURL(file),
        isVideo: file.type.startsWith('video/'),
      });
    }

    setEvidenceFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setEvidenceFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const checkForDuplicates = async (): Promise<DisasterRow | null> => {
    try {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('disasters')
        .select('*')
        .neq('status', 'false_report')
        .gt('created_at', thirtyMinAgo)
        .gte('latitude', latitude - 0.002)
        .lte('latitude', latitude + 0.002)
        .gte('longitude', longitude - 0.002)
        .lte('longitude', longitude + 0.002)
        .limit(1);

      if (!error && data && data.length > 0) {
        return data[0] as DisasterRow;
      }
      return null;
    } catch {
      return null;
    }
  };

  const executeSubmission = async () => {
    if (!user?.id) {
      showToast.error('Please log in to submit a disaster report.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload media files
      const uploadedMedia: { url: string; mediaType: 'photo' | 'video' }[] = [];

      for (const item of evidenceFiles) {
        const cleanName = item.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `reports/${user.id}/${Date.now()}_${cleanName}`;

        const { error: uploadErr } = await supabase.storage
          .from('disaster-media')
          .upload(filePath, item.file, { upsert: false });

        if (uploadErr) {
          throw new Error(`Media upload failed: ${uploadErr.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('disaster-media')
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          uploadedMedia.push({
            url: publicUrlData.publicUrl,
            mediaType: item.isVideo ? 'video' : 'photo',
          });
        }
      }

      // 2. Insert into disasters table
      const formattedDescription = address
        ? `[Location: ${address.trim()}]\n\n${description.trim()}`
        : description.trim();

      const { data: disasterData, error: disasterError } = await supabase
        .from('disasters')
        .insert({
          reporter_id: user.id,
          disaster_type: selectedType,
          latitude,
          longitude,
          severity,
          description: formattedDescription,
          status: 'reported',
        })
        .select()
        .single();

      if (disasterError) throw disasterError;

      const newDisasterId = disasterData.id;

      // 3. Insert media records
      if (uploadedMedia.length > 0) {
        const mediaRecords = uploadedMedia.map((m) => ({
          disaster_id: newDisasterId,
          file_url: m.url,
          media_type: m.mediaType,
          uploaded_by: user.id,
        }));

        await supabase.from('disaster_media').insert(mediaRecords);
      }

      setSubmittedReportId(newDisasterId);
      showToast.success('Incident reported successfully.');
    } catch (err: any) {
      console.error(err);
      showToast.error('Submission failed', err.message || 'Please try again.');
    } finally {
      setIsSubmitting(false);
      setDuplicateModalOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (description.trim().length < 20) {
      showToast.error('Description too short', 'Minimum 20 characters required.');
      return;
    }
    if (description.trim().length > 500) {
      showToast.error('Description too long', 'Maximum 500 characters.');
      return;
    }

    setIsSubmitting(true);
    const duplicate = await checkForDuplicates();
    if (duplicate) {
      setIsSubmitting(false);
      setExistingDisaster(duplicate);
      setDuplicateModalOpen(true);
      return;
    }

    await executeSubmission();
  };

  if (submittedReportId) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <div className="rounded-lg bg-surface border border-surface-border p-6 shadow-card text-center space-y-4">
          <div className="w-12 h-12 rounded-lg bg-brand/10 text-brand grid place-items-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-ink">Report Submitted Successfully</h2>
            <p className="text-xs text-ink-muted mt-1">
              Your disaster report has been recorded and queued for field response verification.
            </p>
          </div>

          <div className="p-2.5 rounded-md bg-surface-muted border border-surface-border text-xs font-mono text-ink">
            Report ID: <span className="font-bold text-brand">{submittedReportId}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link
              href="/citizen/reports"
              className="py-2 px-3 rounded-lg bg-brand hover:bg-brand/90 text-white text-xs font-medium transition shadow-card"
            >
              View My Reports
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmittedReportId(null);
                setDescription('');
                setEvidenceFiles([]);
              }}
              className="py-2 px-3 rounded-lg border border-surface-border bg-surface hover:bg-surface-muted text-ink text-xs font-medium transition"
            >
              Report Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-ink tracking-tight">Report Incident</h1>
        <p className="text-xs text-ink-muted">
          Submit immediate hazard reports to deploy verified relief teams.
        </p>
      </div>

      {/* Main 2-Column Grid: Form 55% / Map 45% (Admin Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Form Column (7 cols) */}
        <div className="lg:col-span-7 rounded-lg bg-surface border border-surface-border shadow-card p-5 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Type Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                1. Disaster Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DISASTER_TYPES.map((type) => {
                  const isSelected = selectedType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSelectedType(type.id)}
                      className={`p-2.5 rounded-lg border text-center transition flex flex-col items-center justify-center gap-1 ${
                        isSelected
                          ? 'border-brand bg-brand/5 text-brand font-semibold shadow-xs'
                          : 'border-surface-border hover:bg-surface-muted text-ink'
                      }`}
                    >
                      <span className="text-xl">{type.icon}</span>
                      <span className="text-xs">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Location */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  2. Incident Location
                </label>
                <span className="text-[11px] text-ink-muted">Click map pin to adjust</span>
              </div>

              <div className="flex p-0.5 bg-surface-muted rounded-lg border border-surface-border">
                <button
                  type="button"
                  onClick={() => setLocationTab('map')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
                    locationTab === 'map' ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted'
                  }`}
                >
                  Pick on Map
                </button>
                <button
                  type="button"
                  onClick={() => setLocationTab('manual')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
                    locationTab === 'manual' ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted'
                  }`}
                >
                  Enter Address
                </button>
              </div>

              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter village, union, landmark or street name..."
                className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand"
              />

              <div className="flex items-center gap-3 text-[11px] font-mono text-ink-muted px-1">
                <span>Lat: {latitude.toFixed(4)}</span>
                <span>Lng: {longitude.toFixed(4)}</span>
              </div>
            </div>

            {/* Step 3: Severity */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                3. Severity Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SEVERITY_LEVELS.map((level) => {
                  const isSelected = severity === level.id;
                  return (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setSeverity(level.id)}
                      className={`p-3 rounded-lg border text-left transition ${
                        isSelected
                          ? 'border-brand bg-brand/5 shadow-xs'
                          : 'border-surface-border hover:bg-surface-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink">{level.label}</span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-brand" />
                        )}
                      </div>
                      <p className="text-[11px] text-ink-muted mt-0.5">{level.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  4. Description
                </label>
                <span className="text-[11px] text-ink-muted font-mono">
                  {description.length}/500 chars (min 20)
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details on flooding water level, casualties, trapped residents, or roadblocks..."
                rows={3}
                className="w-full p-3 rounded-lg border border-surface-border bg-surface text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand resize-none"
              />
            </div>

            {/* Step 5: Evidence Upload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  5. Media Evidence
                </label>
                <span className="text-[11px] text-ink-muted">{evidenceFiles.length}/5 files</span>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-surface-border hover:border-brand/60 rounded-lg p-4 text-center cursor-pointer transition bg-surface-muted/30"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  multiple
                  accept="image/jpeg,image/png,image/webp,video/mp4"
                  className="hidden"
                />
                <Upload className="w-5 h-5 text-ink-muted mx-auto mb-1" />
                <p className="text-xs font-medium text-ink">Upload images or video</p>
                <p className="text-[10px] text-ink-muted">JPG, PNG, WEBP, MP4 (Max 10MB)</p>
              </div>

              {evidenceFiles.length > 0 && (
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {evidenceFiles.map((item, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-md overflow-hidden border border-surface-border aspect-square bg-surface-muted"
                    >
                      {item.isVideo ? (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white text-[10px] p-1 text-center">
                          Video
                        </div>
                      ) : (
                        <img
                          src={item.previewUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-md bg-ink/70 text-white flex items-center justify-center hover:bg-ink"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="pt-2 border-t border-surface-border">
              <button
                type="submit"
                disabled={isSubmitting || description.trim().length < 20}
                className="w-full py-2.5 px-4 rounded-lg bg-brand hover:bg-brand/90 text-white text-xs font-medium transition shadow-card flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span>Submit Incident Report</span>
              </button>
            </div>
          </form>
        </div>

        {/* Map Column (5 cols) */}
        <div className="lg:col-span-5 rounded-lg border border-surface-border shadow-card bg-surface overflow-hidden sticky top-20">
          <div className="p-3 border-b border-surface-border">
            <h3 className="text-xs font-bold text-ink">Incident Coordinate Locator</h3>
          </div>
          <div className="w-full h-[450px]">
            <ReportLeafletMap
              latitude={latitude}
              longitude={longitude}
              severity={severity}
              onPositionChange={handlePositionChange}
            />
          </div>
        </div>
      </div>

      {/* Duplicate Alert Modal */}
      {duplicateModalOpen && existingDisaster && (
        <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg max-w-md w-full p-5 shadow-card-lg border border-surface-border space-y-4">
            <div className="flex items-center gap-2.5 text-brand-warning">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-ink">Similar Incident Reported</h3>
            </div>

            <p className="text-xs text-ink-muted">
              An active incident was reported within the last 30 minutes in this vicinity.
            </p>

            <div className="p-3 rounded-md bg-surface-muted border border-surface-border text-xs space-y-1">
              <p className="font-semibold capitalize text-ink">
                {existingDisaster.disaster_type} (Severity: {existingDisaster.severity})
              </p>
              <p className="text-ink-muted">{existingDisaster.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link
                href={`/disasters/${existingDisaster.id}`}
                target="_blank"
                className="py-2 px-3 rounded-lg border border-surface-border bg-surface hover:bg-surface-muted text-ink text-xs font-medium text-center"
              >
                View Existing
              </Link>
              <button
                type="button"
                onClick={executeSubmission}
                disabled={isSubmitting}
                className="py-2 px-3 rounded-lg bg-brand hover:bg-brand/90 text-white text-xs font-medium"
              >
                Report Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
