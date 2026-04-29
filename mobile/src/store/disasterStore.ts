import { create } from 'zustand';
import type { DisasterFilters, DisasterRow } from '../types/disaster';

interface DisasterState {
  disasters: DisasterRow[];
  selectedDisaster: DisasterRow | null;
  filters: DisasterFilters;
  isLoading: boolean;
  setDisasters: (rows: DisasterRow[]) => void;
  upsertDisaster: (row: DisasterRow) => void;
  removeDisaster: (id: string) => void;
  setSelected: (row: DisasterRow | null) => void;
  setFilter: (patch: Partial<DisasterFilters>) => void;
  clearFilters: () => void;
  setLoading: (v: boolean) => void;
}

const defaultFilters: DisasterFilters = {
  status: ['verified'],
};

export const useDisasterStore = create<DisasterState>((set, get) => ({
  disasters: [],
  selectedDisaster: null,
  filters: defaultFilters,
  isLoading: false,

  setDisasters: (rows) => set({ disasters: rows }),

  upsertDisaster: (row) =>
    set((state) => {
      const idx = state.disasters.findIndex((d) => d.id === row.id);
      if (idx === -1) return { disasters: [row, ...state.disasters] };
      const next = [...state.disasters];
      next[idx] = row;
      return { disasters: next };
    }),

  removeDisaster: (id) =>
    set((state) => ({
      disasters: state.disasters.filter((d) => d.id !== id),
      selectedDisaster: state.selectedDisaster?.id === id ? null : state.selectedDisaster,
    })),

  setSelected: (row) => set({ selectedDisaster: row }),

  setFilter: (patch) =>
    set({
      filters: { ...get().filters, ...patch },
    }),

  clearFilters: () => set({ filters: defaultFilters }),

  setLoading: (isLoading) => set({ isLoading }),
}));
