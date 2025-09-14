import { createStore } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { isDevMode } from '@/constants/debugFeatures'

export type JamSettings = {
  developerMode: boolean
}

interface JamSettingsStoreState {
  state: JamSettings
  update: (val: Partial<JamSettings>) => void
  clear: () => void
}

const initial = {
  developerMode: isDevMode(),
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
