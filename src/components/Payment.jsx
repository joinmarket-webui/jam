import React from 'react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { serialize, ACCOUNTS } from '../utils'

export default function Payment({ currentWallet }) {
  const location = useLocation()
  const [validated, setValidated] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [isCoinjoin, setIsCoinjoin] = useState(false)
  const [account, setAccount] = useState(location.state?.account || 0)

  const sendPayment = async (_name, account, amount_sats, destination) => {
    const { name, token } = currentWallet
    const opts = {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        mixdepth: account,
        amount_sats,
        destination
      })
    }

    setAlert(null)
    setIsSending(true)
    try {
      const res = await fetch(`/api/v1/wallet/${name}/taker/direct-send`, opts)
      if (res.ok) {
        const data = await res.json()
        console.log(data)
        setAlert({ variant: 'success', message: 'Payment successful' })
      } else {
        const { message } = await res.json()
        setAlert({ variant: 'danger', message })
      }
    } catch (e) {
      setAlert({ variant: 'danger', message: e.message })
    } finally {
      setIsSending(false)
    }
  }

  const startCoinjoin = async (account, amount, counterparties, destination) => {
    const { name, token } = currentWallet
    const opts = {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        mixdepth: account,
        amount,
        counterparties,
        destination
      }),
    }

    setAlert(null)
    setIsSending(true)
    try {
      const res = await fetch(`/api/v1/wallet/${name}/taker/coinjoin`, opts)

      if (res.ok) {
        const data = await res.json()
        console.log(data)
        setAlert({ variant: 'success', message: 'Coinjoin started' })
      } else {
        const { message } = await res.json()
        setAlert({ variant: 'danger', message })
      }
    } catch (e) {
      setAlert({ variant: 'danger', message: e.message })
    } finally {
      setIsSending(false)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()

    const form = e.currentTarget
    const isValid = form.checkValidity()
    setValidated(true)

    if (isValid) {
      const { account, amount, counterparties, coinjoin, destination } = serialize(form)
      if (!coinjoin) {
        await sendPayment(currentWallet, account, amount, destination)
      } else {
        await startCoinjoin(account, amount, counterparties, destination)
      }

      form.reset()
    }
  }

  return (
    <rb.Form onSubmit={onSubmit} validated={validated} noValidate>
      <h1>Send Payment</h1>
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      <rb.Form.Group className="mb-3" controlId="destination">
        <rb.Form.Label>Receiver Address</rb.Form.Label>
        <rb.Form.Control name="destination" defaultValue="" required style={{ maxWidth: '50ch' }} />
        <rb.Form.Control.Feedback type="invalid">Please provide a receiving address.</rb.Form.Control.Feedback>
      </rb.Form.Group>
      <rb.Form.Group className="mb-3" controlId="account">
        <rb.Form.Label>Account</rb.Form.Label>
        <rb.Form.Control name="account" type="number" value={account} min={ACCOUNTS[0]} max={ACCOUNTS[4]} onChange={e => setAccount(parseInt(e.target.value, 10))} style={{ width: '7ch' }} required />
        <rb.Form.Control.Feedback type="invalid">Please provide an account between {ACCOUNTS[0]} and {ACCOUNTS[4]}.</rb.Form.Control.Feedback>
      </rb.Form.Group>
      <rb.Form.Group className="mb-3" controlId="amount">
        <rb.Form.Label>Amount in Sats</rb.Form.Label>
        <rb.Form.Control name="amount" type="number" min={0} defaultValue={0} required style={{ maxWidth: '15ch' }}/>
        <rb.Form.Control.Feedback type="invalid">Please provide a receiving address.</rb.Form.Control.Feedback>
      </rb.Form.Group>
      <rb.Form.Group className="mb-3" controlId="isCoinjoin">
        <rb.Form.Check type="switch" label="As coinjoin" value={true} onChange={(e) => setIsCoinjoin(e.target.checked)} />
      </rb.Form.Group>
      {isCoinjoin === true &&
        <rb.Form.Group className="mb-3" controlId="counterparties">
          <rb.Form.Label>Number of counterparties</rb.Form.Label>
          <rb.Form.Control name="counterparties" type="number" min={0} defaultValue={3} style={{ width: '10ch' }} required />
          <rb.Form.Control.Feedback type="invalid">Please set the counterparties.</rb.Form.Control.Feedback>
        </rb.Form.Group>}
      <rb.Button variant="dark" type="submit" disabled={isSending}>
        {isSending
          ? <div>
            <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
            Sending
          </div>
          : 'Send'}
      </rb.Button>
    </rb.Form>
  )
}
