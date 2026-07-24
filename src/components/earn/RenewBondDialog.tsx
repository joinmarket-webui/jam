import { useState } from 'react'
import { gettimelockaddressOptions } from '@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query'
import type { DirectSendResponse } from '@joinmarket-webui/joinmarket-ng-api-ts/jm'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangleIcon, CalendarIcon, RefreshCwIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useApiClient } from '@/hooks/useApiClient'
import type { FidelityBondUtxo } from '@/hooks/useQueryUtxos'
import * as fb from '@/lib/fidelityBondUtils'
import type { WalletFileName } from '@/lib/utils'
import { FidelityBondDialogLayout } from './fidelity-bond/FidelityBondDialogLayout'
import {
  AddressPreview,
  ConfirmationToggle,
  CopyableField,
  FidelityBondAmount,
  InfoCard,
  InlineLoading,
  JarBadge,
  PendingStep,
  StepIntro,
  SuccessHeading,
} from './fidelity-bond/FidelityBondDialogParts'
import { LockdateSelect } from './fidelity-bond/LockdateSelect'
import { WizardStepFooter } from './fidelity-bond/WizardStepFooter'
import { useFidelityBondSweep } from './fidelity-bond/useFidelityBondSweep'

type Step = 'select_date' | 'confirm' | 'sending' | 'success'

const WIZARD_STEPS: Step[] = ['select_date', 'confirm']

interface RenewBondDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletFileName: WalletFileName
  utxo: FidelityBondUtxo
}

export function RenewBondDialog({ open, onOpenChange, walletFileName, utxo }: RenewBondDialogProps) {
  const { t } = useTranslation()
  const client = useApiClient()

  const [step, setStep] = useState<Step>('select_date')
  const [selectedLockdate, setSelectedLockdate] = useState<fb.Lockdate | ''>('')
  const [confirmationChecked, setConfirmationChecked] = useState(false)
  const [txResult, setTxResult] = useState<DirectSendResponse | undefined>()

  const { sweep, isLoading, error, setError, sourceJar } = useFidelityBondSweep({
    walletFileName,
    utxo,
    unfreezeErrorKey: 'earn.fidelity_bond.error_unfreezing_utxos',
    sendErrorKey: 'earn.fidelity_bond.renew.error_renewing_fidelity_bond',
  })

  const selectedDateLabel = selectedLockdate ? fb.lockdate.toDateLabel(selectedLockdate) : null

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

  const destinationAddress = timelockAddressQuery.data?.address
  const displayError =
    error ?? (timelockAddressQuery.isError ? t('earn.fidelity_bond.error_loading_address') : undefined)

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
    const swept = await sweep(destinationAddress, (result) => {
      setTxResult(result)
      setStep('success')
      toast.success(t('earn.fidelity_bond.renew.success_text'))
    })
    if (!swept) setStep('confirm')
  }

  const renderFooter = () => {
    switch (step) {
      case 'select_date':
        return (
          <WizardStepFooter
            onCancel={() => handleOpenChange(false)}
            onPrimary={() => setStep('confirm')}
            primaryDisabled={!selectedLockdate}
            primaryLabel={t('global.next')}
          />
        )
      case 'confirm':
        return (
          <WizardStepFooter
            onBack={() => setStep('select_date')}
            onCancel={() => handleOpenChange(false)}
            onPrimary={() => void handleSubmit()}
            primaryDisabled={!confirmationChecked || !destinationAddress}
            isLoading={isLoading}
            primaryLabel={t('earn.fidelity_bond.renew.text_button_submit')}
          />
        )
      case 'sending':
        return null
      case 'success':
        return <Button onClick={() => handleOpenChange(false)}>{t('global.done')}</Button>
    }
  }

  return (
    <FidelityBondDialogLayout
      open={open}
      onOpenChange={handleOpenChange}
      title={t('earn.fidelity_bond.renew.title')}
      currentStep={step === 'sending' || step === 'success' ? undefined : WIZARD_STEPS.indexOf(step)}
      totalSteps={WIZARD_STEPS.length}
      error={displayError}
      footer={renderFooter()}
    >
      {step === 'select_date' && (
        <div className="space-y-6">
          <StepIntro icon={CalendarIcon} title={t('earn.fidelity_bond.select_date.description')} />

          <InfoCard label={t('earn.fidelity_bond.review_inputs.label_amount')}>
            <FidelityBondAmount value={utxo.value} className="text-lg" />
          </InfoCard>

          <LockdateSelect id="renew-lockdate" value={selectedLockdate} onChange={setSelectedLockdate} />
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoCard label={t('earn.fidelity_bond.review_inputs.label_lock_date')}>
              <p className="font-semibold">{selectedDateLabel}</p>
            </InfoCard>
            <InfoCard label={t('earn.fidelity_bond.review_inputs.label_jar')}>
              <JarBadge jarIndex={utxo.mixdepth} name={sourceJar?.name} />
            </InfoCard>
          </div>

          <InfoCard highlight label={t('earn.fidelity_bond.review_inputs.label_amount')}>
            <FidelityBondAmount value={utxo.value} />
          </InfoCard>

          {timelockAddressQuery.isLoading ? (
            <InlineLoading text={t('earn.fidelity_bond.renew.text_loading')} />
          ) : (
            destinationAddress && (
              <AddressPreview
                label={t('earn.fidelity_bond.review_inputs.label_address')}
                address={destinationAddress}
              />
            )
          )}

          <Alert variant="warning">
            <AlertTriangleIcon />
            <AlertTitle>{t('earn.fidelity_bond.renew.confirm_send_modal.title')}</AlertTitle>
            <AlertDescription>
              {t('earn.fidelity_bond.confirm_modal.body', {
                /* TODO: fix human readable duration */
                humanReadableDuration: selectedDateLabel ? `until ${selectedDateLabel}` : '',
                date: selectedDateLabel || '',
              })}
            </AlertDescription>
          </Alert>

          <ConfirmationToggle
            id="renew-confirmation"
            checked={confirmationChecked}
            onCheckedChange={setConfirmationChecked}
          />
        </div>
      )}

      {step === 'sending' && <PendingStep icon={RefreshCwIcon} title={t('earn.fidelity_bond.renew.text_sending')} />}

      {step === 'success' && (
        <div className="space-y-6">
          <SuccessHeading title={t('earn.fidelity_bond.renew.success_text')} />

          {destinationAddress && (
            <CopyableField
              label={t('earn.fidelity_bond.create_fidelity_bond.label_address')}
              value={destinationAddress}
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
      )}
    </FidelityBondDialogLayout>
  )
}
