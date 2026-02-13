import { createStore } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ConfigKey, ConfigValue } from '@/constants/jm'

export type JmConfigs = {
  [key: ConfigKey['section']]: Record<ConfigKey['field'], ConfigValue['value']>
}

interface JmConfigStoreState {
  state: JmConfigs
  get: (val: ConfigKey) => ConfigValue | null
  getAll: () => ConfigValue[]
  set: (val: ConfigValue) => void
  clear: () => void
}

const initial: JmConfigs = {}

export const jmConfigStore = createStore<JmConfigStoreState>()(
  persist(
    (set, get) => ({
      state: initial,
      get: (key) => {
        const fields = get().state[key.section]
        if (fields === undefined) return null

        const value = fields[key.field]
        if (value === undefined) return null

        return {
          key,
          value: value || null,
        }
      },
      getAll: () => {
        return Object.entries(get().state).flatMap(([section, entries]) => {
          return Object.entries(entries).map(([field, value]) => ({
            key: {
              section,
              field,
            },
            value,
          }))
        })
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
      name: 'jm-config',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
