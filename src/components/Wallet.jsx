import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { serialize, walletDisplayName } from '../utils'
import * as Api from '../libs/JmWalletApi'
import { EarnIndicator, JoiningIndicator } from './ActivityIndicators'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import InputGroup from 'react-bootstrap/InputGroup'
import FormControl from 'react-bootstrap/FormControl'
import Form from 'react-bootstrap/Form'
import Spinner from 'react-bootstrap/Spinner'
import Card from 'react-bootstrap/Card'

function ConfirmModal({ show = false, onHide, title, body, footer }) {
  return (
    <Modal show={show} onHide={onHide} keyboard={false} centered={true} animation={true}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{body}</Modal.Body>
      <Modal.Footer>{footer}</Modal.Footer>
    </Modal>
  )
}

function ConfirmLockModal({ show = false, body, onHide, onConfirm }) {
  const { t } = useTranslation()

  const title = t('wallets.wallet_preview.modal_lock_wallet_title')
  const footer = (
    <>
      <Button variant="outline-dark" onClick={onHide}>
        {t('wallets.wallet_preview.modal_lock_wallet_button_cancel')}
      </Button>
      <Button variant="dark" onClick={onConfirm}>
        {t('wallets.wallet_preview.modal_lock_wallet_button_confirm')}
      </Button>
    </>
  )
  return <ConfirmModal show={show} onHide={onHide} title={title} body={body} footer={footer} />
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
  const [validated, setValidated] = useState(false)
  const [isLocking, setIsLocking] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [showLockConfirmModal, setShowLockConfirmModal] = useState(false)

  const navigate = useNavigate()

  const unlockWallet = async (walletName, password) => {
    setAlert(null)
    setIsUnlocking(true)
    try {
      const res = await Api.postWalletUnlock({ walletName }, { password })
      const body = await res.json()

      setIsUnlocking(false)

      if (res.ok) {
        const { walletname: unlockedWalletName, token } = body
        startWallet(unlockedWalletName, token)
        navigate('/wallet')
      } else {
        setAlert({
          variant: 'danger',
          message: body.message.replace('Wallet', walletName),
        })
      }
    } catch (e) {
      setIsUnlocking(false)
      setAlert({ variant: 'danger', message: e.message })
    }
  }

  const lockWallet = async () => {
    try {
      const { name: walletName, token } = currentWallet
      setAlert(null)
      setIsLocking(true)

      const res = await Api.getWalletLock({ walletName, token })
      const body = await res.json()

      setIsLocking(false)

      // On status OK or UNAUTHORIZED, stop the wallet and clear all local
      // information. The token might have become invalid or another one might have been
      // issued for the same wallet, etc.
      // In any case, the user has no access to the wallet anymore.
      if (res.ok || res.status === 401) {
        stopWallet()
      }

      if (res.ok) {
        const { walletname: lockedWalletName, already_locked } = body

        setAlert({
          variant: already_locked ? 'warning' : 'success',
          message: already_locked
            ? t('wallets.wallet_preview.alert_wallet_already_locked', {
                walletName: walletDisplayName(lockedWalletName),
              })
            : t('wallets.wallet_preview.alert_wallet_locked_successfully', {
                walletName: walletDisplayName(lockedWalletName),
              }),
          dismissible: false,
        })
      } else {
        setAlert({ variant: 'danger', message: body.message })
      }
    } catch (e) {
      setIsLocking(false)
      setAlert({ variant: 'danger', message: e.message })
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()

    const form = e.currentTarget
    const isValid = form.checkValidity()
    setValidated(true)

    if (isValid) {
      const { action, password } = serialize(form)

      switch (action) {
        case 'unlock': {
          if (currentWallet) {
            setAlert({
              variant: 'warning',
              message:
                currentWallet.name === name
                  ? // unlocking same wallet
                    t('wallets.wallet_preview.alert_wallet_already_unlocked', { walletName: walletDisplayName(name) })
                  : // unlocking another wallet while one is already unlocked
                    t('wallets.wallet_preview.alert_other_wallet_unlocked', { walletName: walletDisplayName(name) }),
            })
          } else {
            unlockWallet(name, password)
          }
          break
        }
        case 'lock': {
          const needsLockConfirmation = coinjoinInProgress || makerRunning
          if (needsLockConfirmation) {
            setShowLockConfirmModal(true)
          } else {
            lockWallet()
          }
          break
        }
        default:
          break
      }
      setValidated(false)
    }
  }

  const showLockOptions = isActive && hasToken
  const showUnlockOptions = noneActive || (isActive && !hasToken) || (!hasToken && !makerRunning && !coinjoinInProgress)

  const confirmLockBody = (() => {
    const serviceRunningInfoText =
      (makerRunning && t('wallets.wallet_preview.modal_lock_wallet_maker_running_text')) ||
      (coinjoinInProgress && t('wallets.wallet_preview.modal_lock_wallet_coinjoin_in_progress_text'))
    return (
      <>
        {serviceRunningInfoText}
        {serviceRunningInfoText ? ' ' : ''}
        {t('wallets.wallet_preview.modal_lock_wallet_alternative_action_text')}
      </>
    )
  })()

  return (
    <>
      <ConfirmLockModal
        show={showLockConfirmModal}
        body={confirmLockBody}
        onConfirm={() => {
          setShowLockConfirmModal(false)
          lockWallet()
        }}
        onHide={() => {
          setShowLockConfirmModal(false)
        }}
      />
      <Card {...props}>
        <Card.Body>
          <Form onSubmit={onSubmit} validated={validated} noValidate>
            <div className="d-flex justify-content-between align-items-center flex-wrap">
              <div className="py-1">
                <Card.Title>
                  {isActive ? (
                    <span style={{ position: 'relative' }}>
                      <Link className="wallet-name" to="/wallet">
                        {walletDisplayName(name)}
                      </Link>
                      {makerRunning && <EarnIndicator isOn={true} />}
                      {coinjoinInProgress && <JoiningIndicator isOn={true} className="text-success" />}
                    </span>
                  ) : (
                    <>{walletDisplayName(name)}</>
                  )}
                </Card.Title>
                {isActive ? (
                  <span className="text-success">{t('wallets.wallet_preview.wallet_active')}</span>
                ) : (
                  <span className="text-muted">{t('wallets.wallet_preview.wallet_inactive')}</span>
                )}
              </div>
              <div>
                {showLockOptions ? (
                  <>
                    <Link className="btn btn-outline-dark me-2" to="/wallet">
                      {t('wallets.wallet_preview.button_open')}
                    </Link>
                    <FormControl type="hidden" name="action" value="lock" />
                    <Button variant="outline-dark" type="submit" disabled={isLocking}>
                      {isLocking ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                          />
                          {t('wallets.wallet_preview.button_locking')}
                        </>
                      ) : (
                        <>{t('wallets.wallet_preview.button_lock')}</>
                      )}
                    </Button>
                  </>
                ) : (
                  showUnlockOptions && (
                    <InputGroup hasValidation={true}>
                      <FormControl
                        type="password"
                        placeholder={t('wallets.wallet_preview.placeholder_password')}
                        name="password"
                        disabled={isUnlocking}
                        required
                      />
                      <FormControl type="hidden" name="action" value="unlock" />
                      <Button variant="outline-dark" className="py-1 px-3" type="submit" disabled={isUnlocking}>
                        {isUnlocking ? (
                          <>
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="me-2"
                            />
                            {t('wallets.wallet_preview.button_unlocking')}
                          </>
                        ) : (
                          <>{t('wallets.wallet_preview.button_unlock')}</>
                        )}
                      </Button>
                      <Form.Control.Feedback type="invalid">
                        {t('wallets.wallet_preview.feedback_missing_password')}
                      </Form.Control.Feedback>
                    </InputGroup>
                  )
                )}
              </div>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </>
  )
}
