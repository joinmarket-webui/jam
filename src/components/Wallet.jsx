import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { serialize, walletDisplayName } from '../utils'
import * as Api from '../libs/JmWalletApi'
import ActivityIndicator from './ActivityIndicator'
import Sprite from './Sprite'

export default function Wallet({
  name,
  isActive,
  makerRunning,
  coinjoinInProcess,
  hasToken,
  currentWallet,
  startWallet,
  stopWallet,
  setAlert,
  ...props
}) {
  const [validated, setValidated] = useState(false)
  const [isLocking, setIsLocking] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const navigate = useNavigate()

  const unlockWallet = async (walletName, password) => {
    if (currentWallet) {
      setAlert({
        variant: 'warning',
        message:
          currentWallet.name === walletName
            ? // unlocking same wallet
              `${walletDisplayName(walletName)} is already unlocked.`
            : // unlocking another wallet while one is already unlocked
              `${walletDisplayName(currentWallet.name)} is currently in use, please lock it first.`,
      })
    } else {
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
          message: `${walletDisplayName(lockedWalletName)} ${
            already_locked ? 'already locked' : 'locked successfully'
          }.`,
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
        case 'unlock':
          unlockWallet(name, password)
          break
        case 'lock':
          lockWallet()
          break
        default:
          break
      }
      setValidated(false)
    }
  }

  const showLockOptions = isActive && hasToken
  const showNoTokenAlert = isActive && !hasToken

  return (
    <rb.Card {...props}>
      <rb.Card.Body>
        <rb.Form onSubmit={onSubmit} validated={validated} noValidate>
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <div className="py-1">
              <rb.Card.Title>
                {isActive ? (
                  <span style={{ position: 'relative' }}>
                    <Link className="wallet-name" to="/wallet">
                      {walletDisplayName(name)}
                    </Link>
                    {makerRunning && <ActivityIndicator isOn={true} />}
                  </span>
                ) : (
                  <>{walletDisplayName(name)}</>
                )}
              </rb.Card.Title>
              <span style={{ position: 'relative' }}>
                {isActive ? (
                  <span className="text-success">
                    {coinjoinInProcess && <Sprite symbol="joining" width="30" height="30" className="p-1" />}
                    Active
                  </span>
                ) : (
                  <span className="text-muted">Inactive</span>
                )}
              </span>
            </div>

            <div>
              {showLockOptions ? (
                <>
                  <Link className="btn btn-outline-dark me-2" to="/wallet">
                    Open
                  </Link>
                  <rb.FormControl type="hidden" name="action" value="lock" />
                  <rb.Button variant="outline-dark" type="submit" disabled={isLocking}>
                    {isLocking ? (
                      <>
                        <rb.Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Locking
                      </>
                    ) : (
                      <>Lock</>
                    )}
                  </rb.Button>
                </>
              ) : (
                <rb.InputGroup hasValidation={true}>
                  <rb.FormControl
                    type="password"
                    placeholder="Password"
                    name="password"
                    disabled={isUnlocking}
                    required
                  />
                  <rb.FormControl type="hidden" name="action" value="unlock" />
                  <rb.Button variant="outline-dark" className="py-1 px-3" type="submit" disabled={isUnlocking}>
                    {isUnlocking ? (
                      <>
                        <rb.Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Unlocking
                      </>
                    ) : (
                      <>Unlock</>
                    )}
                  </rb.Button>
                  <rb.Form.Control.Feedback type="invalid">Please set the wallet's password.</rb.Form.Control.Feedback>
                </rb.InputGroup>
              )}
            </div>
          </div>
        </rb.Form>
      </rb.Card.Body>
      {showNoTokenAlert && (
        <rb.Card.Footer>
          <rb.Alert variant="warning" className="mb-0">
            This wallet is active, but there is no token to interact with it. Please try unlocking a wallet or remove
            the lock file on the server.
          </rb.Alert>
        </rb.Card.Footer>
      )}
    </rb.Card>
  )
}
