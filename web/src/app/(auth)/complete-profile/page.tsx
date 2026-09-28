'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, UserCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import CitizenProfileForm from './CitizenProfileForm';
import VolunteerProfileForm from './VolunteerProfileForm';
import type { Profile } from '@/types/auth';

export default function CompleteProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadData() {
      try {
        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !currentUser) {
          router.replace('/login?redirect=/complete-profile');
          return;
        }

        setUser(currentUser);

        // Fetch profile
        const { data: currentProfile, error: profError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (profError) {
          console.warn('Error loading profile:', profError.message);
        }

        // If profile is already completed, redirect to appropriate dashboard
        if (currentProfile && currentProfile.profile_completed) {
          const role = currentProfile.role || 'citizen';
          if (role === 'admin' || role === 'authority') {
            router.replace('/admin');
          } else if (role === 'volunteer') {
            router.replace('/volunteer/dashboard');
          } else {
            router.replace('/citizen/dashboard');
          }
          return;
        }

        setProfile(currentProfile);
      } catch (err) {
        console.error('Failed to load complete profile data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-500">Checking your profile…</p>
      </div>
    );
  }

  if (!user) return null;

  // Determine role: from profile or fallback to metadata
  const activeRole = profile?.role || user?.user_metadata?.role || 'citizen';
  const isVolunteer = activeRole === 'volunteer';

  return (
    <div className="w-full space-y-6">
      <div className="space-y-1.5 text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-1">
          {isVolunteer ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5" />
              Volunteer Registration
            </>
          ) : (
            <>
              <UserCheck className="w-3.5 h-3.5" />
              Citizen Registration
            </>
          )}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Complete your profile
        </h2>
        <p className="text-sm text-slate-500">
          {isVolunteer
            ? 'Complete the 5-step application to join our verified volunteer network.'
            : 'Help disaster responders contact and locate you during emergency situations.'}
        </p>
      </div>

      {isVolunteer ? (
        <VolunteerProfileForm
          userId={user.id}
          initialProfile={profile}
          onSuccess={() => {}}
        />
      ) : (
        <CitizenProfileForm
          userId={user.id}
          initialProfile={profile}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
