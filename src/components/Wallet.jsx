import React, { useState, useCallback, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Formik } from 'formik'
import * as rb from 'react-bootstrap'
import { ConfirmModal } from './Modal'
import { useTranslation } from 'react-i18next'
import { walletDisplayName } from '../utils'
import * as Api from '../libs/JmWalletApi'
import { TabActivityIndicator, JoiningIndicator } from './ActivityIndicators'
import { routes } from '../constants/routes'
import styles from './Wallet.module.css'

const WalletLockForm = ({ walletName, lockWallet }) => {
  const { t } = useTranslation()

  const onSubmit = useCallback(async () => {
    await lockWallet(walletName, { confirmed: false })
  }, [walletName, lockWallet])

  return (
    <Formik initialValues={{}} validate={() => ({})} onSubmit={onSubmit}>
      {({ handleSubmit, isSubmitting }) => (
        <rb.Form onSubmit={handleSubmit} noValidate>
          <Link className="btn btn-outline-dark me-2" to={routes.wallet}>
            {t('wallets.wallet_preview.button_open')}
          </Link>
          <rb.Button variant="outline-dark" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <div className="d-flex justify-content-center align-items-center">
                <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                {t('wallets.wallet_preview.button_locking')}
              </div>
            ) : (
              t('wallets.wallet_preview.button_lock')
            )}
          </rb.Button>
        </rb.Form>
      )}
    </Formik>
  )
}

const WalletUnlockForm = ({ walletName, unlockWallet }) => {
  const { t } = useTranslation()

  const initialValues = {
    password: '',
  }
  const validate = (values) => {
    const errors = {}
    if (!values.password) {
      errors.password = t('wallets.wallet_preview.feedback_missing_password')
    }
    return errors
  }

  const onSubmit = useCallback(
    async (values) => {
      const { password } = values
      await unlockWallet(walletName, password)
    },
    [walletName, unlockWallet]
  )

  return (
    <Formik initialValues={initialValues} validate={validate} onSubmit={onSubmit} validateOnBlur={false}>
      {({ handleSubmit, handleChange, handleBlur, values, touched, errors, isSubmitting }) => (
        <rb.Form onSubmit={handleSubmit} noValidate>
          <rb.InputGroup hasValidation={true}>
            <rb.Form.Control
              name="password"
              type="password"
              placeholder={t('wallets.wallet_preview.placeholder_password')}
              disabled={isSubmitting}
              onChange={handleChange}
              onBlur={handleBlur}
              value={values.password}
              isInvalid={touched.password && errors.password}
            />
            <rb.Button variant="outline-dark" className="py-1 px-3" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="d-flex justify-content-center align-items-center">
                  <rb.Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  {t('wallets.wallet_preview.button_unlocking')}
                </div>
              ) : (
                t('wallets.wallet_preview.button_unlock')
              )}
            </rb.Button>
            <rb.Form.Control.Feedback type="invalid">{errors.password}</rb.Form.Control.Feedback>
          </rb.InputGroup>
        </rb.Form>
      )}
    </Formik>
  )
}

export default function Wallet({
  name,
  noneActive,
  isActive,
  hasToken,
  makerRunning,
  coinjoinInProgress,
  currentWallet,
  startWallet,
  stopWallet,
  setAlert,
  ...props
}) {
  const { t } = useTranslation()
  const [showLockConfirmModal, setShowLockConfirmModal] = useState(false)

  const navigate = useNavigate()

  const unlockWallet = useCallback(
    async (walletName, password) => {
      if (currentWallet) {
        setAlert({
          variant: 'warning',
          dismissible: false,
          message:
            currentWallet.name === name
              ? // unlocking same wallet
                t('wallets.wallet_preview.alert_wallet_already_unlocked', { walletName: walletDisplayName(name) })
              : // unlocking another wallet while one is already unlocked
                t('wallets.wallet_preview.alert_other_wallet_unlocked', { walletName: walletDisplayName(name) }),
        })
        return
      }

      setAlert(null)
      try {
        const res = await Api.postWalletUnlock({ walletName }, { password })
        const body = await (res.ok ? res.json() : Api.Helper.throwError(res))

        const { walletname: unlockedWalletName, token } = body
        startWallet(unlockedWalletName, token)
        navigate(routes.wallet)
      } catch (e) {
        const message = e.message.replace('Wallet', walletName)
        setAlert({ variant: 'danger', dismissible: false, message })
      }
    },
    [currentWallet, name, setAlert, startWallet, t, navigate]
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

  const showLockOptions = isActive && hasToken
  const showUnlockOptions = noneActive || (isActive && !hasToken) || (!hasToken && !makerRunning && !coinjoinInProgress)

  return (
    <>
      <ConfirmModal
        isShown={showLockConfirmModal}
        title={t('wallets.wallet_preview.modal_lock_wallet_title')}
        body={
          (makerRunning
            ? t('wallets.wallet_preview.modal_lock_wallet_maker_running_text')
            : t('wallets.wallet_preview.modal_lock_wallet_coinjoin_in_progress_text')) +
          ' ' +
          t('wallets.wallet_preview.modal_lock_wallet_alternative_action_text')
        }
        onCancel={() => setShowLockConfirmModal(false)}
        onConfirm={onLockConfirmed}
      />
      <rb.Card {...props}>
        <rb.Card.Body>
          <div className="w-100 d-flex justify-content-between align-items-center flex-wrap py-1">
            <div>
              <rb.Card.Title>
                {isActive ? (
                  <span style={{ position: 'relative' }}>
                    <Link className="wallet-name" to={routes.wallet}>
                      {walletDisplayName(name)}
                    </Link>
                    {makerRunning && <TabActivityIndicator isOn={true} />}
                    {coinjoinInProgress && <JoiningIndicator isOn={true} className="text-success" />}
                  </span>
                ) : (
                  <>{walletDisplayName(name)}</>
                )}
              </rb.Card.Title>

              {isActive ? (
                <span className="text-success">{t('wallets.wallet_preview.wallet_active')}</span>
              ) : (
                <span className="text-muted">{t('wallets.wallet_preview.wallet_inactive')}</span>
              )}
            </div>

            {showLockOptions ? (
              <WalletLockForm walletName={name} lockWallet={lockWallet} />
            ) : (
              <div className={`w-100 mt-3 mt-md-0 ${styles['wallet-password-input']}`}>
                {showUnlockOptions && <WalletUnlockForm walletName={name} unlockWallet={unlockWallet} />}
              </div>
            )}
          </div>
        </rb.Card.Body>
      </rb.Card>
    </>
  )
}
