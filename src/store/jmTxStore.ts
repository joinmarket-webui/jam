import type { DirectSendResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { createStore } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type TxId = NonNullable<DirectSendResponse['txinfo']['txid']>
export type JmTxInfo = Omit<DirectSendResponse['txinfo'], 'txid'> & {
  txid: TxId
}

export type JmTxInfos = {
  [key: TxId]: {
    data: JmTxInfo
    insertedAt: number
    updatedAt: number
  }
}

interface JmTxStoreState {
  state: JmTxInfos
  get: (txid: TxId) => JmTxInfo | undefined
  getAll: () => JmTxInfos
  add: (val: JmTxInfo) => void
  clear: () => void
}

export const jmTxStore = createStore<JmTxStoreState>()(
  persist(
    (set, get) => ({
      state: {} as JmTxInfos,
      get: (txid) => get().state[txid]?.data,
      getAll: () => get().state,
      add: (data) =>
        set((state) => {
          const now = Date.now()
          const copy = { ...state.state }
          copy[data.txid] = {
            data,
            insertedAt: copy[data.txid]?.insertedAt || now,
            updatedAt: now,
          }
          return { state: copy }
        }),
      clear: () => set({ state: {} as JmTxInfos }),
    }),
    {
      name: 'jm-tx-store',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
