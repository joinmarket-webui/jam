import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useTranslation, Trans } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { FEE_CONFIG_KEYS } from '@/constants/jm'
import { useApiClient } from '@/hooks/useApiClient'
import { configsettingMutation, configgetOptions } from '@/lib/jm-api/generated/client/@tanstack/react-query.gen'
import { factorToPercentage } from '@/lib/utils'
import { DevBadge } from '../ui/DevBadge'
import { CollaboratorFeesForm, type CollaboratorFeesFormRef } from './CollaboratorFeesForm'
import { MiningFeesForm, type MiningFeesFormRef } from './MiningFeesForm'

interface FeeLimitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletFileName: string
}

export const FeeLimitDialog = ({ open, onOpenChange, walletFileName }: FeeLimitDialogProps) => {
  const { t } = useTranslation()
  const [enableFormValidation, setEnableFormValidation] = useState(true)
  const [collaboratorFeesExpanded, setCollaboratorFeesExpanded] = useState(false)
  const [miningFeesExpanded, setMiningFeesExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingConfig, setIsLoadingConfig] = useState(false)
  const [saveErrorMessage, setSaveErrorMessage] = useState<string>()

  useEffect(() => {
    if (open) {
      setCollaboratorFeesExpanded(false)
      setMiningFeesExpanded(false)
    }
  }, [open])

  const client = useApiClient()
  const collaboratorFormRef = useRef<CollaboratorFeesFormRef>(null)
  const miningFormRef = useRef<MiningFeesFormRef>(null)

  const configMutation = useMutation(configsettingMutation({ client }))

  const commonQueryOptions = {
    enabled: open && !!walletFileName,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  }

  const createConfigQuery = (configKey: keyof typeof FEE_CONFIG_KEYS) => ({
    ...configgetOptions({
      client,
      path: { walletname: walletFileName },
      body: FEE_CONFIG_KEYS[configKey],
    }),
    ...commonQueryOptions,
  })

  const maxCjFeeAbsQuery = useQuery(createConfigQuery('max_cj_fee_abs'))
  const maxCjFeeRelQuery = useQuery(createConfigQuery('max_cj_fee_rel'))
  const txFeesQuery = useQuery(createConfigQuery('tx_fees'))
  const txFeesFactorQuery = useQuery(createConfigQuery('tx_fees_factor'))
  const maxSweepFeeChangeQuery = useQuery(createConfigQuery('max_sweep_fee_change'))

  useEffect(() => {
    if (!open || !walletFileName) {
      setIsLoadingConfig(false)
      setSaveErrorMessage(undefined)
      return
    }

    const isLoading =
      maxCjFeeAbsQuery.isLoading ||
      maxCjFeeRelQuery.isLoading ||
      txFeesQuery.isLoading ||
      txFeesFactorQuery.isLoading ||
      maxSweepFeeChangeQuery.isLoading

    setIsLoadingConfig(isLoading)
  }, [
    open,
    walletFileName,
    maxCjFeeAbsQuery.isLoading,
    maxCjFeeRelQuery.isLoading,
    txFeesQuery.isLoading,
    txFeesFactorQuery.isLoading,
    maxSweepFeeChangeQuery.isLoading,
  ])

  const handleSubmit = async () => {
    if (!walletFileName) {
      return
    }

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

      const configUpdates = [
        { key: 'max_cj_fee_abs', value: collaboratorData.maxCjFeeAbs },
        { key: 'max_cj_fee_rel', value: collaboratorData.maxCjFeeRel },
        { key: 'tx_fees', value: miningData.txFees },
        { key: 'tx_fees_factor', value: miningData.txFeesFactor },
        { key: 'max_sweep_fee_change', value: miningData.maxSweepFeeChange },
      ]

      for (const { key, value } of configUpdates) {
        if (value) {
          await configMutation.mutateAsync({
            path: { walletname: walletFileName },
            body: {
              ...FEE_CONFIG_KEYS[key],
              value,
            },
          })
        }
      }

      await Promise.all([
        maxCjFeeAbsQuery.refetch(),
        maxCjFeeRelQuery.refetch(),
        txFeesQuery.refetch(),
        txFeesFactorQuery.refetch(),
        maxSweepFeeChangeQuery.refetch(),
      ])

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
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto pb-0">
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

        <div className="min-h-0 flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch checked={enableFormValidation} onCheckedChange={setEnableFormValidation} />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Enable form validation</span>
                <DevBadge />
              </div>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            Ability to reset fee values to test what the UI looks like, when a user does not have these values
            configured.
          </p>

          <div className="space-y-2">
            <button
              onClick={() => setCollaboratorFeesExpanded(!collaboratorFeesExpanded)}
              className={`hover:bg-muted/50 flex w-full cursor-pointer items-center justify-between border-b px-4 py-2 text-left ${
                collaboratorFormRef.current && !collaboratorFormRef.current.getFormData() ? 'border-red-300' : ''
              }`}
            >
              <span
                className={`text-base font-medium ${
                  collaboratorFormRef.current && !collaboratorFormRef.current.getFormData() ? 'text-red-600' : ''
                }`}
              >
                {t('settings.fees.title_max_cj_fee_settings')}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${collaboratorFeesExpanded ? 'rotate-180' : ''}`} />
            </button>
            <div className={`border-muted pl-4 ${collaboratorFeesExpanded ? '' : 'hidden'}`}>
              {isLoadingConfig ? (
                <div className="text-muted-foreground flex items-center justify-center py-8">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-b-transparent"></div>
                  {t('global.loading')}...
                </div>
              ) : (
                <CollaboratorFeesForm
                  key={`collaborator-${walletFileName}-${open}`}
                  ref={collaboratorFormRef}
                  initialValues={{
                    maxCjFeeAbs: maxCjFeeAbsQuery.data?.configvalue || '',
                    maxCjFeeRel: maxCjFeeRelQuery.data?.configvalue
                      ? String(factorToPercentage(Number(maxCjFeeRelQuery.data.configvalue)))
                      : '',
                  }}
                  enableValidation={enableFormValidation}
                />
              )}
            </div>
          </div>

          {/* Mining fees dropdown */}
          <div className="space-y-2">
            <button
              onClick={() => setMiningFeesExpanded(!miningFeesExpanded)}
              className={`hover:bg-muted/50 flex w-full cursor-pointer items-center justify-between border-b px-4 py-2 text-left ${
                miningFormRef.current && !miningFormRef.current.getFormData() ? 'border-red-300' : ''
              }`}
            >
              <span
                className={`text-base font-medium ${
                  miningFormRef.current && !miningFormRef.current.getFormData() ? 'text-red-600' : ''
                }`}
              >
                {t('settings.fees.title_general_fee_settings')}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${miningFeesExpanded ? 'rotate-180' : ''}`} />
            </button>
            <div className={`border-muted pl-4 ${miningFeesExpanded ? '' : 'hidden'}`}>
              {isLoadingConfig ? (
                <div className="text-muted-foreground flex items-center justify-center py-8">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-b-transparent"></div>
                  {t('global.loading')}...
                </div>
              ) : (
                <MiningFeesForm
                  key={`mining-${walletFileName}-${open}`}
                  ref={miningFormRef}
                  initialValues={{
                    txFees: txFeesQuery.data?.configvalue ?? '',
                    txFeesFactor: txFeesFactorQuery.data?.configvalue
                      ? String(factorToPercentage(Number(txFeesFactorQuery.data.configvalue)))
                      : '',
                    maxSweepFeeChange: maxSweepFeeChangeQuery.data?.configvalue
                      ? String(factorToPercentage(Number(maxSweepFeeChangeQuery.data.configvalue)))
                      : '',
                  }}
                  enableValidation={enableFormValidation}
                />
              )}
            </div>
          </div>
        </div>

        {saveErrorMessage && (
          <div className="mb-4 w-full rounded-lg border border-red-200 p-2 text-sm text-red-700">
            {saveErrorMessage}
          </div>
        )}
        <DialogFooter
          className={`bg-background sticky bottom-0 flex gap-2 p-4 ${collaboratorFeesExpanded || miningFeesExpanded ? 'border-t' : ''}`}
        >
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
            disabled={isSubmitting || isLoadingConfig}
          >
            {t('settings.fees.text_button_cancel')}
          </Button>
          <Button
            variant="outline"
            onClick={handleResetFormValues}
            disabled={isSubmitting || isLoadingConfig}
            className="border-amber-300 bg-amber-100 hover:bg-amber-200"
          >
            Reset form values
            <DevBadge />
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isLoadingConfig}>
            {isSubmitting ? t('settings.fees.text_button_submitting') : t('settings.fees.text_button_submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
