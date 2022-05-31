import React, { useEffect, useState } from 'react'
import * as rb from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import { useCurrentWallet, useReloadCurrentWalletInfo, Utxos } from '../context/WalletContext'
import { CopyButtonWithConfirmation } from '../components/CopyButton'
import * as Api from '../libs/JmWalletApi'
// @ts-ignore
import PageTitle from './PageTitle'
// @ts-ignore
import DisplayUTXOs from './DisplayUTXOs'
// @ts-ignore
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
// @ts-ignore
import Balance from './Balance'
import Sprite from './Sprite'
import { isFeatureEnabled } from '../constants/features'
import styles from './FidelityBond.module.css'

type AlertWithMessage = rb.AlertProps & { message: string }

const dateToLocktime = (date: Date): Api.Locktime =>
  `${date.getUTCFullYear()}-${date.getUTCMonth() >= 9 ? '' : '0'}${1 + date.getUTCMonth()}` as Api.Locktime

// a maximum of years for a timelock to be accepted
// this is useful in simple mode - when it should be prevented that users
// lock up their coins for an awful amount of time by accident.
// in "advanced" mode, this can be dropped or increased substantially
const DEFAULT_MAX_TIMELOCK_YEARS = 10

const initialLocktimeDate = () => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  return new Date(Date.UTC(year + 1, month, 1, 0, 0, 0))
}

/*interface DepositTemplateProps {
  title: string
  amount: string
  locktime: string
  [key: string]: unknown
}

const DepositTemplate = ({ title, amount, locktime, ...props }: DepositTemplateProps) => {
  const settings = useSettings()

  return (
    <rb.Card {...props}>
      <rb.Card.Body>
        <rb.Card.Title>{title}</rb.Card.Title>
        <rb.Row>
          <rb.Col lg={{ order: 'last' }} className="d-flex align-items-center justify-content-end">
            Amount
            <Balance valueString={amount} convertToUnit={settings.unit} showBalance={settings.showBalance} />
          </rb.Col>
          <rb.Col xs={'auto'}>
            Duration
            {locktime}
          </rb.Col>
        </rb.Row>
      </rb.Card.Body>
    </rb.Card>
  )
}*/

interface LocktimeForm {
  onChange: (locktime: Api.Locktime) => void
  maxYears?: number
}
const LocktimeForm = ({ onChange, maxYears = DEFAULT_MAX_TIMELOCK_YEARS }: LocktimeForm) => {
  const { t } = useTranslation()

  const now = new Date()
  const currentYear = now.getUTCFullYear()
  const currentMonth = 1 + now.getUTCMonth() // utc month ranges from [0, 11]

  const [locktimeYear, setLocktimeYear] = useState(currentYear + 1)
  const [locktimeMonth, setLocktimeMonth] = useState(currentMonth)

  useEffect(() => {
    const date = new Date(Date.UTC(locktimeYear, locktimeMonth - 1, 1, 0, 0, 0))
    console.log(date.toLocaleDateString())
    onChange(dateToLocktime(date))
  }, [locktimeYear, locktimeMonth, onChange])

  const minMonth = () => {
    if (locktimeYear > currentYear) {
      return 1
    }

    return currentMonth + 1 // can be '13' - which means it never is valid and user must adapt 'year'.
  }

  return (
    <rb.Row>
      <rb.Col xs={6}>
        <rb.Form.Group className="mb-4" controlId="locktimeYear">
          <rb.Form.Label form="fidelity-bond-form">
            <Trans i18nKey="fidelity_bond.form_create.label_locktime_year" as="span">
              Year
            </Trans>
          </rb.Form.Label>
          <rb.Form.Control
            name="year"
            type="number"
            value={locktimeYear}
            min={currentYear}
            max={currentYear + maxYears}
            placeholder={t('fidelity_bond.form_create.placeholder_locktime_year')}
            required
            onChange={(e) => setLocktimeYear(parseInt(e.target.value, 10))}
            isInvalid={locktimeYear < currentYear || locktimeYear > currentYear + maxYears}
          />
          <rb.Form.Control.Feedback type="invalid">
            <Trans i18nKey="fidelity_bond.form_create.feedback_invalid_locktime_year" as="span">
              Please provide a valid value.
            </Trans>
          </rb.Form.Control.Feedback>
        </rb.Form.Group>
      </rb.Col>
      <rb.Col xs={6}>
        <rb.Form.Group className="mb-4" controlId="locktimeMonth">
          <rb.Form.Label form="fidelity-bond-form">
            <Trans i18nKey="fidelity_bond.form_create.label_locktime_month" as="span">
              Month
            </Trans>
          </rb.Form.Label>
          <rb.Form.Control
            name="month"
            type="number"
            value={locktimeMonth}
            min={minMonth()}
            step={1}
            max={12}
            placeholder={t('fidelity_bond.form_create.placeholder_locktime_month')}
            required
            onChange={(e) => setLocktimeMonth(parseInt(e.target.value, 10))}
            isInvalid={locktimeMonth < minMonth()}
          />
          <rb.Form.Control.Feedback type="invalid">
            <Trans i18nKey="fidelity_bond.form_create.feedback_invalid_locktime_month" as="span">
              Please provide a valid value.
            </Trans>
          </rb.Form.Control.Feedback>
        </rb.Form.Group>
      </rb.Col>
    </rb.Row>
  )
}

