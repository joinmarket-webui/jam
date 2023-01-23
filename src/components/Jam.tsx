import { useState, useEffect, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Formik, FormikErrors, FormikValues, useFormikContext } from 'formik'
import * as Api from '../libs/JmWalletApi'
import { useSettings } from '../context/SettingsContext'
import { useServiceInfo, useReloadServiceInfo, Schedule } from '../context/ServiceInfoContext'
import { CurrentWallet, useCurrentWalletInfo, useReloadCurrentWalletInfo, WalletInfo } from '../context/WalletContext'
import { isDebugFeatureEnabled } from '../constants/debugFeatures'
import { buildCoinjoinRequirementSummary } from '../hooks/CoinjoinRequirements'
import { CoinjoinPreconditionViolationAlert } from './CoinjoinPreconditionViolationAlert'
import PageTitle from './PageTitle'
import ToggleSwitch from './ToggleSwitch'
import Sprite from './Sprite'
import Balance from './Balance'
import ScheduleProgress from './ScheduleProgress'
import FeeConfigModal from './settings/FeeConfigModal'

import styles from './Jam.module.css'

const DEST_ADDRESS_COUNT_PROD = 3
const DEST_ADDRESS_COUNT_TEST = 1

const getNewAddressesForTesting = (
  walletInfo: WalletInfo,
  count: number,
  mixdepth: number
): Array<Api.BitcoinAddress> => {
  const externalBranch = walletInfo.data.display.walletinfo.accounts[mixdepth].branches.find((branch) => {
    return branch.branch.split('\t')[0] === 'external addresses'
  })

  const newEntries = (externalBranch?.entries || []).filter((entry) => entry.status === 'new').slice(0, count)

  if (newEntries.length !== count) {
    throw new Error(`Cannot find enough fresh addresses in mixdepth ${mixdepth}`)
  }

  return newEntries.map((it) => it.address)
}

const getNewAddressesForTestingOrEmpty = (
  walletInfo: WalletInfo | undefined,
  count: number,
  mixdepth = 0
): Array<Api.BitcoinAddress | ''> => {
  if (!walletInfo) {
    return Array(count).fill('')
  }

  try {
    return getNewAddressesForTesting(walletInfo, count, mixdepth)
  } catch (e) {
    console.log('Error while getting test addresses', e)
    return Array(count).fill('')
  }
}

const addressValueKeys = (addressCount: number) =>
  Array(addressCount)
    .fill('')
    .map((_, index) => `dest${index + 1}`)

const isValidAddress = (candidate: any) => {
  return typeof candidate === 'string' && candidate !== ''
}
const isAddressReused = (
  walletInfo: WalletInfo,
  destination: Api.BitcoinAddress,
  inputAddresses: Api.BitcoinAddress[]
) => {
  if (!destination) return false

  const knownAddress = walletInfo.addressSummary[destination] || false
  const alreadyUsed = knownAddress && walletInfo.addressSummary[destination]?.status !== 'new'
  const duplicateEntry = inputAddresses.filter((it) => it === destination).length > 1

  return alreadyUsed || duplicateEntry
}

interface ValueListenerProps {
  handler: (values?: any) => Promise<FormikErrors<any>>
  addressCount: number
}

