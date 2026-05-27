import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type PaletteKey = 'light' | 'dark' | 'terminal' | 'navy' | 'warm' | 'cool';

interface SettingsState {
  colorPalette: PaletteKey;
  privateMode: boolean;
  setColorPalette: (p: PaletteKey) => void;
  setPrivateMode: (on: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      colorPalette: 'light',
      privateMode: false,
      setColorPalette: (colorPalette) => set({ colorPalette }),
      setPrivateMode: (privateMode) => set({ privateMode }),
    }),
    {
      name: 'app-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
