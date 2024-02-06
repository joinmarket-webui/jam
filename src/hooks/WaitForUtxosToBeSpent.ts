import { useEffect } from 'react'
import { useReloadCurrentWalletInfo } from '../context/WalletContext'
import { UtxoId } from '../libs/JmWalletApi'

// Delaying the poll requests gives the wallet some time to synchronize
// the utxo set and reduces amount of http requests
const DEFAUL_DELAY: Milliseconds = 1_000

interface WaitForUtxosToBeSpentArgs {
  waitForUtxosToBeSpent: UtxoId[]
  setWaitForUtxosToBeSpent: (utxos: UtxoId[]) => void
  onError: (error: any) => void
  delay?: Milliseconds
  resetOnErrors?: boolean
}

// This callback is responsible for updating the utxo array when a
// payment is made. The wallet needs some time after a tx is sent
// to reflect the changes internally. All outputs given in
// `waitForUtxosToBeSpent` must have been removed from the wallet
// for a payment to be considered done.
export const useWaitForUtxosToBeSpent = ({
  waitForUtxosToBeSpent,
  setWaitForUtxosToBeSpent,
  onError,
  delay = DEFAUL_DELAY,
  resetOnErrors = true,
}: WaitForUtxosToBeSpentArgs): void => {
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  return useEffect(() => {
    if (waitForUtxosToBeSpent.length === 0) return

    const abortCtrl = new AbortController()

    const timer = setTimeout(() => {
      if (abortCtrl.signal.aborted) return

      reloadCurrentWalletInfo
        .reloadUtxos({ signal: abortCtrl.signal })
        .then((res) => {
          if (abortCtrl.signal.aborted) return

          const outputs = res.utxos.map((it) => it.utxo)
          const utxosStillPresent = waitForUtxosToBeSpent.filter((it) => outputs.includes(it))

          // updating the utxos array will trigger a recursive call
          setWaitForUtxosToBeSpent([...utxosStillPresent])
        })
        .catch((error: any) => {
          if (abortCtrl.signal.aborted) return
          if (resetOnErrors) {
            // Stop waiting for wallet synchronization on errors
            setWaitForUtxosToBeSpent([])
          }
          onError(error)
        })
    }, delay)

    return () => {
      abortCtrl.abort()
      clearTimeout(timer)
    }
  }, [waitForUtxosToBeSpent, setWaitForUtxosToBeSpent, resetOnErrors, onError, delay, reloadCurrentWalletInfo])
}
