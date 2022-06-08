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
import LockdateForm, {
  toYearsRange,
  lockdateToTimestamp,
  DEFAULT_MAX_TIMELOCK_YEARS,
} from './fidelity_bond/LockdateForm'

type AlertWithMessage = rb.AlertProps & { message: string }

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

  const yearsRange = useMemo(() => toYearsRange(-1, DEFAULT_MAX_TIMELOCK_YEARS), [])
  const [lockdate, setLockdate] = useState<Api.Lockdate | null>(null)
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
          <LockdateForm onChange={setLockdate} yearsRange={yearsRange} />
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
