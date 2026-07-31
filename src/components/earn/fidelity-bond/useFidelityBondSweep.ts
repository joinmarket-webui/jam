import { useMemo } from 'react'
import type { DirectSendResponse } from '@joinmarket-webui/joinmarket-ng-api-ts/jm'
import { useMutation } from '@tanstack/react-query'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import type { FidelityBondUtxo, Utxo } from '@/hooks/useQueryUtxos'
import { delayedPromise, type WalletFileName } from '@/lib/utils'
import { useFidelityBondMutations } from './useFidelityBondMutations'

/**
 * Sweeps a fidelity bond UTXO to a destination address: freezes all other
 * UTXOs in the source jar, unfreezes the bond if needed, direct-sends the
 * whole jar balance, then restores the frozen UTXOs. Shared by the renew
 * and move-to-jar flows.
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
  const { jars, refetch: walletInfoRefetch } = useJamWalletInfoContext()
  const { freezeUtxo, unfreezeUtxo, directSend, error, setError } = useFidelityBondMutations({
    unfreezeErrorKey,
    sendErrorKey,
  })

  const sourceJar = jars.find((jar) => jar.jarIndex === utxo.mixdepth)

  // UTXOs in the source jar that are NOT this FB — they need to be frozen during sweep
  const utxosToFreeze = useMemo(() => {
    if (!sourceJar) return []
    return sourceJar.utxos.filter((u) => u.utxo !== utxo.utxo && !u.frozen)
  }, [sourceJar, utxo.utxo])

  /**
   * Runs the sweep. `onBroadcast` fires as soon as the transaction is sent,
   * before the frozen UTXOs are restored. Returns false when the sweep failed
   * (after a best-effort rollback).
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

      const frozen: Utxo[] = []
      try {
        // Freeze other UTXOs in the source jar so only the FB gets swept
        for (const u of utxosToFreeze) {
          await freezeUtxo.mutateAsync({
            path: { walletname: walletFileName },
            body: { 'utxo-string': u.utxo, freeze: true },
          })
          frozen.push(u)
        }

        if (utxo.frozen) {
          await unfreezeUtxo.mutateAsync({
            path: { walletname: walletFileName },
            body: { 'utxo-string': utxo.utxo, freeze: false },
          })
        }

        const result = await directSend.mutateAsync({
          path: { walletname: walletFileName },
          body: {
            mixdepth: utxo.mixdepth,
            amount_sats: 0, // 0 := sweep!
            destination,
          },
        })

        if (tryFreezeAfterBroadcast) {
          try {
            await delayedPromise(1_000) // provide some time for the backend to catch up, small delay of 1s seems to be enough
            const fbUtxoId = `${result.txinfo.txid}:0` // sent with a sweep, so it is a single output
            await freezeUtxo.mutateAsync({
              path: { walletname: walletFileName },
              body: { 'utxo-string': fbUtxoId, freeze: true },
              throwOnError: true,
            })
          } catch (_ignoredOnPurpose: unknown) {
            console.warn('Error while freezing Fidelity Bond UTXO - continueing.')
          }
        }

        try {
          await onBroadcastSuccess?.(result)
        } catch (error: unknown) {
          console.warn('onBroadcastSuccess failed', error)
        }

        // Best-effort cleanup — tx already broadcast, don't throw on unfreeze failure
        for (const u of frozen) {
          try {
            await unfreezeUtxo.mutateAsync({
              path: { walletname: walletFileName },
              body: { 'utxo-string': u.utxo, freeze: false },
              throwOnError: true,
            })
          } catch (_ignoredOnPurpose: unknown) {
            // only debug output
            console.debug('Error while unfreezing previously frozen UTXO.')
          }
        }

        await walletInfoRefetch()
        return result
      } catch (_ignoredOnPurpose: unknown) {
        // Best-effort rollback — unfreeze UTXOs that were frozen before the error
        for (const u of frozen) {
          try {
            await unfreezeUtxo.mutateAsync({
              path: { walletname: walletFileName },
              body: { 'utxo-string': u.utxo, freeze: false },
              throwOnError: true,
            })
          } catch (_ignoredOnPurpose: unknown) {
            // only debug output
            console.debug('Error while unfreezing previously frozen UTXO in error handling.')
          }
        }
        return undefined
      }
    },
    retry: false,
  })

  return { sweep, isLoading: isPending, error, setError, sourceJar }
}
