import React, { useEffect, useMemo, useState } from 'react'
import * as rb from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useCurrentWallet, useReloadCurrentWalletInfo, Utxos } from '../context/WalletContext'
import { CopyButtonWithConfirmation } from '../components/CopyButton'
import { isFeatureEnabled } from '../constants/features'

// @ts-ignore
import PageTitle from './PageTitle'
// @ts-ignore
import DisplayUTXOs from './DisplayUTXOs'

import { routes } from '../constants/routes'
import * as Api from '../libs/JmWalletApi'
import styles from './FidelityBond.module.css'

type AlertWithMessage = rb.AlertProps & { message: string }

const dateToLockdate = (date: Date): Api.Lockdate =>
  `${date.getUTCFullYear()}-${date.getUTCMonth() >= 9 ? '' : '0'}${1 + date.getUTCMonth()}` as Api.Lockdate

const lockdateToTimestamp = (lockdate: Api.Lockdate): number => {
  const split = lockdate.split('-')
  return Date.UTC(parseInt(split[0], 10), parseInt(split[1], 10) - 1, 1, 0, 0, 0)
}

// a maximum of years for a timelock to be accepted
// this is useful in simple mode - when it should be prevented that users
// lock up their coins for an awful amount of time by accident.
// in "advanced" mode, this can be dropped or increased substantially
const DEFAULT_MAX_TIMELOCK_YEARS = 10

const initialLockdate = () => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  return new Date(Date.UTC(year + 1, month, 1, 0, 0, 0))
}

interface LockdateFormProps {
  onChange: (lockdate: Api.Lockdate) => void
  maxYears?: number
}
const LockdateForm = ({ onChange, maxYears = DEFAULT_MAX_TIMELOCK_YEARS }: LockdateFormProps) => {
  const { t } = useTranslation()

  const now = new Date()
  const currentYear = now.getUTCFullYear()
  const currentMonth = 1 + now.getUTCMonth() // utc month ranges from [0, 11]

  const [lockdateYear, setLockdateYear] = useState(currentYear + 1)
  const [lockdateMonth, setLockdateMonth] = useState(currentMonth)

  useEffect(() => {
    const date = new Date(Date.UTC(lockdateYear, lockdateMonth - 1, 1, 0, 0, 0))
    console.log(date.toLocaleDateString())
    onChange(dateToLockdate(date))
  }, [lockdateYear, lockdateMonth, onChange])

  const minMonth = () => {
    if (lockdateYear > currentYear) {
      return 1
    }

    return currentMonth + 1 // can be '13' - which means it never is valid and user must adapt 'year'.
  }

  return (
    <rb.Row>
      <rb.Col xs={6}>
        <rb.Form.Group className="mb-4" controlId="locktimeYear">
          <rb.Form.Label form="fidelity-bond-form">
            <Trans i18nKey="fidelity_bond.form_create.label_locktime_year">Year</Trans>
          </rb.Form.Label>
          <rb.Form.Control
            name="year"
            type="number"
            value={lockdateYear}
            min={currentYear}
            max={currentYear + maxYears}
            placeholder={t('fidelity_bond.form_create.placeholder_locktime_year')}
            required
            onChange={(e) => setLockdateYear(parseInt(e.target.value, 10))}
            isInvalid={lockdateYear < currentYear || lockdateYear > currentYear + maxYears}
          />
          <rb.Form.Control.Feedback type="invalid">
            <Trans i18nKey="fidelity_bond.form_create.feedback_invalid_locktime_year">
              Please provide a valid value.
            </Trans>
          </rb.Form.Control.Feedback>
        </rb.Form.Group>
      </rb.Col>
      <rb.Col xs={6}>
        <rb.Form.Group className="mb-4" controlId="locktimeMonth">
          <rb.Form.Label form="fidelity-bond-form">
            <Trans i18nKey="fidelity_bond.form_create.label_locktime_month">Month</Trans>
          </rb.Form.Label>
          <rb.Form.Control
            name="month"
            type="number"
            value={lockdateMonth}
            min={minMonth()}
            step={1}
            max={12}
            placeholder={t('fidelity_bond.form_create.placeholder_locktime_month')}
            required
            onChange={(e) => setLockdateMonth(parseInt(e.target.value, 10))}
            isInvalid={lockdateMonth < minMonth()}
          />
          <rb.Form.Control.Feedback type="invalid">
            <Trans i18nKey="fidelity_bond.form_create.feedback_invalid_locktime_month">
              Please provide a valid value.
            </Trans>
          </rb.Form.Control.Feedback>
        </rb.Form.Group>
      </rb.Col>
    </rb.Row>
  )
}

const locktimeDisplayString = (lockdate: Api.Lockdate) => {
  return new Date(lockdateToTimestamp(lockdate)).toUTCString()
}

