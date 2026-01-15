import { useState } from 'react'
import { AlertTriangleIcon, Loader2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FeeLimitDialog } from '@/components/settings/FeeLimitDialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FeeConfigErrorAlert } from '@/components/ui/jam/FeeConfigErrorAlert'
import PageTitle from '@/components/ui/jam/PageTitle'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import type { WalletFileName } from '@/lib/utils'

interface SweepPageProps {
  walletFileName: WalletFileName
}

export const SweepPage = ({ walletFileName }: SweepPageProps) => {
  const { t } = useTranslation()
  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)

  const { maxFeesConfigMissing, isLoading } = useFeeConfigValidation({ walletFileName })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-3 p-4">
        <div className="m-2 flex items-center justify-center gap-2">
          <Loader2Icon className="h-4 w-4 animate-spin motion-reduce:hidden" />
          {t('global.loading')}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3 p-4">
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
