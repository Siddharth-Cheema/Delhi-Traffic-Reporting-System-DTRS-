import { create } from 'zustand'

interface CaptureState {
  draftCount: number;
  isLockedOut: boolean;
  incrementDrafts: () => void;
  clearDrafts: () => void;
  checkLockoutStatus: (count: number) => void;
}

export const useCaptureStore = create<CaptureState>((set) => ({
  draftCount: 0,
  isLockedOut: false,

  incrementDrafts: () => set((state) => {
    const newCount = state.draftCount + 1;
    return {
      draftCount: newCount,
      isLockedOut: newCount >= 10
    };
  }),

  clearDrafts: () => set({ draftCount: 0, isLockedOut: false }),

  checkLockoutStatus: (count: number) => set({
    draftCount: count,
    isLockedOut: count >= 10
  })
}));
