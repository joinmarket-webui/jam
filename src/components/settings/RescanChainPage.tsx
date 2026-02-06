import { yupResolver } from '@hookform/resolvers/yup'
import { rescanblockchain } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useMutation } from '@tanstack/react-query'
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
import { useRescanStatus, type RescanInfo } from '@/context/JamSessionInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import { SEGWIT_ACTIVATION_BLOCK } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'

const INPUT_BLOCK_HEIGHT_MIN = 0

type Inputs = {
  blockHeight: number
}

const schema = yup
  .object({
    blockHeight: yup.number().integer().default(SEGWIT_ACTIVATION_BLOCK).min(INPUT_BLOCK_HEIGHT_MIN).required(),
  })
  .required()

interface RescanChainFormProps {
  rescanInfo: RescanInfo
  onSubmit: SubmitHandler<Inputs>
  disabled?: boolean
}

function RescanChainForm({ rescanInfo, onSubmit, disabled }: RescanChainFormProps) {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<Inputs>({
    mode: 'all',
    defaultValues: {
      blockHeight: SEGWIT_ACTIVATION_BLOCK,
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
            /* TODO: i18n */
            placeholder="Enter block height"
          />
        </div>
        {errors.blockHeight && (
          <div className="text-destructive text-xs">
            <span>{t('rescan_chain.feedback_invalid_blockheight', { min: INPUT_BLOCK_HEIGHT_MIN })}</span>
          </div>
        )}
      </div>
      <Button
        type="submit"
        disabled={disabled || !isValid || isSubmitting || rescanInfo.rescanning}
        className="w-full"
        size="xxl"
      >
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
  const { rescanInfo, setRescanInfo } = useRescanStatus()

  const rescanMutation = useMutation({
    mutationFn: async (blockHeight: number) => {
      const { data } = await rescanblockchain({
        client,
        path: {
          walletname: encodeURIComponent(walletFileName),
          blockheight: blockHeight,
        },
        throwOnError: true,
      })
      return data
    },
    onSuccess: () => {
      // TODO: i18n
      toast.success('Rescan started successfully')
      setRescanInfo({
        updatedAt: Date.now(),
        rescanning: true,
        progress: undefined,
      })
    },
    onError: (error: unknown) => {
      console.error('Rescan error:', error)

      setRescanInfo({
        updatedAt: Date.now(),
        rescanning: false,
        progress: undefined,
      })

      const reason = error instanceof Error ? error.message : String(error)
      toast.error(t('rescan_chain.error_rescanning_failed', { reason }))
    },
  })

  const handleRescan = async (blockHeight: number) => {
    if (Number.isNaN(blockHeight) || blockHeight < INPUT_BLOCK_HEIGHT_MIN) {
      toast.error(t('rescan_chain.feedback_invalid_blockheight', { min: INPUT_BLOCK_HEIGHT_MIN }))
      return
    }

    await rescanMutation.mutateAsync(blockHeight)
  }

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    return handleRescan(data.blockHeight)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3 p-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => void navigate(routes.settings)} title={t('global.back')}>
          <ArrowLeftIcon />
          <span className="sr-only">{t('global.back')}</span>
        </Button>
        <PageTitle title={t('rescan_chain.title')} subtitle={t('rescan_chain.subtitle')} />
      </div>

      <Card>
        <CardContent>
          <RescanChainForm
            rescanInfo={rescanInfo}
            onSubmit={onSubmit}
            disabled={rescanInfo.rescanning || rescanMutation.isPending}
          />
          {rescanInfo.rescanning && (
            <div className="bg-muted/50 mt-4 animate-pulse rounded-lg p-3 duration-100">
              <div className="flex items-center gap-2">
                <RefreshCwIcon className="h-4 w-4 animate-spin motion-reduce:hidden" />
                <span className="text-sm">
                  {rescanInfo?.progress === undefined
                    ? t('app.alert_rescan_in_progress')
                    : t('app.alert_rescan_in_progress_with_progress', {
                        progress: rescanInfo.progress,
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
