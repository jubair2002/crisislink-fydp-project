import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { ensureProfileExists, getProfile } from '../services/authService';
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
    const profile =
      (await getProfile(user.id)) ?? (await ensureProfileExists(user.id, user));
    set({ profile });
  },

  initialize: async () => {
    set({ isLoading: true });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // ensureProfileExists falls back to upserting a profile row from
        // the user's auth metadata if none exists (covers users who
        // signed up before the DB trigger was added).
        const profile = await ensureProfileExists(session.user.id, session.user);
        set({ user: session.user, profile, isAuthenticated: true });
      }

      // Listen for real-time auth changes.
      //
      // IMPORTANT: per Supabase docs, callbacks from onAuthStateChange must
      // NOT directly `await` other supabase methods (auth or DB). The auth
      // client holds an internal lock during certain operations
      // (signInWithPassword, updateUser, signOut, refresh) and any awaited
      // supabase call from inside this listener will deadlock.
      //
      // The fix is to defer DB work with setTimeout so it runs after the
      // current task and outside the lock.
      supabase.auth.onAuthStateChange((_event, session) => {
        if (!session?.user) {
          set({ user: null, profile: null, isAuthenticated: false });
          return;
        }

        // Set what we know synchronously so the UI updates immediately.
        set({ user: session.user, isAuthenticated: true });

        setTimeout(async () => {
          try {
            const profile = await ensureProfileExists(session.user.id, session.user);
            set({ profile });
          } catch (err) {
            console.warn('Profile sync failed:', err);
          }
        }, 0);
      });
    } catch (error) {
      console.error('Auth init error:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
