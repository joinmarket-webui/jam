import React, { useEffect } from 'react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import PageTitle from './PageTitle'
import { useCurrentWalletInfo, useSetCurrentWalletInfo, useCurrentWallet } from '../context/WalletContext'
import { serialize, ACCOUNTS } from '../utils'

const CollaboratorsSelector = () => {
  const [numCollaborators, setNumCollaborators] = useState(6) // Todo: Sane default
  const [usesCustomNumCollaborators, setUsesCustomNumCollaborators] = useState(false)

  return (
    <rb.Form.Group controlId="collaborators">
      <rb.Form.Label className="mb-0">Choose a number of collaborators {numCollaborators}</rb.Form.Label>
      <div className="mb-2">
        <rb.Form.Text className="text-secondary">
          A higher number is better for privacy, but also increases the fee.
        </rb.Form.Text>
      </div>
      <div className="d-flex flex-row flex-wrap" style={{ gap: '0.5rem' }}>
        {[3, 5, 6, 9].map((number, index) => {
          return (
            <rb.Button
              key={index}
              variant="white"
              className={`py-2 px-2 border rounded text-center${
                !usesCustomNumCollaborators && numCollaborators === number && ' border-dark border-2'
              }`}
              style={{ width: '6rem' }}
              onClick={() => {
                setUsesCustomNumCollaborators(false)
                setNumCollaborators(number)
              }}
            >
              {number}
            </rb.Button>
          )
        })}
        <rb.Form.Control
          name="collaborators"
          type="number"
          min={1}
          placeholder="Other"
          className={`py-2 px-2 border rounded text-center${usesCustomNumCollaborators && ' border-dark border-2'}`}
          style={{ width: '6rem' }}
          onChange={(e) => {
            setUsesCustomNumCollaborators(true)
            setNumCollaborators(e.target.value)
          }}
          onClick={(e) => {
            setUsesCustomNumCollaborators(true)
            setNumCollaborators(e.target.value)
          }}
        />
      </div>
      <rb.Form.Control.Feedback type="invalid">Please set the counterparties.</rb.Form.Control.Feedback>
    </rb.Form.Group>
  )
}

