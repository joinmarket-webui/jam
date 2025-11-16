import { useState } from 'react'
import { rescanblockchain } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, RefreshCw } from 'lucide-react'
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
import { SEGWIT_ACTIVATION_BLOCK } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'

interface RescanChainProps {
  walletFileName: WalletFileName
}

export const RescanChain = ({ walletFileName }: RescanChainProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const client = useApiClient()
  const { rescanInfo, setRescanInfo } = useRescanStatus({ walletFileName })
  const [rescanHeight, setRescanHeight] = useState<number>(SEGWIT_ACTIVATION_BLOCK)

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

  const handleRescan = async () => {
    const blockHeight = rescanHeight
    if (isNaN(blockHeight) || blockHeight < 0) {
      toast.error(t('rescan_chain.feedback_invalid_blockheight', { min: 0 }))
      return
    }

    await rescanMutation.mutateAsync(blockHeight)
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
                  disabled={rescanInfo.rescanning}
                />
              </div>
            </div>

            <Button
              onClick={handleRescan}
              disabled={!rescanHeight || rescanInfo.rescanning || rescanMutation.isPending}
              className="w-full"
              size="lg"
            >
              {rescanMutation.isPending || rescanInfo.rescanning
                ? t('rescan_chain.text_button_submitting')
                : t('rescan_chain.text_button_submit')}
            </Button>

            {rescanInfo.rescanning && (
              <div className="bg-muted/50 mt-4 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin motion-reduce:hidden" />
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
