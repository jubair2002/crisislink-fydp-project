'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  Layers,
  Calendar,
  Clock,
  MapPin,
  HeartHandshake,
  TrendingUp,
  AlertTriangle,
  Radio,
  FileCheck,
  UserCheck,
  ArrowRight,
  ExternalLink,
  Shield,
  LifeBuoy,
} from 'lucide-react';
import VolunteerShell from '@/components/dashboard/VolunteerShell';
import DashboardMetricCard from '@/components/dashboard/DashboardMetricCard';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';

interface FieldMission {
  id: string;
  title: string;
  disasterType: string;
  location: string;
  urgency: 'critical' | 'high' | 'medium';
  requiredSkills: string[];
  slotsNeeded: number;
  timeRemaining: string;
}

const MOCK_MISSIONS: FieldMission[] = [
  {
    id: 'm1',
    title: 'Emergency Medical Camp & Water Purification',
    disasterType: 'Flash Flood',
    location: 'Chhatak Upazila, Sunamganj',
    urgency: 'critical',
    requiredSkills: ['Medical Assistance', 'Food Distribution'],
    slotsNeeded: 4,
    timeRemaining: 'Dispatch in 2h',
  },
  {
    id: 'm2',
    title: 'Dry Food Ration & Emergency Kit Distribution',
    disasterType: 'River Surge',
    location: 'Feni Sadar & Daganbhuiyan',
    urgency: 'high',
    requiredSkills: ['Logistics Support', 'Food Distribution'],
    slotsNeeded: 6,
    timeRemaining: 'Dispatch today',
  },
  {
    id: 'm3',
    title: 'Coastal Shelter Evacuation & Special Needs Transport',
    disasterType: 'Cyclone Prep',
    location: 'Moheshkhali, Cox’s Bazar',
    urgency: 'medium',
    requiredSkills: ['Search & Rescue', 'Logistics Support'],
    slotsNeeded: 8,
    timeRemaining: 'Tomorrow 8 AM',
  },
];