export default function Payment({ currentWallet }) {
  const wallet = useCurrentWallet()
  const walletInfo = useCurrentWalletInfo()
  const setWalletInfo = useSetCurrentWalletInfo()

  const location = useLocation()
  const [validated, setValidated] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [isCoinjoin, setIsCoinjoin] = useState(false)
  const [account, setAccount] = useState(parseInt(location.state?.account, 10) || 0)

  useEffect(() => {
    if (walletInfo) {
      return
    }

    const abortCtrl = new AbortController()
    const { name, token } = wallet
    const opts = {
      headers: { Authorization: `Bearer ${token}` },
      signal: abortCtrl.signal,
    }

    setAlert(null)

    fetch(`/api/v1/wallet/${name}/display`, opts)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.message || 'Loading wallet failed.'))))
      .then((data) => setWalletInfo(data.walletinfo))
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })

    return () => abortCtrl.abort()
  }, [wallet, setWalletInfo, walletInfo])

  const sendPayment = async (account, destination, amount_sats) => {
    const { name, token } = currentWallet
    const opts = {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        mixdepth: String(account),
        destination,
        amount_sats,
      }),
    }

    setAlert(null)
    setIsSending(true)
    let success = false
    try {
      const res = await fetch(`/api/v1/wallet/${name}/taker/direct-send`, opts)
      if (res.ok) {
        const {
          txinfo: { outputs },
        } = await res.json()
        const output = outputs.find((o) => o.address === destination)
        setAlert({
          variant: 'success',
          message: `Payment successful: Sent ${output.value_sats} sats to ${output.address}.`,
        })
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
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        mixdepth: String(account),
        destination,
        amount_sats,
        counterparties,
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

  const onSubmit = async (e) => {
    e.preventDefault()

    const form = e.currentTarget
    const isValid = form.checkValidity()
    setValidated(true)

    if (isValid) {
      const { amount, counterparties, destination } = serialize(form)
      const success = isCoinjoin
        ? await startCoinjoin(account, destination, amount, counterparties)
        : await sendPayment(account, destination, amount)

      if (success) {
        form.reset()
        setIsCoinjoin(false)
        setValidated(false)
      }
    }
  }

  return (
    <>
      {!walletInfo ? (
        <rb.Row className="justify-content-center">
          <rb.Col className="flex-grow-0">
            <div className="d-flex justify-content-center align-items-center">
              <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              Loading
            </div>
          </rb.Col>
        </rb.Row>
      ) : (
        <rb.Row className="justify-content-center">
          <rb.Col md={10} lg={8} xl={6}>
            <PageTitle
              title="Send bitcoin"
              subtitle="Any bitcoin you send to an external address will first be mixed for best privacy." // Todo: This is not correct so it needs a different copy but we could (should) aim to make this the default.
            />
            {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
            <rb.Form onSubmit={onSubmit} validated={validated} noValidate>
              <rb.Form.Group className="mb-4" controlId="destination">
                <rb.Form.Label>Recipient</rb.Form.Label>
                <rb.Form.Control
                  name="destination"
                  placeholder="Enter address..."
                  defaultValue=""
                  className="number"
                  required
                  style={{ height: '3.5rem' }}
                />
                <rb.Form.Control.Feedback type="invalid">Please provide a recipient address.</rb.Form.Control.Feedback>
              </rb.Form.Group>
              <rb.Form.Group className="mb-4 flex-grow-1" controlId="account">
                <rb.Form.Label>Choose account</rb.Form.Label>
                <rb.Form.Select
                  defaultValue={account}
                  onChange={(e) => setAccount(parseInt(e.target.value, 10))}
                  required
                  className="number"
                  style={{ height: '3.5rem' }}
                >
                  {walletInfo.accounts
                    .sort((lhs, rhs) => lhs.account - rhs.account)
                    .map(({ account, account_balance: balance }) => (
                      <option key={account} value={account}>
                        Account {account} ({balance})
                      </option>
                    ))}
                </rb.Form.Select>
              </rb.Form.Group>
              <rb.Form.Group className="mb-4" controlId="amount">
                <rb.Form.Label>Amount in sats</rb.Form.Label>
                <rb.Form.Control
                  name="amount"
                  type="number"
                  className="number"
                  min={1}
                  defaultValue={0}
                  required
                  style={{ height: '3.5rem' }}
                />
                <rb.Form.Control.Feedback type="invalid">Please provide a valid amount.</rb.Form.Control.Feedback>
              </rb.Form.Group>
            </rb.Form>
            <rb.Form.Group controlId="isCoinjoin">
              <rb.Form.Check
                type="switch"
                label="Send as CoinJoin for improved privacy"
                value={true}
                className="mb-4"
                onChange={(e) => setIsCoinjoin(e.target.checked)}
              />
            </rb.Form.Group>
            {isCoinjoin && <CollaboratorsSelector />}
            <rb.Button
              variant="dark"
              type="submit"
              disabled={isSending}
              className="mt-4"
              style={{ height: '3rem', width: '100%' }}
            >
              {isSending ? (
                <div>
                  <rb.Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Sending
                </div>
              ) : (
                'Send'
              )}
            </rb.Button>
          </rb.Col>
        </rb.Row>
      )}
    </>
  )

  return (
    <rb.Form onSubmit={onSubmit} validated={validated} noValidate>
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      <rb.Form.Group className="mb-3" controlId="destination">
        <rb.Form.Label>Receiver Address</rb.Form.Label>
        <rb.Form.Control name="destination" defaultValue="" required style={{ maxWidth: '50ch' }} />
        <rb.Form.Control.Feedback type="invalid">Please provide a receiving address.</rb.Form.Control.Feedback>
      </rb.Form.Group>
      <rb.Form.Group className="mb-3" controlId="account">
        <rb.Form.Label>Account</rb.Form.Label>
        <rb.Form.Select
          defaultValue={account}
          onChange={(e) => setAccount(parseInt(e.target.value, 10))}
          style={{ maxWidth: '21ch' }}
          required
        >
          {ACCOUNTS.map((val) => (
            <option key={val} value={val}>
              Account {val}
            </option>
          ))}
        </rb.Form.Select>
      </rb.Form.Group>
      <rb.Form.Group className="mb-3" controlId="amount">
        <rb.Form.Label>Amount in Sats</rb.Form.Label>
        <rb.Form.Control name="amount" type="number" min={1} defaultValue={0} required style={{ maxWidth: '21ch' }} />
        <rb.Form.Control.Feedback type="invalid">Please provide a valid amount.</rb.Form.Control.Feedback>
      </rb.Form.Group>
      <rb.Form.Group className="mb-3" controlId="isCoinjoin">
        <rb.Form.Check
          type="switch"
          label="As coinjoin"
          value={true}
          onChange={(e) => setIsCoinjoin(e.target.checked)}
        />
      </rb.Form.Group>
      {isCoinjoin === true && (
        <rb.Form.Group className="mb-3" controlId="counterparties">
          <rb.Form.Label>Number of counterparties</rb.Form.Label>
          <rb.Form.Control
            name="counterparties"
            type="number"
            min={0}
            defaultValue={3}
            style={{ width: '10ch' }}
            required
          />
          <rb.Form.Control.Feedback type="invalid">Please set the counterparties.</rb.Form.Control.Feedback>
        </rb.Form.Group>
      )}
      <rb.Button variant="dark" type="submit" disabled={isSending}>
        {isSending ? (
          <div>
            <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
            Sending
          </div>
        ) : (
          'Send'
        )}
      </rb.Button>
    </rb.Form>
  )
}