interface DepositForm {
  title: string
  [key: string]: unknown
}
const DepositForm = ({ title, ...props }: DepositForm) => {
  const { t } = useTranslation()
  const settings = useSettings()
  const [amount, setAmount] = useState<number | null>(null)
  const [locktime, setLocktime] = useState<Api.Locktime>(dateToLocktime(initialLocktimeDate()))

  return (
    <rb.Card {...props}>
      <rb.Card.Body>
        <rb.Card.Title>{title}</rb.Card.Title>
        <rb.Form noValidate>
          <LocktimeForm onChange={setLocktime} />
          <rb.Form.Group className="mb-4" controlId="amount">
            <rb.Form.Label form="fidelity-bond-form">{t('send.label_amount')}</rb.Form.Label>
            <rb.Form.Control
              name="amount"
              type="number"
              value={amount || undefined}
              className="slashed-zeroes"
              min={100_000}
              placeholder={t('send.placeholder_amount')}
              required
              onChange={(e) => setAmount(parseInt(e.target.value, 10))}
            />
            <rb.Form.Control.Feedback type="invalid">{t('send.feedback_invalid_amount')}</rb.Form.Control.Feedback>
          </rb.Form.Group>
        </rb.Form>
        <rb.Row>
          <rb.Col lg={{ order: 'last' }} className="d-flex align-items-center justify-content-end">
            Amount
            <Balance valueString={`${amount}`} convertToUnit={settings.unit} showBalance={settings.showBalance} />
          </rb.Col>
          <rb.Col xs={'auto'}>Expires at: {locktime}</rb.Col>
        </rb.Row>
      </rb.Card.Body>
    </rb.Card>
  )
}

