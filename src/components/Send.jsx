import React from 'react'
import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { serialize, ACCOUNTS, btcToSats, valueToUnit, SATS } from '../utils'

export default function Payment({ currentWallet }) {
  const location = useLocation()
  const [validated, setValidated] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [isCoinjoin, setIsCoinjoin] = useState(false)
  const [account, setAccount] = useState(parseInt(location.state?.account, 10) || 0)
  const [isLoading, setIsLoading] = useState(false)
  const [amount, setAmount] = useState(0)
  const [availableAmountsInSats, setAvailableAmountsInSats] = useState([])

  useEffect(() => {
    const abortCtrl = new AbortController()
    const { name, token } = currentWallet
    const opts = {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: abortCtrl.signal
    }

    setAlert(null)
    setIsLoading(true)
    fetch(`/api/v1/wallet/${name}/display`, opts)
      .then(res => res.ok ? res.json() : Promise.reject(new Error(res.message || 'Loading wallet failed.')))
      .then(data => setAvailableAmountsInSats(data.walletinfo.accounts.map(it => btcToSats(it.account_balance))))
      .catch(err => setAlert({ variant: 'danger', message: err.message }))
      .finally(() => setIsLoading(false))

    return () => abortCtrl.abort()
  }, [currentWallet])

  const useMax = () => {
    return () => {
      const maxAmountInSats = availableAmountsInSats[account] || 0;
      setAmount(maxAmountInSats)
    }
  }

  const sendPayment = async (account, destination, amount_sats) => {
    const { name, token } = currentWallet
    const opts = {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        mixdepth: String(account),
        destination,
        amount_sats: String(amount_sats)
      })
    }

    setAlert(null)
    setIsSending(true)
    let success = false
    try {
      const res = await fetch(`/api/v1/wallet/${name}/taker/direct-send`, opts)
      if (res.ok) {
        const { txinfo: { outputs } } = await res.json()
        const output = outputs.find(o => o.address === destination)
        setAlert({ variant: 'success', message: `Payment successful: Sent ${output.value_sats} sats to ${output.address}.` })
        success = true
      } else {
        const { message } = await res.json()
        setAlert({ variant: 'danger', message })
      }
    } catch (e) {
      setAlert({ variant: 'danger', message: e.message })
    } finally {
      setIsSending(false)
    }

    return success
  }

  const startCoinjoin = async (account, destination, amount_sats, counterparties) => {
    const { name, token } = currentWallet
    const opts = {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        mixdepth: String(account),
        destination,
        amount_sats: String(amount_sats),
        counterparties
      }),
    }

    setAlert(null)
    setIsSending(true)
    let success = false
    try {
      const res = await fetch(`/api/v1/wallet/${name}/taker/coinjoin`, opts)
      if (res.ok) {
        const data = await res.json()
        console.log(data)
        setAlert({ variant: 'success', message: 'Coinjoin started' })
        success = true
      } else {
        const { message } = await res.json()
        setAlert({ variant: 'danger', message })
      }
    } catch (e) {
      setAlert({ variant: 'danger', message: e.message })
    } finally {
      setIsSending(false)
    }

    return success
  }

  const onSubmit = async e => {
    e.preventDefault()

    const form = e.currentTarget
    const isValid = form.checkValidity()
    setValidated(true)

    if (isValid) {
      const { counterparties, destination } = serialize(form)

      // joinmarket will send the entire amount if zero is used as amount
      // (using zero manually via input field is forbidden by form validation rules)
      // if the max amount is used without this conversion, jm cannot add tx fees and the tx will fail.
      const amountOrMax = availableAmountsInSats[account] > 0 && amount === availableAmountsInSats[account] ? 0 : amount

      const success = isCoinjoin
        ? await startCoinjoin(account, destination, amountOrMax, counterparties)
        : await sendPayment(account, destination, amountOrMax)

      if (success) {
        form.reset()
        setIsCoinjoin(false)
        setValidated(false)
      }
    }
  }

  return (
    <rb.Form onSubmit={onSubmit} validated={validated} noValidate>
      <h1>Send</h1>
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      <rb.Form.Group className="mb-3" controlId="destination">
        <rb.Form.Label>Receiver Address</rb.Form.Label>
        <rb.Form.Control name="destination" defaultValue="" required style={{ maxWidth: '50ch' }} />
        <rb.Form.Control.Feedback type="invalid">Please provide a receiving address.</rb.Form.Control.Feedback>
      </rb.Form.Group>
      <rb.Form.Group className="mb-3" controlId="account">
        <rb.Form.Label>Account</rb.Form.Label>
        <rb.Form.Select defaultValue={account} onChange={e => setAccount(parseInt(e.target.value, 10))} style={{ maxWidth: '21ch' }} required>
          {ACCOUNTS.map(val => <option key={val} value={val}>Account {val}</option>)}
        </rb.Form.Select>
      </rb.Form.Group>
      <rb.Form.Group className="mb-3" controlId="amount">
        <rb.Form.Label>Amount in Sats</rb.Form.Label>
        <rb.Form.Control type="number" value={amount} onChange={e => setAmount(parseInt(e.target.value, 10))} min={1} required style={{ maxWidth: '21ch' }}/>
        <rb.Form.Control.Feedback type="invalid">Please provide a valid amount.</rb.Form.Control.Feedback>
      </rb.Form.Group>
      {isLoading &&
        <div className="mb-3">
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          Loading available amount
        </div>}
      <div className={availableAmountsInSats[account] >= 0 ? 'mb-3 small' : 'd-none'}>
        <span>{valueToUnit(availableAmountsInSats[account], SATS)} available. </span>
        <rb.Button variant="outline-dark" size="sm" onClick={useMax()} className={availableAmountsInSats[account] > 0 ? undefined : 'd-none'}>Use max</rb.Button>
      </div>
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
