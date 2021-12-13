import React from 'react'
import { useState, useEffect } from 'react'
import { BitcoinQR } from '@ibunker/bitcoin-react'
import '@ibunker/bitcoin-react/dist/index.css'
import { useLocation } from 'react-router-dom'
import * as rb from 'react-bootstrap'

const ACCOUNTS = [0,1,2,3,4]

const Receive = ({ currentWallet }) => {
  const location = useLocation()
  const [validated, setValidated] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isFetching, setIsFetching] = useState(false)
  const [address, setAddress] = useState(null)
  const [amount, setAmount] = useState(0)
  const [account, setAccount] = useState(location.state?.account || 0)
  const [addressCount, setAddressCount] = useState(0)

  useEffect(() => {
    const fetchAddress = async accountNr => {
      const { name, token } = currentWallet
      setAlert(null)
      setIsFetching(true)
      try {
        const res = await fetch(`/api/v1/wallet/${name}/address/new/${accountNr}`, {
          method: 'GET',
          headers: {
            'Content-type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        })
        if (res.ok) {
          const { address } = await res.json()
          setAddress(address)
        } else {
          const { message } = await res.json()
          setAlert({ variant: 'danger', message })
        }
      } catch (e) {
        setAlert({ variant: 'danger', message: e.message })
      } finally {
        setIsFetching(false)
      }
    }

    if (ACCOUNTS.includes(account)) fetchAddress(account)
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
      <rb.Form.Group className="mb-3" controlId="account">
        <rb.Form.Label>Account</rb.Form.Label>
        <rb.Form.Control name="account" type="number" value={account} min={ACCOUNTS[0]} max={ACCOUNTS[4]} onChange={e => setAccount(parseInt(e.target.value, 10))} required />
        <rb.Form.Control.Feedback type="invalid">Please provide an account between {ACCOUNTS[0]} and {ACCOUNTS[4  ]}.</rb.Form.Control.Feedback>
      </rb.Form.Group>
      <rb.Form.Group className="mb-3" controlId="address">
        <rb.Form.Label>Address</rb.Form.Label>
        <rb.Form.Control name="address" value={address} readOnly={true} required />
        <rb.Form.Control.Feedback type="invalid">Please provide a receiving address.</rb.Form.Control.Feedback>
      </rb.Form.Group>
      <rb.Form.Group className="mb-3" controlId="amountSats">
        <rb.Form.Label>Amount in Sats</rb.Form.Label>
        <rb.Form.Control name="amount" type="number" value={amount} min={0} onChange={e => setAmount(e.target.value)} />
        <rb.Form.Control.Feedback type="invalid">Please provide a receiving address.</rb.Form.Control.Feedback>
      </rb.Form.Group>
      <rb.Button variant="primary" type="submit" disabled={isFetching}>
        {isFetching
          ? <>
            <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
            Getting new address
          </>
          : 'Get new address'}
      </rb.Button>
      {address && (
        <BitcoinQR
          bitcoinAddress={address}
          amount={amount}
        />
      )}
    </rb.Form>
  )
}

export default Receive
