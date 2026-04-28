import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profile } from '../types/auth';
import type {
  DisasterType,
  VolunteerAvailability,
  VolunteerProfile,
  VolunteerProfileInput,
  VolunteerSkill,
} from '../types/profile';

export interface VolunteerDraft {
  // Step 1
  phone: string;
  address: string;
  age: string;
  gender: string;
  profile_photo_url?: string;
  profile_photo_local?: string;

  // Step 2
  skills: VolunteerSkill[];

  // Step 3
  availability: VolunteerAvailability | '';
  working_hours: string;
  preferred_disaster_types: DisasterType[];

  // Step 4
  has_previous_experience: boolean;
  years_of_experience: string;
  organization: string;

  // Step 5
  national_id_url?: string;
  volunteer_cert_url?: string;
  org_proof_url?: string;

  // meta
  currentStep: number;
}

const emptyDraft = (): VolunteerDraft => ({
  phone: '',
  address: '',
  age: '',
  gender: '',
  profile_photo_url: undefined,
  profile_photo_local: undefined,
  skills: [],
  availability: '',
  working_hours: '',
  preferred_disaster_types: [],
  has_previous_experience: false,
  years_of_experience: '',
  organization: '',
  national_id_url: undefined,
  volunteer_cert_url: undefined,
  org_proof_url: undefined,
  currentStep: 1,
});

interface ProfileState {
  profile: Profile | null;
  volunteerProfile: VolunteerProfile | null;
  isLoading: boolean;

  volunteerDraft: VolunteerDraft;

  setProfile: (profile: Profile | null) => void;
  setVolunteerProfile: (vp: VolunteerProfile | null) => void;
  setLoading: (v: boolean) => void;

  /** Update a single field on either the loaded profile or the volunteer draft. */
  updateField: <K extends keyof Profile>(key: K, value: Profile[K]) => void;
  updateVolunteerField: <K extends keyof VolunteerDraft>(key: K, value: VolunteerDraft[K]) => void;

  /** Initialise the draft from an existing volunteer record (used for edit flow). */
  hydrateVolunteerDraft: (input: Partial<VolunteerProfileInput> & { profile_photo_url?: string }) => void;

  resetVolunteerDraft: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      volunteerProfile: null,
      isLoading: false,
      volunteerDraft: emptyDraft(),

      setProfile: (profile) => set({ profile }),
      setVolunteerProfile: (vp) => set({ volunteerProfile: vp }),
      setLoading: (isLoading) => set({ isLoading }),

      updateField: (key, value) => {
        const current = get().profile;
        if (!current) return;
        set({ profile: { ...current, [key]: value } });
      },

      updateVolunteerField: (key, value) =>
        set((state) => ({
          volunteerDraft: { ...state.volunteerDraft, [key]: value },
        })),

      hydrateVolunteerDraft: (input) =>
        set((state) => ({
          volunteerDraft: {
            ...state.volunteerDraft,
            phone: input.phone ?? state.volunteerDraft.phone,
            address: input.address ?? state.volunteerDraft.address,
            age: input.age != null ? String(input.age) : state.volunteerDraft.age,
            gender: input.gender ?? state.volunteerDraft.gender,
            profile_photo_url: input.profile_photo_url ?? state.volunteerDraft.profile_photo_url,
            skills: input.skills ?? state.volunteerDraft.skills,
            availability: input.availability ?? state.volunteerDraft.availability,
            working_hours: input.working_hours ?? state.volunteerDraft.working_hours,
            preferred_disaster_types:
              input.preferred_disaster_types ?? state.volunteerDraft.preferred_disaster_types,
            has_previous_experience:
              input.has_previous_experience ?? state.volunteerDraft.has_previous_experience,
            years_of_experience:
              input.years_of_experience != null
                ? String(input.years_of_experience)
                : state.volunteerDraft.years_of_experience,
            organization: input.organization ?? state.volunteerDraft.organization,
            national_id_url: input.national_id_url ?? state.volunteerDraft.national_id_url,
            volunteer_cert_url: input.volunteer_cert_url ?? state.volunteerDraft.volunteer_cert_url,
            org_proof_url: input.org_proof_url ?? state.volunteerDraft.org_proof_url,
          },
        })),

      resetVolunteerDraft: () => set({ volunteerDraft: emptyDraft() }),
    }),
    {
      name: 'crisislink-profile-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only the volunteer draft so users don't lose their multi-step progress.
      // Live profile data is sourced from Supabase on each session.
      partialize: (state) => ({ volunteerDraft: state.volunteerDraft }),
    },
  ),
);
