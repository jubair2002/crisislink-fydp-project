import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getUserSettings,
  updateUserSettings,
  getVolunteerSettings,
  updateVolunteerSettings,
} from '../services/settingsService';
import type { UserSettings, VolunteerSettings } from '../types/settings';

interface SettingsState {
  userSettings: UserSettings | null;
  volunteerSettings: VolunteerSettings | null;
  isLoading: boolean;
  isHydrated: boolean;

  initialize: (userId: string, isVolunteer: boolean) => Promise<void>;
  updateSetting: <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) => Promise<void>;
  updateVolunteerSetting: <K extends keyof VolunteerSettings>(
    key: K,
    value: VolunteerSettings[K],
  ) => Promise<void>;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      userSettings: null,
      volunteerSettings: null,
      isLoading: false,
      isHydrated: false,

      initialize: async (userId, isVolunteer) => {
        set({ isLoading: true });
        try {
          const userSettings = await getUserSettings(userId);
          let volunteerSettings: VolunteerSettings | null = null;
          if (isVolunteer) {
            volunteerSettings = await getVolunteerSettings(userId);
          }
          set({ userSettings, volunteerSettings, isHydrated: true });
        } catch (err) {
          console.warn('[settingsStore] initialize failed:', err);
        } finally {
          set({ isLoading: false });
        }
      },

      updateSetting: async (key, value) => {
        const { userSettings } = get();
        if (!userSettings) return;

        const prev = userSettings[key];
        const next = { ...userSettings, [key]: value };
        set({ userSettings: next });

        try {
          const saved = await updateUserSettings(userSettings.user_id, { [key]: value });
          set({ userSettings: saved });
        } catch (err) {
          set({ userSettings: { ...userSettings, [key]: prev } });
          throw err;
        }
      },

      updateVolunteerSetting: async (key, value) => {
        const { volunteerSettings } = get();
        if (!volunteerSettings) return;

        const prev = volunteerSettings[key];
        const next = { ...volunteerSettings, [key]: value };
        set({ volunteerSettings: next });

        try {
          const saved = await updateVolunteerSettings(volunteerSettings.user_id, { [key]: value });
          set({ volunteerSettings: saved });
        } catch (err) {
          set({ volunteerSettings: { ...volunteerSettings, [key]: prev } });
          throw err;
        }
      },

      reset: () => {
        set({
          userSettings: null,
          volunteerSettings: null,
          isHydrated: false,
        });
      },
    }),
    {
      name: 'crisislink-settings-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        userSettings: state.userSettings,
        volunteerSettings: state.volunteerSettings,
        isHydrated: state.isHydrated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = state.isHydrated ?? false;
      },
    },
  ),
);
