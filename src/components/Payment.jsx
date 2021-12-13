import React from 'react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { serialize } from '../utils'

export default function Payment({ currentWallet }) {
  const location = useLocation()
  const [validated, setValidated] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [isCoinjoin, setIsCoinjoin] = useState(false)

  const sendPayment = async (_name, mixdepth, amount_sats, destination) => {
    const { name, token } = currentWallet
    setAlert(null)
    setIsSending(true)
    try {
      const res = await fetch(`/api/v1/wallet/${name}/taker/direct-send`, {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mixdepth,
          amount_sats,
          destination
        }),
      })
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

  const startCoinjoin = async (mixdepth, amount, counterparties, destination) => {
    const { name, token } = currentWallet
    setAlert(null)
    setIsSending(true)
    try {
      const res = await fetch(`/api/v1/wallet/${name}/taker/coinjoin`, {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mixdepth,
          amount,
          counterparties,
          destination
        }),
      })

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
      const { mixdepth, amount, counterparties, coinjoin, destination } = serialize(form)
      if (!coinjoin) {
        await sendPayment(currentWallet, mixdepth, amount, destination)
      } else {
        await startCoinjoin(mixdepth, amount, counterparties, destination)
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
        <rb.Form.Control name="destination" required />
        <rb.Form.Control.Feedback type="invalid">Please provide a receiving address.</rb.Form.Control.Feedback>
      </rb.Form.Group>
      <rb.Form.Group className="mb-3" controlId="mixdepth">
        <rb.Form.Label>Account</rb.Form.Label>
        <rb.Form.Control name="mixdepth" required value={location.state?.account} />
        <rb.Form.Control.Feedback type="invalid">Please provide an account.</rb.Form.Control.Feedback>
      </rb.Form.Group>
      <rb.Form.Group className="mb-3" controlId="amount">
        <rb.Form.Label>Amount in Sats</rb.Form.Label>
        <rb.Form.Control name="amount" type="number" min={0} />
        <rb.Form.Control.Feedback type="invalid">Please provide a receiving address.</rb.Form.Control.Feedback>
      </rb.Form.Group>
      <rb.Form.Group className="mb-3" controlId="isCoinjoin">
        <rb.Form.Check label="As coinjoin" value={true} onChange={(e) => setIsCoinjoin(e.target.checked)} />
      </rb.Form.Group>
      {isCoinjoin === true &&
        <rb.Form.Group className="mb-3" controlId="counterparties">
          <rb.Form.Label>Counterparties</rb.Form.Label>
          <rb.Form.Control name="counterparties" required />
          <rb.Form.Control.Feedback type="invalid">Please set the counterparties.</rb.Form.Control.Feedback>
        </rb.Form.Group>}
      <rb.Button variant="primary" type="submit" disabled={isSending}>
        {isSending
          ? <>
            <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
            Sending
          </>
          : 'Send'}
      </rb.Button>
    </rb.Form>
  )
}
