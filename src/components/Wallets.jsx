import { useMemo, useEffect, useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as rb from 'react-bootstrap'
import classNames from 'classnames'
import Sprite from './Sprite'
import Alert from './Alert'
import Wallet from './Wallet'
import PageTitle from './PageTitle'
import { useServiceInfo, useReloadServiceInfo } from '../context/ServiceInfoContext'
import { walletDisplayName } from '../utils'
import * as Api from '../libs/JmWalletApi'
import { routes } from '../constants/routes'
import { ConfirmModal } from './Modal'
import { isFeatureEnabled } from '../constants/features'

function arrayEquals(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((val, index) => val === b[index])
}

function sortWallets(wallets, activeWalletName = null) {
  if (activeWalletName && wallets.indexOf(activeWalletName) >= 0) {
    return [activeWalletName, ...sortWallets(wallets.filter((a) => a !== activeWalletName))]
  } else {
    return [...wallets].sort((a, b) => a.localeCompare(b))
  }
}

export default function Wallets({ currentWallet, startWallet, stopWallet }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const serviceInfo = useServiceInfo()
  const reloadServiceInfo = useReloadServiceInfo()
  const [walletList, setWalletList] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [unlockingWalletName, setUnlockWalletName] = useState(undefined)
  const isUnlocking = useMemo(() => unlockingWalletName !== undefined, [unlockingWalletName])
  const [alert, setAlert] = useState(null)
  const [showLockConfirmModal, setShowLockConfirmModal] = useState(false)

  const coinjoinInProgress = useMemo(() => serviceInfo && serviceInfo.coinjoinInProgress, [serviceInfo])
  const makerRunning = useMemo(() => serviceInfo && serviceInfo.makerRunning, [serviceInfo])

  const unlockWallet = useCallback(
    async (walletName, password) => {
      if (currentWallet) {
        setAlert({
          variant: 'warning',
          dismissible: false,
          message:
            currentWallet.name === walletName
              ? // unlocking same wallet
                t('wallets.wallet_preview.alert_wallet_already_unlocked', { walletName: walletDisplayName(walletName) })
              : // unlocking another wallet while one is already unlocked
                t('wallets.wallet_preview.alert_other_wallet_unlocked', { walletName: walletDisplayName(walletName) }),
        })
        return
      }

      setAlert(null)
      setUnlockWalletName(walletName)
      try {
        const res = await Api.postWalletUnlock({ walletName }, { password })
        const body = await (res.ok ? res.json() : Api.Helper.throwError(res))

        setUnlockWalletName(undefined)

        const { walletname: unlockedWalletName, token } = body
        startWallet(unlockedWalletName, token)
        navigate(routes.wallet)
      } catch (e) {
        const message = e.message.replace('Wallet', walletName)
        setAlert({ variant: 'danger', dismissible: false, message })
        setUnlockWalletName(undefined)
      }
    },
    [currentWallet, setAlert, startWallet, t, navigate]
  )

  const lockWallet = useCallback(
    async (lockableWalletName, { confirmed = false }) => {
      if (!currentWallet || currentWallet.name !== lockableWalletName) {
        setAlert({
          variant: 'warning',
          dismissible: false,
          message: currentWallet
            ? // locking another wallet while active one is still unlocked
              t('wallets.wallet_preview.alert_other_wallet_unlocked', {
                walletName: walletDisplayName(currentWallet.name),
              })
            : // locking without active wallet
              t('wallets.wallet_preview.alert_wallet_already_locked', {
                walletName: walletDisplayName(lockableWalletName),
              }),
        })
        return
      }

      const needsLockConfirmation = !confirmed && (coinjoinInProgress || makerRunning)
      if (needsLockConfirmation) {
        setShowLockConfirmModal(true)
        return
      }

      setAlert(null)

      try {
        const { name: walletName, token } = currentWallet

        const res = await Api.getWalletLock({ walletName, token })

        // On status OK or UNAUTHORIZED, stop the wallet and clear all local
        // information. The token might have become invalid or another one might have been
        // issued for the same wallet, etc.
        // In any case, the user has no access to the wallet anymore.
        if (res.ok || res.status === 401) {
          stopWallet()
        }

        const body = await (res.ok ? res.json() : Api.Helper.throwError(res))
        const { walletname: lockedWalletName, already_locked } = body

        setAlert({
          variant: already_locked ? 'warning' : 'success',
          dismissible: false,
          message: already_locked
            ? t('wallets.wallet_preview.alert_wallet_already_locked', {
                walletName: walletDisplayName(lockedWalletName),
              })
            : t('wallets.wallet_preview.alert_wallet_locked_successfully', {
                walletName: walletDisplayName(lockedWalletName),
              }),
        })
      } catch (e) {
        setAlert({ variant: 'danger', dismissible: false, message: e.message })
      }
    },
    [currentWallet, coinjoinInProgress, makerRunning, setAlert, stopWallet, t]
  )

  useEffect(() => {
    if (!currentWallet) {
      setShowLockConfirmModal(false)
    }
  }, [currentWallet])

  const onLockConfirmed = useCallback(async () => {
    if (!currentWallet) return

    setShowLockConfirmModal(false)
    await lockWallet(currentWallet.name, { confirmed: true })
  }, [currentWallet, lockWallet])

  useEffect(() => {
    if (walletList && serviceInfo) {
      const sortedWalletList = sortWallets(walletList, serviceInfo.walletName)
      if (!arrayEquals(walletList, sortedWalletList)) {
        setWalletList(sortedWalletList)
      }
    }
  }, [serviceInfo, walletList])

  useEffect(() => {
    const abortCtrl = new AbortController()

    setIsLoading(true)
    const loadingServiceInfo = reloadServiceInfo({ signal: abortCtrl.signal })

    const loadingWallets = Api.getWalletAll({ signal: abortCtrl.signal })
      .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res, t('wallets.error_loading_failed'))))
      .then((data) => sortWallets(data.wallets || [], currentWallet?.name))
      .then((sortedWalletList) => {
        if (abortCtrl.signal.aborted) return

        setWalletList(sortedWalletList)

        if (currentWallet && sortedWalletList.length > 1) {
          setAlert({
            variant: 'info',
            message: t('wallets.alert_wallet_open', { currentWalletName: walletDisplayName(currentWallet.name) }),
            dismissible: false,
          })
        }
      })

    Promise.all([loadingServiceInfo, loadingWallets])
      .catch((err) => {
        const message = err.message || t('wallets.error_loading_failed')
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message })
      })
      .finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [currentWallet, reloadServiceInfo, t])

  return (
    <>
      <div className="wallets">
        <PageTitle
          title={t('wallets.title')}
          subtitle={walletList?.length === 0 ? t('wallets.subtitle_no_wallets') : null}
          center={true}
        />
        {alert && <Alert {...alert} />}
        {isLoading ? (
          <div className="d-flex justify-content-center align-items-center">
            <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
            <span>{t('wallets.text_loading')}</span>
          </div>
        ) : (
          walletList?.map((wallet, index) => {
            const noneActive = !serviceInfo?.walletName
            const isActive = serviceInfo?.walletName === wallet
            const hasToken = currentWallet && currentWallet.token && currentWallet.name === serviceInfo?.walletName

            const showLockOptions = isActive && hasToken
            const showUnlockOptions =
              (!isUnlocking || unlockingWalletName === wallet) &&
              (noneActive || (isActive && !hasToken) || (!hasToken && !makerRunning && !coinjoinInProgress))
            return (
              <Wallet
                key={wallet}
                name={wallet}
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
          })
        )}

        {serviceInfo && (
          <div
            className={classNames('d-flex', 'justify-content-center', 'gap-2', 'mt-4', {
              'flex-column': walletList?.length === 0,
            })}
          >
            <Link
              to={routes.createWallet}
              className={classNames('btn', {
                'btn-lg': walletList?.length === 0,
                'btn-dark': walletList?.length === 0,
                'btn-outline-dark': !walletList || walletList.length > 0,
                disabled: isLoading || isUnlocking,
              })}
              data-testid="new-wallet-btn"
            >
              <div className="d-flex justify-content-center align-items-center">
                <Sprite symbol="plus" width="20" height="20" className="me-2" />
                <span>{t('wallets.button_new_wallet')}</span>
              </div>
            </Link>
            {isFeatureEnabled('importWallet', serviceInfo) && (
              <Link
                to={routes.importWallet}
                className={classNames('btn', 'btn-outline-dark', {
                  'btn-lg': walletList?.length === 0,
                  disabled: isLoading || isUnlocking,
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
        )}
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
