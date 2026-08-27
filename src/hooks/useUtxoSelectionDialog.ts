import { useCallback, useMemo, useState } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { freezeMutation } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import type { RowSelectionState } from '@tanstack/react-table'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { UtxoSelectionDialogProps } from '@/components/send/UtxoSelectionDialog'
import {
  createUtxoSelectionFormSchema,
  UTXO_SELECTION_FORM_DEFAULT_VALUES,
  type UtxoSelectionFormValues,
} from '@/components/send/UtxoSelectionDialog.schema'
import { useJamWalletInfoContext, type AddressSummary, type Jar } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import type { Utxo } from '@/hooks/useQueryUtxos'
import * as fb from '@/lib/fidelityBondUtils'
import { utxoTags } from '@/lib/tags'
import type { WalletFileName } from '@/lib/utils'

const SEND_AUTO_SELECTION_TOAST_ID = 'send.utxo.selection_changed_automatically'

interface UseUtxoSelectionDialogProps {
  walletFileName: WalletFileName
  sourceJar?: Jar
  addressSummary: AddressSummary
}

export const useUtxoSelectionDialog = ({ walletFileName, sourceJar, addressSummary }: UseUtxoSelectionDialogProps) => {
  const { t } = useTranslation()
  const client = useApiClient()

  const { refetch: walletInfoRefetch } = useJamWalletInfoContext()
  const [open, setOpen] = useState(false)

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

  const selectableUtxoIds = useMemo(() => (sourceJar?.utxos || []).map((utxo) => utxo.utxo), [sourceJar?.utxos])
  const formSchema = useMemo(() => createUtxoSelectionFormSchema(selectableUtxoIds), [selectableUtxoIds])
  const {
    control,
    getValues,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting: isFormSubmitting },
  } = useForm<UtxoSelectionFormValues>({
    mode: 'onChange',
    defaultValues: UTXO_SELECTION_FORM_DEFAULT_VALUES,
    resolver: yupResolver(formSchema),
  })
  const filter = useWatch({ control, name: 'filter', defaultValue: '' })
  const rowSelection = useWatch({ control, name: 'rowSelection', defaultValue: {} })

  const selectedUtxos = useMemo(() => {
    return (sourceJar?.utxos || []).filter((utxo) => rowSelection[utxo.utxo] === true)
  }, [sourceJar?.utxos, rowSelection])

  // TODO: Should this be moved to `WalletInfoContext`?
  // Similar/Duplicate code in `WalletJarDetailsContent`
  const { mutateAsync: freezeOrUnfreezeUtxoMutateAsync } = useMutation({
    ...freezeMutation({ client }),
    retry: false,
  })

  const { mutateAsync: applyUtxoSelectionMutateAsync, isPending: isMutationPending } = useMutation({
    mutationFn: async ({ utxosToFreeze, utxosToUnfreeze }: { utxosToFreeze: Utxo[]; utxosToUnfreeze: Utxo[] }) => {
      const [freezeResult, unfreezeResult] = await Promise.all([
        Promise.allSettled(
          utxosToFreeze.map((utxo) =>
            freezeOrUnfreezeUtxoMutateAsync({
              path: {
                walletname: walletFileName,
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
                walletname: walletFileName,
              },
              body: {
                'utxo-string': utxo.utxo,
                freeze: false,
              },
            }),
          ),
        ),
      ]).then((it) => walletInfoRefetch().then(() => it))

      return { freezeResult, unfreezeResult }
    },
  })

  const onOpenUtxoSelector = useCallback(() => {
    if (!sourceJar) return
    toast.dismiss(SEND_AUTO_SELECTION_TOAST_ID)
    reset({
      filter: '',
      rowSelection: initialRowSelection,
    })
    setOpen(true)
  }, [sourceJar, reset, initialRowSelection])

  const onSubmit = handleSubmit(async ({ rowSelection: submittedRowSelection }) => {
    if (!sourceJar) return

    const submittedUtxos = sourceJar.utxos.filter((utxo) => submittedRowSelection[utxo.utxo] === true)
    const selectedUtxoIds = new Set(submittedUtxos.map((it) => it.utxo))
    const selectedAddresses = new Set(submittedUtxos.map((it) => it.address))
    const mutableUtxos = sourceJar.utxos
    const groupedSelectedUtxos = mutableUtxos.filter((it) => selectedAddresses.has(it.address))
    const groupedDeselectedUtxos = mutableUtxos.filter((it) => !selectedAddresses.has(it.address))
    const userDeselectedUtxos = mutableUtxos.filter((it) => !selectedUtxoIds.has(it.utxo))

    if (groupedSelectedUtxos.length > submittedUtxos.length) {
      toast.warning(t('jar_details.utxo_list.toast_auto_selection_title'), {
        description: t('jar_details.utxo_list.toast_auto_selected_matching', {
          count: groupedSelectedUtxos.length - submittedUtxos.length,
        }),
        id: SEND_AUTO_SELECTION_TOAST_ID,
      })
    }

    if (groupedDeselectedUtxos.length > userDeselectedUtxos.length) {
      toast.warning(t('jar_details.utxo_list.toast_auto_selection_title'), {
        description: t('jar_details.utxo_list.toast_auto_deselected_matching', {
          count: groupedDeselectedUtxos.length - userDeselectedUtxos.length,
        }),
        id: SEND_AUTO_SELECTION_TOAST_ID,
      })
    }

    // The selected set should remain spendable; everything else becomes frozen.
    const utxosToFreeze = mutableUtxos.filter((it) => !selectedAddresses.has(it.address) && it.frozen !== true)
    const utxosToUnfreeze = mutableUtxos.filter((it) => selectedAddresses.has(it.address) && it.frozen === true)

    if (utxosToFreeze.length === 0 && utxosToUnfreeze.length === 0) {
      setOpen(false)
      return
    }

    try {
      const result = await applyUtxoSelectionMutateAsync({ utxosToFreeze, utxosToUnfreeze })

      if (utxosToFreeze.length > 0) {
        const fulfilled = result.freezeResult.filter((it) => it.status === 'fulfilled')
        const rejected = result.freezeResult.filter((it) => it.status === 'rejected')
        if (rejected.length === 0) {
          toast.success(t('jar_details.utxo_list.toast_freeze_success', { count: fulfilled.length }))
        } else {
          const errorMessage = t('jar_details.utxo_list.toast_freeze_error', { count: rejected.length })
          if (fulfilled.length > 0) {
            toast.warning(errorMessage)
          } else {
            toast.error(errorMessage)
          }
        }
      }

      if (utxosToUnfreeze.length > 0) {
        const fulfilled = result.unfreezeResult.filter((it) => it.status === 'fulfilled')
        const rejected = result.unfreezeResult.filter((it) => it.status === 'rejected')
        if (rejected.length === 0) {
          toast.success(t('jar_details.utxo_list.toast_unfreeze_success', { count: fulfilled.length }))
        } else {
          const errorMessage = t('jar_details.utxo_list.toast_unfreeze_error', { count: rejected.length })
          if (fulfilled.length > 0) {
            toast.warning(errorMessage)
          } else {
            toast.error(errorMessage)
          }
        }
      }

      setOpen(false)
    } catch (_ignoredOnPurpose) {
      if (utxosToFreeze.length > 0) {
        toast.error(t('jar_details.utxo_list.toast_freeze_error', { count: utxosToFreeze.length }))
      }
      if (utxosToUnfreeze.length > 0) {
        toast.error(t('jar_details.utxo_list.toast_unfreeze_error', { count: utxosToUnfreeze.length }))
      }
    }
  })

  const isSubmitting = isFormSubmitting || isMutationPending

  const dialogProps: UtxoSelectionDialogProps = {
    open,
    isSubmitting,
    selectedCount: selectedUtxos.length,
    filter,
    tableEntries,
    initialRowSelection,
    enableRowSelection: isSubmitting ? false : undefined,
    onOpenChange: (nextOpen: boolean) => {
      if (isSubmitting) return
      if (!nextOpen) {
        reset(UTXO_SELECTION_FORM_DEFAULT_VALUES)
      }
      setOpen(nextOpen)
    },
    onFilterChange: (nextFilter) =>
      setValue('filter', nextFilter, {
        shouldDirty: true,
        shouldValidate: true,
      }),
    onRowSelectionChange: (updater) => {
      const currentSelection = getValues('rowSelection')
      const nextSelection = typeof updater === 'function' ? updater(currentSelection) : updater
      setValue('rowSelection', nextSelection, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    },
    onSubmit,
  }

  return {
    isSubmitting,
    onOpenUtxoSelector,
    utxoSelectorDisabled: isSubmitting || sourceJar === undefined || sourceJar.utxos.length === 0,
    dialogProps,
  }
}
