import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FeeLimitDialog } from '@/components/settings/FeeLimitDialog'
import { FeeConfigErrorAlert } from '@/components/ui/FeeConfigErrorAlert'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'

interface SendPageProps {
  walletFileName: string
}

export const SendPage = ({ walletFileName }: SendPageProps) => {
  const { t } = useTranslation()
  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)

  const { maxFeesConfigMissing, isLoading, error } = useFeeConfigValidation()

  if (!walletFileName) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 pt-6">
        <h1 className="mb-2 text-left text-2xl font-bold">{t('send.title')}</h1>
        <p className="text-muted-foreground mb-4">{t('current_wallet.error_loading_failed')}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 pt-6">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="text-muted-foreground mt-4">{t('send.loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-4">
        <h1 className="my-2 text-2xl font-semibold tracking-tight">{t('send.title')}</h1>
        <Alert variant="destructive">
          <AlertDescription>
            {t('global.errors.error_loading_wallet_failed', {
              reason: error.message || t('global.errors.reason_unknown'),
            })}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      <h1 className="my-2 text-2xl font-semibold tracking-tight">{t('send.title')}</h1>
      <p className="text-muted-foreground mb-4 text-sm">{t('send.subtitle')}</p>

      {/* Fee Config Error Alert */}
      {maxFeesConfigMissing && (
        <FeeConfigErrorAlert onOpenFeeConfig={() => setShowFeeConfigDialog(true)} className="mb-4" />
      )}

      {/* Send Form Placeholder */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Send Functionality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="light:border-yellow-800 light:bg-yellow-50 rounded-lg border border-yellow-200 bg-yellow-900/20 p-4">
            <div className="flex items-start gap-2">
              <div className="light:text-yellow-800 text-sm text-yellow-200">
                <div className="flex items-center">
                  <AlertTriangle className="light:text-yellow-500 m-1 h-4 w-4 shrink-0 text-yellow-200" />
                  <p className="text-md font-medium">Under construction</p>
                </div>
                <p className="p-1 text-xs">
                  The Send functionality is not yet implemented in this version.
                  {maxFeesConfigMissing && (
                    <span className="mt-2 block">
                      <strong>Note:</strong> Fee configuration is required before sending collaborative transactions.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fee Configuration Dialog */}
      <FeeLimitDialog
        open={showFeeConfigDialog}
        onOpenChange={setShowFeeConfigDialog}
        walletFileName={walletFileName}
      />
    </div>
  )
}
