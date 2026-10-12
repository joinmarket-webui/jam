import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { createStore } from 'zustand'

interface JmSessionStoreState {
  state?: SessionResponse & { __updatedAt: number }
  update: (val: SessionResponse, updatedAt?: number) => void
}

export const jmSessionStore = createStore<JmSessionStoreState>()((set) => ({
  state: undefined,
  update: (val, updatedAt = Date.now()) => set(() => ({ state: { ...val, __updatedAt: updatedAt } })),
}))
