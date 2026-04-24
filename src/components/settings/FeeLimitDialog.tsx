import { useState, type ComponentProps, useMemo } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { configsettingMutation } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { cx } from 'class-variance-authority'
import { AlertTriangleIcon } from 'lucide-react'
import { useForm, type Resolver } from 'react-hook-form'
import { useTranslation, Trans } from 'react-i18next'
import { toast } from 'sonner'
import * as yup from 'yup'
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
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import { getErrorReason } from '@/lib/errorReason'
import { TX_FEE_UNITS } from '@/lib/feeConfig'
import { cn, factorToPercentage, percentageToFactor } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { useDeveloperMode } from '@/store/jamSettingsStore'
import type { WithRequiredProperty } from '@/types/global'
import { toTxFeeFormDefaultValues } from '../send/TxFeeForm.schema'
import { Spinner } from '../ui/spinner'
import { CollaboratorFeesForm } from './CollaboratorFeesForm'
import { createCollaboratorFeesFormSchema, type CollaboratorFeesFormValues } from './CollaboratorFeesForm.schema'
import { MiningFeesForm } from './MiningFeesForm'
import { createMiningFeesFormSchema, type MiningFeesFormValues } from './MiningFeesForm.schema'

type FeeLimitDialogProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> & {
  walletFileName: WalletFileName
}

