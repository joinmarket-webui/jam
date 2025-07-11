import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useApiClient } from '@/hooks/useApiClient'
import { useRescanStatus } from '@/hooks/useRescanStatus'
import { rescanblockchain } from '@/lib/jm-api/generated/client/sdk.gen'
import { setSession } from '@/lib/session'
import { SEGWIT_ACTIVATION_BLOCK } from '@/lib/utils'

export const RescanChain = ({ walletFileName }: { walletFileName: string }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const client = useApiClient()
  const { isRescanning, rescanInfo, showCompletionMessage } = useRescanStatus()
  const [rescanHeight, setRescanHeight] = useState<number>(SEGWIT_ACTIVATION_BLOCK)

  const rescanMutation = useMutation({
    mutationFn: async (blockHeight: number) => {
      setSession({
        rescan: {
          rescanning: true,
          progress: 0,
        },
      })

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
      toast.success('Rescan started successfully')
    },
    onError: (error: unknown) => {
      console.error('Rescan error:', error)

      setSession({
        rescan: {
          rescanning: false,
          progress: 0,
        },
      })

      const reason = error instanceof Error ? error.message : String(error)
      toast.error(t('rescan_chain.error_rescanning_failed', { reason }))
    },
  })

  const handleRescan = async () => {
    const blockHeight = rescanHeight
    if (isNaN(blockHeight) || blockHeight < 0) {
      toast.error(t('rescan_chain.feedback_invalid_blockheight', { min: 0 }))
      return
    }

    if (!walletFileName) {
      toast.error('No wallet loaded')
      return
    }

    rescanMutation.mutate(blockHeight)
  }

  const isLoading = rescanMutation.isPending

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/settings')}
          className="hover:bg-muted/50 h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{t('rescan_chain.title')}</h1>
      </div>

      <p className="text-muted-foreground ml-11 text-sm">{t('rescan_chain.subtitle')}</p>

      <Card className="ml-11 border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="space-y-4">
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
                  id="rescanHeight"
                  type="number"
                  value={rescanHeight}
                  onChange={(e) => setRescanHeight(parseInt(e.target.value))}
                  className="bg-background pl-10"
                  placeholder="Enter block height"
                />
              </div>
            </div>

            <Button
              onClick={handleRescan}
              disabled={isLoading || !rescanHeight || isRescanning}
              className="w-full"
              size="lg"
            >
              {isLoading
                ? t('rescan_chain.text_button_submitting')
                : showCompletionMessage
                  ? 'Rescan Completed'
                  : isRescanning
                    ? rescanInfo?.progress
                      ? `${t('rescan_chain.text_button_submitting')} (${rescanInfo.progress}%)`
                      : t('rescan_chain.text_button_submitting')
                    : t('rescan_chain.text_button_submit')}
            </Button>

            {(isRescanning || showCompletionMessage) && (
              <div className="bg-muted/50 mt-4 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className={`h-4 w-4 ${showCompletionMessage ? 'text-green-600' : 'animate-spin'}`} />
                  <span className="text-sm">
                    {showCompletionMessage
                      ? 'Rescan completed successfully!'
                      : rescanInfo?.progress
                        ? `Rescanning... ${rescanInfo.progress}%`
                        : 'Rescanning...'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
