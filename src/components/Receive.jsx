import React from 'react'
import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { BitcoinQR } from './BitcoinQR'
import { useSettings } from '../context/SettingsContext'
import { useCurrentWallet, useCurrentWalletInfo } from '../context/WalletContext'
import * as Api from '../libs/JmWalletApi'
import PageTitle from './PageTitle'
import Sprite from './Sprite'

export default function Receive() {
  const { t } = useTranslation()
  const location = useLocation()
  const settings = useSettings()
  const currentWallet = useCurrentWallet()
  const walletInfo = useCurrentWalletInfo()
  const addressCopyFallbackInputRef = useRef()
  const [validated, setValidated] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [account, setAccount] = useState(parseInt(location.state?.account, 10) || 0)
  const [accounts, setAccounts] = useState([])
  const [addressCount, setAddressCount] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [addressCopiedFlag, setAddressCopiedFlag] = useState(0)
  const [showAddressCopiedConfirmation, setShowAddressCopiedConfirmation] = useState(false)

  useEffect(() => {
    const abortCtrl = new AbortController()
    const { name: walletName, token } = currentWallet

    setAlert(null)
    setIsLoading(true)
    Api.getAddressNew({ walletName, mixdepth: account, token, signal: abortCtrl.signal })
      .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res, t('receive.error_loading_address_failed'))))
      .then((data) => setAddress(data.address))
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })
      .finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [account, currentWallet, addressCount, t])

  useEffect(() => {
    // `walletInfo` will be populated at least once (when wallet is unlocked).
    // This data *might* be outdated and it can be argued that it should be actively reloaded.
    // However, creating a new account (e.g. by providing custom options to run scheduled transactions)
    // is a rather rare event. Revisit this behaviour when necessary.
    const accountNumbers = walletInfo ? walletInfo.data.display.walletinfo.accounts.map((it) => it.account) : []
    setAccounts(accountNumbers)
  }, [walletInfo])

  useEffect(() => {
    if (addressCopiedFlag < 1) return

    setShowAddressCopiedConfirmation(true)
    const timer = setTimeout(() => {
      setShowAddressCopiedConfirmation(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [addressCopiedFlag])

  const copyToClipboard = (text, fallbackInputField) => {
    const copyToClipboardFallback = (inputField) =>
      new Promise((resolve, reject) => {
        inputField.select()
        const success = document.execCommand && document.execCommand('copy')
        inputField.blur()
        success ? resolve(success) : reject(new Error(t('receive.error_copy_address_failed')))
      })

    // `navigator.clipboard` might not be available, e.g. on sites served over plain `http`.
    if (!navigator.clipboard) {
      return copyToClipboardFallback(fallbackInputField)
    }

    // might not work on iOS.
    return navigator.clipboard.writeText(text).catch(() => copyToClipboardFallback(fallbackInputField))
  }

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
      <PageTitle title={t('receive.title')} subtitle={t('receive.subtitle')} />
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      {address && (
        <div className="qr-container">
          <rb.Card className={`${settings.theme === 'light' ? 'pt-2' : 'pt-4'} pb-4`}>
            <div className="d-flex justify-content-center">
              <BitcoinQR address={address} sats={amount} />
            </div>
            <rb.Card.Body className={`${settings.theme === 'light' ? 'pt-0' : 'pt-3'} pb-0`}>
              <rb.Card.Text className="text-center slashed-zeroes">{address}</rb.Card.Text>
              <div className="d-flex justify-content-center" style={{ gap: '1rem' }}>
                <rb.Button
                  variant="outline-dark"
                  data-bs-toggle="tooltip"
                  data-bs-placement="left"
                  onClick={() => {
                    copyToClipboard(address, addressCopyFallbackInputRef.current).then(
                      () => {
                        setAddressCopiedFlag(addressCopiedFlag + 1)
                      },
                      (e) => {
                        setAlert({ variant: 'warning', message: e.message })
                      }
                    )
                  }}
                >
                  {showAddressCopiedConfirmation ? (
                    <>
                      {t('receive.text_copy_address_confirmed')}
                      <Sprite color="green" symbol="checkmark" className="ms-1" width="20" height="20" />
                    </>
                  ) : (
                    t('receive.button_copy_address')
                  )}
                </rb.Button>

                <input
                  readOnly
                  aria-hidden
                  ref={addressCopyFallbackInputRef}
                  value={address}
                  style={{
                    position: 'absolute',
                    left: '-9999px',
                    top: '-9999px',
                  }}
                />
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
          {t('receive.button_settings')}
          <Sprite symbol={`caret-${showSettings ? 'up' : 'down'}`} className="ms-1" width="20" height="20" />
        </rb.Button>
      </div>
      <rb.Form onSubmit={onSubmit} validated={validated} noValidate>
        {showSettings && (
          <>
            {settings.useAdvancedWalletMode && (
              <rb.Form.Group className="mt-4" controlId="account">
                <rb.Form.Label>{t('receive.label_choose_account')}</rb.Form.Label>
                <rb.Form.Select
                  defaultValue={account}
                  onChange={(e) => setAccount(parseInt(e.target.value, 10))}
                  required
                  disabled={accounts.length === 0}
                >
                  {accounts.map((val) => (
                    <option key={val} value={val}>
                      {t('receive.account_selector_option_dev_mode', { number: val })}
                    </option>
                  ))}
                </rb.Form.Select>
              </rb.Form.Group>
            )}
            <rb.Form.Group className="my-4" controlId="amountSats">
              <rb.Form.Label>{t('receive.label_amount')}</rb.Form.Label>
              <rb.Form.Control
                className="slashed-zeroes"
                name="amount"
                type="number"
                placeholder="0"
                value={amount}
                min={0}
                onChange={(e) => setAmount(e.target.value)}
              />
              <rb.Form.Control.Feedback type="invalid">{t('receive.feedback_invalid_amount')}</rb.Form.Control.Feedback>
            </rb.Form.Group>
          </>
        )}
        <hr />
        <rb.Button variant="outline-dark" type="submit" disabled={isLoading} className="mt-2" style={{ width: '100%' }}>
          {isLoading ? (
            <div>
              <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              {t('receive.text_getting_address')}
            </div>
          ) : (
            t('receive.button_new_address')
          )}
        </rb.Button>
      </rb.Form>
    </div>
  )
}
