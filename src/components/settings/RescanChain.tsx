import { rescanblockchain } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useForm } from 'react-hook-form'
import type { SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { routes } from '@/constants/routes'
import { useApiClient } from '@/hooks/useApiClient'
import { useRescanStatus } from '@/hooks/useRescanStatus'
import type { RescanInfo } from '@/hooks/useRescanStatus'
import { SEGWIT_ACTIVATION_BLOCK } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'

type Inputs = {
  blockHeight: number
}

const INPUT_BLOCK_HEIGHT_MIN = 0

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
    defaultValues: {
      blockHeight: SEGWIT_ACTIVATION_BLOCK,
    },
  })

  return (
    /* "handleSubmit" will validate your inputs before invoking "onSubmit" */
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* include validation with required or other standard HTML validation rules */}
      <div className="space-y-2">
        <Label htmlFor="rescanHeight" className="text-sm font-medium">
          {t('rescan_chain.label_blockheight')}
        </Label>
        <p className="text-muted-foreground text-xs">{t('rescan_chain.description_blockheight')}</p>
        <div className="relative">
          <div className="absolute top-1/2 left-3 -translate-y-1/2">
            <RefreshCw className="text-muted-foreground h-4 w-4" />
          </div>

          <Input
            {...register('blockHeight', {
              required: true,
              min: INPUT_BLOCK_HEIGHT_MIN,
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
          <div className="text-muted-foreground light:text-red-700 text-xs text-red-500">
            <span>{t('rescan_chain.feedback_invalid_blockheight', { min: INPUT_BLOCK_HEIGHT_MIN })}</span>
          </div>
        )}
      </div>
      <Button
        type="submit"
        disabled={disabled || !isValid || isSubmitting || rescanInfo.rescanning}
        className="w-full"
        size="lg"
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

export const RescanChain = ({ walletFileName }: RescanChainProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const client = useApiClient()
  const { rescanInfo, setRescanInfo } = useRescanStatus({ walletFileName })

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
    if (isNaN(blockHeight) || blockHeight < INPUT_BLOCK_HEIGHT_MIN) {
      toast.error(t('rescan_chain.feedback_invalid_blockheight', { min: INPUT_BLOCK_HEIGHT_MIN }))
      return
    }

    await rescanMutation.mutateAsync(blockHeight)
  }

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    return handleRescan(data.blockHeight)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(routes.settings)}
          className="hover:bg-muted/50 h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{t('rescan_chain.title')}</h1>
      </div>

      <p className="text-muted-foreground ml-11 text-sm">{t('rescan_chain.subtitle')}</p>

      <Card className="ml-11 border-0 shadow-sm">
        <CardContent className="px-6">
          <RescanChainForm
            rescanInfo={rescanInfo}
            onSubmit={onSubmit}
            disabled={rescanInfo.rescanning || rescanMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}
