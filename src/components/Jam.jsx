import React, { useState, useEffect, useCallback, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import { Formik, useFormikContext } from 'formik'
import * as Api from '../libs/JmWalletApi'
import { useSettings } from '../context/SettingsContext'
import { useServiceInfo, useReloadServiceInfo } from '../context/ServiceInfoContext'
import { useCurrentWallet, useCurrentWalletInfo, useReloadCurrentWalletInfo } from '../context/WalletContext'
import { isDebugFeatureEnabled } from '../constants/debugFeatures'
import { COINJOIN_PRECONDITIONS, useCoinjoinPreconditionSummary } from '../hooks/CoinjoinPrecondition'
import PageTitle from './PageTitle'
import ToggleSwitch from './ToggleSwitch'
import Sprite from './Sprite'
import Balance from './Balance'
import ScheduleProgress from './ScheduleProgress'

import styles from './Jam.module.css'

// When running the scheduler with internal destination addresses, the funds
// will end up on those 3 mixdepths (one UTXO each).
// Length of this array must be 3 for now.
const INTERNAL_DEST_ACCOUNTS = [0, 1, 2]
// Interval in milliseconds between requests to reload the schedule.
const SCHEDULER_STOP_RESPONSE_DELAY_MS = 2_000

const SCHEDULER_START_ACCOUNT = 0

const ValuesListener = ({ handler }) => {
  const { values } = useFormikContext()

  useEffect(() => {
    if (values.dest1 !== '' && values.dest2 !== '' && values.dest3 !== '') {
      handler()
    }
  }, [values, handler])

  return null
}

export default function Jam() {
  const { t } = useTranslation()
  const settings = useSettings()
  const serviceInfo = useServiceInfo()
  const reloadServiceInfo = useReloadServiceInfo()
  const wallet = useCurrentWallet()
  const walletInfo = useCurrentWalletInfo()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()

  const [alert, setAlert] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [destinationIsExternal, setDestinationIsExternal] = useState(false)
  const [collaborativeOperationRunning, setCollaborativeOperationRunning] = useState(false)

  const startJarUtxos = useMemo(() => {
    if (!walletInfo) return null

    return walletInfo.data.utxos.utxos.filter((it) => it.mixdepth === SCHEDULER_START_ACCOUNT)
  }, [walletInfo])

  const schedulerPreconditionSummary = useCoinjoinPreconditionSummary(startJarUtxos || [])
  const isSchedulerPreconditionsFulfilled = useMemo(
    () => schedulerPreconditionSummary.isFulfilled,
    [schedulerPreconditionSummary]
  )

  const [useInsecureTestingSettings, setUseInsecureTestingSettings] = useState(false)

  const initialFormValues = useMemo(() => {
    const addressCount = 3

    let destinationAddresses = Array(addressCount).fill('')

    return destinationAddresses.reduce((obj, addr, index) => ({ ...obj, [`dest${index + 1}`]: addr }), {})
  }, [destinationIsExternal])

  useEffect(() => {
    const abortCtrl = new AbortController()

    setAlert(null)
    setIsLoading(true)

    const loadingServiceInfo = reloadServiceInfo({ signal: abortCtrl.signal }).catch((err) => {
      const message = err.message || t('send.error_loading_wallet_failed')
      !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message })
    })

    const loadingWalletInfo = reloadCurrentWalletInfo({ signal: abortCtrl.signal }).catch((err) => {
      const message = err.message || t('send.error_loading_wallet_failed')
      !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message })
    })

    Promise.all([loadingServiceInfo, loadingWalletInfo]).finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [reloadServiceInfo, reloadCurrentWalletInfo, t])

  useEffect(() => {
    setCollaborativeOperationRunning(serviceInfo?.coinjoinInProgress || serviceInfo?.makerRunning || false)

    if (serviceInfo?.schedule && process.env.NODE_ENV === 'development') {
      console.table(serviceInfo.schedule)
    }
  }, [serviceInfo])

  const startSchedule = async (values) => {
    if (isLoading || collaborativeOperationRunning || !isSchedulerPreconditionsFulfilled) {
      return
    }

    setAlert(null)
    setIsLoading(true)

    const destinations = [values.dest1, values.dest2, values.dest3]

    const body = { destination_addresses: destinations }

    // Make sure schedule testing is really only used in dev mode.
    if (isDebugFeatureEnabled('insecureScheduleTesting') && useInsecureTestingSettings) {
      body.tumbler_options = {
        addrcount: 3,
        minmakercount: 1,
        makercountrange: [1, 0],
        mixdepthcount: 3,
        mintxcount: 2,
        txcountparams: [1, 1],
        timelambda: 0.1,
        stage1_timelambda_increase: 1.0,
        liquiditywait: 10,
        waittime: 1.0,
      }
    }

    const abortCtrl = new AbortController()
    return Api.postSchedulerStart({ signal: abortCtrl.signal, walletName: wallet.name, token: wallet.token }, body)
      .then((res) => (res.ok ? true : Api.Helper.throwError(res, t('scheduler.error_starting_schedule_failed'))))
      .then((_) => reloadServiceInfo({ signal: abortCtrl.signal }))
      .then((_) => setCollaborativeOperationRunning(true))
      .catch((err) => {
        setAlert({ variant: 'danger', message: err.message })
      })
      .finally(() => setIsLoading(false))
  }

  const stopSchedule = async () => {
    if (isLoading || !collaborativeOperationRunning) {
      return
    }

    setAlert(null)
    setIsLoading(true)

    const abortCtrl = new AbortController()
    return Api.getSchedulerStop({ signal: abortCtrl.signal, walletName: wallet.name, token: wallet.token })
      .then((res) => (res.ok ? true : Api.Helper.throwError(res, t('scheduler.error_stopping_schedule_failed'))))
      .then((_) => new Promise((r) => setTimeout(r, SCHEDULER_STOP_RESPONSE_DELAY_MS)))
      .then((_) => reloadServiceInfo({ signal: abortCtrl.signal }))
      .then((_) => setCollaborativeOperationRunning(false))
      .catch((err) => {
        setAlert({ variant: 'danger', message: err.message })
      })
      .finally(() => setIsLoading(false))
  }

  return (
    <>
      <PageTitle title={t('scheduler.title')} subtitle={t('scheduler.subtitle')} />
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}

      {isLoading ? (
        <rb.Placeholder as="div" animation="wave">
          <rb.Placeholder xs={12} className={styles['input-loader']} />
        </rb.Placeholder>
      ) : (
        <>
          {collaborativeOperationRunning && serviceInfo?.schedule && (
            <div className="mb-4">
              <ScheduleProgress schedule={serviceInfo.schedule} />
            </div>
          )}
          {collaborativeOperationRunning && serviceInfo && !serviceInfo.schedule && (
            <rb.Alert variant="info" className="mb-4">
              {t('send.text_coinjoin_already_running')}
            </rb.Alert>
          )}
          <rb.Fade
            in={!collaborativeOperationRunning && !isSchedulerPreconditionsFulfilled}
            mountOnEnter={true}
            unmountOnExit={true}
          >
            <rb.Alert variant="warning" className="mb-4">
              <>
                {schedulerPreconditionSummary.numberOfMissingUtxos > 0 ? (
                  <Trans i18nKey="scheduler.precondition.hint_missing_utxos">
                    To run the scheduler you need at least one UTXO with{' '}
                    <strong>{{ minConfirmations: COINJOIN_PRECONDITIONS.MIN_CONFIRMATIONS_OF_SINGLE_UTXO }}</strong>{' '}
                    confirmations. Fund your wallet and wait for{' '}
                    <strong>{{ minConfirmations: COINJOIN_PRECONDITIONS.MIN_CONFIRMATIONS_OF_SINGLE_UTXO }}</strong>{' '}
                    blocks.
                  </Trans>
                ) : schedulerPreconditionSummary.amountOfMissingConfirmations > 0 ? (
                  <Trans i18nKey="scheduler.precondition.hint_missing_confirmations">
                    The scheduler requires one of your UTXOs to have{' '}
                    <strong>
                      {{
                        /* this comment is a hack for "prettier" and prevents the removal of "{' '}" 
                           (which is essential for parameterized translations to work). */
                        minConfirmations: COINJOIN_PRECONDITIONS.MIN_CONFIRMATIONS_OF_SINGLE_UTXO,
                      }}
                    </strong>{' '}
                    or more confirmations. Wait for{' '}
                    <strong>
                      {{ amountOfMissingConfirmations: schedulerPreconditionSummary.amountOfMissingConfirmations }}
                    </strong>{' '}
                    more block(s).
                  </Trans>
                ) : (
                  schedulerPreconditionSummary.amountOfMissingOverallRetries > 0 && (
                    <Trans i18nKey="scheduler.precondition.hint_missing_overall_retries">
                      You've tried running the scheduler unsuccessfully too many times in a row. For security reasons,
                      you need a fresh UTXO to try again. See{' '}
                      <a
                        href="https://github.com/JoinMarket-Org/joinmarket/wiki/Sourcing-commitments-for-joins#sourcing-external-commitments"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        the docs
                      </a>{' '}
                      for more information.
                    </Trans>
                  )
                )}
              </>
            </rb.Alert>
          </rb.Fade>
          {!collaborativeOperationRunning && walletInfo && (
            <>
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center gap-2">
                  <Sprite symbol="checkmark" width="25" height="25" className="text-secondary" />
                  <div className="d-flex flex-column">
                    <div>{t('scheduler.complete_wallet_title')}</div>
                    <div className={`text-secondary ${styles['small-text']}`}>
                      {t('scheduler.complete_wallet_subtitle')}
                    </div>
                  </div>
                </div>
                <>
                  <Balance
                    valueString={`${walletInfo.balanceSummary.calculatedAvailableBalanceInSats}`}
                    convertToUnit={settings.unit}
                    showBalance={settings.showBalance}
                  />
                </>
              </div>
              <p className="text-secondary mb-4">{t('scheduler.description_destination_addresses')}</p>
            </>
          )}
          {((!collaborativeOperationRunning && walletInfo && serviceInfo) ||
            (collaborativeOperationRunning && serviceInfo?.schedule)) && (
            <Formik
              initialValues={initialFormValues}
              validate={(values) => {
                if (collaborativeOperationRunning) {
                  return {}
                }

                const errors = {}

                const isValidAddress = (candidate) => {
                  return typeof candidate !== 'undefined' && candidate !== ''
                }
                const isAddressReused = (destination, inputAddresses) => {
                  if (!destination) return false

                  const knownAddress = walletInfo?.addressSummary[destination] || false
                  const alreadyUsed = knownAddress && walletInfo?.addressSummary[destination]?.status !== 'new'
                  const duplicateEntry = inputAddresses.filter((it) => it === destination).length > 1

                  return alreadyUsed || duplicateEntry
                }

                const addressDict = Array(3)
                  .fill('')
                  .map((_, index) => {
                    const key = `dest${index + 1}`
                    return {
                      key,
                      address: values[key],
                    }
                  })
                const addresses = addressDict.map((it) => it.address)

                addressDict.forEach((addressEntry) => {
                  if (!isValidAddress(addressEntry.address)) {
                    errors[addressEntry.key] = t('scheduler.feedback_invalid_destination_address')
                  } else if (isAddressReused(addressEntry.address, addresses)) {
                    errors[addressEntry.key] = t('scheduler.feedback_reused_destination_address')
                  }
                })

                return errors
              }}
              onSubmit={async (values) => {
                if (collaborativeOperationRunning) {
                  await stopSchedule()
                } else {
                  await startSchedule(values)
                }
              }}
            >
              {({
                values,
                isSubmitting,
                handleSubmit,
                handleBlur,
                handleChange,
                setFieldValue,
                validateForm,
                isValid,
                dirty,
                touched,
                errors,
              }) => (
                <>
                  <ValuesListener handler={validateForm} />
                  <rb.Form onSubmit={handleSubmit} noValidate>
                    {!collaborativeOperationRunning && (
                      <>
                        {isDebugFeatureEnabled('insecureScheduleTesting') && (
                          <rb.Form.Group className="mb-4" controlId="offertype">
                            <ToggleSwitch
                              label={'Use insecure testing settings'}
                              subtitle={
                                "This is completely insecure but makes testing the schedule much faster. This option won't be available in production."
                              }
                              toggledOn={useInsecureTestingSettings}
                              onToggle={(isToggled) => setUseInsecureTestingSettings(isToggled)}
                              disabled={isSubmitting}
                            />
                          </rb.Form.Group>
                        )}
                      </>
                    )}
                    {!collaborativeOperationRunning &&
                      destinationIsExternal &&
                      [1, 2, 3].map((i) => {
                        return (
                          <rb.Form.Group className="mb-4" key={i} controlId={`dest${i}`}>
                            <rb.Form.Label>{t('scheduler.label_destination_input', { destination: i })}</rb.Form.Label>
                            <rb.Form.Control
                              name={`dest${i}`}
                              value={values[`dest${i}`]}
                              placeholder={t('scheduler.placeholder_destination_input')}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              isInvalid={touched[`dest${i}`] && !!errors[`dest${i}`]}
                              className={`${styles.input} slashed-zeroes`}
                            />
                            <rb.Form.Control.Feedback type="invalid">{errors[`dest${i}`]}</rb.Form.Control.Feedback>
                          </rb.Form.Group>
                        )
                      })}
                    {!collaborativeOperationRunning && (
                      <p className="text-secondary mb-4">{t('scheduler.description_fees')}</p>
                    )}
                    <rb.Button
                      className={styles.submit}
                      variant="dark"
                      type="submit"
                      disabled={
                        isSubmitting ||
                        isLoading ||
                        (!collaborativeOperationRunning && (!isValid || !isSchedulerPreconditionsFulfilled))
                      }
                    >
                      <div className="d-flex justify-content-center align-items-center">
                        {collaborativeOperationRunning ? t('scheduler.button_stop') : t('scheduler.button_start')}
                      </div>
                    </rb.Button>
                  </rb.Form>
                </>
              )}
            </Formik>
          )}
        </>
      )}
    </>
  )
}
