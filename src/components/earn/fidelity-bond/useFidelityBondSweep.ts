import { useMemo } from 'react'
import type { DirectSendResponse } from '@joinmarket-webui/joinmarket-ng-api-ts/jm'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import type { FidelityBondUtxo, Utxo } from '@/hooks/useQueryUtxos'
import type { WalletFileName } from '@/lib/utils'
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
  const walletInfo = useJamWalletInfoContext()
  const { freezeUtxo, unfreezeUtxo, directSend, error, setError } = useFidelityBondMutations({
    unfreezeErrorKey,
    sendErrorKey,
  })

  const sourceJar = walletInfo.jars.find((jar) => jar.jarIndex === utxo.mixdepth)

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
  const sweep = async (destination: string, onBroadcast: (result: DirectSendResponse) => void): Promise<boolean> => {
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
          amount_sats: 0,
          destination,
        },
      })

      onBroadcast(result)

      // Best-effort cleanup — tx already broadcast, don't throw on unfreeze failure
      for (const u of frozen) {
        try {
          await unfreezeUtxo.mutateAsync({
            path: { walletname: walletFileName },
            body: { 'utxo-string': u.utxo, freeze: false },
          })
        } catch {
          // logged via onError
        }
      }

      await walletInfo.refetch()
      return true
    } catch {
      // Best-effort rollback — unfreeze UTXOs that were frozen before the error
      for (const u of frozen) {
        try {
          await unfreezeUtxo.mutateAsync({
            path: { walletname: walletFileName },
            body: { 'utxo-string': u.utxo, freeze: false },
          })
        } catch {
          // logged via onError
        }
      }
      return false
    }
  }

  const isLoading = freezeUtxo.isPending || unfreezeUtxo.isPending || directSend.isPending

  return { sweep, isLoading, error, setError, sourceJar }
}
