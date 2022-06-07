import React from 'react'
import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { BitcoinQR } from './BitcoinQR'
import { useSettings } from '../context/SettingsContext'
import { useCurrentWallet, useCurrentWalletInfo } from '../context/WalletContext'
import * as Api from '../libs/JmWalletApi'
import PageTitle from './PageTitle'
import Sprite from './Sprite'
import { CopyButtonWithConfirmation } from './CopyButton'
import styles from './Receive.module.css'

export default function Receive() {
  const { t } = useTranslation()
  const location = useLocation()
  const settings = useSettings()
  const currentWallet = useCurrentWallet()
  const walletInfo = useCurrentWalletInfo()
  const [validated, setValidated] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [account, setAccount] = useState(parseInt(location.state?.account, 10) || 0)
  const [accounts, setAccounts] = useState([])
  const [addressCount, setAddressCount] = useState(0)
  const [showSettings, setShowSettings] = useState(false)

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
      // show the loader a little longer to avoid flickering
      .then((_) => new Promise((r) => setTimeout(r, 200)))
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
    <div className={`${styles.receive}`}>
      <PageTitle title={t('receive.title')} subtitle={t('receive.subtitle')} />
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      <div className="qr-container">
        <rb.Card className={`${settings.theme === 'light' ? 'pt-2' : 'pt-4'} pb-4`}>
          <div className={styles['qr-container']}>
            {!isLoading && address && <BitcoinQR address={address} sats={amount} />}
            {(isLoading || !address) && (
              <rb.Placeholder as="div" animation="wave" className={styles['receive-placeholder-qr-container']}>
                <rb.Placeholder className={styles['receive-placeholder-qr']} />
              </rb.Placeholder>
            )}
          </div>
          <rb.Card.Body className={`${settings.theme === 'light' ? 'pt-0' : 'pt-3'} pb-0`}>
            {address && <rb.Card.Text className="text-center slashed-zeroes">{address}</rb.Card.Text>}
            {!address && (
              <rb.Placeholder as="p" animation="wave" className={styles['receive-placeholder-container']}>
                <rb.Placeholder xs={12} sm={10} md={8} className={styles['receive-placeholder']} />
              </rb.Placeholder>
            )}
            <div className="d-flex justify-content-center" style={{ gap: '1rem' }}>
              <CopyButtonWithConfirmation
                value={address}
                text={t('receive.button_copy_address')}
                successText={t('receive.text_copy_address_confirmed')}
                disabled={!address || isLoading}
              />
            </div>
          </rb.Card.Body>
        </rb.Card>
      </div>
      <rb.Form onSubmit={onSubmit} validated={validated} noValidate>
        <div className={styles['settings-container']}>
          <rb.Button
            variant={`${settings.theme}`}
            className={`${styles['settings-btn']} d-flex align-items-center`}
            onClick={() => setShowSettings(!showSettings)}
          >
            {t('receive.button_settings')}
            <Sprite symbol={`caret-${showSettings ? 'up' : 'down'}`} className="ms-1" width="20" height="20" />
          </rb.Button>
          {showSettings && (
            <div className="my-4">
              {settings.useAdvancedWalletMode && (
                <rb.Form.Group className="mb-4" controlId="account">
                  <rb.Form.Label>{t('receive.label_choose_account')}</rb.Form.Label>
                  <rb.Form.Select
                    defaultValue={account}
                    onChange={(e) => setAccount(parseInt(e.target.value, 10))}
                    required
                    disabled={isLoading || accounts.length === 0}
                  >
                    {accounts.map((val) => (
                      <option key={val} value={val}>
                        {t('receive.account_selector_option_dev_mode', { number: val })}
                      </option>
                    ))}
                  </rb.Form.Select>
                </rb.Form.Group>
              )}
              <rb.Form.Group controlId="amountSats">
                <rb.Form.Label>{t('receive.label_amount')}</rb.Form.Label>
                <rb.Form.Control
                  className="slashed-zeroes"
                  name="amount"
                  type="number"
                  placeholder="0"
                  value={amount}
                  min={0}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isLoading}
                />
                <rb.Form.Control.Feedback type="invalid">
                  {t('receive.feedback_invalid_amount')}
                </rb.Form.Control.Feedback>
              </rb.Form.Group>
            </div>
          )}
          <hr />
        </div>
        <rb.Button variant="outline-dark" type="submit" disabled={isLoading} className="mt-2" style={{ width: '100%' }}>
          {isLoading ? (
            <div className="d-flex justify-content-center align-items-center">
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
