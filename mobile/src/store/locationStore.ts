import { create } from 'zustand';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  permissionDenied: boolean;
  setCoords: (lat: number | null, lng: number | null) => void;
  setPermissionDenied: (v: boolean) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  latitude: null,
  longitude: null,
  permissionDenied: false,
  setCoords: (latitude, longitude) => set({ latitude, longitude }),
  setPermissionDenied: (permissionDenied) => set({ permissionDenied }),
}));