interface DepositFormAdvancedProps {
  title: React.ReactElement
  [key: string]: unknown
}
const DepositFormAdvanced = ({ title, ...props }: DepositFormAdvancedProps) => {
  const { t } = useTranslation()
  const currentWallet = useCurrentWallet()
  const [locktime, setLocktime] = useState(dateToLocktime(initialLocktimeDate()))
  const [address, setAddress] = useState(null)
  const [addressLocktime, setAddressLocktime] = useState<Api.Locktime | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [alert, setAlert] = useState<AlertWithMessage | null>(null)

  useEffect(() => {
    if (!currentWallet) return
    if (!locktime) return

    const abortCtrl = new AbortController()
    const { name: walletName, token } = currentWallet

    setAlert(null)

    setAddress(null)
    setAddressLocktime(null)

    setIsLoading(true)
    Api.getAddressTimelockNew({ walletName, token, locktime, signal: abortCtrl.signal })
      .then((res) =>
        res.ok ? res.json() : Api.Helper.throwError(res, t('fidelity_bond.error_loading_timelock_address_failed'))
      )
      .then((data) => {
        setAddress(data.address)
        setAddressLocktime(locktime)
      })
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })
      .finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [currentWallet, locktime, t])

  return (
    <rb.Card {...props}>
      <rb.Card.Body>
        <rb.Card.Title>{title}</rb.Card.Title>

        {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}

        <rb.Form noValidate>
          <LocktimeForm onChange={setLocktime} />
        </rb.Form>
        <rb.Row>
          <rb.Col>
            <>
              {isLoading && (
                <div className="d-flex justify-content-center align-items-center">
                  <rb.Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  {t('global.loading')}
                </div>
              )}
            </>
          </rb.Col>
        </rb.Row>
        <rb.Row>
          <rb.Col>
            <>
              {address && (
                <>
                  <div className="text-center">
                    <div className="slashed-zeroes">{address}</div>
                    <div className="my-2">
                      <CopyButtonWithConfirmation
                        value={address}
                        text={t('global.button_copy_text')}
                        successText={t('global.button_copy_text_confirmed')}
                        disabled={!address || isLoading}
                      />{' '}
                    </div>
                  </div>
                  <rb.Card.Text>Expires at: {addressLocktime}</rb.Card.Text>
                </>
              )}
            </>
          </rb.Col>
        </rb.Row>
      </rb.Card.Body>
    </rb.Card>
  )
}

/*const FidelityBondSimple = () => {
  const { t } = useTranslation()
  const currentWallet = useCurrentWallet()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const [fidelityBonds, setFidelityBonds] = useState<Utxos | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [alert, setAlert] = useState<AlertWithMessage | null>(null)

  useEffect(() => {
    if (!currentWallet) {
      setAlert({ variant: 'danger', message: t('current_wallet.error_loading_failed') })
      setIsLoading(false)
      return
    }

    const abortCtrl = new AbortController()

    setAlert(null)
    setIsLoading(true)
    setFidelityBonds(null)

    reloadCurrentWalletInfo({ signal: abortCtrl.signal })
      .then((info) => {
        if (info) {
          const timelockedUtxos = info.data.utxos.utxos.filter((utxo) => utxo.locktime)
          setFidelityBonds(timelockedUtxos)
        }
      })
      .catch((err) => {
        const message = err.message || t('current_wallet.error_loading_failed')
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message })
      })
      .finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [currentWallet, reloadCurrentWalletInfo, t])

  return (
    <div>
      {isLoading && (
        <div className="d-flex justify-content-center align-items-center">
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          {t('global.loading')}
        </div>
      )}
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}

      <rb.Fade in={!!fidelityBonds && fidelityBonds.length === 0} mountOnEnter={true} unmountOnExit={true}>
        <>
          <DepositTemplate title="Long Term" amount="123" locktime="2042-01" />
          <DepositTemplate title="Short Term" amount="123" locktime="2042-01" />
          <DepositForm title="form" />
        </>
      </rb.Fade>
    </div>
  )
}*/

