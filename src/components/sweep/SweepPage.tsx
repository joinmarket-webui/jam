import { useState } from 'react'
import { AlertTriangleIcon, Loader2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import type { WalletFileName } from '@/lib/utils'
import { FeeLimitDialog } from '../settings/FeeLimitDialog'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { FeeConfigErrorAlert } from '../ui/jam/FeeConfigErrorAlert'
import PageTitle from '../ui/jam/PageTitle'

interface SweepPageProps {
  walletFileName: WalletFileName
}

export const SweepPage = ({ walletFileName }: SweepPageProps) => {
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
      <PageTitle title={t('scheduler.title')} subtitle={t('scheduler.subtitle')} />

      {maxFeesConfigMissing && (
        <FeeConfigErrorAlert onOpenFeeConfig={() => setShowFeeConfigDialog(true)} className="mb-4" />
      )}

      <Alert variant="warning">
        <AlertTriangleIcon />
        <AlertTitle>Under construction</AlertTitle>
        <AlertDescription>Not yet implemented.</AlertDescription>
      </Alert>

      <FeeLimitDialog
        open={showFeeConfigDialog}
        onOpenChange={setShowFeeConfigDialog}
        walletFileName={walletFileName}
      />
    </div>
  )
}
