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
  getRevision: (key: ConfigKey) => string
  clear: () => void
}

const initial: JmConfigs = {}
// Track resets and same-key writes without invalidating unrelated reads.
let generation = 0
const revisions = new Map<string, number>()
const revisionKey = (key: ConfigKey) => `${key.section}:${key.field}`

export const jmConfigStore = createStore<JmConfigStoreState>()(
  persist(
    (set, get) => ({
      state: initial,
      get: (key) => {
        const value = get().state[key.section]?.[key.field]
        return value !== undefined ? { key, value } : null
      },
      set: (val) => {
        const key = revisionKey(val.key)
        revisions.set(key, (revisions.get(key) ?? 0) + 1)
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
        })
      },
      getRevision: (key) => `${generation}:${revisions.get(revisionKey(key)) ?? 0}`,
      clear: () => {
        generation++
        revisions.clear()
        set({ state: initial })
      },
    }),
    {
      name: 'jm-config-store',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