export default function VolunteerDashboardPage() {
  const { user, profile } = useAuth();
  const [volunteerRecord, setVolunteerRecord] = useState<any>(null);
  const [showUnderReviewBanner, setShowUnderReviewBanner] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check if just submitted or pending
    const justSubmitted = sessionStorage.getItem('just_submitted_volunteer');
    if (justSubmitted) {
      setShowUnderReviewBanner(true);
    }

    const supabase = createClient();
    async function loadVolunteer() {
      if (!user?.id) return;
      const { data } = await supabase
        .from('volunteers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setVolunteerRecord(data);
        if (data.verification_status === 'pending') {
          setShowUnderReviewBanner(true);
        }
      }
    }

    loadVolunteer();
  }, [user]);

  const isApproved = volunteerRecord?.verification_status === 'approved';
  const isRejected = volunteerRecord?.verification_status === 'rejected';
  const displayName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Volunteer';

  const registeredSkills: string[] = volunteerRecord?.skills || ['Search & Rescue', 'Food Distribution'];
  const availabilityType = volunteerRecord?.availability?.replace(/_/g, ' ') || 'Part-time';
  const workingHours = volunteerRecord?.working_hours || 'Flexible hours';

  return (
    <VolunteerShell>
      <div className="space-y-6">
        {/* Info Banner when application is under review */}
        {showUnderReviewBanner && (
          <div className="p-4 sm:p-5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 shadow-sm flex items-start gap-3.5 animate-fade-in">
            <span className="text-2xl shrink-0 mt-0.5">⏳</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-amber-950">
                Application Submitted — Under Review
              </h3>
              <p className="text-xs sm:text-sm text-amber-800/90 mt-0.5 leading-relaxed">
                Your volunteer profile is under review by our admin team. This usually takes 1-2 days. You will receive an alert once approved. You can explore active field maps and relief operations below while awaiting verification.
              </p>
            </div>
            <button
              onClick={() => {
                setShowUnderReviewBanner(false);
                sessionStorage.removeItem('just_submitted_volunteer');
              }}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-200 text-amber-900 shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Header Section */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">Volunteer Operations Hub</h1>
            <p className="text-sm text-ink-muted">
              Live field mission queues, verified credentials, and emergency dispatch deployment.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/volunteer/pending"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-surface-border bg-surface text-ink text-xs font-semibold hover:border-slate-400 transition"
            >
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Review Status</span>
            </Link>
            <Link
              href="/map"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-card transition"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Incident Radar Map</span>
            </Link>
          </div>
        </header>

        {/* 4 Metric Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <DashboardMetricCard
            label="Verification Status"
            value={
              isApproved
                ? 'Approved'
                : isRejected
                ? 'Revision Needed'
                : 'Pending'
            }
            hint={
              isApproved
                ? 'Authorized for emergency field missions'
                : 'Under administrative vetting'
            }
            icon={ShieldCheck}
            tone={isApproved ? 'success' : isRejected ? 'danger' : 'warning'}
            badge={isApproved ? 'Verified' : 'Under Review'}
          />
          <DashboardMetricCard
            label="Tasks Completed"
            value={volunteerRecord?.tasks_completed ?? 0}
            hint="Recorded relief operations"
            icon={CheckCircle2}
            tone="brand"
          />
          <DashboardMetricCard
            label="Registered Skillsets"
            value={`${registeredSkills.length} Skills`}
            hint="Proficiencies on file"
            icon={Layers}
            tone="secondary"
          />
          <DashboardMetricCard
            label="Deployment Availability"
            value={availabilityType}
            hint={workingHours}
            icon={Calendar}
            tone="success"
          />
        </section>

        {/* Main Grid: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2/3): Field Operations & Capability Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Field Missions Queue */}
            <div className="rounded-xl bg-surface border border-surface-border shadow-card overflow-hidden">
              <div className="p-5 border-b border-surface-border flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-ink flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                    Active Field Operations &amp; Mission Tasks
                  </h2>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Live coordination opportunities for verified disaster response personnel.
                  </p>
                </div>
                <Link
                  href="/campaigns"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition"
                >
                  All Operations <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="divide-y divide-surface-border">
                {MOCK_MISSIONS.map((mission) => (
                  <div
                    key={mission.id}
                    className="p-5 hover:bg-surface-muted transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            mission.urgency === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {mission.urgency}
                        </span>
                        <span className="text-xs text-ink-muted">· {mission.disasterType}</span>
                        <span className="text-xs text-ink-muted font-medium">· {mission.timeRemaining}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-ink leading-snug">
                        {mission.title}
                      </h3>
                      <p className="text-xs text-ink-muted flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {mission.location} ·{' '}
                        <strong className="text-emerald-700 font-semibold">
                          {mission.slotsNeeded} volunteer slots open
                        </strong>
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {mission.requiredSkills.map((sk) => (
                          <span
                            key={sk}
                            className="text-[11px] px-2 py-0.5 rounded bg-surface border border-surface-border text-ink-muted"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>

                    <Link
                      href="/campaigns"
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shrink-0 self-start sm:self-center shadow-sm"
                    >
                      <span>Join Dispatch</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Field Tools */}
            <div className="rounded-xl bg-surface border border-surface-border shadow-card p-5">
              <h2 className="text-base font-bold text-ink mb-1">Field Responder Utilities</h2>
              <p className="text-xs text-ink-muted mb-4">
                Rapid toolset for team coordination, supply tracking, and incident logging.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  href="/map"
                  className="p-4 rounded-xl border border-surface-border bg-surface-muted hover:border-emerald-500 hover:bg-emerald-50/30 transition group"
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-ink group-hover:text-emerald-600 transition">
                    Hotzone Radar
                  </h3>
                  <p className="text-xs text-ink-muted mt-1">
                    Check flood water gauges and safe transit routes.
                  </p>
                </Link>

                <Link
                  href="/track"
                  className="p-4 rounded-xl border border-surface-border bg-surface-muted hover:border-blue-500 hover:bg-blue-50/30 transition group"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-ink group-hover:text-blue-600 transition">
                    Log Checkpoint
                  </h3>
                  <p className="text-xs text-ink-muted mt-1">
                    Update relief cargo arrivals and supply delivery states.
                  </p>
                </Link>

                <Link
                  href="/campaigns"
                  className="p-4 rounded-xl border border-surface-border bg-surface-muted hover:border-cyan-500 hover:bg-cyan-50/30 transition group"
                >
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-ink group-hover:text-cyan-600 transition">
                    Relief Inventory
                  </h3>
                  <p className="text-xs text-ink-muted mt-1">
                    Request medicine, emergency rafts, or dry rations.
                  </p>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column (1/3): Volunteer Credentials & Operational Directives */}
          <div className="space-y-6">
            {/* Volunteer Credentials Card */}
            <div className="rounded-xl bg-surface border border-surface-border shadow-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Responder Credentials
                </h2>
                <Link
                  href="/complete-profile"
                  className="text-xs font-semibold text-emerald-600 hover:underline"
                >
                  Update
                </Link>
              </div>

              <div className="flex items-center gap-3">
                {profile?.profile_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.profile_photo_url}
                    alt={displayName}
                    className="w-12 h-12 rounded-full object-cover border border-surface-border shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-bold text-base grid place-items-center shrink-0">
                    {displayName[0]?.toUpperCase() || 'V'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink truncate">{displayName}</p>
                  <p className="text-xs text-ink-muted truncate">{user?.email}</p>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold mt-0.5 ${
                      isApproved ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    <Shield className="w-3 h-3" />{' '}
                    {isApproved ? 'Verified Volunteer' : 'Vetting in Progress'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs pt-1 border-t border-surface-border">
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">National ID on File:</span>
                  <span className="font-semibold text-ink flex items-center gap-1">
                    {volunteerRecord?.national_id_url ? (
                      <>
                        <FileCheck className="w-3 h-3 text-emerald-600" /> Uploaded
                      </>
                    ) : (
                      'Not uploaded'
                    )}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">Certification:</span>
                  <span className="font-semibold text-ink">
                    {volunteerRecord?.volunteer_cert_url ? 'Verified Cert' : 'None provided'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">Organization / Affiliation:</span>
                  <span className="font-semibold text-ink text-right max-w-[150px] truncate">
                    {volunteerRecord?.organization || 'Independent Responder'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">Field Contact:</span>
                  <span className="font-semibold text-ink">{profile?.phone || 'Not recorded'}</span>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider block mb-1.5">
                  Assigned Skills
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {registeredSkills.map((sk) => (
                    <span
                      key={sk}
                      className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-medium capitalize border border-emerald-200"
                    >
                      {sk.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Field Safety & Operational Protocols */}
            <div className="rounded-xl bg-surface border border-surface-border shadow-card p-5 space-y-3">
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                <LifeBuoy className="w-4 h-4 text-blue-600" />
                Field Safety Directives
              </h2>
              <div className="space-y-2 text-xs text-ink-muted leading-relaxed">
                <div className="p-2.5 rounded-lg bg-surface-muted border border-surface-border">
                  <strong className="text-ink block mb-0.5">1. Team Check-in Protocol</strong>
                  Never enter red-zone water currents alone. Log mission starts with your district coordinator.
                </div>
                <div className="p-2.5 rounded-lg bg-surface-muted border border-surface-border">
                  <strong className="text-ink block mb-0.5">2. Medical Kit Readiness</strong>
                  Keep oral rehydration salts (ORS), antiseptic, and sterile bandages accessible on every boat.
                </div>
                <div className="p-2.5 rounded-lg bg-surface-muted border border-surface-border">
                  <strong className="text-ink block mb-0.5">3. Transparent Logging</strong>
                  Record recipient counts accurately at each food checkpoint before handing over packages.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </VolunteerShell>
  );
}
