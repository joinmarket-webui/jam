import React, { useState, useCallback, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Formik } from 'formik'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { walletDisplayName } from '../utils'
import * as Api from '../libs/JmWalletApi'
import { EarnIndicator, JoiningIndicator } from './ActivityIndicators'
import { routes } from '../constants/routes'

function ConfirmModal({ show = false, onHide, title, body, footer }) {
  return (
    <rb.Modal show={show} onHide={onHide} keyboard={false} centered={true} animation={true}>
      <rb.Modal.Header closeButton>
        <rb.Modal.Title>{title}</rb.Modal.Title>
      </rb.Modal.Header>
      <rb.Modal.Body>{body}</rb.Modal.Body>
      <rb.Modal.Footer>{footer}</rb.Modal.Footer>
    </rb.Modal>
  )
}

function ConfirmLockModal({ show = false, body, onHide, onConfirm }) {
  const { t } = useTranslation()

  const title = t('wallets.wallet_preview.modal_lock_wallet_title')
  const footer = (
    <>
      <rb.Button variant="outline-dark" onClick={onHide}>
        {t('wallets.wallet_preview.modal_lock_wallet_button_cancel')}
      </rb.Button>
      <rb.Button variant="dark" onClick={onConfirm}>
        {t('wallets.wallet_preview.modal_lock_wallet_button_confirm')}
      </rb.Button>
    </>
  )
  return <ConfirmModal show={show} onHide={onHide} title={title} body={body} footer={footer} />
}

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
  const [confirmLockBody, setConfirmLockBody] = useState(<></>)

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
        navigate('/wallet')
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
        // in theory this might never happen. buttons triggering this action should only be rendered for the active wallet.
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
    const serviceRunningInfoText =
      (makerRunning && t('wallets.wallet_preview.modal_lock_wallet_maker_running_text')) ||
      (coinjoinInProgress && t('wallets.wallet_preview.modal_lock_wallet_coinjoin_in_progress_text'))

    setConfirmLockBody(
      <>
        {serviceRunningInfoText}
        {serviceRunningInfoText ? ' ' : ''}
        {t('wallets.wallet_preview.modal_lock_wallet_alternative_action_text')}
      </>
    )
  }, [makerRunning, coinjoinInProgress, t])

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
      <ConfirmLockModal
        show={showLockConfirmModal}
        body={confirmLockBody}
        onConfirm={onLockConfirmed}
        onHide={() => {
          setShowLockConfirmModal(false)
        }}
      />
      <rb.Card {...props}>
        <rb.Card.Body>
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <div className="py-1">
              <rb.Card.Title>
                {isActive ? (
                  <span style={{ position: 'relative' }}>
                    <Link className="wallet-name" to={routes.wallet}>
                      {walletDisplayName(name)}
                    </Link>
                    {makerRunning && <EarnIndicator isOn={true} />}
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
            <div>
              {showLockOptions ? (
                <WalletLockForm walletName={name} lockWallet={lockWallet} />
              ) : (
                showUnlockOptions && <WalletUnlockForm walletName={name} unlockWallet={unlockWallet} />
              )}
            </div>
          </div>
        </rb.Card.Body>
      </rb.Card>
    </>
  )
}
