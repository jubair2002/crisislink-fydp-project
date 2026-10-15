'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { getProfile, signOut as serviceSignOut } from '@/lib/authService';
import type { Profile } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const p = await getProfile(userId);
      setProfile(p);
    } catch (err) {
      console.error('[AuthContext] Failed to load profile:', err);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user && mounted) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('[AuthContext] Session init error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = async () => {
    await serviceSignOut();
    setUser(null);
    setProfile(null);
    window.location.href = '/login';
  };

  const value: AuthContextType = {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    refreshProfile,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
