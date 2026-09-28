'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { signOut as authSignOut } from '@/lib/authService';
import type { Profile } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<Profile | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  refreshProfile: async () => null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.warn('[AuthContext] Error fetching profile:', error.message);
          return null;
        }
        return data as Profile;
      } catch (err) {
        console.warn('[AuthContext] Exception fetching profile:', err);
        return null;
      }
    },
    [supabase],
  );

  const refreshProfile = useCallback(async (): Promise<Profile | null> => {
    if (!user) {
      setProfile(null);
      return null;
    }
    const prof = await fetchProfile(user.id);
    setProfile(prof);
    return prof;
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!mounted) return;
        setUser(currentUser);

        if (currentUser) {
          const prof = await fetchProfile(currentUser.id);
          if (mounted) setProfile(prof);
        } else {
          if (mounted) setProfile(null);
        }
      } catch (err) {
        console.warn('[AuthContext] initAuth error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      if (!mounted) return;
      setUser(currentUser);

      if (event === 'SIGNED_OUT' || !currentUser) {
        setProfile(null);
      } else {
        const prof = await fetchProfile(currentUser.id);
        if (mounted) setProfile(prof);
      }

      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const handleSignOut = async () => {
    setIsLoading(true);
    setUser(null);
    setProfile(null);
    try {
      await authSignOut();
    } catch (err) {
      console.warn('SignOut error:', err);
    } finally {
      setIsLoading(false);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAuthenticated: !!user,
        refreshProfile,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
