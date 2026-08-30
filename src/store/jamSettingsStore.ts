import { createStore, useStore } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { isDevMode } from '@/constants/debugFeatures'
import type { Currency } from '@/types/global'

type PreviewFeatures = {
  'tx-history'?: boolean
  // add more entries on demand
  // 'myCoolNewFeature'?: boolean
}

type ExpertFeatures = {
  'custom-earn-fee-values'?: boolean
  // add more entries on demand
  // 'myCoolNewExportFeature'?: boolean
}

export type JamSettings = {
  developerMode: boolean
  previewFeatures: PreviewFeatures | undefined
  expertFeatures: ExpertFeatures | undefined
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
  previewFeatures: isDevMode() ? {} : undefined,
  expertFeatures: isDevMode() ? {} : undefined,
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

export const usePreviewFeatures = () => {
  return useStore(jamSettingsStore, (state) => state.state.previewFeatures)
}

export const usePreviewFeatureEnabled = (name: keyof PreviewFeatures) => {
  return useStore(jamSettingsStore, (state) => state.state.previewFeatures?.[name])
}

export const useExpertFeatures = () => {
  return useStore(jamSettingsStore, (state) => state.state.expertFeatures)
}

export const useExpertFeatureEnabled = (name: keyof ExpertFeatures) => {
  return useStore(jamSettingsStore, (state) => state.state.expertFeatures?.[name])
}
