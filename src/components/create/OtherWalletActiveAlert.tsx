import { AlertCircleIcon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { routes, type Route } from '@/constants/routes'
import { walletDisplayName } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'

type OtherWalletActiveAlertProps = {
  walletFileName: WalletFileName | undefined
  linkTarget: Route
}

export const OtherWalletActiveAlert = ({ walletFileName, linkTarget }: OtherWalletActiveAlertProps) => {
  const { t } = useTranslation()
  const walletName = walletFileName
    ? walletDisplayName(walletFileName)
    : t('create_wallet.another_wallet', 'another wallet')

  return (
    <Alert variant="warning">
      <AlertCircleIcon />
      <AlertDescription>
        <Trans
          i18nKey="create_wallet.alert_other_wallet_unlocked"
          values={{ walletName }}
        >
          Currently <strong>walletName</strong> is active. You need to lock it first.
          <Link to={routes[linkTarget]} className="font-semibold underline">
            Go back
          </Link>
        </Trans>
      </AlertDescription>
    </Alert>
  )
}
