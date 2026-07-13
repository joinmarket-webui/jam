import { useState, useMemo } from 'react'
import { getaddressOptions } from '@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query'
import type { DirectSendResponse } from '@joinmarket-webui/joinmarket-ng-api-ts/jm'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangleIcon, CheckCircle2Icon, UnlockIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import type { FidelityBondUtxo } from '@/hooks/useQueryUtxos'
import { cn, formatSats, type WalletFileName } from '@/lib/utils'
import type { JarIndex } from '@/types/global'
import { FidelityBondDialogLayout } from './fidelity-bond/FidelityBondDialogLayout'
import {
  AddressPreview,
  ConfirmationToggle,
  CopyableField,
  InfoCard,
  InlineLoading,
  JarBadge,
  PendingStep,
  SatsAmount,
  StepIntro,
  SuccessHeading,
} from './fidelity-bond/FidelityBondDialogParts'
import { WizardStepFooter } from './fidelity-bond/WizardStepFooter'
import { useFidelityBondSweep } from './fidelity-bond/useFidelityBondSweep'

type Step = 'select_jar' | 'confirm' | 'sending' | 'success'

const WIZARD_STEPS: Step[] = ['select_jar', 'confirm']

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

  const { sweep, isLoading, error, setError, sourceJar } = useFidelityBondSweep({
    walletFileName,
    utxo,
    unfreezeErrorKey: 'earn.fidelity_bond.move.error_unfreezing_fidelity_bond',
    sendErrorKey: 'earn.fidelity_bond.move.error_spending_fidelity_bond',
  })

  const destinationJar = walletInfo.jars.find((jar) => jar.jarIndex === selectedJarIndex)

  // All jars except the FB's source jar are valid destinations
  const destinationJars = useMemo(() => {
    return walletInfo.jars.filter((jar) => jar.jarIndex !== utxo.mixdepth)
  }, [walletInfo.jars, utxo.mixdepth])

  const getAddressQueryOptions = getaddressOptions({
    client,
    path: {
      walletname: walletFileName,
      mixdepth: String(selectedJarIndex ?? 0),
    },
  })

  const getAddressQuery = useQuery({
    ...getAddressQueryOptions,
    enabled: open && selectedJarIndex !== undefined && step !== 'select_jar',
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })

  const destinationAddress = getAddressQuery.data?.address
  const displayError = error ?? (getAddressQuery.isError ? t('global.errors.error_loading_address_failed') : undefined)

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
    const swept = await sweep(destinationAddress, (result) => {
      setTxResult(result)
      setStep('success')
      toast.success(t('earn.fidelity_bond.move.success_text'))
    })
    if (!swept) setStep('confirm')
  }

  const renderFooter = () => {
    switch (step) {
      case 'select_jar':
        return (
          <WizardStepFooter
            onCancel={() => handleOpenChange(false)}
            onPrimary={() => setStep('confirm')}
            primaryDisabled={selectedJarIndex === undefined}
            primaryLabel={t('global.next')}
          />
        )
      case 'confirm':
        return (
          <WizardStepFooter
            onBack={() => setStep('select_jar')}
            onCancel={() => handleOpenChange(false)}
            onPrimary={() => void handleSubmit()}
            primaryDisabled={!confirmationChecked || !destinationAddress}
            isLoading={isLoading}
            primaryLabel={t('earn.fidelity_bond.move.text_button_submit')}
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
      title={t('earn.fidelity_bond.move.title')}
      currentStep={step === 'sending' || step === 'success' ? undefined : WIZARD_STEPS.indexOf(step)}
      totalSteps={WIZARD_STEPS.length}
      error={displayError}
      footer={renderFooter()}
    >
      {step === 'select_jar' && (
        <div className="space-y-6">
          <StepIntro icon={UnlockIcon} title={t('earn.fidelity_bond.move.select_jar.description')} />

          <InfoCard label={t('earn.fidelity_bond.review_inputs.label_amount')}>
            <SatsAmount value={utxo.value} className="text-lg" />
          </InfoCard>

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
                  <CardContent className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 items-center gap-4">
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
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoCard label={t('earn.fidelity_bond.review_inputs.label_jar')}>
              <JarBadge jarIndex={utxo.mixdepth} name={sourceJar?.name} />
            </InfoCard>
            <InfoCard label={t('earn.fidelity_bond.move.label_destination')}>
              <JarBadge jarIndex={selectedJarIndex} name={destinationJar?.name} />
            </InfoCard>
          </div>

          <InfoCard highlight label={t('earn.fidelity_bond.review_inputs.label_amount')}>
            <SatsAmount value={utxo.value} />
          </InfoCard>

          {getAddressQuery.isLoading ? (
            <InlineLoading text={t('earn.fidelity_bond.move.text_loading')} />
          ) : (
            destinationAddress && (
              <AddressPreview label={t('earn.fidelity_bond.move.label_destination')} address={destinationAddress} />
            )
          )}

          <Alert variant="warning">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertTitle>{t('earn.fidelity_bond.move.confirm_send_modal.title')}</AlertTitle>
          </Alert>

          <ConfirmationToggle
            id="move-confirmation"
            checked={confirmationChecked}
            onCheckedChange={setConfirmationChecked}
          />
        </div>
      )}

      {step === 'sending' && <PendingStep icon={UnlockIcon} title={t('earn.fidelity_bond.move.text_sending')} />}

      {step === 'success' && (
        <div className="space-y-6">
          <SuccessHeading title={t('earn.fidelity_bond.move.success_text')} />

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