interface DepositFormAdvancedProps {
  title: React.ReactElement
  [key: string]: unknown
}
const DepositFormAdvanced = ({ title, ...props }: DepositFormAdvancedProps) => {
  const { t } = useTranslation()
  const currentWallet = useCurrentWallet()
  const [lockdate, setLockdate] = useState(dateToLockdate(initialLockdate()))
  const [address, setAddress] = useState(null)
  const [addressLockdate, setAddressLockdate] = useState<Api.Lockdate | null>(null)
  const addressLocktimeString = useMemo<string | null>(
    () => (addressLockdate ? locktimeDisplayString(addressLockdate) : null),
    [addressLockdate]
  )
  const [isLoading, setIsLoading] = useState(true)
  const [alert, setAlert] = useState<AlertWithMessage | null>(null)

  useEffect(() => {
    if (!currentWallet) return
    if (!lockdate) return

    const abortCtrl = new AbortController()
    const { name: walletName, token } = currentWallet

    setAlert(null)

    setAddress(null)
    setAddressLockdate(null)

    setIsLoading(true)

    Api.getAddressTimelockNew({ walletName, token, lockdate, signal: abortCtrl.signal })
      .then((res) =>
        res.ok ? res.json() : Api.Helper.throwError(res, t('fidelity_bond.error_loading_timelock_address_failed'))
      )
      .then((data) => {
        if (abortCtrl.signal.aborted) return

        setAddress(data.address)
        setAddressLockdate(lockdate)
      })
      // show the loader a little longer to avoid flickering
      .then((_) => new Promise((r) => setTimeout(r, 200)))
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })
      .finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [currentWallet, lockdate, t])

  return (
    <rb.Card {...props}>
      <rb.Card.Body>
        <rb.Card.Title>{title}</rb.Card.Title>

        {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}

        <rb.Form noValidate>
          <LockdateForm onChange={setLockdate} />
        </rb.Form>
        <rb.Row>
          <rb.Col>
            <rb.Toast style={{ width: 'auto' }}>
              <rb.Toast.Header closeButton={false}>
                {isLoading ? (
                  <div className="d-flex justify-content-center align-items-center">
                    <rb.Spinner animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                    {t('global.loading')}
                  </div>
                ) : (
                  <strong className="me-auto">
                    <Trans
                      i18nKey="fidelity_bond.form_create.text_expires_at"
                      values={{
                        addressLocktime: addressLocktimeString,
                      }}
                    >
                      Expires at: {addressLocktimeString}
                    </Trans>
                  </strong>
                )}
              </rb.Toast.Header>
              <rb.Toast.Body>
                <div
                  className="d-grid place-content-space-evenly justify-content-center text-center"
                  style={{ minHeight: '6rem' }}
                >
                  {!isLoading && address && (
                    <>
                      <div className="text-break slashed-zeroes">{address}</div>
                      <div className=" my-2">
                        <CopyButtonWithConfirmation
                          value={address}
                          text={t('global.button_copy_text')}
                          successText={t('global.button_copy_text_confirmed')}
                          disabled={!address || isLoading}
                        />{' '}
                      </div>
                    </>
                  )}
                </div>
              </rb.Toast.Body>
            </rb.Toast>
          </rb.Col>
        </rb.Row>
      </rb.Card.Body>
    </rb.Card>
  )
}

export const FidelityBondDevOnly = () => {
  const featureEnabled = isFeatureEnabled('fidelityBondsDevOnly')
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

  if (!featureEnabled) {
    return (
      <div>
        <h2>Feature not enabled</h2>
      </div>
    )
  }

  return (
    <div className={styles['fidelity-bond']}>
      <PageTitle title={t('fidelity_bond.title')} subtitle={t('fidelity_bond.subtitle')} />

      <rb.Row>
        <rb.Col>
          <div className="mb-4">
            <Link className="unstyled" to={routes.fidelityBonds}>
              Switch to default view.
            </Link>
          </div>

          <div className="mb-4">
            <Trans i18nKey="fidelity_bond.description">
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

          <rb.Alert variant="warning" className="mb-4">
            <Trans i18nKey="fidelity_bond.alert_warning_advanced_mode_active">
              You are in developer mode. It is assumed that you know what you are doing.
              <br />
              <small>
                e.g. a transaction creating a Fidelity Bond <b>should have no change</b>, etc.
              </small>
            </Trans>
          </rb.Alert>

          {isLoading ? (
            <div className="d-flex justify-content-center align-items-center">
              <rb.Spinner animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              {t('global.loading')}
            </div>
          ) : (
            <>
              {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}

              {fidelityBonds && (
                <>
                  <div className="mb-4">
                    <DepositFormAdvanced
                      title={<Trans i18nKey="fidelity_bond.form_create.title">Fidelity Bond</Trans>}
                    />
                  </div>

                  {fidelityBonds.length > 0 && (
                    <div className="mt-2 mb-4">
                      <h5>{t('current_wallet_advanced.title_fidelity_bonds')}</h5>
                      <DisplayUTXOs utxos={fidelityBonds} />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </rb.Col>
      </rb.Row>
    </div>
  )
}
