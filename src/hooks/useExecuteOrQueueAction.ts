import { useCallback } from 'react'
import { useStore } from 'zustand'
import { isConnectivityError } from '@/lib/connectivity'
import { selectConnectionUnavailable, connectivityStore } from '@/store/connectivityStore'
import type { EnqueueOfflineActionInput, OfflineAction } from '@/store/offlineActionQueueStore'
import { offlineActionQueueStore } from '@/store/offlineActionQueueStore'

export type ExecuteOrQueueResult<TData> =
  | {
      status: 'executed'
      data: TData
    }
  | {
      status: 'queued'
      action: OfflineAction
    }

interface ExecuteOrQueueActionOptions<TData> {
  execute: () => Promise<TData>
  queueAction: EnqueueOfflineActionInput
}

export const useExecuteOrQueueAction = () => {
  const connectionUnavailable = useStore(connectivityStore, selectConnectionUnavailable)
  const enqueue = useStore(offlineActionQueueStore, (state) => state.enqueue)

  return useCallback(
    async <TData>({
      execute,
      queueAction,
    }: ExecuteOrQueueActionOptions<TData>): Promise<ExecuteOrQueueResult<TData>> => {
      if (connectionUnavailable) {
        return {
          status: 'queued',
          action: enqueue(queueAction),
        }
      }

      try {
        const data = await execute()
        return {
          status: 'executed',
          data,
        }
      } catch (error) {
        if (!isConnectivityError(error)) {
          throw error
        }

        return {
          status: 'queued',
          action: enqueue(queueAction),
        }
      }
    },
    [connectionUnavailable, enqueue],
  )
}
