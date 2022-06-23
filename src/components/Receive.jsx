import React, { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'

import { useSettings } from '../context/SettingsContext'
import { useCurrentWallet, useCurrentWalletInfo } from '../context/WalletContext'
import { useBalanceSummary } from '../hooks/BalanceSummary'
import * as Api from '../libs/JmWalletApi'

import { BitcoinQR } from './BitcoinQR'
import PageTitle from './PageTitle'
import Sprite from './Sprite'
import { CopyButton } from './CopyButton'
import { ShareButton, checkIsWebShareAPISupported } from './ShareButton'
import styles from './Receive.module.css'
import { SelectableJar, calculateFillLevel } from './jars/Jar'

export default function Receive() {
  const { t } = useTranslation()
  const location = useLocation()
  const settings = useSettings()
  const currentWallet = useCurrentWallet()
  const walletInfo = useCurrentWalletInfo()
  const balanceSummary = useBalanceSummary(walletInfo)
  const [validated, setValidated] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedJarIndex, setSelectedJarIndex] = useState(parseInt(location.state?.account, 10) || 0)
  const [addressCount, setAddressCount] = useState(0)
  const [showSettings, setShowSettings] = useState(false)

  const sortedAccountBalances = useMemo(() => {
    if (!balanceSummary) return []
    return Object.values(balanceSummary.accountBalances).sort((lhs, rhs) => lhs.accountIndex - rhs.accountIndex)
  }, [balanceSummary])

  useEffect(() => {
    const abortCtrl = new AbortController()
    const { name: walletName, token } = currentWallet

    setAlert(null)
    setIsLoading(true)

    Api.getAddressNew({ walletName, mixdepth: selectedJarIndex, token, signal: abortCtrl.signal })
      .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res, t('receive.error_loading_address_failed'))))
      .then((data) => setAddress(data.address))
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })
      // show the loader a little longer to avoid flickering
      .then((_) => new Promise((r) => setTimeout(r, 200)))
      .finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [selectedJarIndex, currentWallet, addressCount, t])

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
          <rb.Card.Body
            className={`${settings.theme === 'light' ? 'pt-0' : 'pt-3'} pb-0 d-flex flex-column align-items-center`}
          >
            {address && (
              <rb.Card.Text className={`${styles['address']} text-center slashed-zeroes`}>{address}</rb.Card.Text>
            )}
            {!address && (
              <rb.Placeholder as="p" animation="wave" className={styles['receive-placeholder-container']}>
                <rb.Placeholder xs={12} sm={10} md={8} className={styles['receive-placeholder']} />
              </rb.Placeholder>
            )}
            <div className="d-flex justify-content-center gap-3 w-75">
              <CopyButton
                className="btn btn-outline-dark flex-1"
                value={address}
                text={t('receive.button_copy_address')}
                successText={t('receive.text_copy_address_confirmed')}
                disabled={!address || isLoading}
              />
              {checkIsWebShareAPISupported() && <ShareButton value={address} className="flex-1" />}
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
                <>
                  {!balanceSummary || sortedAccountBalances.length === 0 ? (
                    <rb.Placeholder as="div" animation="wave">
                      <rb.Placeholder className={styles.jarsPlaceholder} />
                    </rb.Placeholder>
                  ) : (
                    <div className={styles.jarsContainer}>
                      {sortedAccountBalances.map((it) => {
                        return (
                          <SelectableJar
                            key={it.accountIndex}
                            index={it.accountIndex}
                            balance={it.totalBalance}
                            isSelectable={true}
                            isSelected={it.accountIndex === selectedJarIndex}
                            fillLevel={calculateFillLevel(it.totalBalance, balanceSummary.totalBalance)}
                            onClick={() => setSelectedJarIndex(it.accountIndex)}
                          />
                        )
                      })}
                    </div>
                  )}
                </>
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
