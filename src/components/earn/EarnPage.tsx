import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FeeLimitDialog } from '@/components/settings/FeeLimitDialog'
import { FeeConfigErrorAlert } from '@/components/ui/FeeConfigErrorAlert'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import type { WalletFileName } from '@/lib/utils'

interface EarnPageProps {
  walletFileName: WalletFileName
}

export const EarnPage = ({ walletFileName }: EarnPageProps) => {
  const { t } = useTranslation()
  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)
  const { maxFeesConfigMissing } = useFeeConfigValidation()

  if (!walletFileName) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 pt-6">
        <h1 className="mb-2 text-left text-2xl font-bold">{t('earn.title')}</h1>
        <p className="text-muted-foreground mb-4">{t('current_wallet.error_loading_failed')}</p>
      </div>
    )
  }
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      <h1 className="my-2 text-2xl font-semibold tracking-tight">{t('earn.title')}</h1>
      <p className="text-muted-foreground mb-4 text-sm">{t('earn.subtitle')}</p>

      {/* Fee Config Error Alert */}
      {maxFeesConfigMissing && (
        <FeeConfigErrorAlert onOpenFeeConfig={() => setShowFeeConfigDialog(true)} className="mb-4" />
      )}

      <div className="light:border-yellow-800 light:bg-yellow-50 rounded-lg border border-yellow-200 bg-yellow-900/20 p-2">
        <div className="flex items-start gap-2">
          <div className="light:text-yellow-800 text-sm text-yellow-200">
            <div className="flex items-center">
              <AlertTriangle className="light:text-yellow-500 m-1 h-4 w-4 shrink-0 text-yellow-200" />
              <p className="text-md font-medium">Under construction</p>
            </div>
            <p className="p-1 text-xs">
              Not yet implemented.
              {maxFeesConfigMissing && (
                <span className="mt-2 block">
                  <strong>Note:</strong> Fee configuration is required before earning with collaborative transactions.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Fee Configuration Dialog */}
      <FeeLimitDialog
        open={showFeeConfigDialog}
        onOpenChange={setShowFeeConfigDialog}
        walletFileName={walletFileName}
      />
    </div>
  )
}