const ValuesListener = ({ handler, addressCount }: ValueListenerProps) => {
  const { values } = useFormikContext<any>()

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

interface JamProps {
  wallet: CurrentWallet
}

export default function Jam({ wallet }: JamProps) {
  const { t } = useTranslation()
  const settings = useSettings()
  const serviceInfo = useServiceInfo()
  const reloadServiceInfo = useReloadServiceInfo()
  const walletInfo = useCurrentWalletInfo()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()

  const [alert, setAlert] = useState<SimpleAlert>()
  const [isLoading, setIsLoading] = useState(true)
  const [showingFeeConfig, setShowingFeeConfig] = useState(false)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
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

  const [useInsecureTestingSettings, setUseInsecureTestingSettings] = useState(false)
  const addressCount = useMemo(
    () => (useInsecureTestingSettings ? DEST_ADDRESS_COUNT_TEST : DEST_ADDRESS_COUNT_PROD),
    [useInsecureTestingSettings]
  )

  const initialFormValues = useMemo<FormikValues>(() => {
    let destinationAddresses: Array<Api.BitcoinAddress | ''> = Array(addressCount).fill('')
    if (useInsecureTestingSettings) {
      // prefill with addresses marked as "new"
      destinationAddresses = getNewAddressesForTestingOrEmpty(walletInfo, addressCount)
    }

    return destinationAddresses.reduce((obj, addr, index) => ({ ...obj, [`dest${index + 1}`]: addr }), {})
  }, [addressCount, useInsecureTestingSettings, walletInfo])

  useEffect(() => {
    setAlert(undefined)
    setIsLoading(true)

    const abortCtrl = new AbortController()
    const loadingServiceInfo = reloadServiceInfo({ signal: abortCtrl.signal }).catch((err) => {
      if (abortCtrl.signal.aborted) return
      // reusing "wallet failed" message here is okay, as session info also contains wallet information
      const message = t('global.errors.error_loading_wallet_failed', {
        reason: err.message || t('global.errors.reason_unknown'),
      })
      setAlert({ variant: 'danger', message })
    })

    const loadingWalletInfo = reloadCurrentWalletInfo.reloadUtxos({ signal: abortCtrl.signal }).catch((err) => {
      if (abortCtrl.signal.aborted) return
      const message = t('global.errors.error_loading_wallet_failed', {
        reason: err.message || t('global.errors.reason_unknown'),
      })
      setAlert({ variant: 'danger', message })
    })

    Promise.all([loadingServiceInfo, loadingWalletInfo]).finally(() => {
      if (abortCtrl.signal.aborted) return
      setIsLoading(false)
    })

    return () => {
      abortCtrl.abort()
    }
  }, [collaborativeOperationRunning, reloadServiceInfo, reloadCurrentWalletInfo, t])

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

  const startSchedule = async (values: FormikValues) => {
    if (isLoading || collaborativeOperationRunning) {
      return
    }

    setAlert(undefined)
    setIsWaitingSchedulerStart(true)

    const destinations = addressValueKeys(addressCount).map((key) => values[key])

    const body: Api.StartSchedulerRequest = {
      destination_addresses: destinations,
    }

    // Make sure schedule testing is really only used in dev mode.
    if (isDebugFeatureEnabled('insecureScheduleTesting') && useInsecureTestingSettings) {
      // for a proper description of all parameters see
      // https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/v0.9.8/jmclient/jmclient/cli_options.py#L268
      body.tumbler_options = {
        addrcount: addressCount,
        minmakercount: 1,
        makercountrange: [1, 0],
        mixdepthcount: addressCount,
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

    setAlert(undefined)
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

      {isLoading || !serviceInfo || !walletInfo || isWaitingSchedulerStart || isWaitingSchedulerStop ? (
        <rb.Placeholder as="div" animation="wave">
          <rb.Placeholder xs={12} className={styles['input-loader']} />
        </rb.Placeholder>
      ) : (
        <>
          {collaborativeOperationRunning ? (
            <>
              {!schedule ? (
                <rb.Alert variant="info">{t('send.text_coinjoin_already_running')}</rb.Alert>
              ) : (
                <>
                  <div className="mb-4">
                    <ScheduleProgress schedule={schedule} />
                  </div>

                  <rb.Button
                    className={styles.submit}
                    variant="dark"
                    disabled={isLoading}
                    onClick={async () => {
                      await stopSchedule()
                    }}
                  >
                    <div className="d-flex justify-content-center align-items-center">{t('scheduler.button_stop')}</div>
                  </rb.Button>
                </>
              )}
            </>
          ) : (
            <>
              <rb.Fade
                in={!schedulerPreconditionSummary.isFulfilled}
                mountOnEnter={true}
                unmountOnExit={true}
                className="mb-4"
              >
                <CoinjoinPreconditionViolationAlert
                  summary={schedulerPreconditionSummary}
                  i18nPrefix="scheduler.precondition."
                />
              </rb.Fade>

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

              <Formik
                initialValues={initialFormValues}
                validate={(values) => {
                  const errors = {} as FormikErrors<FormikValues>

                  const addressDict = addressValueKeys(addressCount).map((key) => {
                    return {
                      key,
                      address: values[key],
                    }
                  })
                  const addresses = addressDict.map((it) => it.address)

                  addressDict.forEach((addressEntry) => {
                    if (!isValidAddress(addressEntry.address)) {
                      errors[addressEntry.key] = t('scheduler.feedback_invalid_destination_address') as string
                    } else if (isAddressReused(walletInfo, addressEntry.address, addresses)) {
                      errors[addressEntry.key] = t('scheduler.feedback_reused_destination_address') as string
                    }
                  })

                  return errors
                }}
                onSubmit={async (values) => {
                  await startSchedule(values)
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
                                  const newAddresses = getNewAddressesForTestingOrEmpty(
                                    walletInfo,
                                    DEST_ADDRESS_COUNT_TEST
                                  )
                                  newAddresses.forEach((newAddress, index) => {
                                    setFieldValue(`dest${index + 1}`, newAddress, true)
                                  })
                                } catch (e) {
                                  console.error('Could not get internal addresses.', e)

                                  addressValueKeys(DEST_ADDRESS_COUNT_TEST).forEach((key) => {
                                    setFieldValue(key, '', true)
                                  })
                                }
                              } else {
                                addressValueKeys(DEST_ADDRESS_COUNT_PROD).forEach((key) => {
                                  setFieldValue(key, '', false)
                                })
                              }
                            }}
                            disabled={isSubmitting}
                          />
                        </rb.Form.Group>
                      )}
                      {addressValueKeys(addressCount).map((key, index) => {
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

                      <p className="text-secondary mb-4">{t('scheduler.description_fees')}</p>

                      <rb.Button
                        className={styles.submit}
                        variant="dark"
                        type="submit"
                        disabled={isSubmitting || !isValid}
                      >
                        <div className="d-flex justify-content-center align-items-center">
                          {t('scheduler.button_start')}
                        </div>
                      </rb.Button>
                    </rb.Form>
                  </>
                )}
              </Formik>

              <rb.Row className="mt-5 mb-3">
                <rb.Col className="d-flex justify-content-center">
                  <rb.Button
                    variant="outline-dark"
                    className="border-0 mb-2 d-inline-flex align-items-center"
                    onClick={() => setShowingFeeConfig(true)}
                  >
                    <Sprite symbol="coins" width="24" height="24" className="me-1" />
                    {t('settings.show_fee_config')}
                  </rb.Button>
                  {showingFeeConfig && (
                    <FeeConfigModal show={showingFeeConfig} onHide={() => setShowingFeeConfig(false)} />
                  )}
                </rb.Col>
              </rb.Row>
            </>
          )}
        </>
      )}
    </>
  )
}
