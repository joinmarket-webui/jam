import type { DirectSendRequest, RecoverWalletRequest } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { createStore } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { FeeConfigName } from '@/constants/jm'
import type { WalletFileName } from '@/lib/utils'

export type OfflineActionType = 'send' | 'import_wallet' | 'rescan_chain' | 'update_fee_settings'
export type OfflineActionStatus = 'queued' | 'retrying' | 'failed'

interface OfflineActionMeta {
  label?: string
  summary?: string
}

interface OfflineActionBase<Type extends OfflineActionType, Payload> {
  id: string
  type: Type
  payload: Payload
  status: OfflineActionStatus
  attempts: number
  nextRetryAt?: number
  lastError?: string
  createdAt: number
  updatedAt: number
  meta?: OfflineActionMeta
}

export type OfflineSendActionPayload = {
  walletFileName: WalletFileName
  request: Pick<DirectSendRequest, 'amount_sats' | 'destination' | 'mixdepth'>
}

export type OfflineImportWalletActionPayload = {
  request: RecoverWalletRequest
}

export type OfflineRescanChainActionPayload = {
  walletFileName: WalletFileName
  blockHeight: number
}

export type OfflineFeeSettingsActionPayload = {
  walletFileName: WalletFileName
  updates: Array<{ key: FeeConfigName; value: string }>
}

export type OfflineSendAction = OfflineActionBase<'send', OfflineSendActionPayload>
export type OfflineImportWalletAction = OfflineActionBase<'import_wallet', OfflineImportWalletActionPayload>
export type OfflineRescanChainAction = OfflineActionBase<'rescan_chain', OfflineRescanChainActionPayload>
export type OfflineFeeSettingsAction = OfflineActionBase<'update_fee_settings', OfflineFeeSettingsActionPayload>

export type OfflineAction =
  | OfflineSendAction
  | OfflineImportWalletAction
  | OfflineRescanChainAction
  | OfflineFeeSettingsAction

export type EnqueueOfflineActionInput =
  | Pick<OfflineSendAction, 'type' | 'payload' | 'meta'>
  | Pick<OfflineImportWalletAction, 'type' | 'payload' | 'meta'>
  | Pick<OfflineRescanChainAction, 'type' | 'payload' | 'meta'>
  | Pick<OfflineFeeSettingsAction, 'type' | 'payload' | 'meta'>

interface OfflineActionQueueStoreState {
  actions: OfflineAction[]
  enqueue: (input: EnqueueOfflineActionInput) => OfflineAction
  remove: (id: OfflineAction['id']) => void
  markRetrying: (id: OfflineAction['id']) => void
  markQueued: (id: OfflineAction['id'], details?: { attempts?: number; nextRetryAt?: number; error?: string }) => void
  markFailed: (id: OfflineAction['id'], details?: { attempts?: number; error?: string }) => void
  requestRetry: (id: OfflineAction['id']) => void
  resetRetryingActions: () => void
  clear: () => void
}

const createOfflineActionId = (): OfflineAction['id'] => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const updateAction = (
  actions: OfflineAction[],
  id: OfflineAction['id'],
  updateFn: (current: OfflineAction) => OfflineAction,
): OfflineAction[] => {
  return actions.map((action) => {
    if (action.id !== id) {
      return action
    }

    return updateFn(action)
  })
}

const initialActions: OfflineAction[] = []

export const offlineActionQueueStore = createStore<OfflineActionQueueStoreState>()(
  persist(
    (set) => ({
      actions: initialActions,
      enqueue: (input) => {
        const now = Date.now()
        const action: OfflineAction = {
          ...input,
          id: createOfflineActionId(),
          status: 'queued',
          attempts: 0,
          createdAt: now,
          updatedAt: now,
          nextRetryAt: undefined,
          lastError: undefined,
        }

        set((state) => ({ actions: [...state.actions, action] }))
        return action
      },
      remove: (id) => {
        set((state) => ({ actions: state.actions.filter((action) => action.id !== id) }))
      },
      markRetrying: (id) => {
        set((state) => ({
          actions: updateAction(state.actions, id, (current) => ({
            ...current,
            status: 'retrying',
            updatedAt: Date.now(),
          })),
        }))
      },
      markQueued: (id, details) => {
        set((state) => ({
          actions: updateAction(state.actions, id, (current) => ({
            ...current,
            status: 'queued',
            attempts: details?.attempts ?? current.attempts,
            nextRetryAt: details?.nextRetryAt,
            lastError: details?.error,
            updatedAt: Date.now(),
          })),
        }))
      },
      markFailed: (id, details) => {
        set((state) => ({
          actions: updateAction(state.actions, id, (current) => ({
            ...current,
            status: 'failed',
            attempts: details?.attempts ?? current.attempts,
            lastError: details?.error,
            nextRetryAt: undefined,
            updatedAt: Date.now(),
          })),
        }))
      },
      requestRetry: (id) => {
        set((state) => ({
          actions: updateAction(state.actions, id, (current) => ({
            ...current,
            status: 'queued',
            nextRetryAt: undefined,
            lastError: undefined,
            updatedAt: Date.now(),
          })),
        }))
      },
      resetRetryingActions: () => {
        set((state) => ({
          actions: state.actions.map((action) => {
            if (action.status !== 'retrying') {
              return action
            }

            return {
              ...action,
              status: 'queued',
              updatedAt: Date.now(),
            }
          }),
        }))
      },
      clear: () => set({ actions: initialActions }),
    }),
    {
      name: 'jam-offline-action-queue-store',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

export const getOfflineActionLabel = (action: Pick<OfflineAction, 'type' | 'meta'>): string => {
  if (action.meta?.label) {
    return action.meta.label
  }

  switch (action.type) {
    case 'send':
      return 'Send transaction'
    case 'import_wallet':
      return 'Import wallet'
    case 'rescan_chain':
      return 'Rescan blockchain'
    case 'update_fee_settings':
      return 'Update fee settings'
    default:
      return 'Wallet action'
  }
}
