import { useState, useMemo, type ComponentProps } from 'react'
import {
  directsendMutation,
  freezeMutation,
  gettimelockaddressOptions,
} from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { DirectSendResponse, ErrorMessage } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangleIcon, CheckCircle2Icon, CheckIcon, ChevronLeftIcon, CopyIcon, Loader2Icon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { BitcoinQR } from '@/components/receive/BitcoinQR'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CopyButton } from '@/components/ui/jam/CopyButton'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import type { Utxo } from '@/hooks/useQueryUtxos'
import * as fb from '@/lib/fidelityBondUtils'
import { cn, formatSats } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import type { JarIndex, WithRequiredProperty } from '@/types/global'
import { Spinner } from '../ui/spinner'

type Step = 'select_date' | 'select_jar' | 'select_utxos' | 'freeze_utxos' | 'review' | 'creating' | 'success'

type CreateFidelityBondDialogProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> & {
  walletFileName: WalletFileName
}

// Generate list of available months for the next 10 years (and past months in dev mode)
const generateLockdateOptions = (isDeveloperMode: boolean): { value: fb.Lockdate; label: string }[] => {
  const options: { value: fb.Lockdate; label: string }[] = []
  const now = new Date()
  const startYear = now.getUTCFullYear()
  const startMonth = now.getUTCMonth()

  // In dev mode, include past 12 months for testing expired bonds
  const startOffset = isDeveloperMode ? -12 : 3

  for (let i = startOffset; i <= 120; i++) {
    const monthOffset = startMonth + i
    const year = startYear + Math.floor(monthOffset / 12)
    const month = (monthOffset % 12) + 1
    const lockdate = `${year}-${month.toString().padStart(2, '0')}` as fb.Lockdate
    const date = new Date(Date.UTC(year, month - 1, 1))
    const label = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
    options.push({ value: lockdate, label })
  }

  return options
}

