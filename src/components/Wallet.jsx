import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGlobal } from 'reactn'
import * as rb from 'react-bootstrap'
import { setSession, clearSession } from '../session'
import { serialize } from '../utils'

export default function Wallet({ name, currentWallet, activeWallet, setAlert }) {
  const [, setCurrentWallet] = useGlobal('currentWallet')
  const [, setActiveWallet] = useGlobal('activeWallet')
  const [validated, setValidated] = useState(false)
  const [isLocking, setIsLocking] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)

  const unlockWallet = async (walletName, password) => {
    if (currentWallet) {
      setAlert({
        variant: 'warning',
        message: currentWallet.name === walletName
          // unlocking same wallet
          ? `${walletName} is already unlocked.`
          // unlocking another wallet while one is already unlocked
          : `${currentWallet.name} is currently in use, please lock it first.`
      })
    } else {
      setAlert(null)
      setIsUnlocking(true)
      try {
        const res = await fetch(`/api/v1/wallet/${walletName}/unlock`, {
          method: 'POST',
          headers: { 'Content-type': 'application/json' },
          body: JSON.stringify({ password }),
        })
        if (res.ok) {
          const { walletname: name, token } = await res.json()
          setSession(name, token)
          setCurrentWallet({ name, token })
        } else {
          const { message } = await res.json()
          setAlert({ variant: 'danger', message: message.replace('Wallet', walletName) })
        }
      } catch (e) {
        setAlert({ variant: 'danger', message: e.message })
      } finally {
        setIsUnlocking(false)
      }
    }
  }

  const lockWallet = async (name) => {
    if (currentWallet && currentWallet.name !== name) {
      setAlert({ variant: 'warning', message: `${name} is not unlocked.` })
    }

    try {
      setAlert(null)
      setIsLocking(true)
      const res = await fetch(`/api/v1/wallet/${currentWallet.name}/lock`, {
        headers: {
          'Authorization': `Bearer ${currentWallet.token}`
        }
      })
      if (res.ok) {
        const { walletname, already_locked } = await res.json()
        clearSession()
        setActiveWallet(null)
        setCurrentWallet(null)
        setAlert({
          variant: already_locked ? 'warning' : 'success',
          message: `${walletname} ${already_locked ? 'already locked' : 'locked succesfully'}.`,
          dismissible: true
        })
      } else {
        const { message } = await res.json()
        setAlert({ variant: 'danger', message })
      }
    } catch (e) {
      setAlert({ variant: 'danger', message: e.message })
    } finally {
      setIsLocking(false)
    }
  }

  const onSubmit = e => {
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
          lockWallet(name)
          break
        default:
          break
      }
      setValidated(false)
    }
  }

  const isActive = activeWallet === name
  const hasToken = currentWallet?.token
  const noneActive = !activeWallet

  return (
    <rb.Card style={{ maxWidth: '24em' }} className="mt-3">
      <rb.Card.Body>
        <rb.Form onSubmit={onSubmit} validated={validated} noValidate>
          <rb.Card.Title className={!isActive && !noneActive && "mb-0"}>{name}</rb.Card.Title>
          {isActive
            ? (hasToken
                ? <>
                    <Link className="btn btn-primary me-2" to="/wallets/current">Open</Link>
                    <rb.FormControl type="hidden" name="action" value="lock" />
                    <rb.Button variant="secondary" type="submit" disabled={isLocking}>
                      {isLocking
                      ? <>
                          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                          Locking
                        </>
                      : 'Lock'}
                    </rb.Button>
                  </>
                : <rb.Alert variant="warning" className="mb-0">
                    This wallet is active, but there is no token to interact with it.
                    Please remove the lock file on the server.
                  </rb.Alert>
              )
            : (noneActive &&
                <rb.InputGroup>
                  <rb.FormControl type="password" placeholder="Password" name="password" disabled={isUnlocking} required />
                  <rb.FormControl type="hidden" name="action" value="unlock" />
                  <rb.Button variant="primary" type="submit" disabled={isUnlocking}>
                    {isUnlocking
                      ? <>
                          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                          Unlocking
                        </>
                      : 'Unlock'}
                    </rb.Button>
                  <rb.Form.Control.Feedback type="invalid">Please set the wallet's password.</rb.Form.Control.Feedback>
                </rb.InputGroup>)
          }
        </rb.Form>
      </rb.Card.Body>
    </rb.Card>
  )
}
