import { create } from 'zustand';
import type {
  CampaignRow,
  CampaignUpdateRow,
  HomeDisaster,
  HomeTaskAssignment,
  ResourceCenterRow,
  SectionKey,
  VolunteerCampaignNeed,
} from '../types/home';
import {
  fetchActiveCampaigns,
  fetchCampaignUpdates,
  fetchActiveTaskAssignment,
  fetchVolunteerNearbyDisasters,
  fetchCampaignsNeedingVolunteers,
  respondToTaskRequest,
  updateAvailabilityStatus,
} from '../services/homeService';

const emptyLoading = (): Record<SectionKey, boolean> => ({
  disasters: false,
  campaigns: false,
  centers: false,
  updates: false,
  volunteerTasks: false,
  volunteerCampaigns: false,
});

interface HomeState {
  nearbyDisasters: HomeDisaster[];
  activeCampaigns: CampaignRow[];
  resourceCenters: ResourceCenterRow[];
  campaignUpdates: CampaignUpdateRow[];
  pendingTaskRequests: HomeTaskAssignment[];
  activeTask: HomeTaskAssignment | null;
  campaignsNeedingVolunteers: VolunteerCampaignNeed[];

  isLoading: boolean;
  error: string | null;
  loadingSections: Record<SectionKey, boolean>;
  sectionErrors: Partial<Record<SectionKey, string | null>>;
  volunteerSessionUserId: string | null;

  fetchCitizenHomeData: (lat: number, lng: number) => Promise<void>;
  fetchVolunteerHomeData: (userId: string, lat: number, lng: number) => Promise<void>;
  respondToTask: (assignmentId: string, action: 'accept' | 'decline') => Promise<void>;
  setAvailabilityStatus: (
    userId: string,
    status: 'online' | 'offline' | 'available' | 'busy',
  ) => Promise<void>;

  refreshCitizenSections: (lat: number, lng: number) => Promise<void>;
  refreshVolunteerSections: (userId: string, lat: number, lng: number) => Promise<void>;
  reloadVolunteerAssignments: () => Promise<void>;
}

const runSection = async <T>(
  key: SectionKey,
  fn: () => Promise<T>,
  onOk: (v: T) => void,
  set: (partial: Partial<HomeState> | ((s: HomeState) => Partial<HomeState>)) => void,
  get: () => HomeState,
) => {
  set((s) => ({
    loadingSections: { ...s.loadingSections, [key]: true },
    sectionErrors: { ...s.sectionErrors, [key]: null },
  }));
  try {
    const val = await fn();
    onOk(val);
    set((s) => ({
      loadingSections: { ...s.loadingSections, [key]: false },
      sectionErrors: { ...s.sectionErrors, [key]: null },
    }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not load.';
    set((s) => ({
      loadingSections: { ...s.loadingSections, [key]: false },
      sectionErrors: { ...s.sectionErrors, [key]: msg },
    }));
  }
};

export const useHomeStore = create<HomeState>((set, get) => ({
  nearbyDisasters: [],
  activeCampaigns: [],
  resourceCenters: [],
  campaignUpdates: [],
  pendingTaskRequests: [],
  activeTask: null,
  campaignsNeedingVolunteers: [],

  isLoading: false,
  error: null,
  loadingSections: emptyLoading(),
  sectionErrors: {},
  volunteerSessionUserId: null,

  fetchCitizenHomeData: async (_lat, _lng) => {
    set({ error: null });
    await Promise.all([
      runSection(
        'campaigns',
        () => fetchActiveCampaigns(10),
        (activeCampaigns) => set({ activeCampaigns }),
        set,
        get,
      ),
      runSection(
        'updates',
        () => fetchCampaignUpdates(5),
        (campaignUpdates) => set({ campaignUpdates }),
        set,
        get,
      ),
    ]);
  },

  fetchVolunteerHomeData: async (userId, lat, lng) => {
    set({ volunteerSessionUserId: userId, error: null });
    await Promise.all([
      runSection(
        'disasters',
        () => fetchVolunteerNearbyDisasters(lat, lng, 5),
        (nearbyDisasters) => set({ nearbyDisasters }),
        set,
        get,
      ),
      runSection(
        'volunteerTasks',
        async () => fetchActiveTaskAssignment(userId),
        (active) =>
          set({
            pendingTaskRequests: [],
            activeTask: active,
          }),
        set,
        get,
      ),
      runSection(
        'volunteerCampaigns',
        () => fetchCampaignsNeedingVolunteers(5),
        (campaignsNeedingVolunteers) => set({ campaignsNeedingVolunteers }),
        set,
        get,
      ),
    ]);
  },

  respondToTask: async (assignmentId, action) => {
    const volunteerUserId = get().volunteerSessionUserId;
    if (!volunteerUserId) throw new Error('Not signed in.');
    await respondToTaskRequest(assignmentId, volunteerUserId, action);
    await get().reloadVolunteerAssignments();
  },

  reloadVolunteerAssignments: async () => {
    const volunteerUserId = get().volunteerSessionUserId;
    if (!volunteerUserId) return;
    await runSection(
      'volunteerTasks',
      () => fetchActiveTaskAssignment(volunteerUserId),
      (active) =>
        set({
          pendingTaskRequests: [],
          activeTask: active,
        }),
      set,
      get,
    );
  },

  setAvailabilityStatus: async (userId, status) => {
    await updateAvailabilityStatus(userId, status);
  },

  refreshCitizenSections: async (lat, lng) => {
    await get().fetchCitizenHomeData(lat, lng);
  },

  refreshVolunteerSections: async (userId, lat, lng) => {
    await get().fetchVolunteerHomeData(userId, lat, lng);
  },
}));
