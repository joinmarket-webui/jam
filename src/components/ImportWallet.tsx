import { useState, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { useServiceInfo } from '../context/ServiceInfoContext'
import PageTitle from './PageTitle'
import WalletCreationForm from './WalletCreationForm'
import { routes } from '../constants/routes'
import { walletDisplayName } from '../utils'

export default function ImportWallet() {
  const { t } = useTranslation()
  const serviceInfo = useServiceInfo()

  const [alert] = useState<SimpleAlert>()
  const [createdWallet] = useState<any>()

  const isCreated = useMemo(
    () => createdWallet?.name && createdWallet?.seedphrase && createdWallet?.password,
    [createdWallet]
  )
  const canCreate = useMemo(() => !isCreated && !serviceInfo?.walletName, [isCreated, serviceInfo])

  return (
    <div className="import-wallet">
      {isCreated ? (
        <PageTitle
          title={t('create_wallet.title_wallet_created')}
          subtitle={t('create_wallet.subtitle_wallet_created')}
          success
        />
      ) : (
        <PageTitle title={t('import_wallet.title')} />
      )}
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      {canCreate && (
        <WalletCreationForm
          onSubmit={async () => {}}
          submitButtonText={(isSubmitting) => (
            <>{t(isSubmitting ? 'import_wallet.button_importing' : 'import_wallet.button_import')}</>
          )}
        />
      )}
      {!canCreate && !isCreated && serviceInfo?.walletName && (
        <rb.Alert variant="warning">
          <Trans i18nKey="create_wallet.alert_other_wallet_unlocked">
            Currently <strong>{{ walletName: walletDisplayName(serviceInfo.walletName) }}</strong> is active. You need
            to lock it first.
            <Link to={routes.walletList} className="alert-link">
              Go back
            </Link>
            .
          </Trans>
        </rb.Alert>
      )}
    </div>
  )
}
