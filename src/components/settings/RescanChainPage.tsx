import { useMemo } from 'react'
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
import { Input } from '@/components/ui/input'
import PageTitle from '@/components/ui/jam/PageTitle'
import { Label } from '@/components/ui/label'
import { routes } from '@/constants/routes'
import { useCurrentBlockHeight, useRescanStatus, type RescanInfo } from '@/context/JamSessionInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import { getErrorReason } from '@/lib/errorReason'
import { isValidInteger, SEGWIT_ACTIVATION_BLOCK } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import type { BlockHeight } from '@/types/global'

const INPUT_BLOCK_HEIGHT_MIN = 0
const INPUT_BLOCK_HEIGHT_MAX = Number.MAX_SAFE_INTEGER

type Inputs = {
  blockHeight: BlockHeight
}

const rescanFormSchema = (currentBlockHeight: BlockHeight | undefined, t: TFunction) => {
  const minBlockHeight = Math.min(INPUT_BLOCK_HEIGHT_MIN, currentBlockHeight ?? INPUT_BLOCK_HEIGHT_MIN)
  const maxBlockheight = currentBlockHeight || INPUT_BLOCK_HEIGHT_MAX
  const invalidBlockheightMessage = t('rescan_chain.feedback_invalid_blockheight', { min: minBlockHeight })

  return yup
    .object({
      blockHeight: yup
        .number<BlockHeight>()
        .integer(invalidBlockheightMessage)
        .transform((value) => (isValidInteger(value) ? value : null))
        .min(minBlockHeight, invalidBlockheightMessage)
        .max(maxBlockheight, invalidBlockheightMessage)
        .required(invalidBlockheightMessage),
    })
    .required()
}

interface RescanChainFormProps {
  rescanInfo: RescanInfo
  initialBlockHeight?: BlockHeight
  currentBlockHeight?: BlockHeight
  onSubmit: SubmitHandler<Inputs>
  disabled?: boolean
}

function RescanChainForm({
  rescanInfo,
  initialBlockHeight,
  currentBlockHeight,
  onSubmit,
  disabled,
}: RescanChainFormProps) {
  const { t } = useTranslation()

  const schema = useMemo(() => rescanFormSchema(currentBlockHeight, t), [currentBlockHeight, t])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Inputs>({
    mode: 'onSubmit',
    defaultValues: {
      blockHeight: initialBlockHeight,
    },
    resolver: yupResolver(schema),
  })

  const doOnSubmit = handleSubmit(onSubmit)

  return (
    <form onSubmit={(event) => void doOnSubmit(event)} className="space-y-4">
      {/* include validation with required or other standard HTML validation rules */}
      <div className="space-y-2">
        <Label htmlFor="rescanHeight" className="text-sm font-medium">
          {t('rescan_chain.label_blockheight')}
        </Label>
        <p className="text-muted-foreground text-xs">{t('rescan_chain.description_blockheight')}</p>
        <div className="relative">
          <div className="absolute top-1/2 left-3 -translate-y-1/2">
            <PackageSearchIcon className="text-muted-foreground h-4 w-4" />
          </div>

          <Input
            {...register('blockHeight', {
              disabled: rescanInfo.rescanning,
            })}
            type="number"
            step={1}
            className="bg-background pl-10"
            placeholder={t('rescan_chain.placeholder_blockheight')}
          />
        </div>
        {errors.blockHeight?.message && <div className="text-destructive text-xs">{errors.blockHeight.message}</div>}
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
}

export const RescanChainPage = ({ walletFileName }: RescanChainProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const client = useApiClient()
  const { currentBlockHeight } = useCurrentBlockHeight()

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

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    return await rescanMutation.mutateAsync(data.blockHeight)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3 p-4">
      <div className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-4">
        <Button
          variant="ghost"
          className="shrink-0"
          onClick={() => void navigate(routes.settings)}
          title={t('global.back')}
        >
          <ArrowLeftIcon />
          <span className="sr-only">{t('global.back')}</span>
        </Button>
        <PageTitle title={t('rescan_chain.title')} subtitle={t('rescan_chain.subtitle')} />
      </div>

      <Card>
        <CardContent>
          <RescanChainForm
            rescanInfo={rescanInfo}
            initialBlockHeight={
              currentBlockHeight === undefined
                ? SEGWIT_ACTIVATION_BLOCK
                : Math.max(0, currentBlockHeight - (1 / 10) * 60 * 24)
            }
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
