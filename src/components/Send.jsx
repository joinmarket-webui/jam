import React, { useEffect } from 'react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import PageTitle from './PageTitle'
import ToggleSwitch from './ToggleSwitch'
import { useCurrentWalletInfo, useSetCurrentWalletInfo, useCurrentWallet } from '../context/WalletContext'
import { useSettings } from '../context/SettingsContext'
import * as Api from '../libs/JmWalletApi'

// not cryptographically random
const pseudoRandomNumber = (min, max) => {
  return Math.round(Math.random() * (max - min)) + min
}

const isValidAddress = (candidate) => {
  return typeof candidate === 'string' && !(candidate === '')
}

const isValidAccount = (candidate) => {
  const parsed = parseInt(candidate, 10)
  return !isNaN(parsed) && parsed >= 0
}

const isValidAmount = (candidate) => {
  const parsed = parseInt(candidate, 10)
  return !isNaN(parsed) && parsed > 0
}

const isValidNumCollaborators = (candidate) => {
  const parsed = parseInt(candidate, 10)
  return !isNaN(parsed) && parsed >= 1 && parsed <= 99
}

const extractErrorMessage = async (response, fallbackReason = 'Unknown Error - No exact reasons are available : (') => {
  // The server will answer with a html response instead of json on certain errors.
  // The situation is mitigated by parsing the returned html till a fix is available.
  // Tracked here: https://github.com/JoinMarket-Org/joinmarket-clientserver/issues/1170 (last checked: 2022-02-11)
  const isHtmlErrorMessage = response.headers.get('content-type') === 'text/html'

  if (isHtmlErrorMessage) {
    return await response
      .text()
      .then((html) => {
        var parser = new DOMParser()
        var doc = parser.parseFromString(html, 'text/html')
        return doc.title || fallbackReason
      })
      .then((reason) => `The server reported a problem: ${reason}`)
  }

  const { message } = await response.json()
  return message || fallbackReason
}

