import { useState, useMemo } from 'react'
import {
  directsendMutation,
  freezeMutation,
  gettimelockaddressOptions,
} from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { DirectSendResponse, ErrorMessage } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronLeftIcon,
  CopyIcon,
  Loader2Icon,
  RefreshCwIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
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
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import type { FidelityBondUtxo, Utxo } from '@/hooks/useQueryUtxos'
import * as fb from '@/lib/fidelityBondUtils'
import { cn, formatSats, type WalletFileName } from '@/lib/utils'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { generateLockdateOptions, getYearOptions, getMonthOptions } from './CreateFidelityBondDialog/types'

type Step = 'select_date' | 'confirm' | 'sending' | 'success'

interface RenewBondDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletFileName: WalletFileName
  utxo: FidelityBondUtxo
}

export function RenewBondDialog({ open, onOpenChange, walletFileName, utxo }: RenewBondDialogProps) {
  const { t } = useTranslation()
  const client = useApiClient()
  const walletInfo = useJamWalletInfoContext()
  const isDeveloperMode = useStore(jamSettingsStore, (state) => state.state.developerMode)

  const [step, setStep] = useState<Step>('select_date')
  const [selectedLockdate, setSelectedLockdate] = useState<fb.Lockdate | ''>('')
  const [confirmationChecked, setConfirmationChecked] = useState(false)
  const [txResult, setTxResult] = useState<DirectSendResponse | undefined>()
  const [error, setError] = useState<string | undefined>()

  const lockdateOptions = useMemo(() => generateLockdateOptions(isDeveloperMode), [isDeveloperMode])
  const yearOptions = useMemo(() => getYearOptions(lockdateOptions), [lockdateOptions])
  const monthOptions = useMemo(() => getMonthOptions(), [])

  const minLockdate = lockdateOptions.at(0)?.value ?? ''
  const maxLockdate = lockdateOptions.at(-1)?.value ?? ''
  const clampLockdate = (lockdate: string): fb.Lockdate | '' => {
    if (!lockdate || lockdate < minLockdate) return minLockdate || ''
    if (lockdate > maxLockdate) return maxLockdate || ''
    return lockdate as fb.Lockdate
  }
  const selectedYear = selectedLockdate ? selectedLockdate.slice(0, 4) : ''
  const selectedMonth = selectedLockdate ? selectedLockdate.slice(5, 7) : ''
  const minYear = minLockdate ? Number.parseInt(minLockdate.slice(0, 4), 10) : 0
  const minMonth = minLockdate ? Number.parseInt(minLockdate.slice(5, 7), 10) : 1

  const selectedDateLabel = selectedLockdate
    ? new Date(fb.lockdate.toTimestamp(selectedLockdate)).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  const sourceJar = walletInfo.jars.find((jar) => jar.jarIndex === utxo.mixdepth)

  // UTXOs in the source jar that are NOT this FB — they need to be frozen during sweep
  const utxosToFreeze = useMemo(() => {
    if (!sourceJar) return []
    return sourceJar.utxos.filter((u) => u.utxo !== utxo.utxo && !u.frozen)
  }, [sourceJar, utxo.utxo])

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

  if (timelockAddressQuery.isError && !error) {
    setError(t('earn.fidelity_bond.error_loading_address'))
  }

  const destinationAddress = timelockAddressQuery.data?.address

  const freezeUtxo = useMutation({
    ...freezeMutation({ client }),
    onError: (error: ErrorMessage) => {
      const reason = error.message || error.error_description || t('global.errors.reason_unknown')
      setError(`${t('earn.fidelity_bond.error_freezing_utxos')} ${reason}`)
    },
  })

  const unfreezeUtxo = useMutation({
    ...freezeMutation({ client }),
    onError: (error: ErrorMessage) => {
      const reason = error.message || error.error_description || t('global.errors.reason_unknown')
      setError(`${t('earn.fidelity_bond.error_unfreezing_utxos')} ${reason}`)
    },
  })

  const directSend = useMutation({
    ...directsendMutation({ client }),
    onError: (error: ErrorMessage) => {
      const reason = error.message || error.error_description || t('global.errors.reason_unknown')
      setError(`${t('earn.fidelity_bond.renew.error_renewing_fidelity_bond')} ${reason}`)
    },
  })

  const handleReset = () => {
    setStep('select_date')
    setSelectedLockdate('')
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

  const handleSubmit = async () => {
    if (!destinationAddress) return

    setStep('sending')
    setError(undefined)

    const frozen: Utxo[] = []
    try {
      // Freeze other UTXOs in the source jar so only the FB gets swept
      for (const u of utxosToFreeze) {
        await freezeUtxo.mutateAsync({
          path: { walletname: encodeURIComponent(walletFileName) },
          body: { 'utxo-string': u.utxo, freeze: true },
        })
        frozen.push(u)
      }

      if (utxo.frozen) {
        await unfreezeUtxo.mutateAsync({
          path: { walletname: encodeURIComponent(walletFileName) },
          body: { 'utxo-string': utxo.utxo, freeze: false },
        })
      }

      const result = await directSend.mutateAsync({
        path: { walletname: encodeURIComponent(walletFileName) },
        body: {
          mixdepth: utxo.mixdepth,
          amount_sats: 0,
          destination: destinationAddress,
        },
      })

      setTxResult(result)
      setStep('success')
      toast.success(t('earn.fidelity_bond.renew.success_text'))

      // Best-effort cleanup — tx already broadcast, don't throw on unfreeze failure
      for (const u of frozen) {
        try {
          await unfreezeUtxo.mutateAsync({
            path: { walletname: encodeURIComponent(walletFileName) },
            body: { 'utxo-string': u.utxo, freeze: false },
          })
        } catch {
          // logged via onError
        }
      }

      await walletInfo.refetch()
    } catch {
      // Best-effort rollback — unfreeze UTXOs that were frozen before the error
      for (const u of frozen) {
        try {
          await unfreezeUtxo.mutateAsync({
            path: { walletname: encodeURIComponent(walletFileName) },
            body: { 'utxo-string': u.utxo, freeze: false },
          })
        } catch {
          // logged via onError
        }
      }
      setStep('confirm')
    }
  }

  const isLoading = freezeUtxo.isPending || unfreezeUtxo.isPending || directSend.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t('earn.fidelity_bond.renew.title')}</DialogTitle>
          <DialogDescription>{t('earn.fidelity_bond.subtitle')}</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="animate-in fade-in-50">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="py-2">
          {step === 'select_date' && (
            <div className="space-y-6">
              <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-4">
                <div className="bg-primary/10 rounded-lg p-2">
                  <CalendarIcon className="text-primary h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{t('earn.fidelity_bond.select_date.description')}</p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-muted-foreground mb-1 text-xs">
                  {t('earn.fidelity_bond.review_inputs.label_amount')}
                </p>
                <p className="font-mono text-lg font-bold">{formatSats(utxo.value)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="renew-lockdate-month" className="text-sm font-medium">
                    {t('earn.fidelity_bond.select_date.form_label_month')}
                  </Label>
                  <Select
                    value={selectedMonth}
                    onValueChange={(month) => {
                      const year =
                        selectedYear || String(Number.parseInt(month, 10) >= minMonth ? minYear : minYear + 1)
                      const newLockdate = clampLockdate(`${year}-${month}`)
                      setSelectedLockdate(newLockdate)
                    }}
                  >
                    <SelectTrigger id="renew-lockdate-month" className="h-11 w-full">
                      <SelectValue placeholder={t('earn.fidelity_bond.select_date.form_label_month')} />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="renew-lockdate-year" className="text-sm font-medium">
                    {t('earn.fidelity_bond.select_date.form_label_year')}
                  </Label>
                  <Select
                    value={selectedYear}
                    onValueChange={(year) => {
                      const month = selectedMonth || String(year === String(minYear) ? minMonth : 1).padStart(2, '0')
                      const newLockdate = clampLockdate(`${year}-${month}`)
                      setSelectedLockdate(newLockdate)
                    }}
                  >
                    <SelectTrigger id="renew-lockdate-year" className="h-11 w-full">
                      <SelectValue placeholder={t('earn.fidelity_bond.select_date.form_label_year')} />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedLockdate && (
                <div className="bg-primary/5 border-primary/20 rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">
                    {t('earn.fidelity_bond.review_inputs.label_lock_date')}
                  </p>
                  <p className="mt-1 text-lg font-semibold">{selectedDateLabel}</p>
                </div>
              )}
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-muted-foreground mb-1 text-xs">
                    {t('earn.fidelity_bond.review_inputs.label_lock_date')}
                  </p>
                  <p className="font-semibold">{selectedDateLabel}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-muted-foreground mb-1 text-xs">
                    {t('earn.fidelity_bond.review_inputs.label_jar')}
                  </p>
                  <p className="font-semibold">
                    {t('earn.fidelity_bond.review_inputs.label_jar_n', { jar: utxo.mixdepth })}
                  </p>
                </div>
              </div>

              <div className="bg-primary/5 border-primary/20 rounded-lg border p-4">
                <p className="text-muted-foreground mb-1 text-xs">
                  {t('earn.fidelity_bond.review_inputs.label_amount')}
                </p>
                <p className="font-mono text-2xl font-bold">{formatSats(utxo.value)}</p>
              </div>

              {timelockAddressQuery.isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2Icon className="text-primary h-6 w-6 animate-spin" />
                  <p className="text-muted-foreground ml-2">{t('earn.fidelity_bond.renew.text_loading')}</p>
                </div>
              ) : (
                destinationAddress && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('earn.fidelity_bond.review_inputs.label_address')}</Label>
                    <code className="bg-muted block rounded-lg p-3 font-mono text-xs break-all">
                      {destinationAddress}
                    </code>
                  </div>
                )
              )}

              <Alert variant="warning">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertTitle>{t('earn.fidelity_bond.renew.confirm_send_modal.title')}</AlertTitle>
                <AlertDescription>
                  {t('earn.fidelity_bond.confirm_modal.body', {
                    humanReadableDuration: selectedDateLabel ? `until ${selectedDateLabel}` : '',
                    date: selectedDateLabel || '',
                  })}
                </AlertDescription>
              </Alert>

              <div className="bg-muted/50 flex items-start gap-3 rounded-lg p-4">
                <Switch
                  id="renew-confirmation"
                  checked={confirmationChecked}
                  onCheckedChange={(checked) => setConfirmationChecked(checked)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="renew-confirmation" className="cursor-pointer text-sm font-medium">
                    {t('earn.fidelity_bond.create_form.confirmation_toggle_title')}
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    {t('earn.fidelity_bond.create_form.confirmation_toggle_subtitle')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 'sending' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <Spinner className="h-16 w-16" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <RefreshCwIcon className="text-primary h-6 w-6 animate-pulse" />
                </div>
              </div>
              <p className="mt-6 text-lg font-semibold">{t('earn.fidelity_bond.renew.text_sending')}</p>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-6">
              <div className="flex flex-col items-center py-6">
                <div className="rounded-full bg-green-500/10 p-4">
                  <CheckCircle2Icon className="h-16 w-16 text-green-500" />
                </div>
                <p className="mt-4 text-xl font-bold">{t('earn.fidelity_bond.renew.success_text')}</p>
              </div>

              {destinationAddress && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t('earn.fidelity_bond.create_fidelity_bond.label_address')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted flex-1 rounded-lg p-3 font-mono text-xs break-all">
                      {destinationAddress}
                    </code>
                    <CopyButton
                      key="copy-address-renew"
                      value={destinationAddress}
                      text={<CopyIcon className="h-4 w-4" />}
                      successText={<CheckIcon className="h-4 w-4 text-green-500" />}
                      className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'h-10 w-10 shrink-0')}
                      onSuccess={() => toast.success(t('receive.text_copy_address'))}
                      onError={() => toast.error(t('global.errors.reason_unknown'))}
                    />
                  </div>
                </div>
              )}

              {txResult?.txinfo?.txid && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t('earn.fidelity_bond.create_fidelity_bond.label_transaction_id')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted flex-1 rounded-lg p-3 font-mono text-xs break-all">
                      {txResult.txinfo.txid}
                    </code>
                    <CopyButton
                      key="copy-txid-renew"
                      value={txResult.txinfo.txid}
                      text={<CopyIcon className="h-4 w-4" />}
                      successText={<CheckIcon className="h-4 w-4 text-green-500" />}
                      className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'h-10 w-10 shrink-0')}
                      onSuccess={() => toast.success(t('receive.text_copy_address'))}
                      onError={() => toast.error(t('global.errors.reason_unknown'))}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {step === 'select_date' && (
          <DialogFooter className="gap-3 sm:gap-2">
            <Button variant="outline" className="min-w-24" onClick={() => handleOpenChange(false)}>
              {t('earn.fidelity_bond.select_date.text_secondary_button')}
            </Button>
            <Button className="min-w-32" disabled={!selectedLockdate} onClick={() => setStep('confirm')}>
              {t('earn.fidelity_bond.select_date.text_primary_button')}
            </Button>
          </DialogFooter>
        )}

        {step === 'confirm' && (
          <DialogFooter className="gap-3 sm:gap-2">
            <Button variant="ghost" onClick={() => setStep('select_date')} disabled={isLoading}>
              <ChevronLeftIcon className="mr-1 h-4 w-4" />
              {t('global.back')}
            </Button>
            <Button variant="outline" className="min-w-24" onClick={() => handleOpenChange(false)} disabled={isLoading}>
              {t('earn.fidelity_bond.select_date.text_secondary_button')}
            </Button>
            <Button
              className="min-w-32"
              disabled={!confirmationChecked || !destinationAddress || isLoading}
              onClick={() => void handleSubmit()}
            >
              {isLoading && <Spinner className="mr-2 h-4 w-4" />}
              {t('earn.fidelity_bond.renew.text_button_submit')}
            </Button>
          </DialogFooter>
        )}

        {step === 'success' && (
          <DialogFooter className="gap-3 sm:gap-2">
            <Button className="min-w-32" onClick={() => handleOpenChange(false)}>
              {t('earn.fidelity_bond.create_fidelity_bond.text_primary_button')}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
