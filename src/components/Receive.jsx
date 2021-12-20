import React from 'react'
import { useState, useEffect } from 'react'
import { BitcoinQR } from '@ibunker/bitcoin-react'
import { useLocation } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { ACCOUNTS } from '../utils'

const Receive = ({ currentWallet }) => {
  const location = useLocation()
  const [validated, setValidated] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState(0)
  const [account, setAccount] = useState(location.state?.account || 0)
  const [addressCount, setAddressCount] = useState(0)

  useEffect(() => {
    const abortCtrl = new AbortController()
    const fetchAddress = async accountNr => {
      const { name, token } = currentWallet
      const opts = {
        headers: {  'Authorization': `Bearer ${token}` },
        signal: abortCtrl.signal
      }

      setAlert(null)
      setIsLoading(true)
      fetch(`/api/v1/wallet/${name}/address/new/${accountNr}`, opts)
        .then(res => res.ok ? res.json() : Promise.reject(new Error(res.message || 'Loading new address failed.')))
        .then(data => setAddress(data.address))
        .catch(err => {
          if (!abortCtrl.signal.aborted) {
            setAlert({ variant: 'danger', message: err.message })
          }
        })
        .finally(() => setIsLoading(false))

    }
    if (ACCOUNTS.includes(account)) fetchAddress(account)

    return () => abortCtrl.abort()
  }, [account, currentWallet, addressCount])

  const onSubmit = e => {
    e.preventDefault()

    const form = e.currentTarget
    const isValid = form.checkValidity()
    setValidated(true)

    if (isValid) {
      setAddressCount(addressCount + 1)
    }
  }

  return (
    <rb.Form onSubmit={onSubmit} validated={validated} noValidate>
      <h1>Receive Funds</h1>
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      {address && (
        <div className="qr-container">
          <BitcoinQR
            bitcoinAddress={address}
            amount={amount}
            title={address}
          />
        </div>
      )}
      <rb.Form.Group className="mb-3" controlId="account">
        <rb.Form.Label>Account</rb.Form.Label>
        <rb.Form.Control name="account" type="number" value={account} min={ACCOUNTS[0]} max={ACCOUNTS[4]} onChange={e => setAccount(parseInt(e.target.value, 10))} style={{ width: '7ch' }} required />
        <rb.Form.Control.Feedback type="invalid">Please provide an account between {ACCOUNTS[0]} and {ACCOUNTS[4]}.</rb.Form.Control.Feedback>
      </rb.Form.Group>
      <rb.Form.Group className="mb-3" controlId="amountSats">
        <rb.Form.Label>Amount in Sats</rb.Form.Label>
        <rb.Form.Control name="amount" type="number" value={amount} min={0} onChange={e => setAmount(e.target.value)} style={{ width: '21ch' }} />
        <rb.Form.Control.Feedback type="invalid">Please provide a receiving address.</rb.Form.Control.Feedback>
      </rb.Form.Group>
      <rb.Form.Group className="mb-3" controlId="address">
        <rb.Form.Label>Address</rb.Form.Label>
        <rb.Form.Control name="address" value={address} readOnly={true} required style={{ maxWidth: '50ch' }} />
        <rb.Form.Control.Feedback type="invalid">Please provide a receiving address.</rb.Form.Control.Feedback>
      </rb.Form.Group>
      <rb.Button variant="dark" type="submit" disabled={isLoading}>
        {isLoading
          ? <div>
            <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
            Getting new address
          </div>
          : 'Get new address'}
      </rb.Button>
    </rb.Form>
  )
}

export default Receive
