import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { FidelityBondDialogLayout } from '../fidelity-bond/FidelityBondDialogLayout'
import { WizardStepFooter } from '../fidelity-bond/WizardStepFooter'
import { CreateFidelityBondDialogSteps } from './CreateFidelityBondDialogSteps'
import type { CreateFidelityBondDialogProps } from './types'
import { useCreateFidelityBondWizard } from './useCreateFidelityBondWizard'

const TOTAL_STEPS = 5

export function CreateFidelityBondDialog({
  open,
  onOpenChange,
  walletFileName,
  ...dialogProps
}: CreateFidelityBondDialogProps) {
  const wizard = useCreateFidelityBondWizard(open, onOpenChange, walletFileName)

  const {
    step,
    error,
    frozenUtxos,
    utxosToFreeze,
    freezeUtxo,
    unfreezeUtxo,
    directSend,
    handleOpenChange,
    handleBack,
    handleNext,
    handleUnfreezeUtxos,
    canProceed,
    getStepNumber,
    t,
  } = wizard

  const renderFooter = () => {
    if (step === 'creating') return null

    if (step === 'success') {
      return (
        <>
          {frozenUtxos.length > 0 && (
            <Button variant="outline" onClick={() => void handleUnfreezeUtxos()} disabled={unfreezeUtxo.isPending}>
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
          <Button onClick={() => handleOpenChange(false)}>{t('global.done')}</Button>
        </>
      )
    }

    return (
      <WizardStepFooter
        onBack={step !== 'select_date' ? handleBack : undefined}
        onCancel={() => handleOpenChange(false)}
        onPrimary={() => void handleNext()}
        primaryDisabled={!canProceed()}
        isLoading={freezeUtxo.isPending || directSend.isPending}
        primaryLabel={
          step === 'freeze_utxos'
            ? utxosToFreeze.length > 0
              ? t('earn.fidelity_bond.freeze_utxos.text_primary_button')
              : t('earn.fidelity_bond.freeze_utxos.text_primary_button_all_frozen')
            : step === 'review'
              ? t('earn.fidelity_bond.review_inputs.text_primary_button')
              : t('global.next')
        }
      />
    )
  }

  return (
    <FidelityBondDialogLayout
      open={open}
      onOpenChange={handleOpenChange}
      title={t('earn.fidelity_bond.create_fidelity_bond.title')}
      currentStep={step !== 'creating' && step !== 'success' ? getStepNumber() : undefined}
      totalSteps={TOTAL_STEPS}
      error={error}
      footer={renderFooter()}
      {...dialogProps}
    >
      <CreateFidelityBondDialogSteps wizard={wizard} />
    </FidelityBondDialogLayout>
  )
}