export const CreateFidelityBondDialog = ({ open, onOpenChange, walletFileName }: CreateFidelityBondDialogProps) => {
  const { t } = useTranslation()
  const client = useApiClient()
  const walletInfo = useJamWalletInfoContext()
  const isDeveloperMode = useStore(jamSettingsStore, (state) => state.state.developerMode)

  // Wizard state
  const [step, setStep] = useState<Step>('select_date')
  const [selectedYear, setSelectedYear] = useState<number | undefined>()
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>()
  const [selectedJarIndex, setSelectedJarIndex] = useState<JarIndex | undefined>()
  const [selectedUtxos, setSelectedUtxos] = useState<Utxo[]>([])
  const [frozenUtxos, setFrozenUtxos] = useState<Utxo[]>([])
  const [confirmationChecked, setConfirmationChecked] = useState(false)
  const [txResult, setTxResult] = useState<DirectSendResponse | undefined>()
  const [error, setError] = useState<string | undefined>()

  const lockdateOptions = useMemo(() => generateLockdateOptions(isDeveloperMode), [isDeveloperMode])
  const yearOptions = useMemo(
    () => Array.from(new Set(lockdateOptions.map((o) => Number(o.value.split('-')[0])))),
    [lockdateOptions],
  )
  const monthOptions = useMemo(() => {
    if (!selectedYear) return []
    return lockdateOptions
      .filter((o) => o.value.startsWith(`${selectedYear}-`))
      .map((o) => Number(o.value.split('-')[1]))
  }, [lockdateOptions, selectedYear])
  const selectedLockdate = useMemo(() => {
    if (!selectedYear || !selectedMonth) return undefined
    return `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}` as fb.Lockdate
  }, [selectedYear, selectedMonth])

  // Get existing fidelity bonds to check for duplicates
  const existingFbLockdates = useMemo(() => {
    return walletInfo.fidelityBondSummary.fbOutputs
      .filter((fbUtxo) => fb.utxo.isLocked(fbUtxo))
      .map((fbUtxo) => {
        const locktime = fb.utxo.getLocktime(fbUtxo)
        return locktime ? fb.lockdate.fromTimestamp(locktime) : null
      })
      .filter(Boolean) as fb.Lockdate[]
  }, [walletInfo.fidelityBondSummary.fbOutputs])

  const hasDuplicateLockdate = selectedLockdate !== undefined && existingFbLockdates.includes(selectedLockdate)

  // Get jars with UTXOs
  const jarsWithUtxos = useMemo(() => {
    return walletInfo.jars.filter((jar) => {
      const availableUtxos = jar.utxos.filter((utxo) => !utxo.frozen && !fb.utxo.isFidelityBond(utxo))
      return availableUtxos.length > 0
    })
  }, [walletInfo.jars])

  // Get UTXOs for selected jar
  const availableUtxos = useMemo(() => {
    if (selectedJarIndex === undefined) return []
    const jar = walletInfo.jars.find((j) => j.jarIndex === selectedJarIndex)
    if (!jar) return []
    return jar.utxos.filter((utxo) => !utxo.frozen && !fb.utxo.isFidelityBond(utxo))
  }, [walletInfo.jars, selectedJarIndex])

  // UTXOs that need to be frozen (unselected ones in the jar)
  const utxosToFreeze = useMemo(() => {
    if (selectedJarIndex === undefined) return []
    const jar = walletInfo.jars.find((j) => j.jarIndex === selectedJarIndex)
    if (!jar) return []
    return jar.utxos.filter(
      (utxo) => !utxo.frozen && !fb.utxo.isFidelityBond(utxo) && !selectedUtxos.some((s) => s.utxo === utxo.utxo),
    )
  }, [walletInfo.jars, selectedJarIndex, selectedUtxos])

  // Check if all funds are being used (warning condition)
  const isUsingAllFunds = useMemo(() => {
    const totalWalletUtxos = walletInfo.jars.flatMap((jar) =>
      jar.utxos.filter((utxo) => !utxo.frozen && !fb.utxo.isFidelityBond(utxo)),
    )
    return selectedUtxos.length === totalWalletUtxos.length && totalWalletUtxos.length > 0
  }, [walletInfo.jars, selectedUtxos])

  // Calculate total amount
  const totalAmount = useMemo(() => selectedUtxos.reduce((sum, utxo) => sum + utxo.value, 0), [selectedUtxos])

  // Fetch timelock address
  const timelockAddressQuery = useQuery({
    ...gettimelockaddressOptions({
      client,
      path: {
        walletname: encodeURIComponent(walletFileName),
        lockdate: selectedLockdate ?? '',
      },
    }),
    enabled: open && !!selectedLockdate && step !== 'select_date',
    staleTime: Infinity,
    retry: false,
  })

  const address = timelockAddressQuery.data?.address

  // Freeze mutation
  const freezeUtxo = useMutation({
    ...freezeMutation({ client }),
    onError: (err: ErrorMessage) => {
      console.error('Freeze error:', err)
      const reason = err.message || err.error_description || t('global.errors.reason_unknown')
      setError(`${t('earn.fidelity_bond.error_freezing_utxos')} ${reason}`)
    },
  })

  // Unfreeze mutation
  const unfreezeUtxo = useMutation({
    ...freezeMutation({ client }),
    onError: (err: ErrorMessage) => {
      console.error('Unfreeze error:', err)
      const reason = err.message || err.error_description || t('global.errors.reason_unknown')
      setError(`${t('earn.fidelity_bond.error_unfreezing_utxos')} ${reason}`)
    },
  })

  // DirectSend mutation
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
    setSelectedYear(undefined)
    setSelectedMonth(undefined)
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
        setSelectedUtxos([])
        setStep('select_jar')
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
      // amount_sats: 0 means sweep all unfrozen UTXOs from the jar
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

  const renderStepContent = () => {
    switch (step) {
      case 'select_date':
        return (
          <div className="space-y-4">
            <Label>{t('earn.fidelity_bond.select_date.description')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={selectedYear?.toString()}
                onValueChange={(value) => {
                  setSelectedYear(Number(value))
                  setSelectedMonth(undefined)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('earn.fidelity_bond.select_date.form_label_year')} />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedMonth?.toString()}
                onValueChange={(value) => setSelectedMonth(Number(value))}
                disabled={!selectedYear}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('earn.fidelity_bond.select_date.form_label_month')} />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => {
                    const label = new Date(Date.UTC(selectedYear!, month - 1, 1)).toLocaleDateString(undefined, {
                      month: 'long',
                    })
                    return (
                      <SelectItem key={month} value={month.toString()}>
                        {label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {hasDuplicateLockdate && (
              <Alert variant="warning">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertDescription>
                  <Trans i18nKey="earn.fidelity_bond.select_date.warning_fb_with_same_expiry">
                    <strong>Warning</strong>: A fidelity bond with the same expiry date already exists.
                  </Trans>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )

      case 'select_jar':
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">{t('earn.fidelity_bond.select_jar.description')}</p>
            <div className="grid gap-2">
              {jarsWithUtxos.map((jar) => (
                <Card
                  key={jar.jarIndex}
                  className={cn(
                    'cursor-pointer transition-colors',
                    selectedJarIndex === jar.jarIndex ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                  )}
                  onClick={() => setSelectedJarIndex(jar.jarIndex)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full" style={{ backgroundColor: jar.color, opacity: 0.7 }} />
                      <div>
                        <p className="font-medium">{jar.name}</p>
                        <p className="text-muted-foreground text-sm">
                          {jar.utxos.filter((u) => !u.frozen && !fb.utxo.isFidelityBond(u)).length} UTXOs
                        </p>
                      </div>
                    </div>
                    <p className="font-mono text-sm">
                      {formatSats(jar.balanceSummary.calculatedAvailableBalanceInSats)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {jarsWithUtxos.length === 0 && (
              <Alert variant="warning">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertDescription>{t('earn.fidelity_bond.select_jar.alert_no_jars_available')}</AlertDescription>
              </Alert>
            )}
          </div>
        )

      case 'select_utxos':
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {t('earn.fidelity_bond.select_utxos.description', { jar: selectedJarIndex })}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllUtxos}>
                {t('earn.fidelity_bond.select_utxos.button_select_all')}
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAllUtxos}>
                {t('earn.fidelity_bond.select_utxos.button_deselect_all')}
              </Button>
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {availableUtxos.map((utxo) => {
                const isSelected = selectedUtxos.some((u) => u.utxo === utxo.utxo)
                return (
                  <Card
                    key={utxo.utxo}
                    className={cn(
                      'cursor-pointer transition-colors',
                      isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                    )}
                    onClick={() => toggleUtxoSelection(utxo)}
                  >
                    <CardContent className="flex items-center gap-3 p-3">
                      <div
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded border',
                          isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground',
                        )}
                      >
                        {isSelected && <CheckIcon className="h-3 w-3" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-xs">{utxo.utxo}</p>
                        <p className="text-muted-foreground text-xs">
                          {t('earn.fidelity_bond.select_utxos.utxo_card.confirmations', { confs: utxo.confirmations })}
                        </p>
                      </div>
                      <p className="font-mono text-sm">{formatSats(utxo.value)}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            {selectedUtxos.length > 0 && (
              <div className="border-t pt-2">
                <p className="text-right font-medium">
                  {t('earn.fidelity_bond.select_utxos.label_total')} {formatSats(totalAmount)}
                </p>
              </div>
            )}
            {isUsingAllFunds && (
              <Alert variant="warning">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertDescription>
                  <Trans i18nKey="earn.fidelity_bond.alert_all_funds_in_use">
                    <strong>Keep in mind</strong>: As you are using all available funds for the creation of this
                    fidelity bond, you will not have any UTXOs left. A fidelity bond{' '}
                    <strong>will not participate in collaborative transactions</strong> and you{' '}
                    <strong>have to fund your wallet again</strong> to start sending or earning.
                  </Trans>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )

      case 'freeze_utxos':
        return (
          <div className="space-y-4">
            <div>
              <p className="font-medium">{t('earn.fidelity_bond.freeze_utxos.description_selected_utxos')}</p>
              <div className="mt-2 space-y-1">
                {selectedUtxos.map((utxo) => (
                  <div key={utxo.utxo} className="flex items-center justify-between text-sm">
                    <span className="truncate font-mono text-xs">{utxo.utxo.slice(0, 20)}...</span>
                    <span className="font-mono">{formatSats(utxo.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {utxosToFreeze.length > 0 && (
              <div className="border-t pt-4">
                <p className="font-medium">{t('earn.fidelity_bond.freeze_utxos.description_unselected_utxos')}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t('earn.fidelity_bond.freeze_utxos.description_selected_utxos_to_freeze', { jar: selectedJarIndex })}
                </p>
                <div className="mt-2 space-y-1">
                  {utxosToFreeze.map((utxo) => (
                    <div key={utxo.utxo} className="flex items-center justify-between text-sm">
                      <span className="truncate font-mono text-xs">{utxo.utxo.slice(0, 20)}...</span>
                      <span className="font-mono">{formatSats(utxo.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case 'review':
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">{t('earn.fidelity_bond.review_inputs.description')}</p>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('earn.fidelity_bond.review_inputs.label_lock_date')}</span>
                <span className="font-medium">{selectedDateLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('earn.fidelity_bond.review_inputs.label_jar')}</span>
                <span className="font-medium">
                  {t('earn.fidelity_bond.review_inputs.label_jar_n', { jar: selectedJarIndex })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('earn.fidelity_bond.review_inputs.label_amount')}</span>
                <span className="font-mono font-medium">{formatSats(totalAmount)}</span>
              </div>
            </div>

            {timelockAddressQuery.isLoading ? (
              <div className="text-muted-foreground flex items-center gap-2">
                <Loader2Icon className="h-4 w-4 animate-spin" />
                {t('earn.fidelity_bond.text_loading')}
              </div>
            ) : (
              address && (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <BitcoinQR address={address} amount={totalAmount} width={180} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('earn.fidelity_bond.review_inputs.label_address')}</Label>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted flex-1 rounded p-2 text-xs break-all">{address}</code>
                      <CopyButton
                        className={buttonVariants({ variant: 'outline', size: 'icon' })}
                        value={address}
                        text={<CopyIcon className="h-4 w-4" />}
                        successText={<CheckIcon className="h-4 w-4 text-green-500" />}
                        onSuccess={() => toast.success(t('receive.text_copy_address'))}
                      />
                    </div>
                  </div>
                </div>
              )
            )}

            <Alert variant="warning">
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertDescription>
                <strong>{t('earn.fidelity_bond.confirm_modal.title')}</strong>{' '}
                {t('earn.fidelity_bond.confirm_modal.body', {
                  humanReadableDuration: selectedDateLabel ? `until ${selectedDateLabel}` : '',
                  date: selectedDateLabel || '',
                })}
              </AlertDescription>
            </Alert>

            <div className="flex items-start gap-3">
              <Switch
                id="confirmation"
                checked={confirmationChecked}
                onCheckedChange={(checked) => setConfirmationChecked(checked)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="confirmation" className="cursor-pointer text-sm font-medium">
                  {t('earn.fidelity_bond.create_form.confirmation_toggle_title')}
                </Label>
                <p className="text-muted-foreground text-xs">
                  {t('earn.fidelity_bond.create_form.confirmation_toggle_subtitle')}
                </p>
              </div>
            </div>
          </div>
        )

      case 'creating':
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <Spinner className="h-12 w-12" />
            <p className="mt-4 text-lg font-medium">{t('earn.fidelity_bond.text_creating')}</p>
          </div>
        )

      case 'success':
        return (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-4">
              <CheckCircle2Icon className="h-16 w-16 text-green-500" />
              <p className="mt-4 text-lg font-medium">{t('earn.fidelity_bond.create_fidelity_bond.success_text')}</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('earn.fidelity_bond.create_fidelity_bond.label_lock_date')}
                </span>
                <span className="font-medium">{selectedDateLabel}</span>
              </div>
              {address && (
                <div className="space-y-2">
                  <Label>{t('earn.fidelity_bond.create_fidelity_bond.label_address')}</Label>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted flex-1 rounded p-2 text-xs break-all">{address}</code>
                    <CopyButton
                      className={buttonVariants({ variant: 'outline', size: 'icon' })}
                      value={address}
                      text={<CopyIcon className="h-4 w-4" />}
                      successText={<CheckIcon className="h-4 w-4 text-green-500" />}
                      onSuccess={() => toast.success(t('receive.text_copy_address'))}
                    />
                  </div>
                </div>
              )}
              {txResult?.txinfo?.txid && (
                <div className="space-y-2">
                  <Label>{t('earn.fidelity_bond.create_fidelity_bond.label_transaction_id')}</Label>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted flex-1 rounded p-2 text-xs break-all">{txResult.txinfo.txid}</code>
                    <CopyButton
                      className={buttonVariants({ variant: 'outline', size: 'icon' })}
                      value={txResult.txinfo.txid}
                      text={<CopyIcon className="h-4 w-4" />}
                      successText={<CheckIcon className="h-4 w-4 text-green-500" />}
                      onSuccess={() => toast.success(t('receive.text_copy_address'))}
                    />
                  </div>
                </div>
              )}
            </div>

            {frozenUtxos.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-muted-foreground text-sm">
                  {t('earn.fidelity_bond.create_fidelity_bond.label_utxos_to_unfreeze')}
                </p>
              </div>
            )}
          </div>
        )
    }
  }

  const renderFooter = () => {
    if (step === 'creating') return null

    if (step === 'success') {
      return (
        <DialogFooter className="gap-2 sm:gap-0">
          {frozenUtxos.length > 0 && (
            <Button variant="outline" onClick={handleUnfreezeUtxos} disabled={unfreezeUtxo.isPending}>
              {unfreezeUtxo.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {t('earn.fidelity_bond.text_unfreezing')}
                </>
              ) : (
                t('earn.fidelity_bond.create_fidelity_bond.text_primary_button_unfreeze')
              )}
            </Button>
          )}
          <Button onClick={() => handleOpenChange(false)}>
            {t('earn.fidelity_bond.create_fidelity_bond.text_primary_button')}
          </Button>
        </DialogFooter>
      )
    }

    const isLoading = freezeUtxo.isPending || directSend.isPending

    return (
      <DialogFooter className="gap-2 sm:gap-0">
        {step !== 'select_date' && (
          <Button variant="ghost" onClick={handleBack} disabled={isLoading}>
            <ChevronLeftIcon className="mr-1 h-4 w-4" />
            {t('global.back')}
          </Button>
        )}
        <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
          {t('earn.fidelity_bond.select_date.text_secondary_button')}
        </Button>
        <Button onClick={handleNext} disabled={!canProceed() || isLoading}>
          {isLoading && <Spinner className="mr-2 h-4 w-4" />}
          {step === 'freeze_utxos'
            ? utxosToFreeze.length > 0
              ? t('earn.fidelity_bond.freeze_utxos.text_primary_button')
              : t('earn.fidelity_bond.freeze_utxos.text_primary_button_all_frozen')
            : step === 'review'
              ? t('earn.fidelity_bond.review_inputs.text_primary_button')
              : t('earn.fidelity_bond.select_date.text_primary_button')}
        </Button>
      </DialogFooter>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('earn.fidelity_bond.create_fidelity_bond.title')}</DialogTitle>
          <DialogDescription>{t('earn.fidelity_bond.subtitle')}</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="py-4">{renderStepContent()}</div>

        {renderFooter()}
      </DialogContent>
    </Dialog>
  )
}
