import { useState, useEffect, useMemo, FormEvent } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext'
import { useServiceInfo } from '../context/ServiceInfoContext'
import { CurrentWallet, useCurrentWalletInfo } from '../context/WalletContext'
import * as Api from '../libs/JmWalletApi'
import { BitcoinQR } from './BitcoinQR'
import PageTitle from './PageTitle'
import Sprite from './Sprite'
import { CopyButton } from './CopyButton'
import { ShareButton, checkIsWebShareAPISupported } from './ShareButton'
import { SelectableJar, jarFillLevel } from './jars/Jar'
import styles from './Receive.module.css'
import Accordion from './Accordion'

interface ReceiveProps {
  wallet: CurrentWallet
}

export default function Receive({ wallet }: ReceiveProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const settings = useSettings()
  const serviceInfo = useServiceInfo()
  const walletInfo = useCurrentWalletInfo()

  const [alert, setAlert] = useState<SimpleAlert>()
  const [isLoading, setIsLoading] = useState(true)

  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedJarIndex, setSelectedJarIndex] = useState(parseInt(location.state?.account, 10) || 0)

  const [addressCount, setAddressCount] = useState(0)
  const isFormEnabled = useMemo(() => serviceInfo?.rescanning !== true, [serviceInfo])
  const [validated, setValidated] = useState(false)

  const sortedAccountBalances = useMemo(() => {
    if (!walletInfo) return []
    return Object.values(walletInfo.balanceSummary.accountBalances).sort(
      (lhs, rhs) => lhs.accountIndex - rhs.accountIndex,
    )
  }, [walletInfo])

  useEffect(() => {
    if (!isFormEnabled) {
      setIsLoading(false)
      return
    }

    const abortCtrl = new AbortController()

    setAlert(undefined)
    setIsLoading(true)

    Api.getAddressNew({ ...wallet, mixdepth: selectedJarIndex, signal: abortCtrl.signal })
      .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res, t('receive.error_loading_address_failed'))))
      .then((data) => setAddress(data.address))
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })
      // show the loader a little longer to avoid flickering
      .then((_) => new Promise((r) => setTimeout(r, 200)))
      .finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [isFormEnabled, wallet, selectedJarIndex, addressCount, t])

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const form = e.currentTarget
    const isValid = form.checkValidity()
    setValidated(true)

    if (isValid) {
      setAddressCount((it) => it + 1)
    }
  }

  return (
    <div className={`${styles.receive}`}>
      <PageTitle title={t('receive.title')} subtitle={t('receive.subtitle')} />
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      {serviceInfo?.rescanning === true && <rb.Alert variant="success">{t('app.alert_rescan_in_progress')}</rb.Alert>}
      <div className={`mb-4 ${styles.cardContainer}`}>
        <rb.Card className={`${settings.theme === 'light' ? 'pt-2' : 'pt-4'} pb-4`}>
          <div className={styles['qr-container']}>
            {!isLoading && address && <BitcoinQR address={address} amount={parseInt(amount, 10) || 0} />}
            {(isLoading || !address) && (
              <rb.Placeholder as="div" animation="wave" className={styles['receive-placeholder-qr-container']}>
                <rb.Placeholder className={styles['receive-placeholder-qr']} />
              </rb.Placeholder>
            )}
          </div>
          <rb.Card.Body
            className={`${settings.theme === 'light' ? 'pt-0' : 'pt-3'} pb-0 d-flex flex-column align-items-center`}
          >
            {!address ? (
              <rb.Placeholder as="p" animation="wave" className={styles['receive-placeholder-container']}>
                <rb.Placeholder xs={12} sm={10} md={8} className={styles['receive-placeholder']} />
              </rb.Placeholder>
            ) : (
              <rb.Card.Text className={`${styles['address']} text-center slashed-zeroes`}>{address}</rb.Card.Text>
            )}

            <div className="d-flex justify-content-center gap-3 w-75">
              <CopyButton
                className="btn btn-outline-dark flex-1"
                disabled={!address || isLoading}
                value={address}
                text={
                  <>
                    <Sprite symbol="copy" className="me-1" width="24" height="24" />
                    {t('receive.button_copy_address')}
                  </>
                }
                successText={
                  <>
                    <Sprite color="green" symbol="checkmark" className="me-1" width="24" height="24" />
                    {t('receive.text_copy_address_confirmed')}
                  </>
                }
              />
              {checkIsWebShareAPISupported() && <ShareButton value={address} className="flex-1" />}
            </div>
          </rb.Card.Body>
        </rb.Card>
      </div>
      <rb.Form className={styles.receiveForm} onSubmit={onSubmit} validated={validated} noValidate>
        <Accordion title={t('receive.button_settings')} disabled={!isFormEnabled}>
          <div className="mb-4">
            {!walletInfo || sortedAccountBalances.length === 0 ? (
              <rb.Placeholder as="div" animation="wave">
                <rb.Placeholder className={styles.jarsPlaceholder} />
              </rb.Placeholder>
            ) : (
              <div className={styles.jarsContainer}>
                {sortedAccountBalances.map((it) => (
                  <SelectableJar
                    key={it.accountIndex}
                    index={it.accountIndex}
                    balance={it.calculatedAvailableBalanceInSats}
                    frozenBalance={it.calculatedFrozenOrLockedBalanceInSats}
                    isSelectable={isFormEnabled}
                    isSelected={it.accountIndex === selectedJarIndex}
                    fillLevel={jarFillLevel(
                      it.calculatedTotalBalanceInSats,
                      walletInfo.balanceSummary.calculatedTotalBalanceInSats,
                    )}
                    onClick={(jarIndex) => setSelectedJarIndex(jarIndex)}
                  />
                ))}
              </div>
            )}
            <rb.Form.Group controlId="amountSats">
              <rb.Form.Label>{t('receive.label_amount')}</rb.Form.Label>
              <rb.InputGroup>
                <rb.InputGroup.Text id="amountSats-addon1" className={styles.inputGroupText}>
                  <Sprite symbol="sats" width="24" height="24" />
                </rb.InputGroup.Text>
                <rb.Form.Control
                  aria-label={t('receive.label_amount')}
                  className="slashed-zeroes"
                  name="amount"
                  type="number"
                  placeholder="0"
                  value={amount}
                  disabled={!isFormEnabled || isLoading}
                  onChange={(e) => setAmount(e.target.value)}
                  min={0}
                  step={1}
                />
              </rb.InputGroup>
              <rb.Form.Control.Feedback type="invalid">{t('receive.feedback_invalid_amount')}</rb.Form.Control.Feedback>
            </rb.Form.Group>
          </div>
        </Accordion>

        <div className="d-flex justify-content-center">
          <rb.Button
            variant="outline-dark"
            type="submit"
            disabled={!isFormEnabled || isLoading}
            className="d-flex justify-content-center align-items-center"
          >
            {isLoading ? (
              <>
                <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                {t('receive.text_getting_address')}
              </>
            ) : (
              <>
                <Sprite symbol="refresh" className="me-2" width="24" height="24" />
                {t('receive.button_new_address')}
              </>
            )}
          </rb.Button>
        </div>
      </rb.Form>
    </div>
  )
}
