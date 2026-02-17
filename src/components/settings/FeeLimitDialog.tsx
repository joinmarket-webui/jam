import { useState, useRef, useEffect, type ComponentProps } from 'react'
import { configsettingMutation } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { cx } from 'class-variance-authority'
import { useTranslation, Trans } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { DevBadge } from '@/components/dev/DevBadge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { FEE_CONFIG_KEYS, type FeeConfigName } from '@/constants/jm'
import { useApiClient } from '@/hooks/useApiClient'
import { useExecuteOrQueueAction } from '@/hooks/useExecuteOrQueueAction'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import { factorToPercentage } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import type { WithRequiredProperty } from '@/types/global'
import { Spinner } from '../ui/spinner'
import { CollaboratorFeesForm, type CollaboratorFeesFormRef } from './CollaboratorFeesForm'
import { MiningFeesForm, type MiningFeesFormRef } from './MiningFeesForm'

//TODO: needs testing!

type FeeLimitDialogProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> & {
  walletFileName: WalletFileName
}

export const FeeLimitDialog = ({ open, onOpenChange, walletFileName }: FeeLimitDialogProps) => {
  const { t } = useTranslation()

  const isDeveloperMode = useStore(jamSettingsStore, (state) => state.state.developerMode)
  const [enableFormValidation, setEnableFormValidation] = useState(true)
  const [collaboratorFeesExpanded, setCollaboratorFeesExpanded] = useState(false)
  const [miningFeesExpanded, setMiningFeesExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveErrorMessage, setSaveErrorMessage] = useState<string>()
  const {
    feeConfigValues,
    refetchAll: refetchFeeConfigValues,
    isLoading: isLoadingConfig,
  } = useFeeConfigValidation({ walletFileName })

  useEffect(() => {
    if (open) {
      setCollaboratorFeesExpanded(false)
      setMiningFeesExpanded(false)
    }
  }, [open])

  const client = useApiClient()
  const executeOrQueueAction = useExecuteOrQueueAction()
  const collaboratorFormRef = useRef<CollaboratorFeesFormRef>(null)
  const miningFormRef = useRef<MiningFeesFormRef>(null)

  const setconfigMutation = useMutation(configsettingMutation({ client }))

  useEffect(() => {
    if (!open) {
      setSaveErrorMessage(undefined)
      return
    }
  }, [open])

  const handleSubmit = async () => {
    // Trigger validation on both forms before submission
    const collaboratorValid = collaboratorFormRef.current?.validateForm() ?? false
    const miningValid = miningFormRef.current?.validateForm() ?? false

    if (!collaboratorValid || !miningValid) {
      toast.error(t('settings.fees.error_message'))
      return
    }

    setIsSubmitting(true)
    setSaveErrorMessage(undefined)

    try {
      const collaboratorData = collaboratorFormRef.current?.getFormData()
      const miningData = miningFormRef.current?.getFormData()

      if (!collaboratorData || !miningData) {
        toast.error(t('settings.fees.error_message'))
        setIsSubmitting(false)
        return
      }

      const configUpdates: { key: FeeConfigName; value: string }[] = [
        { key: 'max_cj_fee_abs', value: collaboratorData.maxCjFeeAbs },
        { key: 'max_cj_fee_rel', value: collaboratorData.maxCjFeeRel },
        { key: 'tx_fees', value: miningData.txFees },
        { key: 'tx_fees_factor', value: miningData.txFeesFactor },
        { key: 'max_sweep_fee_change', value: miningData.maxSweepFeeChange },
      ]

      const outcome = await executeOrQueueAction({
        execute: async () => {
          for (const { key, value } of configUpdates) {
            await setconfigMutation.mutateAsync({
              path: { walletname: encodeURIComponent(walletFileName) },
              body: {
                ...FEE_CONFIG_KEYS[key],
                value,
              },
            })
          }
          return true
        },
        queueAction: {
          type: 'update_fee_settings',
          payload: {
            walletFileName,
            updates: configUpdates,
          },
          meta: {
            label: 'Update fee settings',
            summary: `${configUpdates.length} value(s)`,
          },
        },
      })

      if (outcome.status === 'queued') {
        toast.info('Fee settings update queued. It will retry automatically when your connection is restored.')
        onOpenChange(false)
        return
      }

      await refetchFeeConfigValues()

      toast.success(t('settings.fees.success_message'))
      onOpenChange(false)
    } catch (error: unknown) {
      console.error('Failed to update fee settings:', error)
      const errorMessage =
        typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message?: string }).message
          : t('global.errors.reason_unknown')
      setSaveErrorMessage(
        t('settings.fees.error_saving_fee_config_failed', {
          reason: errorMessage,
        }),
      )
      toast.error(t('settings.fees.error_message'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetFormValues = () => {
    collaboratorFormRef.current?.setFormData({
      maxCjFeeAbs: '',
      maxCjFeeRel: '',
    })
    miningFormRef.current?.setFormData({
      txFees: '',
      txFeesFactor: '',
      maxSweepFeeChange: '',
    })

    setTimeout(() => {
      collaboratorFormRef.current?.validateForm()
      miningFormRef.current?.validateForm()
    }, 4)

    toast.success('[DEV] Form values have been reset')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('settings.fees.title')}</DialogTitle>
          <DialogDescription>
            <Trans i18nKey="settings.fees.description">
              Adjust mining fees and collaborator fees according to your needs. These settings will be reset to default
              values when the JoinMarket service restarts, e.g. on a system reboot. For more information, see the
              documentation on fees.
              <a
                href="https://jamdocs.org/market/fees/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {t('settings.fees.link_documentation')}
              </a>
            </Trans>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4">
          {isDeveloperMode && (
            <>
              <div className="flex items-center gap-3">
                <Switch
                  id="fee-limit-form-validation-switch"
                  checked={enableFormValidation}
                  onCheckedChange={setEnableFormValidation}
                />
                <Label htmlFor="fee-limit-form-validation-switch" className="flex items-center gap-2">
                  <span className="text-sm font-medium">Enable form validation</span>
                  <DevBadge />
                </Label>
              </div>
              <p className="text-muted-foreground text-sm">
                Ability to reset fee values to test what the UI looks like, when a user does not have these values
                configured.
              </p>
            </>
          )}

          <div className="space-y-2">
            <Accordion
              defaultValue="collaborator-fees"
              type="single"
              onValueChange={(val) => setCollaboratorFeesExpanded(!!val)}
            >
              <AccordionItem value="collaborator-fees">
                <AccordionTrigger
                  className={cx({
                    'text-desctructive border-red-300':
                      collaboratorFormRef.current && !collaboratorFormRef.current.getFormData(),
                  })}
                >
                  {t('settings.fees.title_max_cj_fee_settings')}
                </AccordionTrigger>
                <AccordionContent>
                  {isLoadingConfig ? (
                    <div className="m-2 flex items-center justify-center gap-2">
                      <Spinner className="motion-reduce:hidden" />
                      {t('global.loading')}
                    </div>
                  ) : (
                    <CollaboratorFeesForm
                      key={`collaborator-${walletFileName}-${open}`}
                      ref={collaboratorFormRef}
                      initialValues={{
                        maxCjFeeAbs: feeConfigValues?.max_cj_fee_abs || '',
                        maxCjFeeRel: feeConfigValues?.max_cj_fee_rel
                          ? String(factorToPercentage(Number(feeConfigValues.max_cj_fee_rel)))
                          : '',
                      }}
                      enableValidation={enableFormValidation}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Mining fees dropdown */}
          <div className="space-y-2">
            <Accordion
              type="single"
              defaultValue="mining-fees"
              onValueChange={(val) => {
                setMiningFeesExpanded(!!val)
              }}
            >
              <AccordionItem value="mining-fees">
                <AccordionTrigger
                  className={cx({
                    'text-desctructive border-red-300': miningFormRef.current && !miningFormRef.current.getFormData(),
                  })}
                >
                  {t('settings.fees.title_general_fee_settings')}
                </AccordionTrigger>
                <AccordionContent>
                  {isLoadingConfig ? (
                    <div className="m-2 flex items-center justify-center gap-2">
                      <Spinner className="motion-reduce:hidden" />
                      {t('global.loading')}
                    </div>
                  ) : (
                    <MiningFeesForm
                      key={`mining-${walletFileName}-${open}`}
                      ref={miningFormRef}
                      initialValues={{
                        txFees: feeConfigValues?.tx_fees ?? '',
                        txFeesFactor: feeConfigValues?.tx_fees_factor
                          ? String(factorToPercentage(Number(feeConfigValues.tx_fees_factor)))
                          : '',
                        maxSweepFeeChange: feeConfigValues?.max_sweep_fee_change
                          ? String(factorToPercentage(Number(feeConfigValues.max_sweep_fee_change)))
                          : '',
                      }}
                      enableValidation={enableFormValidation}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {saveErrorMessage && (
          <div className="text-desctructive mb-4 w-full rounded-lg border border-red-200 p-2 text-sm">
            {saveErrorMessage}
          </div>
        )}
        <DialogFooter
          className={cx('', {
            'border-t pt-4': collaboratorFeesExpanded || miningFeesExpanded,
          })}
        >
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting || isLoadingConfig}>
            {t('settings.fees.text_button_cancel')}
          </Button>
          {isDeveloperMode && (
            <Button
              variant="outline"
              onClick={handleResetFormValues}
              disabled={isSubmitting || isLoadingConfig}
              className="border-amber-300 bg-amber-100 hover:bg-amber-200"
            >
              Reset form values
              <DevBadge />
            </Button>
          )}
          <Button onClick={() => void handleSubmit()} disabled={isSubmitting || isLoadingConfig}>
            {isSubmitting ? t('settings.fees.text_button_submitting') : t('settings.fees.text_button_submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
