import { useMemo, useState } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { rescanblockchain } from '@joinmarket-webui/joinmarket-ng-api-ts/jm'
import { useMutation } from '@tanstack/react-query'
import type { TFunction } from 'i18next'
import { ArrowLeftIcon, PackageSearchIcon, RefreshCwIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import type { SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import * as yup from 'yup'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import PageTitle from '@/components/ui/jam/PageTitle'
import { routes, type Route } from '@/constants/routes'
import { useCurrentBlockHeight, useRescanStatus, type RescanInfo } from '@/context/JamSessionInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import { getErrorReason } from '@/lib/errorReason'
import { blockHeightField, INPUT_BLOCK_HEIGHT_MIN } from '@/lib/formValidation'
import { AVERAGE_BLOCKS_PER_DAY, AVERAGE_BLOCKS_PER_YEAR, SEGWIT_ACTIVATION_BLOCK } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { useDeveloperMode } from '@/store/jamSettingsStore'
import type { BlockHeight } from '@/types/global'
import { Field, FieldDescription, FieldError, FieldLabel } from '../ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

type RescanChainFormValues = {
  blockHeight: BlockHeight
}

const rescanFormSchema = (currentBlockHeight: BlockHeight | undefined, t: TFunction) => {
  return yup
    .object({
      blockHeight: blockHeightField({
        currentBlockHeight: currentBlockHeight,
        messages: {
          invalid: ({ min, max }) =>
            t('rescan_chain.feedback_invalid_blockheight', {
              min: min.toLocaleString('en-US'),
              max: max.toLocaleString('en-US'),
            }),
        },
      }),
    })
    .required()
}

interface RescanChainFormProps {
  rescanInfo: RescanInfo
  defaultValues?: Partial<RescanChainFormValues>
  currentBlockHeight?: BlockHeight
  onSubmit: SubmitHandler<RescanChainFormValues>
  disabled?: boolean
}

function RescanChainForm({ rescanInfo, defaultValues, currentBlockHeight, onSubmit, disabled }: RescanChainFormProps) {
  const { t } = useTranslation()
  const { enabled: isDeveloperMode } = useDeveloperMode()

  const schema = useMemo(() => rescanFormSchema(currentBlockHeight, t), [currentBlockHeight, t])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RescanChainFormValues>({
    mode: 'onSubmit',
    defaultValues,
    resolver: yupResolver(schema),
  })

  const doOnSubmit = handleSubmit(onSubmit)

  return (
    <form onSubmit={(event) => void doOnSubmit(event)} className="space-y-4">
      {/* include validation with required or other standard HTML validation rules */}
      <Field data-invalid={errors.blockHeight !== undefined}>
        <FieldLabel htmlFor="inputRescanBlockheight">{t('rescan_chain.label_blockheight')}</FieldLabel>
        <FieldDescription className="text-xs">{t('rescan_chain.description_blockheight')}</FieldDescription>
        <InputGroup className="gap-2">
          <InputGroupInput
            id="inputRescanBlockheight"
            {...register('blockHeight', {
              disabled: disabled || rescanInfo.rescanning,
            })}
            placeholder={t('rescan_chain.placeholder_blockheight')}
            type="number"
            step={1}
          />
          <InputGroupAddon align="inline-start">
            <PackageSearchIcon />
          </InputGroupAddon>
        </InputGroup>
        {errors.blockHeight?.message && <FieldError>{errors.blockHeight.message}</FieldError>}
      </Field>

      <div className="flex flex-wrap gap-2">
        {(currentBlockHeight && currentBlockHeight >= AVERAGE_BLOCKS_PER_DAY) || isDeveloperMode ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              setValue(
                'blockHeight',
                Math.max(INPUT_BLOCK_HEIGHT_MIN, (currentBlockHeight ?? 0) - AVERAGE_BLOCKS_PER_DAY),
                {
                  shouldValidate: true,
                },
              )
            }
            disabled={disabled || isSubmitting || rescanInfo.rescanning}
          >
            {/* TODO: i18n */}
            Last {AVERAGE_BLOCKS_PER_DAY.toLocaleString('en-US')} blocks (~24 hours)
          </Button>
        ) : null}

        {(currentBlockHeight && currentBlockHeight >= AVERAGE_BLOCKS_PER_YEAR) || isDeveloperMode ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              setValue(
                'blockHeight',
                Math.max(INPUT_BLOCK_HEIGHT_MIN, (currentBlockHeight ?? 0) - AVERAGE_BLOCKS_PER_YEAR),
                {
                  shouldValidate: true,
                },
              )
            }
            disabled={disabled || isSubmitting || rescanInfo.rescanning}
          >
            {/* TODO: i18n */}
            Last {AVERAGE_BLOCKS_PER_YEAR.toLocaleString('en-US')} blocks (~1 year)
          </Button>
        ) : null}

        {(currentBlockHeight && currentBlockHeight >= SEGWIT_ACTIVATION_BLOCK) || isDeveloperMode ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setValue('blockHeight', SEGWIT_ACTIVATION_BLOCK, {
                    shouldValidate: true,
                  })
                }
                disabled={disabled || isSubmitting || rescanInfo.rescanning}
              >
                {/* TODO: i18n */}
                From block #{SEGWIT_ACTIVATION_BLOCK.toLocaleString('en-US')}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Segwit Activation Block</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      <Button type="submit" disabled={disabled || isSubmitting || rescanInfo.rescanning} className="w-full" size="xxl">
        {isSubmitting || rescanInfo.rescanning
          ? t('rescan_chain.text_button_submitting')
          : t('rescan_chain.text_button_submit')}
      </Button>
    </form>
  )
}

