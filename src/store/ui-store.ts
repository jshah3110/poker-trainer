import { create } from 'zustand';

interface UIStore {
  betSliderValue: number;
  setBetSliderValue: (v: number) => void;
  showBetSlider: boolean;
  setShowBetSlider: (v: boolean) => void;
}

export const useUIStore = create<UIStore>(set => ({
  betSliderValue: 0,
  setBetSliderValue: (v) => set({ betSliderValue: v }),
  showBetSlider: false,
  setShowBetSlider: (v) => set({ showBetSlider: v }),
}));
