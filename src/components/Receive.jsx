import React from 'react'
import { useState, useEffect } from 'react'
import { BitcoinQR } from '@ibunker/bitcoin-react'
import { useLocation } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { ACCOUNTS } from '../utils'
import { useSettings } from '../context/SettingsContext'
import * as Api from '../libs/JmWalletApi'
import PageTitle from './PageTitle'
import { satsToBtc } from '../utils'
import Sprite from './Sprite'

export default function Receive({ currentWallet }) {
  const location = useLocation()
  const settings = useSettings()
  const [validated, setValidated] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState(null)
  const [account, setAccount] = useState(parseInt(location.state?.account, 10) || 0)
  const [addressCount, setAddressCount] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [addressCopiedFlag, setAddressCopiedFlag] = useState(0)
  const [showAddressCopiedConfirmation, setShowAddressCopiedConfirmation] = useState(false)

  useEffect(() => {
    const abortCtrl = new AbortController()
    const fetchAddress = async (accountNr) => {
      const { name: walletName, token } = currentWallet

      setAlert(null)
      setIsLoading(true)
      Api.getAddressNew({ walletName, accountNr, token, signal: abortCtrl.signal })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.message || 'Loading new address failed.'))))
        .then((data) => setAddress(data.address))
        .catch((err) => {
          if (!abortCtrl.signal.aborted) {
            setAlert({ variant: 'danger', message: err.message })
          }
        })
        .finally(() => setIsLoading(false))
    }

    if (ACCOUNTS.includes(account)) {
      fetchAddress(account)
    }

    return () => abortCtrl.abort()
  }, [account, currentWallet, addressCount])

  useEffect(() => {
    if (addressCopiedFlag < 1) return

    setShowAddressCopiedConfirmation(true)
    const timer = setTimeout(() => {
      setShowAddressCopiedConfirmation(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [addressCopiedFlag])

  const onSubmit = (e) => {
    e.preventDefault()

    const form = e.currentTarget
    const isValid = form.checkValidity()
    setValidated(true)

    if (isValid) {
      setAddressCount(addressCount + 1)
    }
  }

  return (
    <div className="receive">
      <PageTitle title="Receive bitcoin" subtitle="Send bitcoin to the address below." />
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      {address && (
        <div className="qr-container">
          <rb.Card className={`${settings.theme === 'light' ? 'pt-2' : 'pt-4'} pb-4`}>
            <div className="d-flex justify-content-center">
              {amount ? (
                <BitcoinQR bitcoinAddress={address} amount={satsToBtc(amount)} title={address} />
              ) : (
                <BitcoinQR bitcoinAddress={address} title={address} />
              )}
            </div>
            <rb.Card.Body className={`${settings.theme === 'light' ? 'pt-0' : 'pt-3'} pb-0`}>
              <rb.Card.Text className="text-center slashed-zeroes">{address}</rb.Card.Text>
              <div className="d-flex justify-content-center" style={{ gap: '1rem' }}>
                <rb.Button
                  variant="outline-dark"
                  data-bs-toggle="tooltip"
                  data-bs-placement="left"
                  onClick={() => {
                    // might not work on iOS.
                    navigator.clipboard.writeText(address).then(
                      () => {
                        setAddressCopiedFlag(addressCopiedFlag + 1)
                      },
                      () => {
                        setAlert({ variant: 'warning', message: 'Could not copy address.' })
                      }
                    )
                  }}
                >
                  {showAddressCopiedConfirmation ? (
                    <>
                      Copied
                      <Sprite color="green" symbol="checkmark" className="ms-1" width="20" height="20" />
                    </>
                  ) : (
                    'Copy'
                  )}
                </rb.Button>
              </div>
            </rb.Card.Body>
          </rb.Card>
        </div>
      )}
      <div className="mt-4">
        <rb.Button
          variant={`${settings.theme}`}
          className="ps-0 border-0 d-flex align-items-center"
          onClick={() => setShowSettings(!showSettings)}
        >
          Settings
          <Sprite symbol={`caret-${showSettings ? 'up' : 'down'}`} className="ms-1" width="20" height="20" />
        </rb.Button>
      </div>
      <rb.Form onSubmit={onSubmit} validated={validated} noValidate>
        {showSettings && (
          <>
            <rb.Form.Group className="mt-4" controlId="account">
              <rb.Form.Label>Choose {settings.useAdvancedWalletMode ? 'account' : 'privacy level'}</rb.Form.Label>
              <rb.Form.Select
                defaultValue={account}
                onChange={(e) => setAccount(parseInt(e.target.value, 10))}
                required
                disabled={!settings.useAdvancedWalletMode}
              >
                {ACCOUNTS.map((val) => (
                  <option key={val} value={val}>
                    {settings.useAdvancedWalletMode ? 'Account' : 'Privacy level'} {val}
                  </option>
                ))}
              </rb.Form.Select>
            </rb.Form.Group>
            <rb.Form.Group className="my-4" controlId="amountSats">
              <rb.Form.Label>Amount to request in sats</rb.Form.Label>
              <rb.Form.Control
                className="slashed-zeroes"
                name="amount"
                type="number"
                placeholder="0"
                value={amount}
                min={0}
                onChange={(e) => setAmount(e.target.value)}
              />
              <rb.Form.Control.Feedback type="invalid">Please provide a valid amount.</rb.Form.Control.Feedback>
            </rb.Form.Group>
          </>
        )}
        <hr />
        <rb.Button variant="outline-dark" type="submit" disabled={isLoading} className="mt-2" style={{ width: '100%' }}>
          {isLoading ? (
            <div>
              <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              Getting new address
            </div>
          ) : (
            'Get new address'
          )}
        </rb.Button>
      </rb.Form>
    </div>
  )
}
