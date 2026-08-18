import { useState, useMemo } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { gettimelockaddressOptions } from '@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query'
import type { DirectSendResponse } from '@joinmarket-webui/joinmarket-ng-api-ts/jm'
import { useQuery } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  JAM_TRY_FREEZE_CREATED_FIDELITY_BOND_OUTPUTS,
  JAM_TRY_FREEZE_CREATED_FIDELITY_BOND_OUTPUTS_DELAY,
} from '@/constants/jam'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import type { Utxo } from '@/hooks/useQueryUtxos'
import * as fb from '@/lib/fidelityBondUtils'
import { delayedPromise, type WalletFileName } from '@/lib/utils'
import { useDeveloperMode } from '@/store/jamSettingsStore'
import type { JarIndex } from '@/types/global'
import { useFidelityBondMutations } from '../fidelity-bond/useFidelityBondMutations'
import {
  CREATE_FIDELITY_BOND_FORM_DEFAULT_VALUES,
  createFidelityBondFormSchema,
  type CreateFidelityBondFormValues,
} from './CreateFidelityBondFormSchema'
import type { Step } from './types'
import { generateLockdateOptions } from './types'

export function useCreateFidelityBondWizard(
  open: boolean,
  onOpenChange: (open: boolean) => void,
  walletFileName: WalletFileName,
) {
  const { t } = useTranslation()
  const client = useApiClient()
  const walletInfo = useJamWalletInfoContext()
  const { enabled: isDeveloperMode } = useDeveloperMode()

  const [step, setStep] = useState<Step>('select_date')
  const [frozenUtxos, setFrozenUtxos] = useState<Utxo[]>([])
  const [utxoPage, setUtxoPage] = useState(0)
  const [txResult, setTxResult] = useState<DirectSendResponse | undefined>()

  const { freezeUtxo, unfreezeUtxo, directSend, error, setError } = useFidelityBondMutations({
    unfreezeErrorKey: 'earn.fidelity_bond.error_unfreezing_utxos',
    sendErrorKey: 'earn.fidelity_bond.error_creating_fidelity_bond',
  })

  const lockdateOptions = useMemo(() => generateLockdateOptions(isDeveloperMode), [isDeveloperMode])
  const existingFbLockdates = useMemo(() => {
    return walletInfo.fidelityBondSummary.fbOutputs
      .map((fbUtxo) => {
        const locktime = fb.utxo.getLocktime(fbUtxo)
        return locktime ? fb.lockdate.fromTimestamp(locktime) : null
      })
      .filter(Boolean) as fb.Lockdate[]
  }, [walletInfo.fidelityBondSummary.fbOutputs])
  const availableLockdateOptions = useMemo(
    () => lockdateOptions.filter((option) => !existingFbLockdates.includes(option.value)),
    [existingFbLockdates, lockdateOptions],
  )
  const jarIndexes = useMemo(() => walletInfo.jars.map((jar) => jar.jarIndex), [walletInfo.jars])
  const formSchema = useMemo(
    () => createFidelityBondFormSchema(availableLockdateOptions, jarIndexes, t),
    [availableLockdateOptions, jarIndexes, t],
  )
  const form = useForm<CreateFidelityBondFormValues, unknown, CreateFidelityBondFormValues>({
    mode: 'onChange',
    defaultValues: CREATE_FIDELITY_BOND_FORM_DEFAULT_VALUES,
    resolver: yupResolver(formSchema),
  })

  const watchedLockdate = useWatch({ control: form.control, name: 'lockdate' })
  const selectedLockdate: fb.Lockdate | '' = watchedLockdate ?? ''
  const selectedJarIndex = useWatch({ control: form.control, name: 'source.fromJar' })
  const selectedUtxoIds = useWatch({
    control: form.control,
    name: 'utxoIds',
    defaultValue: CREATE_FIDELITY_BOND_FORM_DEFAULT_VALUES.utxoIds,
  })
  const confirmationChecked = useWatch({
    control: form.control,
    name: 'confirmationAccepted',
    defaultValue: CREATE_FIDELITY_BOND_FORM_DEFAULT_VALUES.confirmationAccepted,
  })

  const setSelectedLockdate = (lockdate: fb.Lockdate | '') => {
    form.setValue('lockdate', lockdate || undefined, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
  }
  const setSelectedJarIndex = (jarIndex: JarIndex | undefined) => {
    form.setValue('source.fromJar', jarIndex, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
  }
  const setSelectedUtxoIds = (utxoIds: string[]) => {
    form.setValue('utxoIds', utxoIds, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
  }
  const setConfirmationChecked = (checked: boolean) => {
    form.setValue('confirmationAccepted', checked, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  const hasDuplicateLockdate = selectedLockdate && existingFbLockdates.includes(selectedLockdate)

  const selectedJar = useMemo(() => {
    if (selectedJarIndex === undefined) return undefined
    return walletInfo.jars.find((it) => it.jarIndex === selectedJarIndex)
  }, [walletInfo.jars, selectedJarIndex])

  const jarsWithUtxos = useMemo(() => {
    return walletInfo.jars.filter((jar) => {
      const availableUtxos = jar.utxos.filter((utxo) =>
        fb.utxo.isEligibleForCreation(utxo, walletInfo.addressSummary[utxo.address]?.status),
      )
      return availableUtxos.length > 0
    })
  }, [walletInfo.addressSummary, walletInfo.jars])

  const availableUtxos = useMemo(() => {
    if (selectedJar === undefined) return []
    return selectedJar.utxos
      .filter((utxo) => fb.utxo.isEligibleForCreation(utxo, walletInfo.addressSummary[utxo.address]?.status))
      .toSorted((a, b) => b.value - a.value)
  }, [selectedJar, walletInfo.addressSummary])

  const selectedUtxos = useMemo(() => {
    const availableUtxosById = new Map<string, Utxo>(availableUtxos.map((utxo) => [utxo.utxo, utxo]))
    return selectedUtxoIds.flatMap((utxoId) => {
      const utxo = availableUtxosById.get(utxoId)
      return utxo === undefined ? [] : [utxo]
    })
  }, [availableUtxos, selectedUtxoIds])

  const utxosToFreeze = useMemo(() => {
    if (selectedJar === undefined) return []
    return selectedJar.utxos.filter(
      (utxo) => !utxo.frozen && !fb.utxo.isFidelityBond(utxo) && !selectedUtxos.some((it) => it.utxo === utxo.utxo),
    )
  }, [selectedJar, selectedUtxos])

  const isUsingAllFunds = useMemo(() => {
    const totalWalletUtxos = walletInfo.jars.flatMap((jar) => jar.utxos.filter((utxo) => !fb.utxo.isFidelityBond(utxo)))
    return selectedUtxos.length === totalWalletUtxos.length && totalWalletUtxos.length > 0
  }, [walletInfo.jars, selectedUtxos])

  const totalAmount = useMemo(() => selectedUtxos.reduce((sum, utxo) => sum + utxo.value, 0), [selectedUtxos])

  const timelockAddressQuery = useQuery({
    ...gettimelockaddressOptions({
      client,
      path: {
        walletname: walletFileName,
        lockdate: selectedLockdate || '',
      },
    }),
    enabled: open && !!selectedLockdate && step !== 'select_date',
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })

  const address = timelockAddressQuery.data?.address

  const handleReset = () => {
    setStep('select_date')
    form.reset(CREATE_FIDELITY_BOND_FORM_DEFAULT_VALUES)
    setFrozenUtxos([])
    setUtxoPage(0)
    setTxResult(undefined)
    setError(undefined)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleReset()
    }
    onOpenChange(newOpen)
  }

  const handleBack = () => {
    setError(undefined)
    switch (step) {
      case 'select_jar':
        setStep('select_date')
        break
      case 'select_utxos':
        if (jarsWithUtxos.length === 1) {
          setSelectedJarIndex(undefined)
          setSelectedUtxoIds([])
          setStep('select_date')
        } else {
          setSelectedUtxoIds([])
          setStep('select_jar')
        }
        break
      case 'freeze_utxos':
        setUtxoPage(0)
        setStep('select_utxos')
        break
      case 'review':
        if (utxosToFreeze.length > 0) {
          setStep('freeze_utxos')
        } else {
          setUtxoPage(0)
          setStep('select_utxos')
        }
        break
    }
  }

  const handleNext = async () => {
    setError(undefined)
    switch (step) {
      case 'select_date':
        if (!(await form.trigger('lockdate'))) return
        if (jarsWithUtxos.length === 1) {
          setSelectedJarIndex(jarsWithUtxos[0].jarIndex)
          setUtxoPage(0)
          setStep('select_utxos')
        } else {
          setStep('select_jar')
        }
        break
      case 'select_jar':
        if (!(await form.trigger('source.fromJar'))) return
        setUtxoPage(0)
        setStep('select_utxos')
        break
      case 'select_utxos':
        if (!(await form.trigger('utxoIds'))) return
        if (utxosToFreeze.length > 0) {
          setStep('freeze_utxos')
        } else {
          setStep('review')
        }
        break
      case 'freeze_utxos':
        await handleFreezeUtxos()
        break
      case 'review':
        if (!(await form.trigger())) return
        await handleCreateFidelityBond()
        break
    }
  }

  const handleFreezeUtxos = async () => {
    const frozen: Utxo[] = []
    try {
      for (const utxo of utxosToFreeze) {
        await freezeUtxo.mutateAsync({
          path: { walletname: walletFileName },
          body: { 'utxo-string': utxo.utxo, freeze: true },
        })
        frozen.push(utxo)
      }
      setFrozenUtxos(frozen)
      setStep('review')
    } catch {
      // Best-effort rollback — unfreeze UTXOs that were frozen before the error
      for (const utxo of frozen) {
        try {
          await unfreezeUtxo.mutateAsync({
            path: { walletname: walletFileName },
            body: { 'utxo-string': utxo.utxo, freeze: false },
          })
        } catch {
          // logged via onError
        }
      }
    }
  }

  const handleCreateFidelityBond = async () => {
    if (!address || selectedJar === undefined) return

    setStep('creating')

    let broadcasted = false

    try {
      // TODO: refactor: use the sweep functionality from `useFidelityBondSweep` here
      const result = await directSend.mutateAsync({
        path: { walletname: walletFileName },
        body: {
          mixdepth: selectedJar.jarIndex,
          amount_sats: 0, // 0 := sweep!
          destination: address,
        },
      })
      broadcasted = true

      // Best-effort cleanup — tx already broadcast, don't throw on unfreeze failure
      for (const utxo of frozenUtxos) {
        try {
          await unfreezeUtxo.mutateAsync({
            path: { walletname: walletFileName },
            body: { 'utxo-string': utxo.utxo, freeze: false },
            throwOnError: true,
          })
        } catch (_ignoredOnPurpose: unknown) {
          // only debug output
          console.debug('Error while unfreezing previously frozen UTXO.')
        }
      }

      // freeze resulting fidelity bond output
      if (JAM_TRY_FREEZE_CREATED_FIDELITY_BOND_OUTPUTS) {
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

      setTxResult(result)
      setStep('success')
      toast.success(t('earn.fidelity_bond.create_fidelity_bond.success_text'))
    } catch {
      if (broadcasted) return

      // Best-effort rollback — unfreeze UTXOs that were frozen for this operation
      for (const utxo of frozenUtxos) {
        try {
          await unfreezeUtxo.mutateAsync({
            path: { walletname: walletFileName },
            body: { 'utxo-string': utxo.utxo, freeze: false },
          })
        } catch (_ignoredOnPurpose: unknown) {
          // only debug output
          console.debug('Error while unfreezing previously frozen UTXO in error handling.')
        }
      }
      setFrozenUtxos([])
      setStep('freeze_utxos')
    } finally {
      if (broadcasted) {
        try {
          await walletInfo.refetch()
        } catch (error: unknown) {
          console.warn('Error while refetching wallet info after creating fidelity bond.', error)
        }
      }
    }
  }

  const handleUnfreezeUtxos = async () => {
    try {
      for (const utxo of frozenUtxos) {
        await unfreezeUtxo.mutateAsync({
          path: { walletname: walletFileName },
          body: { 'utxo-string': utxo.utxo, freeze: false },
        })
      }
      setFrozenUtxos([])
      toast.success(t('earn.fidelity_bond.unfreeze_utxos.done'))
      await walletInfo.refetch()
    } catch {
      // Error handled in onError
    }
  }

  const toggleUtxoSelection = (utxo: Utxo) => {
    const isSelected = selectedUtxoIds.includes(utxo.utxo)
    setSelectedUtxoIds(isSelected ? [] : [utxo.utxo])
  }

  const canProceed = () => {
    switch (step) {
      case 'select_date':
        return !!selectedLockdate && !hasDuplicateLockdate
      case 'select_jar':
        return selectedJar !== undefined
      case 'select_utxos':
        return selectedUtxos.length > 0
      case 'freeze_utxos':
        return true
      case 'review':
        return confirmationChecked && !!address
      default:
        return false
    }
  }

  const getStepNumber = () => {
    const steps: Step[] = ['select_date', 'select_jar', 'select_utxos', 'freeze_utxos', 'review']
    return steps.indexOf(step)
  }

  return {
    step,
    setStep,
    setSelectedLockdate,
    selectedLockdate,
    hasDuplicateLockdate,
    existingFbLockdates,
    selectedJarIndex,
    setSelectedJarIndex,
    jarsWithUtxos,
    selectedUtxos,
    availableUtxos,
    utxoPage,
    setUtxoPage,
    toggleUtxoSelection,
    totalAmount,
    isUsingAllFunds,
    utxosToFreeze,
    confirmationChecked,
    setConfirmationChecked,
    address,
    timelockAddressQuery,
    txResult,
    frozenUtxos,
    error,
    freezeUtxo,
    unfreezeUtxo,
    directSend,
    handleReset,
    handleOpenChange,
    handleBack,
    handleNext,
    handleFreezeUtxos,
    handleCreateFidelityBond,
    handleUnfreezeUtxos,
    canProceed,
    getStepNumber,
    t,
  }
}