const CollaboratorsSelector = ({ numCollaborators, setNumCollaborators }) => {
  const settings = useSettings()

  const [usesCustomNumCollaborators, setUsesCustomNumCollaborators] = useState(false)

  const validateAndSetCustomNumCollaborators = (candidate) => {
    if (isValidNumCollaborators(candidate)) {
      setNumCollaborators(candidate)
    } else {
      setNumCollaborators(null)
    }
  }

  const defaultCollaboratorsSelection = [3, 5, 6, 7, 9]

  return (
    <rb.Form noValidate className="collaborators-selector">
      <rb.Form.Group>
        <rb.Form.Label className="mb-0">Number of collaborators: {numCollaborators}</rb.Form.Label>
        <div className="mb-2">
          <rb.Form.Text className="text-secondary">
            A higher number is better for privacy, but also increases the fee.
          </rb.Form.Text>
        </div>
        <div className="d-flex flex-row flex-wrap">
          {defaultCollaboratorsSelection.map((number) => {
            return (
              <rb.Button
                key={number}
                variant={settings.theme === 'light' ? 'white' : 'dark'}
                className={`p-2 border border-1 rounded text-center${
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
            isInvalid={!isValidNumCollaborators(numCollaborators)}
            placeholder="Other"
            defaultValue=""
            className={`p-2 border border-1 rounded text-center${
              usesCustomNumCollaborators ? (settings.theme === 'light' ? ' border-dark' : ' selected-dark') : ''
            }`}
            onChange={(e) => {
              setUsesCustomNumCollaborators(true)
              validateAndSetCustomNumCollaborators(e.target.value)
            }}
            onClick={(e) => {
              if (e.target.value !== '') {
                setUsesCustomNumCollaborators(true)
                validateAndSetCustomNumCollaborators(parseInt(e.target.value, 10))
              }
            }}
          />
          {usesCustomNumCollaborators && (
            <rb.Form.Control.Feedback type="invalid">
              Please use between 1 and 99 collaborators.
            </rb.Form.Control.Feedback>
          )}
        </div>
      </rb.Form.Group>
    </rb.Form>
  )
}

export default function Send() {
  const wallet = useCurrentWallet()
  const walletInfo = useCurrentWalletInfo()
  const setWalletInfo = useSetCurrentWalletInfo()
  const settings = useSettings()

  const location = useLocation()
  const [alert, setAlert] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [isCoinjoin, setIsCoinjoin] = useState(false)

  const initialDestination = null
  const initialAccount = 0
  const initialAmount = null
  const initialNumCollaborators = () => {
    return pseudoRandomNumber(5, 7)
  }

  const [destination, setDestination] = useState(initialDestination)
  const [account, setAccount] = useState(parseInt(location.state?.account, 10) || initialAccount)
  const [amount, setAmount] = useState(initialAmount)
  // see https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/USAGE.md#try-out-a-coinjoin-using-sendpaymentpy
  const [numCollaborators, setNumCollaborators] = useState(initialNumCollaborators())
  const [formIsValid, setFormIsValid] = useState(false)

  useEffect(() => {
    if (
      isValidAddress(destination) &&
      isValidAccount(account) &&
      isValidAmount(amount) &&
      (isCoinjoin ? isValidNumCollaborators(numCollaborators) : true)
    ) {
      setFormIsValid(true)
    } else {
      setFormIsValid(false)
    }
  }, [destination, account, amount, numCollaborators, isCoinjoin])

  useEffect(() => {
    // Reload wallet info if not already available.
    if (walletInfo) return

    const abortCtrl = new AbortController()

    setAlert(null)

    Api.getWalletDisplay({ walletName: wallet.name, token: wallet.token, signal: abortCtrl.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.message || 'Loading wallet failed.'))))
      .then((data) => setWalletInfo(data.walletinfo))
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })

    return () => abortCtrl.abort()
  }, [wallet, setWalletInfo, walletInfo])

  const sendPayment = async (account, destination, amount_sats) => {
    const { name: walletName, token } = wallet

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
        const message = await extractErrorMessage(res)
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
    const { name: walletName, token } = wallet

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
        const message = await extractErrorMessage(res)
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
    const isValid = formIsValid

    if (isValid) {
      const counterparties = parseInt(numCollaborators)

      const success = isCoinjoin
        ? await startCoinjoin(account, destination, amount, counterparties)
        : await sendPayment(account, destination, amount)

      if (success) {
        setDestination(initialDestination)
        setAccount(initialAccount)
        setAmount(initialAmount)
        setNumCollaborators(initialNumCollaborators())
        setIsCoinjoin(false)
        form.reset()
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
              subtitle="Collaborative transactions increase the privacy of yourself and others."
            />
            {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
            <rb.Form onSubmit={onSubmit} noValidate id="send-form">
              <rb.Form.Group className="mb-4" controlId="destination">
                <rb.Form.Label>Recipient</rb.Form.Label>
                <rb.Form.Control
                  name="destination"
                  placeholder="Enter address..."
                  className="slashed-zeroes"
                  value={destination || ''}
                  required
                  onChange={(e) => setDestination(e.target.value)}
                  isInvalid={destination !== null && !isValidAddress(destination)}
                />
                <rb.Form.Control.Feedback type="invalid">Please provide a recipient address.</rb.Form.Control.Feedback>
              </rb.Form.Group>
              <rb.Form.Group className="mb-4 flex-grow-1" controlId="account">
                <rb.Form.Label>
                  {settings.useAdvancedWalletMode ? 'Account' : 'Privacy level'} to send from
                </rb.Form.Label>
                <rb.Form.Select
                  defaultValue={account}
                  onChange={(e) => setAccount(parseInt(e.target.value, 10))}
                  required
                  className="slashed-zeroes"
                  isInvalid={!isValidAccount(account)}
                >
                  {walletInfo.accounts
                    .sort((lhs, rhs) => lhs.account - rhs.account)
                    .map(({ account, account_balance: balance }) => (
                      <option key={account} value={account}>
                        {settings.useAdvancedWalletMode ? 'Account' : 'Privacy Level'} {account}{' '}
                        {settings.showBalance && `(\u20BF${balance})`}
                      </option>
                    ))}
                </rb.Form.Select>
              </rb.Form.Group>
              <rb.Form.Group className="mb-4" controlId="amount">
                <rb.Form.Label form="send-form">Amount in sats</rb.Form.Label>
                <rb.Form.Control
                  name="amount"
                  type="number"
                  value={amount || ''}
                  className="number"
                  min={1}
                  placeholder="Enter amount..."
                  required
                  onChange={(e) => setAmount(parseInt(e.target.value, 10))}
                  isInvalid={amount !== null && !isValidAmount(amount)}
                />
                <rb.Form.Control.Feedback form="send-form" type="invalid">
                  Please provide a valid amount.
                </rb.Form.Control.Feedback>
              </rb.Form.Group>
              <rb.Form.Group controlId="isCoinjoin" className={`${isCoinjoin ? 'mb-3' : ''}`}>
                <ToggleSwitch
                  label="Send as collaborative transaction for improved privacy"
                  onToggle={(isToggled) => setIsCoinjoin(isToggled)}
                />
              </rb.Form.Group>
            </rb.Form>
            {isCoinjoin && (
              <CollaboratorsSelector numCollaborators={numCollaborators} setNumCollaborators={setNumCollaborators} />
            )}
            <rb.Button
              variant="dark"
              type="submit"
              disabled={isSending || !formIsValid}
              className="mt-4"
              form="send-form"
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
}
