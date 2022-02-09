import React, { useEffect } from 'react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import PageTitle from './PageTitle'
import ToggleSwitch from './ToggleSwitch'
import { useCurrentWalletInfo, useSetCurrentWalletInfo, useCurrentWallet } from '../context/WalletContext'
import { useSettings } from '../context/SettingsContext'
import { serialize } from '../utils'
import * as Api from '../libs/JmWalletApi'

const CollaboratorsSelector = ({ numCollaborators, setNumCollaborators }) => {
  const settings = useSettings()
  const [usesCustomNumCollaborators, setUsesCustomNumCollaborators] = useState(false)

  const collaboratorsSelection = [3, 5, 6, 9]

  return (
    <rb.Form.Group className="collaborators-selector">
      <rb.Form.Label className="mb-0">Choose a number of collaborators ({numCollaborators})</rb.Form.Label>
      <div className="mb-2">
        <rb.Form.Text className="text-secondary">
          A higher number is better for privacy, but also increases the fee.
        </rb.Form.Text>
      </div>
      <div className="d-flex flex-row flex-wrap">
        {collaboratorsSelection.map((number, index) => {
          return (
            <rb.Button
              key={index}
              variant={settings.theme === 'light' ? 'white' : 'dark'}
              className={`py-2 px-2 border border-1 rounded text-center${
                !usesCustomNumCollaborators && numCollaborators === number
                  ? settings.theme === 'light'
                    ? ' border-dark'
                    : ' selected-dark'
                  : ''
              }`}
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
          type="number"
          min={1}
          max={99}
          placeholder="Other"
          className={`py-2 px-2 border border-1 rounded text-center${
            usesCustomNumCollaborators ? (settings.theme === 'light' ? ' border-dark' : ' selected-dark') : ''
          }`}
          onChange={(e) => {
            setUsesCustomNumCollaborators(true)
            setNumCollaborators(e.target.value)
          }}
          onClick={(e) => {
            if (e.target.value) {
              setUsesCustomNumCollaborators(true)
              setNumCollaborators(e.target.value)
            }
          }}
        />
      </div>
      <rb.Form.Control.Feedback type="invalid">Please set the counterparties.</rb.Form.Control.Feedback>
    </rb.Form.Group>
  )
}

export default function Send({ currentWallet }) {
  const wallet = useCurrentWallet()
  const walletInfo = useCurrentWalletInfo()
  const setWalletInfo = useSetCurrentWalletInfo()
  const settings = useSettings()

  const location = useLocation()
  const [validated, setValidated] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [isCoinjoin, setIsCoinjoin] = useState(false)
  const [account, setAccount] = useState(parseInt(location.state?.account, 10) || 0)
  const [numCollaborators, setNumCollaborators] = useState(6) // Todo: Sane default

  useEffect(() => {
    // Reload wallet info if not already available.
    if (walletInfo) return

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
    const { name: walletName, token } = currentWallet

    setAlert(null)
    setIsSending(true)
    let success = false
    try {
      const res = await Api.postDirectSend({ walletName, token }, { account, destination, amount_sats })
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
    const { name: walletName, token } = currentWallet

    setAlert(null)
    setIsSending(true)
    let success = false
    try {
      const res = await Api.postCoinjoin({ walletName, token }, { account, destination, amount_sats, counterparties })
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
      const counterparties = parseInt(numCollaborators)
      const { amount, destination } = serialize(form)
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
        <rb.Row className="send justify-content-center">
          <rb.Col md={10} lg={8} xl={6}>
            <PageTitle
              title="Send bitcoin"
              subtitle="You can mix your bitcoin before sending them for better privacy." // Todo: Copy.
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
                >
                  {walletInfo.accounts
                    .sort((lhs, rhs) => lhs.account - rhs.account)
                    .map(({ account, account_balance: balance }) => (
                      <option key={account} value={account}>
                        Account {account} {settings.showBalance && `(\u20BF${balance})`}
                      </option>
                    ))}
                </rb.Form.Select>
              </rb.Form.Group>
              <rb.Form.Group className="mb-4" controlId="amount">
                <rb.Form.Label>Amount in sats</rb.Form.Label>
                <rb.Form.Control name="amount" type="number" className="number" min={1} defaultValue={0} required />
                <rb.Form.Control.Feedback type="invalid">Please provide a valid amount.</rb.Form.Control.Feedback>
              </rb.Form.Group>
              <rb.Form.Group controlId="isCoinjoin" className={`${isCoinjoin ? 'mb-3' : ''}`}>
                <ToggleSwitch
                  label="Send as CoinJoin for improved privacy"
                  onToggle={(isToggled) => setIsCoinjoin(isToggled)}
                />
              </rb.Form.Group>
              {isCoinjoin && (
                <CollaboratorsSelector numCollaborators={numCollaborators} setNumCollaborators={setNumCollaborators} />
              )}
              <rb.Button variant="dark" type="submit" disabled={isSending} className="mt-4">
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
            </rb.Form>
          </rb.Col>
        </rb.Row>
      )}
    </>
  )
}
