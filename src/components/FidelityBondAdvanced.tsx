import React, { useEffect, useState } from 'react'
import * as rb from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import { useCurrentWallet, useReloadCurrentWalletInfo, Utxos } from '../context/WalletContext'
import { CopyButtonWithConfirmation } from '../components/CopyButton'
import * as Api from '../libs/JmWalletApi'
// @ts-ignore
import DisplayUTXOs from './DisplayUTXOs'

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

interface LocktimeFormProps {
  onChange: (locktime: Api.Locktime) => void
  maxYears?: number
}
const LocktimeForm = ({ onChange, maxYears = DEFAULT_MAX_TIMELOCK_YEARS }: LocktimeFormProps) => {
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
            <Trans i18nKey="fidelity_bond.form_create.label_locktime_year">Year</Trans>
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
            <Trans i18nKey="fidelity_bond.form_create.feedback_invalid_locktime_month">
              Please provide a valid value.
            </Trans>
          </rb.Form.Control.Feedback>
        </rb.Form.Group>
      </rb.Col>
    </rb.Row>
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
                  <rb.Spinner animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
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

export const FidelityBondAdvanced = () => {
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
          <rb.Spinner animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          {t('global.loading')}
        </div>
      ) : (
        <>
          {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}

          {fidelityBonds && (
            <>
              {fidelityBonds.length === 0 ? (
                <>
                  <DepositFormAdvanced title={<Trans i18nKey="fidelity_bond.form_create.title">Fidelity Bond</Trans>} />
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
