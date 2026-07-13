import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CheckIcon,
  CalendarIcon,
  WalletIcon,
  CoinsIcon,
  LockIcon,
} from 'lucide-react'
import { Trans } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BitcoinAddressQrCode } from '@/components/ui/jam/BitcoinQrCode'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import * as fb from '@/lib/fidelityBondUtils'
import { clamp, cn, formatSats } from '@/lib/utils'
import {
  ConfirmationToggle,
  CopyableField,
  InfoCard,
  InlineLoading,
  JarBadge,
  PendingStep,
  SatsAmount,
  StepIntro,
  SuccessHeading,
} from '../fidelity-bond/FidelityBondDialogParts'
import { LockdateSelect, lockdateLabel } from '../fidelity-bond/LockdateSelect'
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
    hasDuplicateLockdate,
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

  const selectedJar = jarsWithUtxos.find((jar) => jar.jarIndex === selectedJarIndex)
  const selectedDateLabel = selectedLockdate ? lockdateLabel(selectedLockdate) : null

  switch (step) {
    case 'select_date':
      return (
        <div className="space-y-6">
          <StepIntro
            icon={CalendarIcon}
            title={t('earn.fidelity_bond.select_date.description')}
            subtitle={t('earn.fidelity_bond.select_date.subtitle')}
          />

          <LockdateSelect id="lockdate" value={selectedLockdate} onChange={setSelectedLockdate} />

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
          <StepIntro
            icon={WalletIcon}
            title={t('earn.fidelity_bond.select_jar.title')}
            subtitle={t('earn.fidelity_bond.select_jar.description')}
          />

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
                  <CardContent className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 items-center gap-4">
                      <div
                        className="h-10 w-10 rounded-full shadow-sm"
                        style={{ backgroundColor: jar.color, opacity: 0.8 }}
                      />
                      <div>
                        <p className="font-semibold">{jar.name}</p>
                        <p className="text-muted-foreground text-sm">
                          {t('earn.fidelity_bond.select_jar.text_available_utxos', {
                            count: jar.utxos.filter((u) => !u.frozen && !fb.utxo.isFidelityBond(u)).length,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
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
          <StepIntro
            icon={CoinsIcon}
            title={t('earn.fidelity_bond.select_utxos.title')}
            subtitle={t('earn.fidelity_bond.select_utxos.description', { jar: selectedJarIndex })}
          />

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={selectAllUtxos} className="shadow-sm">
              <CheckIcon className="mr-1 h-3.5 w-3.5" />
              {t('earn.fidelity_bond.select_utxos.button_select_all')}
            </Button>
            <Button variant="outline" onClick={deselectAllUtxos} className="shadow-sm">
              {t('earn.fidelity_bond.select_utxos.button_deselect_all')}
            </Button>
          </div>

          <div className="space-y-2">
            {(() => {
              const perPage = 5
              const totalPages = Math.ceil(availableUtxos.length / perPage)
              const page = clamp(utxoPage, 0, totalPages - 1)
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
              <div className="bg-muted/50 flex flex-wrap items-center justify-between gap-2 rounded-lg p-3">
                <span className="min-w-0 font-medium break-words">
                  {t('earn.fidelity_bond.select_utxos.label_total_selected')}
                </span>
                <span className="shrink-0 font-mono text-lg font-bold">{formatSats(totalAmount)}</span>
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
          <StepIntro
            icon={LockIcon}
            title={t('earn.fidelity_bond.freeze_utxos.title')}
            subtitle={t('earn.fidelity_bond.freeze_utxos.subtitle')}
          />

          <div className="space-y-4">
            <div className="border-brand-success/20 bg-brand-success/10 rounded-lg border p-4">
              <p className="mb-3 text-sm font-medium">
                {t('earn.fidelity_bond.freeze_utxos.label_selected_utxos', { count: selectedUtxos.length })}
              </p>
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
              <div className="border-brand-warning/20 bg-brand-warning/10 rounded-lg border p-4">
                <p className="mb-1 text-sm font-medium">
                  {t('earn.fidelity_bond.freeze_utxos.label_utxos_to_freeze', { count: utxosToFreeze.length })}
                </p>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoCard label={t('earn.fidelity_bond.review_inputs.label_lock_date')}>
                <p className="font-semibold">{selectedDateLabel}</p>
              </InfoCard>
              <InfoCard label={t('earn.fidelity_bond.review_inputs.label_jar')}>
                <JarBadge jarIndex={selectedJarIndex} name={selectedJar?.name} />
              </InfoCard>
            </div>

            <InfoCard highlight label={t('earn.fidelity_bond.review_inputs.label_amount')}>
              <SatsAmount value={totalAmount} />
            </InfoCard>
          </div>

          {timelockAddressQuery.isLoading ? (
            <InlineLoading text={t('earn.fidelity_bond.text_loading')} />
          ) : (
            address && (
              <div className="space-y-4">
                <div className="dark:bg-muted/30 flex justify-center rounded-lg bg-white p-4">
                  <BitcoinAddressQrCode address={address} amount={totalAmount} width={200} />
                </div>
                <CopyableField
                  label={t('earn.fidelity_bond.review_inputs.label_address')}
                  value={address}
                  copiedMessage={t('receive.text_copy_address')}
                />
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

          <ConfirmationToggle
            id="confirmation"
            checked={confirmationChecked}
            onCheckedChange={setConfirmationChecked}
          />
        </div>
      )

    case 'creating':
      return (
        <PendingStep
          icon={LockIcon}
          title={t('earn.fidelity_bond.text_creating')}
          subtitle={t('earn.fidelity_bond.text_creating_subtitle')}
        />
      )

    case 'success':
      return (
        <div className="space-y-6">
          <SuccessHeading
            title={t('earn.fidelity_bond.create_fidelity_bond.success_text')}
            subtitle={t('earn.fidelity_bond.create_fidelity_bond.text_success_subtitle')}
          />

          <div className="space-y-3">
            <InfoCard label={t('earn.fidelity_bond.create_fidelity_bond.label_lock_date')}>
              <p className="font-semibold">{selectedDateLabel}</p>
            </InfoCard>

            {address && (
              <CopyableField
                label={t('earn.fidelity_bond.create_fidelity_bond.label_address')}
                value={address}
                copiedMessage={t('receive.text_copy_address')}
              />
            )}

            {txResult?.txinfo?.txid && (
              <CopyableField
                label={t('earn.fidelity_bond.create_fidelity_bond.label_transaction_id')}
                value={txResult.txinfo.txid}
                copiedMessage={t('earn.fidelity_bond.create_fidelity_bond.text_copy_transaction_id')}
              />
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