export const FeeLimitDialog = ({ open, onOpenChange, walletFileName, ...dialogProps }: FeeLimitDialogProps) => {
  const { t } = useTranslation()

  const { enabled: isDeveloperMode } = useDeveloperMode()
  const [accordionValue, setAccordionValue] = useState<string[]>([])
  const [enableFormValidation, setEnableFormValidation] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const {
    feeConfigValues,
    refetchAll: refetchFeeConfigValues,
    isLoading: isLoadingConfig,
  } = useFeeConfigValidation({ walletFileName })

  const client = useApiClient()

  const miningFeeFormSchema = useMemo(() => createMiningFeesFormSchema({ t }), [t])

  const miningFeeFormDefaultValues: MiningFeesFormValues = useMemo(() => {
    return {
      txFeesFactorInPercent:
        feeConfigValues.txFeeFactor !== undefined ? factorToPercentage(feeConfigValues.txFeeFactor) : undefined,
      maxSweepFeeChangeInPercent: feeConfigValues.maxSweepFeeChangeFactor
        ? factorToPercentage(feeConfigValues.maxSweepFeeChangeFactor)
        : undefined,
      ...toTxFeeFormDefaultValues(feeConfigValues),
    }
  }, [feeConfigValues])

  const miningFeesForm = useForm<MiningFeesFormValues, unknown, MiningFeesFormValues>({
    mode: 'onChange',
    disabled: isSubmitting || isLoadingConfig,
    defaultValues: miningFeeFormDefaultValues,
    resolver: yupResolver(miningFeeFormSchema as yup.AnyObjectSchema) as Resolver<
      MiningFeesFormValues,
      unknown,
      MiningFeesFormValues
    >,
  })

  const collaboratorFormSchema = useMemo(() => createCollaboratorFeesFormSchema({ t }), [t])

  const collaboratorFeesFormDefaultValues: CollaboratorFeesFormValues = useMemo(() => {
    return {
      maxCjFeeAbs: feeConfigValues.maxCjAbsoluteFee,
      maxCjFeeRelInPercent:
        feeConfigValues.maxCjRelativeFee !== undefined
          ? factorToPercentage(feeConfigValues.maxCjRelativeFee)
          : undefined,
    }
  }, [feeConfigValues])

  const collaboratorFeesForm = useForm<CollaboratorFeesFormValues, unknown, CollaboratorFeesFormValues>({
    mode: 'onChange',
    disabled: isSubmitting || isLoadingConfig,
    defaultValues: collaboratorFeesFormDefaultValues,
    resolver: yupResolver(collaboratorFormSchema as yup.AnyObjectSchema) as Resolver<
      CollaboratorFeesFormValues,
      unknown,
      CollaboratorFeesFormValues
    >,
  })

  const setconfigMutation = useMutation(configsettingMutation({ client }))

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      if (enableFormValidation) {
        // Trigger validation on both nested forms before submission
        const collaboratorValid = await collaboratorFeesForm.trigger()
        const miningValid = await miningFeesForm.trigger()

        if (!collaboratorValid || !miningValid) {
          return
        }
      }

      const collaboratorData = collaboratorFeesForm.getValues()
      const miningData = miningFeesForm.getValues()

      const maxCjFeeAbsoluteValue =
        collaboratorData.maxCjFeeAbs !== undefined && Number.isSafeInteger(collaboratorData.maxCjFeeAbs)
          ? String(collaboratorData.maxCjFeeAbs)
          : ''
      const maxCjFeeRelativeValue =
        collaboratorData.maxCjFeeRelInPercent !== undefined && Number.isFinite(collaboratorData.maxCjFeeRelInPercent)
          ? String(percentageToFactor(collaboratorData.maxCjFeeRelInPercent))
          : ''
      const txFeesBlocksValue = Number.isSafeInteger(miningData.txFee.txFeeInBlocks)
        ? String(miningData.txFee.txFeeInBlocks)
        : ''
      const txFeesSatsPerKvByteValue =
        miningData.txFee.txFeeInSatsPerVbyte !== undefined && Number.isFinite(miningData.txFee.txFeeInSatsPerVbyte)
          ? String(Math.ceil(miningData.txFee.txFeeInSatsPerVbyte * 1_000))
          : ''
      const txFeesValue =
        miningData.txFee.txFeeUnit === TX_FEE_UNITS.BLOCKS ? txFeesBlocksValue : txFeesSatsPerKvByteValue
      const txFeesFactorValue =
        miningData.txFeesFactorInPercent !== undefined && Number.isFinite(miningData.txFeesFactorInPercent)
          ? String(percentageToFactor(miningData.txFeesFactorInPercent))
          : ''
      const maxSweepFeeChangeValue =
        miningData.maxSweepFeeChangeInPercent !== undefined && Number.isFinite(miningData.maxSweepFeeChangeInPercent)
          ? String(percentageToFactor(miningData.maxSweepFeeChangeInPercent))
          : ''

      const configUpdates: { key: FeeConfigName; value: string }[] = [
        { key: 'max_cj_fee_abs', value: maxCjFeeAbsoluteValue },
        { key: 'max_cj_fee_rel', value: maxCjFeeRelativeValue },
        { key: 'tx_fees', value: txFeesValue },
        { key: 'tx_fees_factor', value: txFeesFactorValue },
        { key: 'max_sweep_fee_change', value: maxSweepFeeChangeValue },
      ]

      for (const { key, value } of configUpdates) {
        await setconfigMutation.mutateAsync({
          path: { walletname: walletFileName },
          body: {
            ...FEE_CONFIG_KEYS[key],
            value,
          },
        })
      }

      await refetchFeeConfigValues()

      toast.success(t('settings.fees.success_message'))
      onOpenChange(false)
    } catch (error: unknown) {
      console.error('Failed to update fee settings:', error)
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      const errorMessage = t('settings.fees.error_saving_fee_config_failed', { reason })
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetFormValues = async () => {
    collaboratorFeesForm.reset()
    miningFeesForm.reset()
    await collaboratorFeesForm.trigger()
    await miningFeesForm.trigger()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} {...dialogProps}>
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
        <div className="space-y-4">
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

          <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue}>
            <AccordionItem value="collaborator-fees">
              <AccordionTrigger
                className={cx({
                  'text-destructive': !collaboratorFeesForm.formState.isValid,
                })}
              >
                <div className="flex items-center gap-2">
                  {!collaboratorFeesForm.formState.isValid ? <AlertTriangleIcon /> : null}
                  {t('settings.fees.title_max_cj_fee_settings')}
                </div>
              </AccordionTrigger>
              <AccordionContent className={cn('space-y-2', 'mx-1' /* add x-spacing for input component focus state*/)}>
                {isLoadingConfig ? (
                  <div className="m-2 flex items-center justify-center gap-2">
                    <Spinner className="motion-reduce:hidden" />
                    {t('global.loading')}
                  </div>
                ) : (
                  <CollaboratorFeesForm key={`collaborator-${walletFileName}-${open}`} form={collaboratorFeesForm} />
                )}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="mining-fees">
              <AccordionTrigger
                className={cx({
                  'text-destructive': !miningFeesForm.formState.isValid,
                })}
              >
                <div className="flex items-center gap-2">
                  {!miningFeesForm.formState.isValid ? <AlertTriangleIcon /> : null}
                  {t('settings.fees.title_general_fee_settings')}
                </div>
              </AccordionTrigger>
              <AccordionContent className={cn('space-y-2', 'mx-1' /* add x-spacing for input component focus state*/)}>
                {isLoadingConfig ? (
                  <div className="m-2 flex items-center justify-center gap-2">
                    <Spinner className="motion-reduce:hidden" />
                    {t('global.loading')}
                  </div>
                ) : (
                  <MiningFeesForm key={`mining-${walletFileName}-${open}`} form={miningFeesForm} />
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <DialogFooter
          className={cx({
            'border-t pt-4': accordionValue.length > 0,
          })}
        >
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting || isLoadingConfig}>
            {t('settings.fees.text_button_cancel')}
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleResetFormValues()}
            disabled={isSubmitting || isLoadingConfig}
          >
            {/* TODO: i18n */}
            Reset
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSubmitting || isLoadingConfig}>
            {isSubmitting ? t('settings.fees.text_button_submitting') : t('settings.fees.text_button_submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
