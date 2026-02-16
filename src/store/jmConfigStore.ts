import { createStore } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ConfigKey, ConfigValue } from '@/constants/jm'

export type JmConfigs = {
  [key: ConfigKey['section']]: Record<ConfigKey['field'], ConfigValue['value']>
}

interface JmConfigStoreState {
  state: JmConfigs
  get: (val: ConfigKey) => ConfigValue | null
  set: (val: ConfigValue) => void
  clear: () => void
}

const initial: JmConfigs = {}

export const jmConfigStore = createStore<JmConfigStoreState>()(
  persist(
    (set, get) => ({
      state: initial,
      get: (key) => {
        const value = get().state[key.section]?.[key.field]
        return value !== undefined ? { key, value } : null
      },
      set: (val) =>
        set((state) => {
          const currentSection = state.state[val.key.section] || {}
          return {
            state: {
              ...state.state,
              [val.key.section]: {
                ...currentSection,
                [val.key.field]: val.value,
              },
            },
          }
        }),
      clear: () => set({ state: initial }),
    }),
    {
      name: 'jm-config-store',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