const FidelityBondAdvanced = () => {
  const { t } = useTranslation()
  const currentWallet = useCurrentWallet()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const [fidelityBonds, setFidelityBonds] = useState<Utxos | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [alert, setAlert] = useState<AlertWithMessage | null>(null)

  useEffect(() => {
    if (!currentWallet) {
      setAlert({ variant: 'danger', message: t('current_wallet.error_loading_failed') })
      setIsLoading(false)
      return
    }

    const abortCtrl = new AbortController()

    setAlert(null)
    setIsLoading(true)
    setFidelityBonds(null)

    reloadCurrentWalletInfo({ signal: abortCtrl.signal })
      .then((info) => {
        if (info) {
          const timelockedUtxos = info.data.utxos.utxos.filter((utxo) => utxo.locktime)
          setFidelityBonds(timelockedUtxos)
        }
      })
      .catch((err) => {
        const message = err.message || t('current_wallet.error_loading_failed')
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message })
      })
      .finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [currentWallet, reloadCurrentWalletInfo, t])

  return (
    <div>
      {isLoading ? (
        <div className="d-flex justify-content-center align-items-center">
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          {t('global.loading')}
        </div>
      ) : (
        <>
          {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}

          {fidelityBonds && (
            <>
              {fidelityBonds.length === 0 ? (
                <>
                  <DepositFormAdvanced
                    title={
                      <Trans i18nKey="fidelity_bond.form_create.title" as="span">
                        Fidelity Bond
                      </Trans>
                    }
                  />
                </>
              ) : (
                <rb.Row className="mt-2 mb-3">
                  <rb.Col>{!!fidelityBonds?.length && <DisplayUTXOs utxos={fidelityBonds} />}</rb.Col>
                </rb.Row>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function AdvancedModeToggleButton() {
  const { t } = useTranslation()
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()

  return (
    <rb.Button
      variant="outline-dark"
      className="border-0 d-inline-flex align-items-center justify-content-center"
      onClick={() => settingsDispatch({ useAdvancedWalletMode: !settings.useAdvancedWalletMode })}
    >
      <Sprite symbol={settings.useAdvancedWalletMode ? 'wand' : 'console'} width="20" height="20" className="me-2" />
      <small>{settings.useAdvancedWalletMode ? t('settings.use_normal_mode') : t('settings.use_dev_mode')}</small>
    </rb.Button>
  )
}

export default function FidelityBond() {
  const featureFidelityBondsEnabled = isFeatureEnabled('fidelityBonds')

  const { t } = useTranslation()
  const settings = useSettings()

  if (!featureFidelityBondsEnabled) {
    return (
      <div>
        <h2>Feature not enabled</h2>
      </div>
    )
  }

  return (
    <div className={styles['fidelity-bond']}>
      <rb.Row>
        <rb.Col xs={12}>
          <rb.Stack direction="horizontal" gap={2} className="align-items-start">
            <div>
              <PageTitle title={t('fidelity_bond.title')} subtitle={t('fidelity_bond.subtitle')} />
            </div>
            <div className="ms-auto">
              <AdvancedModeToggleButton />
            </div>
          </rb.Stack>
        </rb.Col>
      </rb.Row>
      <rb.Row>
        <rb.Col>
          <div className="mb-4">
            <Trans i18nKey="fidelity_bond.description" as="p">
              <a
                href="https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/fidelity-bonds.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary"
              >
                See the documentation about Fidelity Bonds
              </a>{' '}
              for more information.
            </Trans>
          </div>

          {settings.useAdvancedWalletMode ? (
            <rb.Alert variant="warning" className="mb-4">
              <Trans i18nKey="fidelity_bond.alert_warning_advanced_mode_active" as="p">
                You are in advanced mode. It is assumed that you know what you are doing.
                <br />
                <small>
                  e.g. a transaction creating a Fidelity Bond <b>should have no change</b>, etc.
                </small>
              </Trans>
            </rb.Alert>
          ) : (
            <rb.Alert variant="danger" className="mb-4">
              <Trans i18nKey="fidelity_bond.alert_warning_advanced_mode">
                Fidelity Bonds are currently only available in advanced mode.
              </Trans>
            </rb.Alert>
          )}

          {/*settings.useAdvancedWalletMode ? <FidelityBondAdvanced /> : <FidelityBondSimple />*/}
          {settings.useAdvancedWalletMode && <FidelityBondAdvanced />}
        </rb.Col>
      </rb.Row>
    </div>
  )
}
