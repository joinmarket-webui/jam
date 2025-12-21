import { createStore } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { isDevMode } from '@/constants/debugFeatures'
import type { Currency } from '@/types/global'

export type JamSettings = {
  developerMode: boolean
  privateMode: boolean
  currencyUnit: Currency
  powerUserMode: boolean
}

interface JamSettingsStoreState {
  state: JamSettings
  update: (val: Partial<JamSettings>) => void
  clear: () => void
}

const initial: JamSettings = {
  developerMode: isDevMode(),
  privateMode: false,
  currencyUnit: 'sats',
  powerUserMode: false,
}

export const jamSettingsStore = createStore<JamSettingsStoreState>()(
  persist(
    (set) => ({
      state: initial,
      update: (val) => set((state) => ({ state: { ...(state.state || {}), ...val } })),
      clear: () => set({ state: initial }),
    }),
    {
      name: 'jam-settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
