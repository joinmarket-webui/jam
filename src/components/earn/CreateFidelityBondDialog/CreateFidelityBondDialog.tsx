import { AlertTriangleIcon, ChevronLeftIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { CreateFidelityBondDialogSteps } from './CreateFidelityBondDialogSteps'
import { StepProgress } from './StepProgress'
import type { CreateFidelityBondDialogProps } from './types'
import { useCreateFidelityBondWizard } from './useCreateFidelityBondWizard'

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
        <DialogFooter className="gap-3 sm:gap-2">
          {frozenUtxos.length > 0 && (
            <Button
              variant="outline"
              className="min-w-32"
              onClick={() => void handleUnfreezeUtxos()}
              disabled={unfreezeUtxo.isPending}
            >
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
          <Button className="min-w-32" onClick={() => handleOpenChange(false)}>
            {t('earn.fidelity_bond.create_fidelity_bond.text_primary_button')}
          </Button>
        </DialogFooter>
      )
    }

    const isLoading = freezeUtxo.isPending || directSend.isPending

    return (
      <DialogFooter className="gap-3 sm:gap-2">
        {step !== 'select_date' && (
          <Button variant="ghost" onClick={handleBack} disabled={isLoading}>
            <ChevronLeftIcon />
            {t('global.back')}
          </Button>
        )}
        <Button variant="outline" className="min-w-24" onClick={() => handleOpenChange(false)} disabled={isLoading}>
          {t('earn.fidelity_bond.select_date.text_secondary_button')}
        </Button>
        <Button className="min-w-32" onClick={() => void handleNext()} disabled={!canProceed() || isLoading}>
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
    <Dialog open={open} onOpenChange={handleOpenChange} {...dialogProps}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t('earn.fidelity_bond.create_fidelity_bond.title')}</DialogTitle>
          <DialogDescription>{t('earn.fidelity_bond.subtitle')}</DialogDescription>
        </DialogHeader>

        {step !== 'creating' && step !== 'success' && <StepProgress currentStep={getStepNumber()} totalSteps={5} />}

        {error && (
          <Alert variant="destructive" className="animate-in fade-in-50">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="py-2">
          <CreateFidelityBondDialogSteps wizard={wizard} />
        </div>

        {renderFooter()}
      </DialogContent>
    </Dialog>
  )
}
