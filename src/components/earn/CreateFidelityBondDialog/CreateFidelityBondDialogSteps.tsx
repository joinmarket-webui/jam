import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CheckIcon,
  CopyIcon,
  Loader2Icon,
  CalendarIcon,
  WalletIcon,
  CoinsIcon,
  LockIcon,
} from 'lucide-react'
import { Trans } from 'react-i18next'
import { toast } from 'sonner'
import { BitcoinQR } from '@/components/receive/BitcoinQR'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent } from '@/components/ui/card'
import { CopyButton } from '@/components/ui/jam/CopyButton'
import { Label } from '@/components/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import * as fb from '@/lib/fidelityBondUtils'
import { cn, formatSats } from '@/lib/utils'
import type { useCreateFidelityBondWizard } from './useCreateFidelityBondWizard'

type Wizard = ReturnType<typeof useCreateFidelityBondWizard>

type CreateFidelityBondDialogStepsProps = {
  wizard: Wizard
}

export function CreateFidelityBondDialogSteps({ wizard }: CreateFidelityBondDialogStepsProps) {
  const {
    step,
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
    utxoPage,
    setUtxoPage,
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
    t,
  } = wizard

  switch (step) {
    case 'select_date':
      return (
        <div className="space-y-6">
          <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-4">
            <div className="bg-primary/10 rounded-lg p-2">
              <CalendarIcon className="text-primary h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{t('earn.fidelity_bond.select_date.description')}</p>
              <p className="text-muted-foreground mt-1 text-sm">Choose when your funds will be unlocked</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lockdate-month" className="text-sm font-medium">
                {t('earn.fidelity_bond.select_date.form_label_month')}
              </Label>
              <Select
                value={selectedMonth}
                onValueChange={(month) => {
                  const year = selectedYear || String(Number.parseInt(month, 10) >= minMonth ? minYear : minYear + 1)
                  const newLockdate = clampLockdate(`${year}-${month}`)
                  setSelectedLockdate(newLockdate)
                }}
              >
                <SelectTrigger id="lockdate-month" className="h-11 w-full">
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
              <Label htmlFor="lockdate-year" className="text-sm font-medium">
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
                <SelectTrigger id="lockdate-year" className="h-11 w-full">
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
              <p className="text-muted-foreground text-sm">Selected lock date</p>
              <p className="mt-1 text-lg font-semibold">{selectedDateLabel}</p>
            </div>
          )}

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
        <div className="space-y-6">
          <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-4">
            <div className="bg-primary/10 rounded-lg p-2">
              <WalletIcon className="text-primary h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Select Source Jar</p>
              <p className="text-muted-foreground mt-1 text-sm">{t('earn.fidelity_bond.select_jar.description')}</p>
            </div>
          </div>

          <div className="grid gap-3">
            {jarsWithUtxos.map((jar) => {
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
                        <p className="text-muted-foreground text-sm">
                          {jar.utxos.filter((u) => !u.frozen && !fb.utxo.isFidelityBond(u)).length} available UTXOs
                        </p>
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
        <div className="space-y-6">
          <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-4">
            <div className="bg-primary/10 rounded-lg p-2">
              <CoinsIcon className="text-primary h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">Select UTXOs</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t('earn.fidelity_bond.select_utxos.description', { jar: selectedJarIndex })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={selectAllUtxos} className="shadow-sm">
              <CheckIcon className="mr-1 h-3.5 w-3.5" />
              {t('earn.fidelity_bond.select_utxos.button_select_all')}
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAllUtxos} className="shadow-sm">
              {t('earn.fidelity_bond.select_utxos.button_deselect_all')}
            </Button>
          </div>

          <div className="space-y-2">
            {(() => {
              const perPage = 5
              const totalPages = Math.ceil(availableUtxos.length / perPage)
              const page = Math.max(0, Math.min(utxoPage, totalPages - 1))
              const paged = availableUtxos.slice(page * perPage, (page + 1) * perPage)

              return (
                <>
                  {paged.map((utxo) => {
                    const isSelected = selectedUtxos.some((u) => u.utxo === utxo.utxo)
                    return (
                      <Card
                        key={utxo.utxo}
                        className={cn(
                          'cursor-pointer transition-all duration-200',
                          isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'hover:bg-muted/30 hover:shadow-sm',
                        )}
                        onClick={() => toggleUtxoSelection(utxo)}
                      >
                        <CardContent className="flex items-center gap-3 p-3">
                          <div
                            className={cn(
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all',
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-muted-foreground/40',
                            )}
                          >
                            {isSelected && <CheckIcon className="h-3.5 w-3.5" />}
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="truncate font-mono text-xs break-all">{utxo.utxo}</p>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {t('earn.fidelity_bond.select_utxos.utxo_card.confirmations', {
                                confs: utxo.confirmations,
                              })}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-mono text-sm font-semibold whitespace-nowrap">
                              {formatSats(utxo.value)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                  {totalPages > 1 && (
                    <Pagination className="pt-2">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setUtxoPage(Math.max(0, page - 1))}
                            disabled={page === 0}
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <span className="text-muted-foreground px-2 text-sm">
                            {page + 1} / {totalPages}
                          </span>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setUtxoPage(Math.min(totalPages - 1, page + 1))}
                            disabled={page >= totalPages - 1}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              )
            })()}
          </div>

          {selectedUtxos.length > 0 && (
            <div className="border-t pt-4">
              <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
                <span className="font-medium">Total Selected</span>
                <span className="font-mono text-lg font-bold">{formatSats(totalAmount)}</span>
              </div>
            </div>
          )}

          {isUsingAllFunds && (
            <Alert variant="warning">
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertDescription>
                <Trans i18nKey="earn.fidelity_bond.alert_all_funds_in_use">
                  <strong>Keep in mind</strong>: As you are using all available funds for the creation of this fidelity
                  bond, you will not have any UTXOs left. A fidelity bond{' '}
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
        <div className="space-y-6">
          <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-4">
            <div className="bg-primary/10 rounded-lg p-2">
              <LockIcon className="text-primary h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Freeze Remaining UTXOs</p>
              <p className="text-muted-foreground mt-1 text-sm">Protect your privacy by freezing unselected UTXOs</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
              <p className="mb-3 text-sm font-medium">Selected UTXOs ({selectedUtxos.length})</p>
              <div className="max-h-40 space-y-2 overflow-y-auto">
                {selectedUtxos.map((utxo) => (
                  <div key={utxo.utxo} className="flex items-center justify-between py-1 text-sm">
                    <span className="mr-2 flex-1 truncate font-mono text-xs">{utxo.utxo.slice(0, 24)}...</span>
                    <span className="font-mono font-semibold">{formatSats(utxo.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {utxosToFreeze.length > 0 && (
              <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-4">
                <p className="mb-1 text-sm font-medium">UTXOs to Freeze ({utxosToFreeze.length})</p>
                <p className="text-muted-foreground mb-3 text-xs">
                  {t('earn.fidelity_bond.freeze_utxos.description_selected_utxos_to_freeze', {
                    jar: selectedJarIndex,
                  })}
                </p>
                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {utxosToFreeze.map((utxo) => (
                    <div key={utxo.utxo} className="flex items-center justify-between py-1 text-sm">
                      <span className="mr-2 flex-1 truncate font-mono text-xs">{utxo.utxo.slice(0, 24)}...</span>
                      <span className="font-mono font-semibold">{formatSats(utxo.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )

    case 'review':
      return (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-muted-foreground mb-1 text-xs">
                  {t('earn.fidelity_bond.review_inputs.label_lock_date')}
                </p>
                <p className="font-semibold">{selectedDateLabel}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-muted-foreground mb-1 text-xs">{t('earn.fidelity_bond.review_inputs.label_jar')}</p>
                <p className="font-semibold">
                  {t('earn.fidelity_bond.review_inputs.label_jar_n', { jar: selectedJarIndex })}
                </p>
              </div>
            </div>

            <div className="bg-primary/5 border-primary/20 rounded-lg border p-4">
              <p className="text-muted-foreground mb-1 text-xs">{t('earn.fidelity_bond.review_inputs.label_amount')}</p>
              <p className="font-mono text-2xl font-bold">{formatSats(totalAmount)}</p>
            </div>
          </div>

          {timelockAddressQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2Icon className="text-primary mx-auto h-8 w-8 animate-spin" />
                <p className="text-muted-foreground mt-3">{t('earn.fidelity_bond.text_loading')}</p>
              </div>
            </div>
          ) : (
            address && (
              <div className="space-y-4">
                <div className="dark:bg-muted/30 flex justify-center rounded-lg bg-white p-4">
                  <BitcoinQR address={address} amount={totalAmount} width={200} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('earn.fidelity_bond.review_inputs.label_address')}</Label>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted flex-1 rounded-lg p-3 font-mono text-xs break-all">{address}</code>
                    <CopyButton
                      key="copy-address-review"
                      value={address}
                      text={<CopyIcon className="h-4 w-4" />}
                      successText={<CheckIcon className="h-4 w-4 text-green-500" />}
                      className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'h-10 w-10 shrink-0')}
                      onSuccess={() => toast.success(t('receive.text_copy_address'))}
                      onError={() => toast.error(t('global.errors.reason_unknown'))}
                    />
                  </div>
                </div>
              </div>
            )
          )}

          <Alert variant="warning">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertTitle>{t('earn.fidelity_bond.confirm_modal.title')}</AlertTitle>
            <AlertDescription>
              {t('earn.fidelity_bond.confirm_modal.body', {
                humanReadableDuration: selectedDateLabel ? `until ${selectedDateLabel}` : '',
                date: selectedDateLabel || '',
              })}
            </AlertDescription>
          </Alert>

          <div className="bg-muted/50 flex items-start gap-3 rounded-lg p-4">
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
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <Spinner className="h-16 w-16" />
            <div className="absolute inset-0 flex items-center justify-center">
              <LockIcon className="text-primary h-6 w-6 animate-pulse" />
            </div>
          </div>
          <p className="mt-6 text-lg font-semibold">{t('earn.fidelity_bond.text_creating')}</p>
          <p className="text-muted-foreground mt-2 text-sm">This may take a moment...</p>
        </div>
      )

    case 'success':
      return (
        <div className="space-y-6">
          <div className="flex flex-col items-center py-6">
            <div className="rounded-full bg-green-500/10 p-4">
              <CheckCircle2Icon className="h-16 w-16 text-green-500" />
            </div>
            <p className="mt-4 text-xl font-bold">{t('earn.fidelity_bond.create_fidelity_bond.success_text')}</p>
            <p className="text-muted-foreground mt-2 text-sm">Your fidelity bond has been created successfully</p>
          </div>

          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-muted-foreground mb-1 text-xs">
                {t('earn.fidelity_bond.create_fidelity_bond.label_lock_date')}
              </p>
              <p className="font-semibold">{selectedDateLabel}</p>
            </div>

            {address && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('earn.fidelity_bond.create_fidelity_bond.label_address')}
                </Label>
                <div className="flex items-center gap-2">
                  <code className="bg-muted flex-1 rounded-lg p-3 font-mono text-xs break-all">{address}</code>
                  <CopyButton
                    key="copy-address-success"
                    value={address}
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
                    key="copy-txid"
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

          {frozenUtxos.length > 0 && (
            <Alert>
              <AlertDescription className="text-sm">
                {t('earn.fidelity_bond.create_fidelity_bond.label_utxos_to_unfreeze')}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )
  }
}
