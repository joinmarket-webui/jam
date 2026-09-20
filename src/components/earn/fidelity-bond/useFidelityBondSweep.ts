import type { DirectSendResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { JAM_TRY_FREEZE_CREATED_FIDELITY_BOND_OUTPUTS_DELAY } from '@/constants/jam'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import type { FidelityBondUtxo } from '@/hooks/useQueryUtxos'
import { delayedPromise, type WalletFileName } from '@/lib/utils'
import { useFidelityBondMutations } from './useFidelityBondMutations'

/**
 * Sweeps a fidelity bond UTXO to a destination address: unfreezes the bond if
 * needed, then direct-sends exactly that utxo via `input_utxos`. Shared by the
 * renew and move-to-jar flows.
 *
 * Pinning the input is what makes this safe. A mixdepth sweep spends the regular
 * unfrozen coins first and only falls back to an expired bond when there are
 * none, so the previous approach (freeze everything else, sweep the mixdepth)
 * would spend a coin that arrived in the jar after the freeze snapshot instead
 * of the bond - and report success.
 */
export function useFidelityBondSweep({
  walletFileName,
  utxo,
  unfreezeErrorKey,
  sendErrorKey,
}: {
  walletFileName: WalletFileName
  utxo: FidelityBondUtxo
  unfreezeErrorKey: string
  sendErrorKey: string
}) {
  const { t } = useTranslation()
  const { jars, refetch: walletInfoRefetch } = useJamWalletInfoContext()
  const { freezeUtxo, unfreezeUtxo, directSend, error, setError } = useFidelityBondMutations({
    unfreezeErrorKey,
    sendErrorKey,
  })

  const sourceJar = jars.find((jar) => jar.jarIndex === utxo.mixdepth)

  /**
   * Runs the sweep. `onBroadcastSuccess` fires as soon as the transaction is
   * sent. Returns undefined when the sweep failed (after a best-effort rollback).
   */
  const { isPending, mutateAsync: sweep } = useMutation({
    mutationFn: async ({
      destination,
      tryFreezeAfterBroadcast,
      onBroadcastSuccess,
    }: {
      destination: string
      tryFreezeAfterBroadcast: boolean
      onBroadcastSuccess?: (result: DirectSendResponse) => Promise<void>
    }): Promise<DirectSendResponse | undefined> => {
      setError(undefined)

      // Bail out instead of broadcasting if the bond has left the jar since the
      // dialog was opened - the API rejects an unknown input, but there is no
      // point in unfreezing anything first.
      const bondStillInJar = sourceJar?.utxos.some((it) => it.utxo === utxo.utxo) === true
      if (!bondStillInJar) {
        setError(t('earn.fidelity_bond.error_bond_not_in_jar'))
        return undefined
      }

      let bondWasUnfrozen = false
      let sweepBroadcasted = false

      try {
        if (utxo.frozen) {
          await unfreezeUtxo.mutateAsync({
            path: { walletname: walletFileName },
            body: { 'utxo-string': utxo.utxo, freeze: false },
          })
          bondWasUnfrozen = true
        }

        const result = await directSend.mutateAsync({
          path: { walletname: walletFileName },
          body: {
            mixdepth: utxo.mixdepth,
            amount_sats: 0, // 0 := sweep!
            destination,
            // Pin the bond so the sweep spends exactly this utxo, regardless of
            // what else is unfrozen in the mixdepth at broadcast time.
            input_utxos: [utxo.utxo],
          },
        })
        sweepBroadcasted = true

        if (tryFreezeAfterBroadcast) {
          try {
            await delayedPromise(JAM_TRY_FREEZE_CREATED_FIDELITY_BOND_OUTPUTS_DELAY)

            const fbUtxoId = `${result.txinfo.txid}:0` // sent with a sweep, so it is a single output
            await freezeUtxo.mutateAsync({
              path: { walletname: walletFileName },
              body: { 'utxo-string': fbUtxoId, freeze: true },
              throwOnError: true,
            })
          } catch (_ignoredOnPurpose: unknown) {
            console.warn('Error while freezing Fidelity Bond UTXO - continuing.')
          }
        }

        try {
          await onBroadcastSuccess?.(result)
        } catch (error: unknown) {
          console.warn('onBroadcastSuccess failed', error)
        }

        return result
      } catch (_ignoredOnPurpose: unknown) {
        // re-freeze the bond if it was unfrozen before the error. skip once the
        // sweep already broadcast, the bond utxo is spent by then
        if (bondWasUnfrozen && !sweepBroadcasted) {
          try {
            await freezeUtxo.mutateAsync({
              path: { walletname: walletFileName },
              body: { 'utxo-string': utxo.utxo, freeze: true },
              throwOnError: true,
            })
          } catch (_ignoredOnPurpose: unknown) {
            console.debug('Error while re-freezing fidelity bond UTXO in error handling.')
          }
        }

        return undefined
      } finally {
        // refetch only if the sweep broadcast, and don't let a refetch error
        // get treated as a sweep failure
        if (sweepBroadcasted) {
          try {
            await walletInfoRefetch()
          } catch (error: unknown) {
            console.warn('Error while refetching wallet info after sweep.', error)
          }
        }
      }
    },
    retry: false,
  })

  return { sweep, isLoading: isPending, error, setError, sourceJar }
}
