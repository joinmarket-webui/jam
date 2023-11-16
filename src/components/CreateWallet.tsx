import { useState, useCallback, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import PageTitle from './PageTitle'
import Sprite from './Sprite'
import WalletCreationConfirmation, { CreatedWalletInfo } from './WalletCreationConfirmation'
import PreventLeavingPageByMistake from './PreventLeavingPageByMistake'
import WalletCreationForm from './WalletCreationForm'
import MnemonicPhraseInput from './MnemonicPhraseInput'
import { walletDisplayName, walletDisplayNameToFileName } from '../utils'
import { useServiceInfo } from '../context/ServiceInfoContext'
import * as Api from '../libs/JmWalletApi'
import { Route, routes } from '../constants/routes'
import { isDebugFeatureEnabled } from '../constants/debugFeatures'

type CreatedWalletWithAuth = CreatedWalletInfo & {
  auth: Api.ApiAuthContext
}

interface BackupConfirmationProps {
  wallet: CreatedWalletInfo
  onSuccess: () => void
  onCancel: () => void
}

const BackupConfirmation = ({ wallet, onSuccess, onCancel }: BackupConfirmationProps) => {
  const { t } = useTranslation()

  const seedphrase = useMemo(() => wallet.seedphrase.split(' '), [wallet])
  const [givenWords, setGivenWords] = useState(new Array(seedphrase.length).fill(''))
  const [showSkipButton] = useState(isDebugFeatureEnabled('skipWalletBackupConfirmation'))

  const isSeedBackupConfirmed = useMemo(
    () => givenWords.every((word, index) => word === seedphrase[index]),
    [givenWords, seedphrase],
  )

  return (
    <div>
      <PreventLeavingPageByMistake />
      <div className="fs-4">{t('create_wallet.confirm_backup_title')}</div>
      <p className="text-secondary">{t('create_wallet.confirm_backup_subtitle')}</p>

      <rb.Form noValidate>
        <MnemonicPhraseInput
          mnemonicPhrase={givenWords}
          onChange={(val) => setGivenWords(val)}
          isValid={(index) => givenWords[index] === seedphrase[index]}
          isDisabled={(index) => givenWords[index] === seedphrase[index]}
        />
      </rb.Form>
      {isSeedBackupConfirmed && (
        <div className="mb-4 text-center text-success">{t('create_wallet.feedback_seed_confirmed')}</div>
      )}

      <rb.Button
        className="w-100 mb-4"
        variant="dark"
        size="lg"
        disabled={!isSeedBackupConfirmed}
        onClick={() => onSuccess()}
      >
        {t('create_wallet.confirmation_button_fund_wallet')}
      </rb.Button>

      <div className="d-flex justify-content-between mb-4 gap-4">
        <rb.Button variant="none" disabled={isSeedBackupConfirmed} onClick={() => onCancel()}>
          <div className="d-flex justify-content-center align-items-center">
            <Sprite symbol="arrow-left" width="20" height="20" className="me-2" />
            {t('create_wallet.back_button')}
          </div>
        </rb.Button>

        {showSkipButton && (
          <rb.Button
            className="position-relative"
            variant="outline-dark"
            disabled={isSeedBackupConfirmed}
            onClick={() => onSuccess()}
          >
            <div className="d-flex justify-content-center align-items-center">
              {t('create_wallet.skip_button')}
              <Sprite symbol="arrow-right" width="20" height="20" className="ms-2" />
            </div>
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning">
              dev
            </span>
          </rb.Button>
        )}
      </div>
    </div>
  )
}

interface CreateWalletProps {
  parentRoute: Route
  startWallet: (name: Api.WalletFileName, auth: Api.ApiAuthContext) => void
}

export default function CreateWallet({ parentRoute, startWallet }: CreateWalletProps) {
  const { t } = useTranslation()
  const serviceInfo = useServiceInfo()
  const navigate = useNavigate()

  const [alert, setAlert] = useState<SimpleAlert>()
  const [createdWallet, setCreatedWallet] = useState<CreatedWalletWithAuth>()

  const isCreated = useMemo(() => !!createdWallet?.walletFileName && !!createdWallet?.auth, [createdWallet])
  const canCreate = useMemo(
    () => !createdWallet && !serviceInfo?.walletFileName && !serviceInfo?.rescanning,
    [isCreated, serviceInfo],
  )

  const createWallet = useCallback(
    async ({ walletName, password }) => {
      setAlert(undefined)

      try {
        const res = await Api.postWalletCreate({}, { walletname: walletDisplayNameToFileName(walletName), password })
        const body = await (res.ok ? res.json() : Api.Helper.throwError(res))

        const { seedphrase, walletname: createdWalletFileName } = body
        const auth = Api.Helper.parseAuthProps(body)

        setCreatedWallet({ walletFileName: createdWalletFileName, seedphrase, password, auth })
      } catch (e: any) {
        const message = t('create_wallet.error_creating_failed', {
          reason: e.message || t('global.errors.reason_unknown'),
        })
        setAlert({ variant: 'danger', message })
      }
    },
    [setAlert, setCreatedWallet, t],
  )

  const walletConfirmed = useCallback(() => {
    if (createdWallet) {
      setAlert(undefined)
      startWallet(createdWallet.walletFileName, createdWallet.auth)
      navigate(routes.wallet)
    } else {
      setAlert({ variant: 'danger', message: t('create_wallet.alert_confirmation_failed') })
    }
  }, [createdWallet, startWallet, navigate, setAlert, t])

  const [showBackupConfirmation, setShowBackupConfirmation] = useState(false)

  return (
    <div className="create-wallet">
      {createdWallet ? (
        <PageTitle
          title={t('create_wallet.title_wallet_created')}
          subtitle={t('create_wallet.subtitle_wallet_created')}
          success
        />
      ) : (
        <PageTitle title={t('create_wallet.title')} />
      )}
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      {!canCreate && !isCreated ? (
        <>
          {serviceInfo?.walletFileName && (
            <rb.Alert variant="warning">
              <Trans i18nKey="create_wallet.alert_other_wallet_unlocked">
                Currently <strong>{{ walletName: walletDisplayName(serviceInfo.walletFileName) }}</strong> is active.
                You need to lock it first.
                <Link to={routes.walletList} className="alert-link">
                  Go back
                </Link>
                .
              </Trans>
            </rb.Alert>
          )}
          {serviceInfo?.rescanning === true && (
            <rb.Alert variant="warning" data-testid="alert-rescanning">
              <Trans i18nKey="create_wallet.alert_rescan_in_progress">
                Rescanning the timechain is currently in progress. Please wait until the process finishes and then try
                again.
                <Link to={routes.walletList} className="alert-link">
                  Go back
                </Link>
                .
              </Trans>
            </rb.Alert>
          )}
        </>
      ) : (
        <>
          <PreventLeavingPageByMistake />
          {!serviceInfo?.walletFileName && !createdWallet && (
            <WalletCreationForm
              onCancel={() => navigate(routes[parentRoute])}
              onSubmit={createWallet}
              submitButtonText={(isSubmitting) =>
                t(isSubmitting ? 'create_wallet.button_creating' : 'create_wallet.button_create')
              }
            />
          )}
          {createdWallet &&
            (!showBackupConfirmation ? (
              <WalletCreationConfirmation
                wallet={createdWallet}
                submitButtonText={(_) => t('create_wallet.next_button')}
                onSubmit={async () => setShowBackupConfirmation(true)}
              />
            ) : (
              <BackupConfirmation
                wallet={createdWallet}
                onSuccess={walletConfirmed}
                onCancel={() => setShowBackupConfirmation(false)}
              />
            ))}
        </>
      )}
    </div>
  )
}
