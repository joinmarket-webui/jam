import { useEffect } from 'react'
import type { WalletFileName } from '@/lib/utils'
import type { Milliseconds } from '@/types/global'
import { useQueryUtxos, type UtxoId } from './useQueryUtxos'

// Delaying the poll requests gives the wallet some time to synchronize
// the utxo set and reduces amount of http requests
const DEFAUL_DELAY: Milliseconds = 1_000

interface WaitForUtxosToBeSpentArguments {
  walletFileName: WalletFileName
  waitForUtxosToBeSpent: UtxoId[]
  setWaitForUtxosToBeSpent: (utxos: UtxoId[]) => void
  onError: (error: unknown) => void
  delay?: Milliseconds
  resetOnErrors?: boolean
}

// This callback is responsible for updating the utxo array when a
// payment is made. The wallet needs some time after a tx is sent
// to reflect the changes internally. All outputs given in
// `waitForUtxosToBeSpent` must have been removed from the wallet
// for a payment to be considered done.
export const useWaitForUtxosToBeSpent = ({
  walletFileName,
  waitForUtxosToBeSpent,
  setWaitForUtxosToBeSpent,
  onError,
  delay = DEFAUL_DELAY,
  resetOnErrors = true,
}: WaitForUtxosToBeSpentArguments): void => {
  const {
    queryResult: { refetch },
  } = useQueryUtxos({ walletFileName })

  return useEffect(() => {
    if (waitForUtxosToBeSpent.length === 0) return

    const abortCtrl = new AbortController()

    const updateUtxos = async (signal: AbortSignal) => {
      if (signal.aborted) return
      try {
        const result = await refetch({ throwOnError: true })
        if (signal.aborted) return
        const outputs = result?.data?.utxos?.map((it) => it.utxo)
        const utxosStillPresent = waitForUtxosToBeSpent.filter((it) => outputs?.includes(it))
        // updating the utxos array will trigger a recursive call
        setWaitForUtxosToBeSpent([...utxosStillPresent])
      } catch (error: unknown) {
        if (signal.aborted) return
        if (resetOnErrors) {
          // Stop waiting for wallet synchronization on errors
          setWaitForUtxosToBeSpent([])
        }
        onError(error)
      }
    }

    const timer = setTimeout(() => {
      void updateUtxos(abortCtrl.signal)
    }, delay)

    return () => {
      abortCtrl.abort()
      clearTimeout(timer)
    }
  }, [waitForUtxosToBeSpent, setWaitForUtxosToBeSpent, resetOnErrors, onError, delay, refetch])
}
