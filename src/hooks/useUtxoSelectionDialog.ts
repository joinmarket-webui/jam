import { useMemo, useState } from 'react'
import { freezeMutation } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import type { RowSelectionState } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { UtxoSelectionDialogProps } from '@/components/send/UtxoSelectionDialog'
import type { AddressSummary, Jar } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import type { Utxo } from '@/hooks/useQueryUtxos'
import * as fb from '@/lib/fidelityBondUtils'
import { utxoTags } from '@/lib/tags'
import type { WalletFileName } from '@/lib/utils'
import type { JarIndex } from '@/types/global'

const SEND_AUTO_SELECTION_TOAST_ID = 'send.utxo.selection_changed_automatically'

interface UseUtxoSelectionDialogProps {
  walletFileName: WalletFileName
  jars: Jar[]
  addressSummary: AddressSummary
}

export const useUtxoSelectionDialog = ({
  walletFileName,
  jars,
  addressSummary,
}: UseUtxoSelectionDialogProps) => {
  const { t } = useTranslation()
  const client = useApiClient()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [sourceJarIndex, setSourceJarIndex] = useState<JarIndex>()

  const sourceJar = useMemo(() => {
    if (sourceJarIndex === undefined) return
    return jars.find((it) => it.jarIndex === sourceJarIndex)
  }, [jars, sourceJarIndex])

  const tableEntries = useMemo(() => {
    return (sourceJar?.utxos || []).map((utxo) => ({
      utxo,
      tags: utxoTags(utxo, addressSummary, t),
    }))
  }, [addressSummary, sourceJar?.utxos, t])

  const initialRowSelection = useMemo<RowSelectionState>(() => {
    return (sourceJar?.utxos || []).reduce((acc, utxo) => {
      if (utxo.frozen === false && !fb.utxo.isFidelityBond(utxo)) {
        acc[utxo.utxo] = true
      }
      return acc
    }, {} as RowSelectionState)
  }, [sourceJar?.utxos])

  const selectedUtxos = useMemo(() => {
    return (sourceJar?.utxos || []).filter((utxo) => rowSelection[utxo.utxo] === true)
  }, [sourceJar?.utxos, rowSelection])

  const { mutateAsync: freezeOrUnfreezeUtxoMutateAsync } = useMutation({
    ...freezeMutation({ client }),
    retry: false,
  })

  const { mutateAsync: applyUtxoSelectionMutateAsync, isPending: isApplying } = useMutation({
    mutationFn: async ({ utxosToFreeze, utxosToUnfreeze }: { utxosToFreeze: Utxo[]; utxosToUnfreeze: Utxo[] }) => {
      const [freezeResult, unfreezeResult] = await Promise.all([
        Promise.allSettled(
          utxosToFreeze.map((utxo) =>
            freezeOrUnfreezeUtxoMutateAsync({
              path: {
                walletname: encodeURIComponent(walletFileName),
              },
              body: {
                'utxo-string': utxo.utxo,
                freeze: true,
              },
            }),
          ),
        ),
        Promise.allSettled(
          utxosToUnfreeze.map((utxo) =>
            freezeOrUnfreezeUtxoMutateAsync({
              path: {
                walletname: encodeURIComponent(walletFileName),
              },
              body: {
                'utxo-string': utxo.utxo,
                freeze: false,
              },
            }),
          ),
        ),
      ])

      return { freezeResult, unfreezeResult }
    },
  })

  const onOpenUtxoSelector = () => {
    if (!sourceJar) return
    toast.dismiss(SEND_AUTO_SELECTION_TOAST_ID)
    setFilter('')
    setRowSelection(initialRowSelection)
    setOpen(true)
  }

  const onApplyUtxoSelection = async () => {
    if (!sourceJar) return

    // Keep same-address UTXOs together to avoid accidental privacy leaks.
    const selectedUtxoIds = new Set(selectedUtxos.map((it) => it.utxo))
    const selectedAddresses = new Set(selectedUtxos.map((it) => it.address))
    const mutableUtxos = sourceJar.utxos.filter((it) => !fb.utxo.isFidelityBond(it))
    const groupedSelectedUtxos = mutableUtxos.filter((it) => selectedAddresses.has(it.address))
    const groupedDeselectedUtxos = mutableUtxos.filter((it) => !selectedAddresses.has(it.address))
    const userDeselectedUtxos = mutableUtxos.filter((it) => !selectedUtxoIds.has(it.utxo))

    if (groupedSelectedUtxos.length > selectedUtxos.length) {
      toast.warning(`Security measure: Selection changed`, {
        description: `Automatically selected ${groupedSelectedUtxos.length - selectedUtxos.length} additional UTXOs with matching addresses.`,
        id: SEND_AUTO_SELECTION_TOAST_ID,
      })
    }

    if (groupedDeselectedUtxos.length > userDeselectedUtxos.length) {
      toast.warning(`Security measure: Selection changed`, {
        description: `Automatically deselected ${groupedDeselectedUtxos.length - userDeselectedUtxos.length} additional UTXOs with matching addresses.`,
        id: SEND_AUTO_SELECTION_TOAST_ID,
      })
    }

    // The selected set should remain spendable; everything else becomes frozen.
    const utxosToFreeze = mutableUtxos.filter((it) => !selectedAddresses.has(it.address) && it.frozen === false)
    const utxosToUnfreeze = mutableUtxos.filter((it) => selectedAddresses.has(it.address) && it.frozen === true)

    if (utxosToFreeze.length === 0 && utxosToUnfreeze.length === 0) {
      setOpen(false)
      return
    }

    try {
      const result = await applyUtxoSelectionMutateAsync({ utxosToFreeze, utxosToUnfreeze })

      if (utxosToFreeze.length > 0) {
        const rejected = result.freezeResult.filter((it) => it.status === 'rejected')
        if (rejected.length === 0) {
          toast.success(t('jar_details.utxo_list.toast_freeze_success', { count: utxosToFreeze.length }))
        } else {
          toast.warning(t('jar_details.utxo_list.toast_freeze_error', { count: rejected.length }))
        }
      }

      if (utxosToUnfreeze.length > 0) {
        const rejected = result.unfreezeResult.filter((it) => it.status === 'rejected')
        if (rejected.length === 0) {
          toast.success(t('jar_details.utxo_list.toast_unfreeze_success', { count: utxosToUnfreeze.length }))
        } else {
          toast.warning(t('jar_details.utxo_list.toast_unfreeze_error', { count: rejected.length }))
        }
      }

      setOpen(false)
    } catch (_ignoredOnPurpose) {
      if (utxosToFreeze.length > 0) {
        toast.warning(t('jar_details.utxo_list.toast_freeze_error', { count: utxosToFreeze.length }))
      }
      if (utxosToUnfreeze.length > 0) {
        toast.warning(t('jar_details.utxo_list.toast_unfreeze_error', { count: utxosToUnfreeze.length }))
      }
    }
  }

  const dialogProps: UtxoSelectionDialogProps = {
    open,
    isApplying,
    selectedCount: selectedUtxos.length,
    filter,
    tableEntries,
    initialRowSelection,
    enableRowSelection: (row) => !fb.utxo.isFidelityBond(row.original.utxo),
    onOpenChange: (nextOpen: boolean) => {
      if (isApplying) return
      setOpen(nextOpen)
    },
    onFilterChange: setFilter,
    onRowSelectionChange: setRowSelection,
    onApply: () => void onApplyUtxoSelection(),
  }

  return {
    isApplying,
    sourceJarIndex,
    setSourceJarIndex,
    onOpenUtxoSelector,
    utxoSelectorDisabled: isApplying || sourceJar === undefined || sourceJar.utxos.length === 0,
    dialogProps,
  }
}
