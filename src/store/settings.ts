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

// Resolves when AsyncStorage hydration completes — even if you .then() it after
// the fact, it still fires. Avoids the useEffect race condition where hydration
// completes before the effect subscribes to onFinishHydration.
let _resolveHydrated!: () => void;
export const settingsHydrated = new Promise<void>((r) => {
  _resolveHydrated = r;
});

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
      onRehydrateStorage: () => (_state, error) => {
        if (!error) _resolveHydrated();
      },
    }
  )
);
