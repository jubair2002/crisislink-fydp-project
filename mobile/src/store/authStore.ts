import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { getProfile } from '../services/authService';
import type { Profile } from '../types/auth';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setProfile: (profile) => set({ profile }),

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, isAuthenticated: false });
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    const profile = await getProfile(user.id);
    set({ profile });
  },

  initialize: async () => {
    set({ isLoading: true });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const profile = await getProfile(session.user.id);
        set({ user: session.user, profile, isAuthenticated: true });
      }

      // Listen for real-time auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const profile = await getProfile(session.user.id);
          set({ user: session.user, profile, isAuthenticated: true });
        } else {
          set({ user: null, profile: null, isAuthenticated: false });
        }
      });
    } catch (error) {
      console.error('Auth init error:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
