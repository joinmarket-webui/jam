import React, { useState, useEffect, useCallback, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Formik, useFormikContext } from 'formik'
import * as Api from '../libs/JmWalletApi'
import { useSettings } from '../context/SettingsContext'
import { useServiceInfo, useReloadServiceInfo } from '../context/ServiceInfoContext'
import { useCurrentWallet, useCurrentWalletInfo, useReloadCurrentWalletInfo } from '../context/WalletContext'
import { isDebugFeatureEnabled } from '../constants/debugFeatures'
import { buildCoinjoinRequirementSummary } from '../hooks/CoinjoinRequirements'
import { CoinjoinPreconditionViolationAlert } from './CoinjoinPreconditionViolationAlert'
import PageTitle from './PageTitle'
import ToggleSwitch from './ToggleSwitch'
import Sprite from './Sprite'
import Balance from './Balance'
import ScheduleProgress from './ScheduleProgress'

import styles from './Jam.module.css'

const DEST_ADDRESS_PROD = 3
const DEST_ADDRESS_TEST = 1

const addressValueKeys = (addressCount) =>
  Array(addressCount)
    .fill('')
    .map((_, index) => `dest${index + 1}`)

const ValuesListener = ({ handler, addressCount }) => {
  const { values } = useFormikContext()

  useEffect(() => {
    const allValuesPresent = addressValueKeys(addressCount)
      .map((key) => values[key])
      .every((val) => val !== '')
    if (allValuesPresent) {
      handler()
    }
  }, [values, handler, addressCount])

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
  const [schedule, setSchedule] = useState(null)
  const [isWaitingSchedulerStart, setIsWaitingSchedulerStart] = useState(false)
  const [isWaitingSchedulerStop, setIsWaitingSchedulerStop] = useState(false)
  const collaborativeOperationRunning = useMemo(
    () => serviceInfo?.coinjoinInProgress || serviceInfo?.makerRunning || false,
    [serviceInfo]
  )

  const schedulerPreconditionSummary = useMemo(
    () => buildCoinjoinRequirementSummary(walletInfo?.data.utxos.utxos || []),
    [walletInfo]
  )

  // Returns one fresh address for each requested mixdepth.
  const getNewAddresses = useCallback(
    (count, mixdepth = 0) => {
      if (!walletInfo) {
        throw new Error('Wallet info is not available.')
      }
      const externalBranch = walletInfo.data.display.walletinfo.accounts[mixdepth].branches.find((branch) => {
        return branch.branch.split('\t')[0] === 'external addresses'
      })

      const newEntries = externalBranch.entries.filter((entry) => entry.status === 'new').slice(0, count)

      if (newEntries.length !== count) {
        throw new Error(`Cannot find enough fresh addresses in mixdepth ${mixdepth}`)
      }

      return newEntries.map((it) => it.address)
    },
    [walletInfo]
  )

  const [useInsecureTestingSettings, setUseInsecureTestingSettings] = useState(false)
  const addressCount = useMemo(
    () => (useInsecureTestingSettings ? DEST_ADDRESS_TEST : DEST_ADDRESS_PROD),
    [useInsecureTestingSettings]
  )

  const initialFormValues = useMemo(() => {
    let destinationAddresses = Array(addressCount).fill('')
    if (useInsecureTestingSettings) {
      try {
        // prefill with addresses marked as "new"
        destinationAddresses = getNewAddresses(addressCount)
      } catch (e) {
        // on error initialize with empty addresses - form validation will do the rest
        destinationAddresses = Array(addressCount).fill('')
      }
    }

    return destinationAddresses.reduce((obj, addr, index) => ({ ...obj, [`dest${index + 1}`]: addr }), {})
  }, [addressCount, useInsecureTestingSettings, getNewAddresses])

  useEffect(() => {
    setAlert(null)
    setIsLoading(true)

    const abortCtrl = new AbortController()
    const loadingServiceInfo = reloadServiceInfo({ signal: abortCtrl.signal }).catch((err) => {
      if (abortCtrl.signal.aborted) return
      const message = err.message || t('send.error_loading_wallet_failed')
      setAlert({ variant: 'danger', message })
    })

    const loadingWalletInfo = reloadCurrentWalletInfo({ signal: abortCtrl.signal }).catch((err) => {
      if (abortCtrl.signal.aborted) return
      const message = err.message || t('send.error_loading_wallet_failed')
      setAlert({ variant: 'danger', message })
    })

    Promise.all([loadingServiceInfo, loadingWalletInfo]).finally(() => {
      if (abortCtrl.signal.aborted) return
      setIsLoading(false)
    })

    return () => {
      abortCtrl.abort()
    }
  }, [reloadServiceInfo, reloadCurrentWalletInfo, t])

  useEffect(() => {
    if (!serviceInfo) return

    const scheduleUpdate = serviceInfo.schedule
    setSchedule(scheduleUpdate)

    setIsWaitingSchedulerStart((current) => (current && scheduleUpdate ? false : current))
    setIsWaitingSchedulerStop((current) => (current && !scheduleUpdate ? false : current))

    if (scheduleUpdate && process.env.NODE_ENV === 'development') {
      console.table(scheduleUpdate)
    }
  }, [serviceInfo])

  useEffect(() => {
    // Due to polling, using `collaborativeOperationRunning` instead of
    // `schedule` here, as a schedule object might still be present when
    // the scheduler is actually not running anymore. Reload wallet data
    // only when no collaborative operation is running anymore.
    if (collaborativeOperationRunning) return

    setIsLoading(true)
    const abortCtrl = new AbortController()
    reloadCurrentWalletInfo({ signal: abortCtrl.signal }).finally(() => {
      if (abortCtrl.signal.aborted) return
      setIsLoading(false)
    })
    return () => {
      abortCtrl.abort()
    }
  }, [collaborativeOperationRunning, reloadCurrentWalletInfo])

  const startSchedule = async (values) => {
    if (isLoading || collaborativeOperationRunning) {
      return
    }

    setAlert(null)
    setIsWaitingSchedulerStart(true)

    const destinations = addressValueKeys(addressCount).map((key) => values[key])

    const body = { destination_addresses: destinations }

    // Make sure schedule testing is really only used in dev mode.
    if (isDebugFeatureEnabled('insecureScheduleTesting') && useInsecureTestingSettings) {
      // for a proper description of all parameters see
      // https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/v0.9.8/jmclient/jmclient/cli_options.py#L268
      body.tumbler_options = {
        addrcount: addressCount,
        minmakercount: 1,
        makercountrange: [1, 0],
        mixdepthcount: 2,
        mintxcount: 1,
        txcountparams: [1, 0],
        timelambda: 0.025, // 0.025 minutes := 1.5 seconds
        stage1_timelambda_increase: 1.0,
        liquiditywait: 10,
        waittime: 0.0,
      }
    }

    const abortCtrl = new AbortController()
    return Api.postSchedulerStart({ signal: abortCtrl.signal, walletName: wallet.name, token: wallet.token }, body)
      .then((res) => (res.ok ? true : Api.Helper.throwError(res, t('scheduler.error_starting_schedule_failed'))))
      .then((_) => reloadServiceInfo({ signal: abortCtrl.signal }))
      .catch((err) => {
        if (abortCtrl.signal.aborted) return
        setAlert({ variant: 'danger', message: err.message })
        setIsWaitingSchedulerStart(false)
      })
  }

  const stopSchedule = async () => {
    if (isLoading || !collaborativeOperationRunning) {
      return
    }

    setAlert(null)
    setIsWaitingSchedulerStop(true)

    const abortCtrl = new AbortController()
    return Api.getTakerStop({ signal: abortCtrl.signal, walletName: wallet.name, token: wallet.token })
      .then((res) => (res.ok ? true : Api.Helper.throwError(res, t('scheduler.error_stopping_schedule_failed'))))
      .then((_) => reloadServiceInfo({ signal: abortCtrl.signal }))
      .catch((err) => {
        if (abortCtrl.signal.aborted) return
        setAlert({ variant: 'danger', message: err.message })
        setIsWaitingSchedulerStop(false)
      })
  }

  return (
    <>
      <PageTitle title={t('scheduler.title')} subtitle={t('scheduler.subtitle')} />
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}

      {isLoading || isWaitingSchedulerStart || isWaitingSchedulerStop ? (
        <rb.Placeholder as="div" animation="wave">
          <rb.Placeholder xs={12} className={styles['input-loader']} />
        </rb.Placeholder>
      ) : (
        <>
          {collaborativeOperationRunning && (
            <div className="mb-4">
              {schedule ? (
                <ScheduleProgress schedule={schedule} />
              ) : (
                <rb.Alert variant="info">{t('send.text_coinjoin_already_running')}</rb.Alert>
              )}
            </div>
          )}
          <rb.Fade
            in={!collaborativeOperationRunning && !schedulerPreconditionSummary.isFulfilled}
            mountOnEnter={true}
            unmountOnExit={true}
            className="mb-4"
          >
            <CoinjoinPreconditionViolationAlert
              summary={schedulerPreconditionSummary}
              i18nPrefix="scheduler.precondition."
            />
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
            (collaborativeOperationRunning && schedule)) && (
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

                const addressDict = addressValueKeys(addressCount).map((key) => {
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
                  <ValuesListener handler={validateForm} addressCount={addressCount} />
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
                              onToggle={async (isToggled) => {
                                setUseInsecureTestingSettings(isToggled)
                                if (isToggled) {
                                  try {
                                    const newAddresses = getNewAddresses(DEST_ADDRESS_TEST)
                                    newAddresses.forEach((newAddress, index) => {
                                      setFieldValue(`dest${index + 1}`, newAddress, true)
                                    })
                                  } catch (e) {
                                    console.error('Could not get internal addresses.', e)

                                    addressValueKeys(DEST_ADDRESS_TEST).forEach((key) => {
                                      setFieldValue(key, '', true)
                                    })
                                  }
                                } else {
                                  addressValueKeys(DEST_ADDRESS_PROD).forEach((key) => {
                                    setFieldValue(key, '', false)
                                  })
                                }
                              }}
                              disabled={isSubmitting}
                            />
                          </rb.Form.Group>
                        )}
                      </>
                    )}
                    {!collaborativeOperationRunning &&
                      addressValueKeys(addressCount).map((key, index) => {
                        return (
                          <rb.Form.Group className="mb-4" key={key} controlId={key}>
                            <rb.Form.Label>
                              {t('scheduler.label_destination_input', { destination: index + 1 })}
                            </rb.Form.Label>
                            <rb.Form.Control
                              name={key}
                              value={values[key]}
                              placeholder={t('scheduler.placeholder_destination_input')}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              isInvalid={touched[key] && !!errors[key]}
                              className={`${styles.input} slashed-zeroes`}
                            />
                            <rb.Form.Control.Feedback type="invalid">{errors[key]}</rb.Form.Control.Feedback>
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
                      disabled={isSubmitting || isLoading || (!collaborativeOperationRunning && !isValid)}
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