interface RescanChainProps {
  walletFileName: WalletFileName
  backLinkTarget?: Route
}

export const RescanChainPage = ({ walletFileName, backLinkTarget }: RescanChainProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const client = useApiClient()
  const { currentBlockHeight } = useCurrentBlockHeight()

  const [defaultValues] = useState<Partial<RescanChainFormValues>>(() => ({
    blockHeight:
      currentBlockHeight === undefined
        ? SEGWIT_ACTIVATION_BLOCK
        : Math.max(INPUT_BLOCK_HEIGHT_MIN, currentBlockHeight - AVERAGE_BLOCKS_PER_DAY),
  }))

  const { rescanInfo, setRescanInfo } = useRescanStatus()

  const rescanMutation = useMutation({
    mutationFn: async (blockHeight: number) => {
      const { data } = await rescanblockchain({
        client,
        path: {
          walletname: walletFileName,
          blockheight: blockHeight,
        },
        throwOnError: true,
      })
      return data
    },
    onSuccess: () => {
      toast.success(t('rescan_chain.success_rescan_started'))
      setRescanInfo({
        updatedAt: Date.now(),
        rescanning: true,
      })
    },
    onError: (error: unknown) => {
      console.error('Rescan error:', error)

      setRescanInfo({
        updatedAt: Date.now(),
        rescanning: false,
      })

      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      toast.error(t('rescan_chain.error_rescanning_failed', { reason }))
    },
  })

  const onSubmit: SubmitHandler<RescanChainFormValues> = async (data) => {
    return await rescanMutation.mutateAsync(data.blockHeight)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3 p-4">
      <div className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-4">
        {backLinkTarget ? (
          <Button
            variant="ghost"
            className="shrink-0"
            onClick={() => void navigate(routes.settings)}
            title={t('global.back')}
          >
            <ArrowLeftIcon />
            <span className="sr-only">{t('global.back')}</span>
          </Button>
        ) : null}
        <PageTitle title={t('rescan_chain.title')} subtitle={t('rescan_chain.subtitle')} />
      </div>

      <Card>
        <CardContent>
          <RescanChainForm
            rescanInfo={rescanInfo}
            defaultValues={defaultValues}
            currentBlockHeight={currentBlockHeight}
            onSubmit={onSubmit}
            disabled={rescanInfo.rescanning || rescanMutation.isPending}
          />
          {rescanInfo.rescanning && (
            <div className="bg-muted/50 mt-4 animate-pulse rounded-lg p-3 duration-100">
              <div className="flex min-w-0 items-start gap-2">
                <RefreshCwIcon className="mt-0.5 h-4 w-4 shrink-0 animate-spin motion-reduce:hidden" />
                <span className="min-w-0 text-sm break-words">
                  {rescanInfo?.progressInPercentage === undefined
                    ? t('app.alert_rescan_in_progress')
                    : t('app.alert_rescan_in_progress_with_progress', {
                        progress: rescanInfo.progressInPercentage,
                      })}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
