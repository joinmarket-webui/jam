import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { useApiClient } from '@/hooks/useApiClient'
import { calculateOfflineRetryDelay, isConnectivityError } from '@/lib/connectivity'
import { getErrorReason } from '@/lib/errorReason'
import { executeOfflineAction } from '@/lib/offlineActionExecutor'
import { connectivityStore } from '@/store/connectivityStore'
import { getOfflineActionLabel, offlineActionQueueStore, type OfflineAction } from '@/store/offlineActionQueueStore'

const PROCESSOR_INTERVAL = 1_000

const getNextActionToProcess = (actions: OfflineAction[], now: number): OfflineAction | undefined => {
  return actions
    .filter((action) => action.status === 'queued' && (action.nextRetryAt === undefined || action.nextRetryAt <= now))
    .toSorted((a, b) => {
      const aWhen = a.nextRetryAt ?? a.createdAt
      const bWhen = b.nextRetryAt ?? b.createdAt
      return aWhen - bWhen
    })[0]
}

export const useOfflineActionQueueProcessor = () => {
  const client = useApiClient()
  const browserOnline = useStore(connectivityStore, (state) => state.browserOnline)
  const processingActionIdRef = useRef<OfflineAction['id'] | undefined>(undefined)

  useEffect(() => {
    offlineActionQueueStore.getState().resetRetryingActions()
  }, [])

  const processNextAction = useCallback(async () => {
    if (!browserOnline || processingActionIdRef.current !== undefined) {
      return
    }

    const now = Date.now()
    const stateSnapshot = offlineActionQueueStore.getState()
    const nextAction = getNextActionToProcess(stateSnapshot.actions, now)

    if (!nextAction) {
      return
    }

    processingActionIdRef.current = nextAction.id
    stateSnapshot.markRetrying(nextAction.id)

    try {
      await executeOfflineAction(client, nextAction)
      offlineActionQueueStore.getState().remove(nextAction.id)

      toast.success(`${getOfflineActionLabel(nextAction)} completed.`)
    } catch (error) {
      const attempts = nextAction.attempts + 1
      const reason = getErrorReason(error, 'Unknown reason.')

      if (isConnectivityError(error)) {
        const retryDelay = calculateOfflineRetryDelay(attempts)
        const nextRetryAt = Date.now() + retryDelay

        offlineActionQueueStore.getState().markQueued(nextAction.id, {
          attempts,
          nextRetryAt,
          error: reason,
        })
      } else {
        offlineActionQueueStore.getState().markFailed(nextAction.id, {
          attempts,
          error: reason,
        })

        toast.error(`${getOfflineActionLabel(nextAction)} failed: ${reason}`)
      }
    } finally {
      processingActionIdRef.current = undefined
    }
  }, [browserOnline, client])

  useEffect(() => {
    void processNextAction()

    const timerId = setInterval(() => {
      void processNextAction()
    }, PROCESSOR_INTERVAL)

    return () => {
      clearInterval(timerId)
    }
  }, [processNextAction])
}
