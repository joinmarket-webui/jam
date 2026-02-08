import type { DirectSendResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { createStore } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type TxId = NonNullable<DirectSendResponse['txinfo']['txid']>
export type JmTxInfo = Omit<DirectSendResponse['txinfo'], 'txid'> & {
  txid: TxId
}

type JmTxInfoMap = Map<TxId, JmTxInfo>

interface JmTxStoreState {
  state: JmTxInfoMap
  get: (txid: TxId) => JmTxInfo | undefined
  getAll: () => JmTxInfoMap
  add: (val: JmTxInfo) => void
  clear: () => void
}

export const jmTxStore = createStore<JmTxStoreState>()(
  persist(
    (set, get) => ({
      state: new Map([] as [TxId, JmTxInfo][]),
      get: (txid) => get().state.get(txid),
      getAll: () => get().state,
      add: (val) =>
        set((state) => ({
          state: new Map(state.state).set(val.txid, val),
        })),
      clear: () => set({ state: new Map() }),
    }),
    {
      name: 'jm-tx-store',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
