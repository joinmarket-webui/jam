import { useMemo, useEffect, useCallback, useState } from 'react'
import { Link, useLoaderData, useNavigate, useNavigation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as rb from 'react-bootstrap'
import classNames from 'classnames'
import Sprite from './Sprite'
import Alert from './Alert'
import Wallet from './Wallet'
import PageTitle from './PageTitle'
import { useServiceInfo } from '../context/ServiceInfoContext'
import { walletDisplayName } from '../utils'
import * as Api from '../libs/JmWalletApi'
import { routes } from '../constants/routes'
import { ConfirmModal } from './Modal'
import { isFeatureEnabled } from '../constants/features'
import { CurrentWallet } from '../context/WalletContext'
import { AllWalletsLoaderResponse } from './App'

function sortWallets(
  wallets: Api.WalletFileName[],
  activeWalletFileName: Api.WalletFileName | null = null,
): Api.WalletFileName[] {
  if (activeWalletFileName && wallets.indexOf(activeWalletFileName) >= 0) {
    return [activeWalletFileName, ...sortWallets(wallets.filter((a) => a !== activeWalletFileName))]
  } else {
    return [...wallets].sort((a, b) => a.localeCompare(b))
  }
}

interface WalletsProps {
  currentWallet: CurrentWallet | null
  startWallet: (walletFileName: Api.WalletFileName, auth: Api.ApiAuthContext) => void
  stopWallet: () => void
}

export default function Wallets({ currentWallet, startWallet, stopWallet }: WalletsProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const navigation = useNavigation()
  const serviceInfo = useServiceInfo()
  const { existingWallets, existingWalletsError } = useLoaderData() as AllWalletsLoaderResponse
  const [unlockingWalletFileName, setUnlockWalletFileName] = useState<Api.WalletFileName>()
  const isUnlocking = useMemo(() => unlockingWalletFileName !== undefined, [unlockingWalletFileName])
  const [alert, setAlert] = useState<SimpleAlert>()
  const [showLockConfirmModal, setShowLockConfirmModal] = useState(false)

  const coinjoinInProgress = useMemo(() => serviceInfo !== null && serviceInfo.coinjoinInProgress, [serviceInfo])
  const makerRunning = useMemo(() => serviceInfo !== null && serviceInfo.makerRunning, [serviceInfo])

  const unlockWallet = useCallback(
    async (walletFileName: Api.WalletFileName, password: string) => {
      if (currentWallet) {
        setAlert({
          variant: 'warning',
          dismissible: false,
          message:
            currentWallet.walletFileName === walletFileName
              ? // unlocking same wallet
                t('wallets.wallet_preview.alert_wallet_already_unlocked', { walletName: currentWallet.displayName })
              : // unlocking another wallet while one is already unlocked
                t('wallets.wallet_preview.alert_other_wallet_unlocked', { walletName: currentWallet.displayName }),
        })
        return
      }

      setAlert(undefined)
      setUnlockWalletFileName(walletFileName)
      try {
        const res = await Api.postWalletUnlock({ walletFileName }, { password })
        const body = await (res.ok ? res.json() : Api.Helper.throwError(res))

        setUnlockWalletFileName(undefined)

        const auth = Api.Helper.parseAuthProps(body)
        startWallet(body.walletname, auth)
        navigate(routes.wallet)
      } catch (e: any) {
        const message = e.message?.replace('Wallet', walletFileName)
        setAlert({ variant: 'danger', dismissible: false, message })
        setUnlockWalletFileName(undefined)
      }
    },
    [currentWallet, setAlert, startWallet, t, navigate],
  )

  const lockWallet = useCallback(
    async (lockableWalletFileName: Api.WalletFileName, { confirmed = false }) => {
      if (!currentWallet || currentWallet.walletFileName !== lockableWalletFileName) {
        setAlert({
          variant: 'warning',
          dismissible: false,
          message: currentWallet
            ? // locking another wallet while active one is still unlocked
              t('wallets.wallet_preview.alert_other_wallet_unlocked', {
                walletName: currentWallet.displayName,
              })
            : // locking without active wallet
              t('wallets.wallet_preview.alert_wallet_already_locked', {
                walletName: walletDisplayName(lockableWalletFileName),
              }),
        })
        return
      }

      const needsLockConfirmation = !confirmed && (coinjoinInProgress || makerRunning)
      if (needsLockConfirmation) {
        setShowLockConfirmModal(true)
        return
      }

      setAlert(undefined)

      try {
        const res = await Api.getWalletLock({ ...currentWallet })

        // On status OK or UNAUTHORIZED, stop the wallet and clear all local
        // information. The token might have become invalid or another one might have been
        // issued for the same wallet, etc.
        // In any case, the user has no access to the wallet anymore.
        if (res.ok || res.status === 401) {
          stopWallet()
        }

        const body = await (res.ok ? res.json() : Api.Helper.throwError(res))
        const { walletname: lockedWalletFileName, already_locked } = body

        setAlert({
          variant: already_locked ? 'warning' : 'success',
          dismissible: false,
          message: already_locked
            ? t('wallets.wallet_preview.alert_wallet_already_locked', {
                walletName: walletDisplayName(lockedWalletFileName),
              })
            : t('wallets.wallet_preview.alert_wallet_locked_successfully', {
                walletName: walletDisplayName(lockedWalletFileName),
              }),
        })
      } catch (e: any) {
        const message = e.message || t('global.errors.reason_unknown')
        setAlert({ variant: 'danger', dismissible: false, message })
      }
    },
    [currentWallet, coinjoinInProgress, makerRunning, setAlert, stopWallet, t],
  )

  useEffect(() => {
    if (!currentWallet) {
      setShowLockConfirmModal(false)
    }
  }, [currentWallet])

  const onLockConfirmed = useCallback(async () => {
    if (!currentWallet) return

    setShowLockConfirmModal(false)
    await lockWallet(currentWallet.walletFileName, { confirmed: true })
  }, [currentWallet, lockWallet])

  useEffect(() => {
    if (currentWallet && existingWallets?.wallets?.length > 1) {
      setAlert({
        variant: 'info',
        message: t('wallets.alert_wallet_open', { currentWalletName: currentWallet.displayName }),
        dismissible: false,
      })
    }

    if (existingWalletsError) {
      const message = existingWalletsError ?? t('wallets.error_loading_failed')
      setAlert({ variant: 'danger', message })
    }
  }, [currentWallet, existingWallets?.wallets?.length, existingWalletsError, t])

  return (
    <>
      <div className="wallets">
        <PageTitle
          title={t('wallets.title')}
          subtitle={existingWallets?.wallets?.length === 0 ? t('wallets.subtitle_no_wallets') : undefined}
          center={true}
        />
        {serviceInfo?.rescanning === true && (
          <rb.Alert variant="info" data-testid="alert-rescanning">
            {t('app.alert_rescan_in_progress')}
          </rb.Alert>
        )}
        {alert && <Alert {...alert} />}
        {navigation.state !== 'idle' ? (
          <div className="d-flex justify-content-center align-items-center">
            <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
            <span>{t('wallets.text_loading')}</span>
          </div>
        ) : (
          sortWallets(existingWallets?.wallets ?? [], serviceInfo?.walletFileName).map(
            (walletFileName: Api.WalletFileName, index: number) => {
              const noneActive = !serviceInfo?.walletFileName
              const isActive = serviceInfo?.walletFileName === walletFileName
              const hasToken =
                currentWallet && currentWallet.token && currentWallet.walletFileName === serviceInfo?.walletFileName

              const showLockOptions = isActive && hasToken
              const showUnlockOptions =
                (!isUnlocking || unlockingWalletFileName === walletFileName) &&
                (noneActive || (isActive && !hasToken) || (!hasToken && !makerRunning && !coinjoinInProgress))
              return (
                <Wallet
                  key={walletFileName}
                  walletFileName={walletFileName}
                  lockWallet={showLockOptions ? lockWallet : undefined}
                  unlockWallet={showUnlockOptions ? unlockWallet : undefined}
                  isActive={isActive}
                  makerRunning={makerRunning}
                  coinjoinInProgress={coinjoinInProgress}
                  className={`bg-transparent rounded-0 border-start-0 border-end-0 ${
                    index === 0 ? 'border-top-1' : 'border-top-0'
                  }`}
                />
              )
            },
          )
        )}

        <div
          className={classNames('d-flex', 'justify-content-center', 'gap-2', 'mt-4', {
            'flex-column': existingWallets?.wallets?.length === 0,
          })}
        >
          <Link
            to={routes.createWallet}
            className={classNames('btn', {
              'btn-lg': existingWallets?.wallets?.length === 0,
              'btn-dark': existingWallets?.wallets?.length === 0,
              'btn-outline-dark': !existingWallets?.wallets || existingWallets?.wallets?.length > 0,
              disabled: !existingWallets || isUnlocking,
            })}
            data-testid="new-wallet-btn"
          >
            <div className="d-flex justify-content-center align-items-center">
              <Sprite symbol="plus" width="20" height="20" className="me-2" />
              <span>{t('wallets.button_new_wallet')}</span>
            </div>
          </Link>
          {serviceInfo && isFeatureEnabled('importWallet', serviceInfo) && (
            <Link
              to={routes.importWallet}
              className={classNames('btn', 'btn-outline-dark', {
                'btn-lg': existingWallets?.wallets?.length === 0,
                disabled: !existingWallets || isUnlocking,
              })}
              data-testid="import-wallet-btn"
            >
              <div className="d-flex justify-content-center align-items-center">
                <Sprite symbol="arrow-right" width="20" height="20" className="me-2" />
                <span>{t('wallets.button_import_wallet')}</span>
              </div>
            </Link>
          )}
        </div>
      </div>

      <ConfirmModal
        isShown={showLockConfirmModal}
        title={t('wallets.wallet_preview.modal_lock_wallet_title')}
        onCancel={() => setShowLockConfirmModal(false)}
        onConfirm={onLockConfirmed}
      >
        {(makerRunning
          ? t('wallets.wallet_preview.modal_lock_wallet_maker_running_text')
          : t('wallets.wallet_preview.modal_lock_wallet_coinjoin_in_progress_text')) +
          ' ' +
          t('wallets.wallet_preview.modal_lock_wallet_alternative_action_text')}
      </ConfirmModal>
    </>
  )
}
