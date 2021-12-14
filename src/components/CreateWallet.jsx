import React, { useState } from 'react'
import * as rb from 'react-bootstrap'
import { serialize } from '../utils'

export default function CreateWallet({ currentWallet, startWallet }) {
  const [validated, setValidated] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createdWallet, setCreatedWallet] = useState(null)

  const createWallet = async (name, password) => {
    const walletname = name.endsWith('.jmdat') ? name : `${name}.jmdat`
    setAlert(null)
    setIsCreating(true)
    try {
      const wallettype = 'sw-fb'
      const res = await fetch(`/api/v1/wallet/create`, {
        method: 'POST',
        body: JSON.stringify({
          password,
          walletname,
          wallettype
        }),
      })

      if (res.ok) {
        const { seedphrase, token, walletname: createdWallet } = await res.json()
        setAlert({ variant: 'success', seedphrase, password })
        setCreatedWallet(createdWallet)
        startWallet(createdWallet, token)
      } else {
        const { message } = await res.json()
        setAlert({ variant: 'danger', message })
      }
    } catch (e) {
      setAlert({ variant: 'danger', message: e.message })
    } finally {
      setIsCreating(false)
    }
  }

  const onSubmit = e => {
    e.preventDefault()

    const form = e.currentTarget
    const isValid = form.checkValidity()
    setValidated(true)

    if (isValid) {
      const { wallet, password } = serialize(form)
      createWallet(wallet, password)
    }
  }

  const isCreated = currentWallet && currentWallet.name === createdWallet
  const canCreate = !currentWallet && !isCreated

  if (isCreated && alert?.seedphrase) {
    return (
      <rb.Alert variant="success">
        <rb.Alert.Heading>Wallet created succesfully!</rb.Alert.Heading>
        <p className="d-flex align-items-center my-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="me-3" viewBox="0 0 16 16">
            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
          </svg>
          <span>Please write down your seed phrase and password!<br />Without this information you will not be able to access and recover your wallet!</span>
        </p>
        <p>Seed phrase: <strong>{alert.seedphrase}</strong></p>
        <p className="mb-0">Password: <strong>{alert.password}</strong></p>
      </rb.Alert>
    )
  } else {
    return canCreate
      ? <rb.Form onSubmit={onSubmit} validated={validated} noValidate>
        <h1>Create Wallet</h1>
        {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
        <rb.Form.Group className="mb-3" controlId="walletName">
          <rb.Form.Label>Wallet Name</rb.Form.Label>
          <rb.Form.Control name="wallet" style={{ maxWidth: '20em' }} required />
          <rb.Form.Control.Feedback type="invalid">Please set a wallet name.</rb.Form.Control.Feedback>
        </rb.Form.Group>
        <rb.Form.Group className="mb-3" controlId="password">
          <rb.Form.Label>Passphrase</rb.Form.Label>
          <rb.Form.Control name="password" type="password" style={{ maxWidth: '20em' }} required />
          <rb.Form.Control.Feedback type="invalid">Please set a passphrase.</rb.Form.Control.Feedback>
        </rb.Form.Group>
        <rb.Button variant="primary" type="submit" disabled={isCreating}>
          {isCreating
            ? <div>
              <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              Creating
            </div>
            : 'Create'}
        </rb.Button>
      </rb.Form>
      : <rb.Alert variant="warning">Currently {currentWallet.name} is active. You need to lock it first.</rb.Alert>
  }
}
