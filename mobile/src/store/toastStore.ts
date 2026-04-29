import { create } from 'zustand';

interface ToastState {
  message: string | null;
  durationMs: number;
  show: (message: string, durationMs?: number) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  durationMs: 3200,
  show: (message, durationMs = 3200) => set({ message, durationMs }),
  hide: () => set({ message: null }),
}));
