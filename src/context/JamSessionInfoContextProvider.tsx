import type { PropsWithChildren } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  getrescaninfoOptions,
  sessionOptions,
  takerstatusOptions,
} from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { TakerStatusResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useQuery } from '@tanstack/react-query'
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
  const paymentAttemptCreatedAt = currentPaymentAttempt?.createdAt

  const {
    data: takerStatusData,
    dataUpdatedAt: takerStatusDataUpdatedAt,
    refetch: refetchTakerStatus,
  } = useQuery({
    ...takerstatusOptions({
      client,
      path: { walletname: activeWalletFileName || '' },
    }),
    enabled: !!activeWalletFileName,
    refetchInterval: (query) => {
      // do not poll endlessly if the backend does not support the endpoint
      if (query.state.status === 'error' && !sessionTakerIsActive) return false
      return sessionTakerIsActive || query.state.data?.running === true ? JAM.RUNNING_COINJOIN_POLLING_INTERVAL : false
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

  const takerInfo = useMemo<TakerInfo>(() => {
    const isWalletPayment = currentPaymentAttempt?.walletFileName === activeWalletFileName
    const isCoinJoin = currentPaymentAttempt?.data.isCoinJoin === true
    const paymentAttempt = isWalletPayment && isCoinJoin ? currentPaymentAttempt : undefined

    // ignore a snapshot of a previous run fetched before the current payment attempt has been made
    const isStaleTakerStatus =
      paymentAttempt !== undefined &&
      takerStatusData?.running !== true &&
      takerStatusDataUpdatedAt < paymentAttempt.createdAt
    const takerStatus: TakerStatusResponse | undefined = isStaleTakerStatus ? undefined : takerStatusData

    const takerIsRunning = sessionTakerIsActive || takerStatus?.running === true
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
  }, [
    sessionTakerIsActive,
    takerStatusData,
    takerStatusDataUpdatedAt,
    state?.schedule,
    activeWalletFileName,
    currentPaymentAttempt,
  ])

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
