import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { createStore } from 'zustand'

interface JmSessionStoreState {
  state?: SessionResponse & { __updatedAt: number }
  update: (val: SessionResponse) => void
}

export const jmSessionStore = createStore<JmSessionStoreState>()((set) => ({
  state: undefined,
  update: (val) => set(() => ({ state: { ...val, __updatedAt: Date.now() } })),
}))
