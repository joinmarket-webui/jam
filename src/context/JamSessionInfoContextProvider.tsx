import type { PropsWithChildren } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  getrescaninfoOptions,
  sessionOptions,
  takerstatusOptions,
} from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { TakerStatusResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useQuery, type QueryFunction, type QueryKey } from '@tanstack/react-query'
import { createStore, useStore } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { JAM_RESCAN_PROGRESS_INTERVAL } from '@/constants/jam'
import * as JAM from '@/constants/jam'
import { useApiClient } from '@/hooks/useApiClient'
import { withQueryDelay } from '@/lib/queryClient'
import { toTakerStatusInfo } from '@/lib/takerStatus'
import { factorToPercentage, type WalletFileName } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import { JamSessionInfoContext } from './JamSessionInfoContext'
import type { MakerInfo, PaymentAttempt, RescanInfo, TakerInfo } from './JamSessionInfoContext'

interface PaymentAttemptStoreState {
  state?: PaymentAttempt
  update: (val: PaymentAttempt) => void
  clear: () => void
}

const paymentAttemptStore = createStore<PaymentAttemptStoreState>()(
  persist(
    (set) => ({
      state: undefined,
      update: (val) => set(() => ({ state: val })),
      clear: () => set({ state: undefined }),
    }),
    {
      name: 'jam-payment-attempt-store',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)

// the time of the request (not of the response) tells whether a snapshot can belong to a payment attempt
const withRequestTime = <TQueryFnData, TQueryKey extends QueryKey>(
  queryFn: QueryFunction<TQueryFnData, TQueryKey> | undefined,
): QueryFunction<{ requestedAt: number; response: TQueryFnData }, TQueryKey> | undefined => {
  if (queryFn === undefined) return undefined
  return async (context) => {
    const requestedAt = Date.now()
    return { requestedAt, response: await queryFn(context) }
  }
}

interface JamSessionInfoContextProviderProps {
  walletFileName?: WalletFileName
}

export const JamSessionInfoContextProvider = ({
  walletFileName,
  children,
}: PropsWithChildren<JamSessionInfoContextProviderProps>) => {
  const authWalletFileName = useStore(authStore, (state) => state.state?.walletFileName)
  const activeWalletFileName = walletFileName ?? authWalletFileName

  const { state, update: updateSessionInfo } = useStore(jmSessionStore, (state) => state)

  const client = useApiClient()

  const { data: sessionData, refetch: refetchSessionData } = useQuery({
    ...sessionOptions({
      client,
    }),
    enabled: true,
    retry: 3,
    staleTime: 1,
    gcTime: 1,
    refetchInterval: JAM.JAM_JM_SESSION_REFRESH_INTERVAL,
    refetchIntervalInBackground: true,
  })

  useEffect(() => {
    if (sessionData) {
      updateSessionInfo(sessionData)
    }
  }, [sessionData, updateSessionInfo])

  useEffect(
    function refetchOnWalletLockOrUnlock() {
      const abortCtrl = new AbortController()
      refetchSessionData().catch(() => {
        if (abortCtrl.signal.aborted) return
        console.warn('Error while refreshing session data after auth wallet change.')
      })
      return () => abortCtrl.abort()
    },
    [authWalletFileName, refetchSessionData],
  )

  const [rescanInfo, setRescanInfo] = useState<RescanInfo>({
    updatedAt: 0,
    rescanning: state?.rescanning === true,
  })

  const {
    state: currentPaymentAttempt,
    update: setCurrentPaymentAttempt,
    clear: clearCurrentPaymentAttempt,
  } = useStore(paymentAttemptStore, (state) => state)

  const sessionTakerIsActive = state?.coinjoin_in_process === true

  const paymentAttempt = useMemo(() => {
    const isWalletPayment = currentPaymentAttempt?.walletFileName === activeWalletFileName
    const isCoinJoin = currentPaymentAttempt?.data.isCoinJoin === true
    return isWalletPayment && isCoinJoin ? currentPaymentAttempt : undefined
  }, [currentPaymentAttempt, activeWalletFileName])
  const paymentAttemptCreatedAt = paymentAttempt?.createdAt
  const paymentAttemptIsPending = paymentAttempt !== undefined && paymentAttempt.outcome === undefined

  const takerStatusQueryOptions = useMemo(
    () =>
      takerstatusOptions({
        client,
        path: { walletname: activeWalletFileName || '' },
      }),
    [client, activeWalletFileName],
  )

  const { data: takerStatusData, refetch: refetchTakerStatus } = useQuery({
    queryKey: takerStatusQueryOptions.queryKey,
    queryFn: withRequestTime(takerStatusQueryOptions.queryFn),
    enabled: !!activeWalletFileName,
    // only poll while a taker is active or the outcome of a payment attempt is still unknown
    // (e.g. no endless polling if the backend does not support the endpoint)
    refetchInterval: (query) => {
      return sessionTakerIsActive || paymentAttemptIsPending || query.state.data?.response.running === true
        ? JAM.RUNNING_COINJOIN_POLLING_INTERVAL
        : false
    },
    refetchIntervalInBackground: true,
    retry: false,
  })

  useEffect(
    function refetchTakerStatusOnTakerStartOrStop() {
      if (!activeWalletFileName) return
      // fetch immediately when a taker starts (or a new payment attempt is made) to
      // replace a snapshot of a previous run, and when it stops to get its final outcome
      refetchTakerStatus().catch(() => {
        // empty on purpose
      })
    },
    [activeWalletFileName, sessionTakerIsActive, paymentAttemptCreatedAt, refetchTakerStatus],
  )

  // ignore a snapshot of a previous run requested before the current payment attempt has been made.
  // snapshots requested afterwards are safe: NG marks the taker as running and clears the previous
  // outcome before responding to `POST /taker/coinjoin` (and `createdAt` is set after it responded)
  const isStaleTakerStatus =
    paymentAttempt !== undefined &&
    takerStatusData !== undefined &&
    takerStatusData.response.running !== true &&
    takerStatusData.requestedAt < paymentAttempt.createdAt
  const liveTakerStatus: TakerStatusResponse | undefined = isStaleTakerStatus ? undefined : takerStatusData?.response
  const takerIsRunning = sessionTakerIsActive || liveTakerStatus?.running === true

  useEffect(
    function keepOutcomeOfPaymentAttempt() {
      // any taker run started afterwards (e.g. by the scheduler) must not be reported as outcome of this attempt
      if (paymentAttempt === undefined || paymentAttempt.outcome !== undefined) return
      if (takerIsRunning || liveTakerStatus === undefined) return
      setCurrentPaymentAttempt({ ...paymentAttempt, outcome: liveTakerStatus })
    },
    [paymentAttempt, takerIsRunning, liveTakerStatus, setCurrentPaymentAttempt],
  )

  const takerInfo = useMemo<TakerInfo>(() => {
    const takerStatus = paymentAttempt?.outcome ?? liveTakerStatus
    const schedulerIsRunning = takerIsRunning && !!state?.schedule
    return {
      currentPaymentAttempt: paymentAttempt,
      running: takerIsRunning,
      status: toTakerStatusInfo(takerStatus),
      __raw: takerStatus,

      // TODO: move the scheduler to own "schedulerInfo"
      scheduler: {
        running: schedulerIsRunning,
      },
    }
  }, [paymentAttempt, liveTakerStatus, takerIsRunning, state?.schedule])

  const makerInfo = useMemo<MakerInfo>(() => {
    const makerIsRunning = state?.maker_running === true
    return {
      running: makerIsRunning,
    }
  }, [state?.maker_running])

  const getrescaninfoQueryOptions = useMemo(
    () =>
      getrescaninfoOptions({
        client,
        path: { walletname: activeWalletFileName || '' },
      }),
    [client, activeWalletFileName],
  )

  const getrescaninfoQuery = useQuery({
    ...getrescaninfoQueryOptions,
    queryFn: withQueryDelay(getrescaninfoQueryOptions.queryFn, {
      delayBefore: 1_000,
    }),
    refetchInterval: JAM_RESCAN_PROGRESS_INTERVAL,
    refetchIntervalInBackground: true,
    enabled: !!activeWalletFileName && (rescanInfo.rescanning || state?.rescanning === true),
  })

  // only update rescan info if data is available and the current rescan info is younger than the latest data from the query
  // e.g. this prevents updating with stale data if components manually update it and want the query interval updater to refetch data later
  const shouldUpdateRescanInfo =
    getrescaninfoQuery.data &&
    (rescanInfo.updatedAt === undefined || rescanInfo.updatedAt < getrescaninfoQuery.dataUpdatedAt)

  if (shouldUpdateRescanInfo) {
    const isRescanning = getrescaninfoQuery.data.rescanning || state?.rescanning === true
    const rescanningFinished = getrescaninfoQuery.data.rescanning === false && state?.rescanning === true

    const progress = rescanningFinished ? 1 : (getrescaninfoQuery.data.progress ?? undefined)
    setRescanInfo({
      updatedAt: getrescaninfoQuery.dataUpdatedAt,
      rescanning: isRescanning,
      progress: progress,
      progressInPercentage: progress === undefined ? undefined : factorToPercentage(progress).toFixed(1),
    })
  }

  const value = {
    blockHeight: state?.block_height ?? undefined,
    takerInfo,
    makerInfo,
    jmSession: state,
    rescanInfo,
    setRescanInfo,
    setCurrentPaymentAttempt,
    clearCurrentPaymentAttempt,
    updateSessionInfo,
  }

  return <JamSessionInfoContext.Provider value={value}>{children}</JamSessionInfoContext.Provider>
}
