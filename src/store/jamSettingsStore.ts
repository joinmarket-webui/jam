import { createStore, useStore } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { isDevMode } from '@/constants/debugFeatures'
import type { Currency } from '@/types/global'

export type JamSettings = {
  developerMode: boolean
  privateMode: boolean
  addressChunking: boolean
  currencyUnit: Currency
  cheatsheetForceOpenAt?: number
}

interface JamSettingsStoreState {
  state: JamSettings
  update: (val: Partial<JamSettings>) => void
  clear: () => void
}

const initial: JamSettings = {
  developerMode: isDevMode(),
  privateMode: false,
  addressChunking: true,
  currencyUnit: 'sats',
  cheatsheetForceOpenAt: undefined,
}

export const jamSettingsStore = createStore<JamSettingsStoreState>()(
  persist(
    (set) => ({
      state: initial,
      update: (val) => set((state) => ({ state: { ...state.state, ...val } })),
      clear: () => set({ state: initial }),
    }),
    {
      name: 'jam-settings-store',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

export const useDeveloperMode = () => {
  const isDeveloperMode = useStore(jamSettingsStore, (state) => state.state.developerMode)
  return { enabled: isDeveloperMode }
}
