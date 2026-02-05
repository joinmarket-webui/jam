import { useState, useMemo } from 'react'
import {
  directsendMutation,
  freezeMutation,
  gettimelockaddressOptions,
} from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { DirectSendResponse, ErrorMessage } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import type { Utxo } from '@/hooks/useQueryUtxos'
import * as fb from '@/lib/fidelityBondUtils'
import type { WalletFileName } from '@/lib/utils'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import type { JarIndex } from '@/types/global'
import type { Step } from './types'
import { generateLockdateOptions, getYearOptions, getMonthOptions } from './types'

export function useCreateFidelityBondWizard(
  open: boolean,
  onOpenChange: (open: boolean) => void,
  walletFileName: WalletFileName,
) {
  const { t } = useTranslation()
  const client = useApiClient()
  const walletInfo = useJamWalletInfoContext()
  const isDeveloperMode = useStore(jamSettingsStore, (state) => state.state.developerMode)

  const [step, setStep] = useState<Step>('select_date')
  const [selectedLockdate, setSelectedLockdate] = useState<fb.Lockdate | ''>('')
  const [selectedJarIndex, setSelectedJarIndex] = useState<JarIndex | undefined>()
  const [selectedUtxos, setSelectedUtxos] = useState<Utxo[]>([])
  const [frozenUtxos, setFrozenUtxos] = useState<Utxo[]>([])
  const [confirmationChecked, setConfirmationChecked] = useState(false)
  const [txResult, setTxResult] = useState<DirectSendResponse | undefined>()
  const [error, setError] = useState<string | undefined>()

  const lockdateOptions = useMemo(() => generateLockdateOptions(isDeveloperMode), [isDeveloperMode])
  const yearOptions = useMemo(() => getYearOptions(lockdateOptions), [lockdateOptions])
  const monthOptions = useMemo(() => getMonthOptions(), [])

  const minLockdate = lockdateOptions[0]?.value ?? ''
  const maxLockdate = lockdateOptions[lockdateOptions.length - 1]?.value ?? ''
  const clampLockdate = (lockdate: string): fb.Lockdate | '' => {
    if (!lockdate || lockdate < minLockdate) return minLockdate || ''
    if (lockdate > maxLockdate) return maxLockdate || ''
    return lockdate as fb.Lockdate
  }
  const selectedYear = selectedLockdate ? selectedLockdate.slice(0, 4) : ''
  const selectedMonth = selectedLockdate ? selectedLockdate.slice(5, 7) : ''
  const minYear = minLockdate ? parseInt(minLockdate.slice(0, 4), 10) : 0
  const minMonth = minLockdate ? parseInt(minLockdate.slice(5, 7), 10) : 1

  const existingFbLockdates = useMemo(() => {
    return walletInfo.fidelityBondSummary.fbOutputs
      .filter((fbUtxo) => fb.utxo.isLocked(fbUtxo))
      .map((fbUtxo) => {
        const locktime = fb.utxo.getLocktime(fbUtxo)
        return locktime ? fb.lockdate.fromTimestamp(locktime) : null
      })
      .filter(Boolean) as fb.Lockdate[]
  }, [walletInfo.fidelityBondSummary.fbOutputs])

  const hasDuplicateLockdate = selectedLockdate && existingFbLockdates.includes(selectedLockdate)

  const jarsWithUtxos = useMemo(() => {
    return walletInfo.jars.filter((jar) => {
      const availableUtxos = jar.utxos.filter((utxo) => !utxo.frozen && !fb.utxo.isFidelityBond(utxo))
      return availableUtxos.length > 0
    })
  }, [walletInfo.jars])

  const availableUtxos = useMemo(() => {
    if (selectedJarIndex === undefined) return []
    const jar = walletInfo.jars.find((j) => j.jarIndex === selectedJarIndex)
    if (!jar) return []
    return jar.utxos.filter((utxo) => !utxo.frozen && !fb.utxo.isFidelityBond(utxo))
  }, [walletInfo.jars, selectedJarIndex])

  const utxosToFreeze = useMemo(() => {
    if (selectedJarIndex === undefined) return []
    const jar = walletInfo.jars.find((j) => j.jarIndex === selectedJarIndex)
    if (!jar) return []
    return jar.utxos.filter(
      (utxo) => !utxo.frozen && !fb.utxo.isFidelityBond(utxo) && !selectedUtxos.some((s) => s.utxo === utxo.utxo),
    )
  }, [walletInfo.jars, selectedJarIndex, selectedUtxos])

  const isUsingAllFunds = useMemo(() => {
    const totalWalletUtxos = walletInfo.jars.flatMap((jar) =>
      jar.utxos.filter((utxo) => !utxo.frozen && !fb.utxo.isFidelityBond(utxo)),
    )
    return selectedUtxos.length === totalWalletUtxos.length && totalWalletUtxos.length > 0
  }, [walletInfo.jars, selectedUtxos])

  const totalAmount = useMemo(() => selectedUtxos.reduce((sum, utxo) => sum + utxo.value, 0), [selectedUtxos])

  const timelockAddressQuery = useQuery({
    ...gettimelockaddressOptions({
      client,
      path: {
        walletname: encodeURIComponent(walletFileName),
        lockdate: selectedLockdate || '',
      },
    }),
    enabled: open && !!selectedLockdate && step !== 'select_date',
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })

  const address = timelockAddressQuery.data?.address

  const freezeUtxo = useMutation({
    ...freezeMutation({ client }),
    onError: (err: ErrorMessage) => {
      console.error('Freeze error:', err)
      const reason = err.message || err.error_description || t('global.errors.reason_unknown')
      setError(`${t('earn.fidelity_bond.error_freezing_utxos')} ${reason}`)
    },
  })

  const unfreezeUtxo = useMutation({
    ...freezeMutation({ client }),
    onError: (err: ErrorMessage) => {
      console.error('Unfreeze error:', err)
      const reason = err.message || err.error_description || t('global.errors.reason_unknown')
      setError(`${t('earn.fidelity_bond.error_unfreezing_utxos')} ${reason}`)
    },
  })

  const directSend = useMutation({
    ...directsendMutation({ client }),
    onError: (err: ErrorMessage) => {
      console.error('DirectSend error:', err)
      const reason = err.message || err.error_description || t('global.errors.reason_unknown')
      setError(`${t('earn.fidelity_bond.error_creating_fidelity_bond')} ${reason}`)
    },
  })

  const handleReset = () => {
    setStep('select_date')
    setSelectedLockdate('')
    setSelectedJarIndex(undefined)
    setSelectedUtxos([])
    setFrozenUtxos([])
    setConfirmationChecked(false)
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
        setStep('select_jar')
        setSelectedUtxos([])
        break
      case 'freeze_utxos':
        setStep('select_utxos')
        break
      case 'review':
        if (utxosToFreeze.length > 0) {
          setStep('freeze_utxos')
        } else {
          setStep('select_utxos')
        }
        break
    }
  }

  const handleNext = async () => {
    setError(undefined)
    switch (step) {
      case 'select_date':
        if (jarsWithUtxos.length === 1) {
          setSelectedJarIndex(jarsWithUtxos[0].jarIndex)
          setStep('select_utxos')
        } else {
          setStep('select_jar')
        }
        break
      case 'select_jar':
        setStep('select_utxos')
        break
      case 'select_utxos':
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
        await handleCreateFidelityBond()
        break
    }
  }

  const handleFreezeUtxos = async () => {
    try {
      for (const utxo of utxosToFreeze) {
        await freezeUtxo.mutateAsync({
          path: { walletname: encodeURIComponent(walletFileName) },
          body: { 'utxo-string': utxo.utxo, freeze: true },
        })
      }
      setFrozenUtxos([...utxosToFreeze])
      setStep('review')
    } catch {
      // Error handled in onError
    }
  }

  const handleCreateFidelityBond = async () => {
    if (!address || selectedJarIndex === undefined) return

    setStep('creating')

    try {
      const result = await directSend.mutateAsync({
        path: { walletname: encodeURIComponent(walletFileName) },
        body: {
          mixdepth: selectedJarIndex,
          amount_sats: 0,
          destination: address,
        },
      })
      setTxResult(result)
      setStep('success')
      toast.success(t('earn.fidelity_bond.create_fidelity_bond.success_text'))
      walletInfo.refetch()
    } catch {
      setStep('review')
    }
  }

  const handleUnfreezeUtxos = async () => {
    try {
      for (const utxo of frozenUtxos) {
        await unfreezeUtxo.mutateAsync({
          path: { walletname: encodeURIComponent(walletFileName) },
          body: { 'utxo-string': utxo.utxo, freeze: false },
        })
      }
      setFrozenUtxos([])
      toast.success(t('earn.fidelity_bond.unfreeze_utxos.done'))
      walletInfo.refetch()
    } catch {
      // Error handled in onError
    }
  }

  const toggleUtxoSelection = (utxo: Utxo) => {
    setSelectedUtxos((prev) => {
      const isSelected = prev.some((u) => u.utxo === utxo.utxo)
      if (isSelected) {
        return prev.filter((u) => u.utxo !== utxo.utxo)
      }
      return [...prev, utxo]
    })
  }

  const selectAllUtxos = () => setSelectedUtxos([...availableUtxos])
  const deselectAllUtxos = () => setSelectedUtxos([])

  const selectedDateLabel = selectedLockdate
    ? new Date(fb.lockdate.toTimestamp(selectedLockdate)).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  const canProceed = () => {
    switch (step) {
      case 'select_date':
        return !!selectedLockdate
      case 'select_jar':
        return selectedJarIndex !== undefined
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
    selectedYear,
    selectedMonth,
    minYear,
    minMonth,
    yearOptions,
    monthOptions,
    clampLockdate,
    hasDuplicateLockdate,
    selectedDateLabel,
    selectedJarIndex,
    setSelectedJarIndex,
    jarsWithUtxos,
    selectedUtxos,
    availableUtxos,
    toggleUtxoSelection,
    selectAllUtxos,
    deselectAllUtxos,
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
