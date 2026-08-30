import type { PropsWithChildren } from 'react'
import { useMemo, useState } from 'react'
import { getrescaninfoOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { createStore, useStore } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { JAM_RESCAN_PROGRESS_INTERVAL } from '@/constants/jam'
import { useApiClient } from '@/hooks/useApiClient'
import { withQueryDelay } from '@/lib/queryClient'
import { factorToPercentage, type WalletFileName } from '@/lib/utils'
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
  walletFileName: WalletFileName
}

export const JamSessionInfoContextProvider = ({
  walletFileName,
  children,
}: PropsWithChildren<JamSessionInfoContextProviderProps>) => {
  const { state } = useStore(jmSessionStore, (state) => state)
  const client = useApiClient()
  const [rescanInfo, setRescanInfo] = useState<RescanInfo>({
    updatedAt: 0,
    rescanning: state?.rescanning === true,
  })

  const {
    state: currentPaymentAttempt,
    update: setCurrentPaymentAttempt,
    clear: clearCurrentPaymentAttempt,
  } = useStore(paymentAttemptStore, (state) => state)

  const takerInfo = useMemo<TakerInfo>(() => {
    const isWalletPayment = currentPaymentAttempt?.walletFileName === walletFileName
    const isCoinJoin = currentPaymentAttempt?.data.isCoinJoin === true
    const takerIsRunning = state?.coinjoin_in_process === true
    const schedulerIsRunning = takerIsRunning && !!state?.schedule
    return {
      currentPaymentAttempt: isWalletPayment && isCoinJoin ? currentPaymentAttempt : undefined,
      running: takerIsRunning,
      scheduler: {
        running: schedulerIsRunning,
      },
    }
  }, [state?.coinjoin_in_process, state?.schedule, walletFileName, currentPaymentAttempt])

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
        path: { walletname: walletFileName },
      }),
    [client, walletFileName],
  )

  const getrescaninfoQuery = useQuery({
    ...getrescaninfoQueryOptions,
    queryFn: withQueryDelay(getrescaninfoQueryOptions.queryFn, {
      delayBefore: 1_000,
    }),
    refetchInterval: JAM_RESCAN_PROGRESS_INTERVAL,
    refetchIntervalInBackground: true,
    enabled: rescanInfo.rescanning || state?.rescanning === true,
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
    takerRunning: state?.coinjoin_in_process === true,
    takerInfo,
    makerInfo,
    rescanInfo,
    setRescanInfo,
    setCurrentPaymentAttempt,
    clearCurrentPaymentAttempt,
  }

  return <JamSessionInfoContext.Provider value={value}>{children}</JamSessionInfoContext.Provider>
}
