import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { serialize, walletDisplayName } from '../utils'

export default function Wallet({ name, currentWallet, startWallet, stopWallet, setAlert, ...props}) {
  const [validated, setValidated] = useState(false)
  const [isLocking, setIsLocking] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const navigate = useNavigate()

  const unlockWallet = async (walletName, password) => {
    if (currentWallet) {
      setAlert({
        variant: 'warning',
        message: currentWallet.name === walletName
          // unlocking same wallet
          ? `${walletDisplayName(walletName)} is already unlocked.`
          // unlocking another wallet while one is already unlocked
          : `${walletDisplayName(currentWallet.name)} is currently in use, please lock it first.`
      })
    } else {
      setAlert(null)
      setIsUnlocking(true)
      try {
        const opts = {
          method: 'POST',
          body: JSON.stringify({ password }),
        }
        const res = await fetch(`/api/v1/wallet/${walletName}/unlock`, opts)
        if (res.ok) {
          const { walletname: name, token } = await res.json()
          startWallet(name, token)
          navigate('/wallet')
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

  const lockWallet = async name => {
    if (currentWallet && currentWallet.name !== name) {
      setAlert({ variant: 'warning', message: `${walletDisplayName(name)} is not unlocked.` })
    }

    try {
      const { name, token } = currentWallet
      const opts = {
        headers: { 'Authorization': `Bearer ${token}` }
      }

      setAlert(null)
      setIsLocking(true)
      const res = await fetch(`/api/v1/wallet/${name}/lock`, opts)
      if (res.ok) {
        const { walletname, already_locked } = await res.json()
        stopWallet()
        setAlert({
          variant: already_locked ? 'warning' : 'success',
          message: `${walletDisplayName(walletname)} ${already_locked ? 'already locked' : 'locked succesfully'}.`,
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

  const isActive = currentWallet && currentWallet.name === name
  const hasToken = currentWallet?.token
  const noneActive = !currentWallet

  return (
    <rb.Card style={{ maxWidth: '24em' }} className="mt-3" {...props}>
      <rb.Card.Body>
        <rb.Form onSubmit={onSubmit} validated={validated} noValidate>
          <rb.Card.Title className={!isActive && !noneActive && "mb-0"}>{walletDisplayName(name)}</rb.Card.Title>
          {isActive
            ? (hasToken
                ? <>
                    <Link className="btn btn-dark me-2" to="/wallet">Open</Link>
                    <rb.FormControl type="hidden" name="action" value="lock" />
                    <rb.Button variant="outline-dark" type="submit" disabled={isLocking}>
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
                <rb.InputGroup hasValidation={true}>
                  <rb.FormControl type="password" placeholder="Password" name="password" disabled={isUnlocking} required />
                  <rb.FormControl type="hidden" name="action" value="unlock" />
                  <rb.Button variant="dark" type="submit" disabled={isUnlocking}>
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
