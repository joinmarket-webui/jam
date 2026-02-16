import { useState, useMemo } from 'react'
import {
  directsendMutation,
  freezeMutation,
  getaddressOptions,
} from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { DirectSendResponse, ErrorMessage } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  CopyIcon,
  CheckIcon,
  UnlockIcon,
  Loader2Icon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import type { FidelityBondUtxo, Utxo } from '@/hooks/useQueryUtxos'
import { getErrorReason } from '@/lib/errorReason'
import { cn, formatSats, type WalletFileName } from '@/lib/utils'
import type { JarIndex } from '@/types/global'

type Step = 'select_jar' | 'confirm' | 'sending' | 'success'

interface MoveToJarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletFileName: WalletFileName
  utxo: FidelityBondUtxo
}

export function MoveToJarDialog({ open, onOpenChange, walletFileName, utxo }: MoveToJarDialogProps) {
  const { t } = useTranslation()
  const client = useApiClient()
  const walletInfo = useJamWalletInfoContext()

  const [step, setStep] = useState<Step>('select_jar')
  const [selectedJarIndex, setSelectedJarIndex] = useState<JarIndex | undefined>()
  const [confirmationChecked, setConfirmationChecked] = useState(false)
  const [txResult, setTxResult] = useState<DirectSendResponse | undefined>()
  const [error, setError] = useState<string | undefined>()

  const sourceJar = walletInfo.jars.find((jar) => jar.jarIndex === utxo.mixdepth)

  // All jars except the FB's source jar are valid destinations
  const destinationJars = useMemo(() => {
    return walletInfo.jars.filter((jar) => jar.jarIndex !== utxo.mixdepth)
  }, [walletInfo.jars, utxo.mixdepth])

  // UTXOs in the source jar that are NOT this FB — they need to be frozen during sweep
  const utxosToFreeze = useMemo(() => {
    if (!sourceJar) return []
    return sourceJar.utxos.filter((u) => u.utxo !== utxo.utxo && !u.frozen)
  }, [sourceJar, utxo.utxo])

  const getAddressQueryOptions = getaddressOptions({
    client,
    path: {
      walletname: encodeURIComponent(walletFileName),
      mixdepth: String(selectedJarIndex ?? 0),
    },
  })

  const getAddressQuery = useQuery({
    ...getAddressQueryOptions,
    enabled: open && selectedJarIndex !== undefined && step !== 'select_jar',
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })

  if (getAddressQuery.isError && !error) {
    setError(t('earn.fidelity_bond.move.error_loading_address'))
  }

  const destinationAddress = getAddressQuery.data?.address

  const freezeUtxo = useMutation({
    ...freezeMutation({ client }),
    onError: (error: ErrorMessage) => {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      setError(`${t('earn.fidelity_bond.move.error_freezing_utxos')} ${reason}`)
    },
  })

  const unfreezeUtxo = useMutation({
    ...freezeMutation({ client }),
    onError: (error: ErrorMessage) => {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      setError(`${t('earn.fidelity_bond.move.error_unfreezing_fidelity_bond')} ${reason}`)
    },
  })

  const directSend = useMutation({
    ...directsendMutation({ client }),
    onError: (error: ErrorMessage) => {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      setError(`${t('earn.fidelity_bond.move.error_spending_fidelity_bond')} ${reason}`)
    },
  })

  const handleReset = () => {
    setStep('select_jar')
    setSelectedJarIndex(undefined)
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
    if (selectedJarIndex === undefined || !destinationAddress) return

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
      toast.success(t('earn.fidelity_bond.move.success_text'))

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
          <DialogTitle className="text-2xl">{t('earn.fidelity_bond.move.title')}</DialogTitle>
          <DialogDescription>{t('earn.fidelity_bond.subtitle')}</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="animate-in fade-in-50">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="py-2">
          {step === 'select_jar' && (
            <div className="space-y-6">
              <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-4">
                <div className="bg-primary/10 rounded-lg p-2">
                  <UnlockIcon className="text-primary h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{t('earn.fidelity_bond.move.select_jar.description')}</p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-muted-foreground mb-1 text-xs">
                  {t('earn.fidelity_bond.review_inputs.label_amount')}
                </p>
                <p className="font-mono text-lg font-bold">{formatSats(utxo.value)}</p>
              </div>

              <div className="grid gap-3">
                {destinationJars.map((jar) => {
                  const isSelected = selectedJarIndex === jar.jarIndex
                  return (
                    <Card
                      key={jar.jarIndex}
                      className={cn(
                        'cursor-pointer transition-all duration-200 hover:shadow-md',
                        isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'hover:bg-muted/30',
                      )}
                      onClick={() => setSelectedJarIndex(jar.jarIndex)}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <div
                            className="h-10 w-10 rounded-full shadow-sm"
                            style={{ backgroundColor: jar.color, opacity: 0.8 }}
                          />
                          <div>
                            <p className="font-semibold">{jar.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-semibold">
                            {formatSats(jar.balanceSummary.calculatedAvailableBalanceInSats)}
                          </p>
                          {isSelected && <CheckCircle2Icon className="text-primary mt-1 ml-auto h-5 w-5" />}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-muted-foreground mb-1 text-xs">
                    {t('earn.fidelity_bond.review_inputs.label_jar')}
                  </p>
                  <p className="font-semibold">
                    {t('earn.fidelity_bond.review_inputs.label_jar_n', { jar: utxo.mixdepth })}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-muted-foreground mb-1 text-xs">{t('earn.fidelity_bond.move.label_destination')}</p>
                  <p className="font-semibold">
                    {t('earn.fidelity_bond.review_inputs.label_jar_n', { jar: selectedJarIndex })}
                  </p>
                </div>
              </div>

              <div className="bg-primary/5 border-primary/20 rounded-lg border p-4">
                <p className="text-muted-foreground mb-1 text-xs">
                  {t('earn.fidelity_bond.review_inputs.label_amount')}
                </p>
                <p className="font-mono text-2xl font-bold">{formatSats(utxo.value)}</p>
              </div>

              {getAddressQuery.isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2Icon className="text-primary h-6 w-6 animate-spin" />
                  <p className="text-muted-foreground ml-2">{t('earn.fidelity_bond.move.text_loading')}</p>
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
                <AlertTitle>{t('earn.fidelity_bond.move.confirm_send_modal.title')}</AlertTitle>
              </Alert>

              <div className="bg-muted/50 flex items-start gap-3 rounded-lg p-4">
                <Switch
                  id="move-confirmation"
                  checked={confirmationChecked}
                  onCheckedChange={(checked) => setConfirmationChecked(checked)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="move-confirmation" className="cursor-pointer text-sm font-medium">
                    {t('earn.fidelity_bond.create_form.confirmation_toggle_title')}
                  </Label>
                </div>
              </div>
            </div>
          )}

          {step === 'sending' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <Spinner className="h-16 w-16" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <UnlockIcon className="text-primary h-6 w-6 animate-pulse" />
                </div>
              </div>
              <p className="mt-6 text-lg font-semibold">{t('earn.fidelity_bond.move.text_sending')}</p>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-6">
              <div className="flex flex-col items-center py-6">
                <div className="rounded-full bg-green-500/10 p-4">
                  <CheckCircle2Icon className="h-16 w-16 text-green-500" />
                </div>
                <p className="mt-4 text-xl font-bold">{t('earn.fidelity_bond.move.success_text')}</p>
              </div>

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
                      key="copy-txid-move"
                      value={txResult.txinfo.txid}
                      text={<CopyIcon className="h-4 w-4" />}
                      successText={<CheckIcon className="h-4 w-4 text-green-500" />}
                      className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'h-10 w-10 shrink-0')}
                      onSuccess={() =>
                        toast.success(t('earn.fidelity_bond.create_fidelity_bond.text_copy_transaction_id'))
                      }
                      onError={() => toast.error(t('global.errors.reason_unknown'))}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {step === 'select_jar' && (
          <DialogFooter className="gap-3 sm:gap-2">
            <Button variant="outline" className="min-w-24" onClick={() => handleOpenChange(false)}>
              {t('earn.fidelity_bond.move.text_button_cancel')}
            </Button>
            <Button className="min-w-32" disabled={selectedJarIndex === undefined} onClick={() => setStep('confirm')}>
              {t('earn.fidelity_bond.select_date.text_primary_button')}
            </Button>
          </DialogFooter>
        )}

        {step === 'confirm' && (
          <DialogFooter className="gap-3 sm:gap-2">
            <Button variant="ghost" onClick={() => setStep('select_jar')} disabled={isLoading}>
              <ChevronLeftIcon className="mr-1 h-4 w-4" />
              {t('global.back')}
            </Button>
            <Button variant="outline" className="min-w-24" onClick={() => handleOpenChange(false)} disabled={isLoading}>
              {t('earn.fidelity_bond.move.text_button_cancel')}
            </Button>
            <Button
              className="min-w-32"
              disabled={!confirmationChecked || !destinationAddress || isLoading}
              onClick={() => void handleSubmit()}
            >
              {isLoading && <Spinner className="mr-2 h-4 w-4" />}
              {t('earn.fidelity_bond.move.text_button_submit')}
            </Button>
          </DialogFooter>
        )}

        {step === 'success' && (
          <DialogFooter className="gap-3 sm:gap-2">
            <Button className="min-w-32" onClick={() => handleOpenChange(false)}>
              {t('earn.fidelity_bond.move.text_button_done')}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
