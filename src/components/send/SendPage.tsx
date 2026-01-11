import { useState } from 'react'
import { AlertTriangleIcon, Loader2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FeeLimitDialog } from '@/components/settings/FeeLimitDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FeeConfigErrorAlert } from '@/components/ui/jam/FeeConfigErrorAlert'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import type { WalletFileName } from '@/lib/utils'
import PageTitle from '../PageTitle'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'

interface SendPageProps {
  walletFileName: WalletFileName
}

export const SendPage = ({ walletFileName }: SendPageProps) => {
  const { t } = useTranslation()
  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)

  const { maxFeesConfigMissing, isLoading } = useFeeConfigValidation({ walletFileName })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-4">
        <div className="m-2 flex items-center justify-center gap-2">
          <Loader2Icon className="h-4 w-4 animate-spin motion-reduce:hidden" />
          {t('global.loading')}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      <PageTitle title={t('send.title')} subtitle={t('send.subtitle')} />

      {maxFeesConfigMissing && (
        <FeeConfigErrorAlert onOpenFeeConfig={() => setShowFeeConfigDialog(true)} className="mb-4" />
      )}

      {/* Send Form Placeholder */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <AlertTriangleIcon className="h-4 w-4 text-yellow-500" />
            Send Functionality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="warning">
            <AlertTriangleIcon />
            <AlertTitle>Under construction</AlertTitle>
            <AlertDescription>
              Not yet implemented.
              {maxFeesConfigMissing && (
                <span className="mt-2 block">
                  <strong>Note:</strong> Fee configuration is required before earning with collaborative transactions.
                </span>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <FeeLimitDialog
        open={showFeeConfigDialog}
        onOpenChange={setShowFeeConfigDialog}
        walletFileName={walletFileName}
      />
    </div>
  )
}
