import { useState, useEffect, type ComponentProps, useMemo } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { configsettingMutation } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { cx } from 'class-variance-authority'
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
import { FEE_CONFIG_KEYS, txFeeUnit, type FeeConfigName } from '@/constants/jm'
import { useApiClient } from '@/hooks/useApiClient'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import { cn, factorToPercentage, percentageToFactor } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { useDeveloperMode } from '@/store/jamSettingsStore'
import type { WithRequiredProperty } from '@/types/global'
import { Spinner } from '../ui/spinner'
import { CollaboratorFeesForm } from './CollaboratorFeesForm'
import { collaboratorFeesFormSchema, type CollaboratorFeesFormValues } from './CollaboratorFeesFormSchema'
import { MiningFeesForm } from './MiningFeesForm'
import { miningFeesFormSchema, type MiningFeesFormValues } from './MiningFeesFormSchema'

type FeeLimitDialogProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> & {
  walletFileName: WalletFileName
}

export const FeeLimitDialog = ({ open, onOpenChange, walletFileName, ...dialogProps }: FeeLimitDialogProps) => {
  const { t } = useTranslation()

  const { enabled: isDeveloperMode } = useDeveloperMode()
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

  const miningFeeFormSchema = useMemo(() => {
    return miningFeesFormSchema(enableFormValidation, t)
  }, [enableFormValidation, t])

  const miningFeeFormInitialValues: MiningFeesFormValues = useMemo(() => {
    const txFeesValue = Number.parseInt(feeConfigValues?.tx_fees || '', 10)
    const txFeesFactor = Number.parseFloat(feeConfigValues?.tx_fees_factor || '')
    const maxSweepChangeFactor = Number.parseFloat(feeConfigValues?.max_sweep_fee_change || '')
    const feeType = txFeesValue >= 1_001 ? txFeeUnit.SATS_PER_KILO_VBYTE : txFeeUnit.BLOCKS
    return {
      feeType,
      txFeesBlocks: feeType === txFeeUnit.BLOCKS ? txFeesValue : undefined,
      txFeesSatsPerVbyte: feeType === txFeeUnit.SATS_PER_KILO_VBYTE ? txFeesValue / 1_000 : undefined,
      txFeesFactorInPercent: Number.isFinite(txFeesFactor) ? factorToPercentage(txFeesFactor) : undefined,
      maxSweepFeeChangeInPercent: Number.isFinite(maxSweepChangeFactor)
        ? factorToPercentage(maxSweepChangeFactor)
        : undefined,
    }
  }, [feeConfigValues])

  const miningFeesForm = useForm<MiningFeesFormValues, unknown, MiningFeesFormValues>({
    mode: 'onChange',
    values: miningFeeFormInitialValues,
    resolver: yupResolver(miningFeeFormSchema as yup.AnyObjectSchema) as Resolver<
      MiningFeesFormValues,
      unknown,
      MiningFeesFormValues
    >,
  })

  const collaboratorFormSchema = useMemo(() => {
    return collaboratorFeesFormSchema(enableFormValidation, t)
  }, [enableFormValidation, t])

  const collaboratorFeesFormInitialValues: CollaboratorFeesFormValues = useMemo(() => {
    const maxCjFeeAbsolute = Number.parseInt(feeConfigValues?.max_cj_fee_abs || '', 10)
    const maxCjFeeRelative = Number.parseFloat(feeConfigValues?.max_cj_fee_rel || '')
    return {
      maxCjFeeAbs: Number.isSafeInteger(maxCjFeeAbsolute) ? maxCjFeeAbsolute : undefined,
      maxCjFeeRelInPercent: Number.isFinite(maxCjFeeRelative) ? factorToPercentage(maxCjFeeRelative) : undefined,
    }
  }, [feeConfigValues])

  const collaboratorFeesForm = useForm<CollaboratorFeesFormValues, unknown, CollaboratorFeesFormValues>({
    mode: 'onChange',
    values: collaboratorFeesFormInitialValues,
    resolver: yupResolver(collaboratorFormSchema as yup.AnyObjectSchema) as Resolver<
      CollaboratorFeesFormValues,
      unknown,
      CollaboratorFeesFormValues
    >,
  })

  const setconfigMutation = useMutation(configsettingMutation({ client }))

  useEffect(() => {
    if (!open) {
      setSaveErrorMessage(undefined)
      return
    }
  }, [open])

  const handleSubmit = async () => {
    // Trigger validation on both forms before submission
    await collaboratorFeesForm.trigger()
    await miningFeesForm.trigger()

    const collaboratorValid = collaboratorFeesForm.formState.isValid
    const miningValid = miningFeesForm.formState.isValid

    if (!collaboratorValid || !miningValid) {
      toast.error(t('settings.fees.error_message'))
      return
    }

    setIsSubmitting(true)
    setSaveErrorMessage(undefined)

    try {
      const collaboratorData = collaboratorFeesForm.getValues()
      const miningData = miningFeesForm.getValues()

      if (!collaboratorData || !miningData) {
        toast.error(t('settings.fees.error_message'))
        setIsSubmitting(false)
        return
      }

      const maxCjFeeAbsoluteValue =
        collaboratorData.maxCjFeeAbs !== undefined && Number.isSafeInteger(collaboratorData.maxCjFeeAbs)
          ? String(collaboratorData.maxCjFeeAbs)
          : ''
      const maxCjFeeRelativeValue =
        collaboratorData.maxCjFeeRelInPercent !== undefined && Number.isFinite(collaboratorData.maxCjFeeRelInPercent)
          ? String(percentageToFactor(collaboratorData.maxCjFeeRelInPercent))
          : ''
      const txFeesBlocksValue = Number.isSafeInteger(miningData.txFeesBlocks) ? String(miningData.txFeesBlocks) : ''
      const txFeesSatsPerKvByteValue =
        miningData.txFeesSatsPerVbyte !== undefined && Number.isFinite(miningData.txFeesSatsPerVbyte)
          ? String(Math.round(miningData.txFeesSatsPerVbyte * 1_000))
          : ''
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
        {
          key: 'tx_fees',
          value: miningData.feeType === txFeeUnit.BLOCKS ? txFeesBlocksValue : txFeesSatsPerKvByteValue,
        },
        { key: 'tx_fees_factor', value: txFeesFactorValue },
        { key: 'max_sweep_fee_change', value: maxSweepFeeChangeValue },
      ]

      for (const { key, value } of configUpdates) {
        await setconfigMutation.mutateAsync({
          path: { walletname: encodeURIComponent(walletFileName) },
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
    collaboratorFeesForm.reset()
    miningFeesForm.reset()

    if (isDeveloperMode) {
      toast.success('[DEV] Form values have been reset')
    }
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
                    'text-destructive border-red-300': !!collaboratorFeesForm.formState.errors.form,
                  })}
                >
                  {t('settings.fees.title_max_cj_fee_settings')}
                </AccordionTrigger>
                <AccordionContent
                  className={cn('space-y-2', 'mx-1' /* add x-spacing for input component focus state*/)}
                >
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
                    'text-destructive border-red-300': !!miningFeesForm.formState.errors.form,
                  })}
                >
                  {t('settings.fees.title_general_fee_settings')}
                </AccordionTrigger>
                <AccordionContent
                  className={cn('space-y-2', 'mx-1' /* add x-spacing for input component focus state*/)}
                >
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
        </div>

        {saveErrorMessage && (
          <div className="text-destructive mb-4 w-full rounded-lg border border-red-200 p-2 text-sm">
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
            <Button variant="outline" onClick={handleResetFormValues} disabled={isSubmitting || isLoadingConfig}>
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
