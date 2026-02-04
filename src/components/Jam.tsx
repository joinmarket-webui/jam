import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Formik, FormikErrors, FormikValues, useFormikContext } from 'formik'
import * as Api from '../libs/JmWalletApi'
import { useSettings } from '../context/SettingsContext'
import {
  useServiceInfo,
  useReloadServiceInfo,
  useDispatchServiceInfo,
  Schedule,
  StateFlag,
} from '../context/ServiceInfoContext'
import { CurrentWallet, useCurrentWalletInfo, useReloadCurrentWalletInfo, WalletInfo } from '../context/WalletContext'
import { isDebugFeatureEnabled, isDevMode } from '../constants/debugFeatures'
import { buildCoinjoinRequirementSummary } from '../hooks/CoinjoinRequirements'
import { CoinjoinPreconditionViolationAlert } from './CoinjoinPreconditionViolationAlert'
import PageTitle from './PageTitle'
import ToggleSwitch from './ToggleSwitch'
import Sprite from './Sprite'
import Balance from './Balance'
import ScheduleProgress from './ScheduleProgress'
import { ConfirmModal, ConfirmModalProps } from './Modal'
import FeeConfigModal from './settings/FeeConfigModal'
import { useFeeConfigValues } from '../hooks/Fees'
import styles from './Jam.module.css'
import { isFeatureEnabled } from '../constants/features'
import { startQuickWalletResync } from '../utils/walletResync'

const DEST_ADDRESS_COUNT_PROD = 3
const DEST_ADDRESS_COUNT_TEST = 1

const SCHEDULE_STALL_WARNING_TIMEOUT_MS: Milliseconds = isDevMode() ? 60_000 : 30 * 60_000
const QUICK_WALLET_RESYNC_LOOKBACK_BLOCKS = 2_016 // 2 weeks on mainnet
const SCHEDULE_ACTIVE_BROADCAST_TX_STORAGE_KEY = 'jam.scheduler.activeBroadcastTx'

const getActiveScheduleEntryIndex = (schedule: Schedule): number => schedule.findIndex((it) => it[6] !== 1)

const getNewAddressesForTesting = (
  walletInfo: WalletInfo,
  count: number,
  mixdepth: number,
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
  mixdepth = 0,
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
  inputAddresses: Api.BitcoinAddress[],
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

function useLatestTruthy<T>(val: T): [T | undefined, () => void] {
  const [prev, setPrev] = useState<T | undefined>(undefined)

  useEffect(() => {
    if (!!val) {
      setPrev(val)
    }
  }, [val])

  return [prev, () => setPrev(undefined)]
}

interface SchedulerSuccessMessageProps {
  schedule: Schedule
  onConfirm: () => void
}

function SchedulerSuccessMessage({ schedule, onConfirm }: SchedulerSuccessMessageProps) {
  const { t } = useTranslation()

  return (
    <>
      <PageTitle
        success={true}
        center={true}
        title={t('scheduler.success.title')}
        subtitle={t('scheduler.success.subtitle', { count: schedule.length })}
      />

      <div className="d-flex justify-content-center">
        <rb.Button
          variant="outline-dark"
          className="border-0 mb-2 d-inline-flex align-items-center"
          onClick={() => onConfirm()}
        >
          {t('scheduler.success.text_button_submit')}
          <Sprite symbol="caret-right" width="24" height="24" className="ms-1" />
        </rb.Button>
      </div>
    </>
  )
}

type ScheduleConfirmModalProps = Omit<ConfirmModalProps, 'title'>

function ScheduleConfirmModal(props: ScheduleConfirmModalProps) {
  const { t } = useTranslation()
  return (
    <ConfirmModal title={t('scheduler.confirm_modal.title')} {...props}>
      {t('scheduler.confirm_modal.body')}
    </ConfirmModal>
  )
}

interface JamProps {
  wallet: CurrentWallet
}

export default function Jam({ wallet }: JamProps) {
  const { t } = useTranslation()
  const settings = useSettings()
  const serviceInfo = useServiceInfo()
  const reloadServiceInfo = useReloadServiceInfo()
  const dispatchServiceInfo = useDispatchServiceInfo()
  const walletInfo = useCurrentWalletInfo()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()

  const [alert, setAlert] = useState<SimpleAlert>()
  const [isLoading, setIsLoading] = useState(true)
  const [showFeeConfigModal, setShowFeeConfigModal] = useState(false)
  const [isWaitingSchedulerStart, setIsWaitingSchedulerStart] = useState(false)
  const [isWaitingSchedulerStop, setIsWaitingSchedulerStop] = useState(false)
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null)
  const currentScheduleRef = useRef<Schedule | null>(null)
  const [lastKnownSchedule, resetLastKnownSchedule] = useLatestTruthy(currentSchedule ?? undefined)
  const [isShowSuccessMessage, setIsShowSuccessMessage] = useState(false)
  const [activeBroadcastTx, setActiveBroadcastTx] = useState<{ txid: Api.TxId; scheduleIndex: number } | null>(null)
  const [activeBroadcastTxSeenAt, setActiveBroadcastTxSeenAt] = useState<number | null>(null)
  const [showScheduleStallRecovery, setShowScheduleStallRecovery] = useState(false)
  const [isResyncingWalletState, setIsResyncingWalletState] = useState(false)
  const [feeConfigValues, reloadFeeConfigValues] = useFeeConfigValues()
  const [showScheduleConfirmModal, setShowScheduleConfirmModal] = useState(false)
  const maxFeesConfigMissing = useMemo(
    () =>
      feeConfigValues && (feeConfigValues.max_cj_fee_abs === undefined || feeConfigValues.max_cj_fee_rel === undefined),
    [feeConfigValues],
  )

  const isRescanningInProgress = useMemo(() => serviceInfo?.rescanning === true, [serviceInfo])
  const isRescanChainSupported = useMemo(() => {
    if (!serviceInfo) return false
    // If the server version is unknown (e.g. temporarily unavailable), still allow trying to rescan.
    if (!serviceInfo.server) return true
    return isFeatureEnabled('rescanChain', serviceInfo)
  }, [serviceInfo])

  const collaborativeOperationRunning = useMemo(
    () => serviceInfo?.coinjoinInProgress || serviceInfo?.makerRunning || false,
    [serviceInfo],
  )

  const isOperationDisabled = useMemo(
    () => maxFeesConfigMissing || collaborativeOperationRunning || isRescanningInProgress,
    [maxFeesConfigMissing, collaborativeOperationRunning, isRescanningInProgress],
  )

  const schedulerPreconditionSummary = useMemo(
    () => buildCoinjoinRequirementSummary(walletInfo?.data.utxos.utxos || []),
    [walletInfo],
  )

  const [useInsecureTestingSettings, setUseInsecureTestingSettings] = useState(false)
  const addressCount = useMemo(
    () => (useInsecureTestingSettings ? DEST_ADDRESS_COUNT_TEST : DEST_ADDRESS_COUNT_PROD),
    [useInsecureTestingSettings],
  )

  const initialFormValues = useMemo<FormikValues>(() => {
    let destinationAddresses: Array<Api.BitcoinAddress | ''> = Array(addressCount).fill('')
    if (useInsecureTestingSettings) {
      // prefill with addresses marked as "new"
      destinationAddresses = getNewAddressesForTestingOrEmpty(walletInfo, addressCount)
    }

    return destinationAddresses.reduce((obj, addr, index) => ({ ...obj, [`dest${index + 1}`]: addr }), {})
  }, [addressCount, useInsecureTestingSettings, walletInfo])

  const reloadData = useCallback(
    ({ signal }: { signal: AbortSignal }) => {
      setAlert(undefined)
      setIsLoading(true)

      return Promise.all([reloadServiceInfo({ signal }), reloadCurrentWalletInfo.reloadUtxos({ signal })])
        .catch((err) => {
          if (signal.aborted) return
          // reusing "wallet failed" message here is okay, as session info also contains wallet information
          const message = t('global.errors.error_loading_wallet_failed', {
            reason: err.message || t('global.errors.reason_unknown'),
          })
          setAlert({ variant: 'danger', message })
        })
        .finally(() => {
          if (signal.aborted) return
          setIsLoading(false)
        })
    },
    [reloadServiceInfo, reloadCurrentWalletInfo, t],
  )

  useEffect(() => {
    const abortCtrl = new AbortController()
    reloadData({ signal: abortCtrl.signal })
    return () => {
      abortCtrl.abort()
    }
  }, [collaborativeOperationRunning, reloadData])

  useEffect(() => {
    if (!serviceInfo) return

    const scheduleUpdate = serviceInfo.schedule
    setCurrentSchedule(scheduleUpdate)

    setIsWaitingSchedulerStart((current) => (current && scheduleUpdate ? false : current))
    setIsWaitingSchedulerStop((current) => (current && !scheduleUpdate ? false : current))

    if (scheduleUpdate && process.env.NODE_ENV === 'development') {
      console.table(scheduleUpdate)
    }
  }, [serviceInfo])

  useEffect(() => {
    currentScheduleRef.current = currentSchedule
  }, [currentSchedule])

  useEffect(() => {
    if (!currentSchedule) {
      setActiveBroadcastTx(null)
      return
    }

    const activeIndex = getActiveScheduleEntryIndex(currentSchedule)
    if (activeIndex < 0) {
      setActiveBroadcastTx(null)
      return
    }

    const stateFlag = currentSchedule[activeIndex][6]
    if (typeof stateFlag === 'string') {
      setActiveBroadcastTx((prev) =>
        prev && prev.txid === stateFlag && prev.scheduleIndex === activeIndex
          ? prev
          : { txid: stateFlag, scheduleIndex: activeIndex },
      )
      return
    }

    setActiveBroadcastTx(null)
  }, [currentSchedule])

  useEffect(() => {
    if (!activeBroadcastTx) {
      setActiveBroadcastTxSeenAt(null)
      setShowScheduleStallRecovery(false)
      try {
        sessionStorage.removeItem(SCHEDULE_ACTIVE_BROADCAST_TX_STORAGE_KEY)
      } catch (_) {
        // ignore
      }
      return
    }

    setShowScheduleStallRecovery(false)

    const now = Date.now()
    let seenAt = now

    try {
      const stored = sessionStorage.getItem(SCHEDULE_ACTIVE_BROADCAST_TX_STORAGE_KEY)
      const parsed = stored ? JSON.parse(stored) : null

      const matchesActive =
        parsed &&
        typeof parsed === 'object' &&
        parsed.walletFileName === wallet.walletFileName &&
        parsed.txid === activeBroadcastTx.txid &&
        parsed.scheduleIndex === activeBroadcastTx.scheduleIndex &&
        typeof parsed.seenAt === 'number'

      if (matchesActive) {
        seenAt = parsed.seenAt
      } else {
        sessionStorage.setItem(
          SCHEDULE_ACTIVE_BROADCAST_TX_STORAGE_KEY,
          JSON.stringify({
            walletFileName: wallet.walletFileName,
            txid: activeBroadcastTx.txid,
            scheduleIndex: activeBroadcastTx.scheduleIndex,
            seenAt: now,
          }),
        )
      }
    } catch (_) {
      // ignore
    }

    setActiveBroadcastTxSeenAt(seenAt)
  }, [activeBroadcastTx, wallet.walletFileName])

  useEffect(() => {
    if (!activeBroadcastTx || activeBroadcastTxSeenAt === null) return

    const elapsed = Date.now() - activeBroadcastTxSeenAt

    const reportStall = () => {
      const active = activeBroadcastTx
      const scheduleEntry = currentScheduleRef.current?.[active.scheduleIndex]
      console.warn('SWEEP_TX_STALLED', {
        event: 'SWEEP_TX_STALLED',
        txid: active.txid,
        scheduleIndex: active.scheduleIndex,
        scheduleEntry,
      })
      setShowScheduleStallRecovery(true)
    }

    if (elapsed >= SCHEDULE_STALL_WARNING_TIMEOUT_MS) {
      reportStall()
      return
    }

    const remaining = Math.max(0, SCHEDULE_STALL_WARNING_TIMEOUT_MS - elapsed)
    const stallTimer = setTimeout(reportStall, remaining)

    return () => clearTimeout(stallTimer)
  }, [activeBroadcastTx, activeBroadcastTxSeenAt])

  useEffect(() => {
    const stillRunningOrManualAbort =
      !walletInfo || isWaitingSchedulerStop || currentSchedule !== null || lastKnownSchedule === undefined

    if (stillRunningOrManualAbort) {
      setIsShowSuccessMessage(false)
    } else {
      const isInMempoolOrSuccess = (it: StateFlag) => it === 1 || typeof it === 'string'

      const firstEntriesSuccess = lastKnownSchedule
        .slice(0, -1)
        .map((it) => it[6])
        .every((it) => it === 1 || typeof it === 'string')

      const lastEntryState = lastKnownSchedule[lastKnownSchedule.length - 1][6]
      const lastEntrySuccess = isInMempoolOrSuccess(lastEntryState)

      // Workaround to prevent race conditions: Since the schedule info is polled,
      // it'll be possible that the latest known state still has the success flag
      // of the last entry set to `0`, although the schedule was completed successfully.
      // In this case, additionally check that every remaining UTXO is frozen
      // (indicating the opteration was successfully completed).
      // Hint: In dev mode, this will only work if you send coins to an external wallet.
      const allUtxosFrozen = walletInfo.data.utxos.utxos.every((it) => it.frozen)

      setIsShowSuccessMessage(firstEntriesSuccess && (lastEntrySuccess || allUtxosFrozen))
    }
  }, [currentSchedule, lastKnownSchedule, isWaitingSchedulerStop, walletInfo])

  const startSchedule = async (values: FormikValues) => {
    if (isLoading || collaborativeOperationRunning || isOperationDisabled) {
      return
    }

    setAlert(undefined)
    setShowScheduleConfirmModal(false)
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
        liquiditywait: 13,
        waittime: 0.0,
      }
    }

    const abortCtrl = new AbortController()
    return Api.postSchedulerStart({ ...wallet, signal: abortCtrl.signal }, body)
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
    return Api.getTakerStop({ ...wallet, signal: abortCtrl.signal })
      .then((res) => (res.ok ? true : Api.Helper.throwError(res, t('scheduler.error_stopping_schedule_failed'))))
      .then((_) => reloadServiceInfo({ signal: abortCtrl.signal }))
      .catch((err) => {
        if (abortCtrl.signal.aborted) return
        setAlert({ variant: 'danger', message: err.message })
        setIsWaitingSchedulerStop(false)
      })
  }

  const stopScheduleAndResyncWalletState = async () => {
    if (isRescanningInProgress || isResyncingWalletState) return

    setAlert(undefined)
    setIsResyncingWalletState(true)

    const txid = activeBroadcastTx?.txid
    const scheduleIndex = activeBroadcastTx?.scheduleIndex

    try {
      if (currentSchedule) {
        setAlert({ variant: 'info', message: t('scheduler.recovery.text_stopping_scheduler') })
        const stopped = await stopSchedule()
        if (!stopped) return
      }

      if (!isRescanChainSupported) {
        setAlert({ variant: 'warning', message: t('scheduler.recovery.error_rescan_not_supported') })
        return
      }

      setAlert({ variant: 'info', message: t('scheduler.recovery.text_resyncing_wallet_state') })

      const abortCtrl = new AbortController()
      const { chainTipHeight, startHeight } = await startQuickWalletResync({
        wallet,
        signal: abortCtrl.signal,
        lookbackBlocks: QUICK_WALLET_RESYNC_LOOKBACK_BLOCKS,
      })

      dispatchServiceInfo({ rescanning: true })
      await reloadServiceInfo({ signal: abortCtrl.signal })

      console.warn('SWEEP_TX_REPLACED', {
        event: 'SWEEP_TX_REPLACED',
        originalTxid: txid,
        scheduleIndex,
        scheduleEntry: scheduleIndex !== undefined ? currentScheduleRef.current?.[scheduleIndex] : undefined,
        chainTipHeight,
        startHeight,
      })
    } catch (e: any) {
      const message = t('scheduler.recovery.error_resyncing_wallet_state_failed', {
        reason: e.message || t('global.errors.reason_unknown'),
      })
      setAlert({ variant: 'danger', message })
    } finally {
      setIsResyncingWalletState(false)
    }
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
              {!currentSchedule ? (
                <rb.Alert variant="info">{t('send.text_coinjoin_already_running')}</rb.Alert>
              ) : (
                <>
                  <div className="mb-4">
                    {showScheduleStallRecovery && activeBroadcastTx && (
                      <rb.Alert variant="warning" className="slashed-zeroes">
                        <rb.Alert.Heading>{t('scheduler.recovery.alert_stalled_heading')}</rb.Alert.Heading>
                        <div className="d-flex flex-column gap-2">
                          <div>{t('scheduler.recovery.alert_stalled_body')}</div>
                          <div className="small">
                            <span className="text-secondary">{t('scheduler.recovery.label_txid')}: </span>
                            <span className="font-monospace break-word">{activeBroadcastTx.txid}</span>
                          </div>

                          <div className="d-flex flex-wrap gap-2 mt-2">
                            <rb.Button
                              variant="dark"
                              disabled={!isRescanChainSupported || isResyncingWalletState || isRescanningInProgress}
                              onClick={() => stopScheduleAndResyncWalletState()}
                            >
                              {isResyncingWalletState ? (
                                <>
                                  <rb.Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                    className="me-2"
                                  />
                                  {t('scheduler.recovery.button_stop_and_resync_loading')}
                                </>
                              ) : (
                                <>{t('scheduler.recovery.button_stop_and_resync')}</>
                              )}
                            </rb.Button>

                            <rb.Button
                              variant="outline-dark"
                              disabled={isResyncingWalletState || isRescanningInProgress}
                              onClick={() => stopSchedule()}
                            >
                              {t('scheduler.recovery.button_stop_scheduler')}
                            </rb.Button>

                            <rb.Button
                              variant="outline-dark"
                              disabled={isResyncingWalletState || isRescanningInProgress}
                              onClick={async () => {
                                const abortCtrl = new AbortController()
                                await reloadData({ signal: abortCtrl.signal })
                              }}
                            >
                              {t('scheduler.recovery.button_refresh')}
                            </rb.Button>
                          </div>

                          {!isRescanChainSupported && (
                            <div className="text-secondary small">
                              {t('scheduler.recovery.hint_rescan_not_supported')}
                            </div>
                          )}
                        </div>
                      </rb.Alert>
                    )}
                    <ScheduleProgress schedule={currentSchedule} />
                  </div>

                  <rb.Button
                    className="w-100 mb-4"
                    variant="dark"
                    size="lg"
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
              {isShowSuccessMessage && lastKnownSchedule ? (
                <div className="py-4">
                  <SchedulerSuccessMessage
                    schedule={lastKnownSchedule}
                    onConfirm={async () => {
                      setIsShowSuccessMessage(false)
                      resetLastKnownSchedule()

                      const abortCtrl = new AbortController()
                      await reloadData({ signal: abortCtrl.signal })
                    }}
                  />
                </div>
              ) : (
                <>
                  {maxFeesConfigMissing && (
                    <rb.Alert className="slashed-zeroes" variant="danger">
                      {t('send.taker_error_message_max_fees_config_missing')}
                      &nbsp;
                      <rb.Alert.Link onClick={() => setShowFeeConfigModal(true)}>
                        {t('settings.show_fee_config')}
                      </rb.Alert.Link>
                    </rb.Alert>
                  )}
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
                        <div className="text-secondary text-small">{t('scheduler.complete_wallet_subtitle')}</div>
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
                      touched,
                      errors,
                    }) => (
                      <>
                        <ValuesListener handler={validateForm} addressCount={addressCount} />
                        <rb.Form onSubmit={handleSubmit} noValidate>
                          {isDebugFeatureEnabled('insecureScheduleTesting') && (
                            <rb.Form.Group className="mb-4" controlId="offertype">
                              <ToggleSwitch
                                label={
                                  <>
                                    Use insecure testing settings
                                    <span className="ms-2 badge rounded-pill bg-warning">dev</span>
                                  </>
                                }
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
                                        DEST_ADDRESS_COUNT_TEST,
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
                                disabled={isOperationDisabled || isSubmitting}
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
                                  disabled={isOperationDisabled || isSubmitting}
                                />
                                <rb.Form.Control.Feedback type="invalid">
                                  <>{errors[key]}</>
                                </rb.Form.Control.Feedback>
                              </rb.Form.Group>
                            )
                          })}

                          <p className="text-secondary mb-4">{t('scheduler.description_fees')}</p>
                          <rb.Button
                            className="w-100 mb-4"
                            variant="dark"
                            size="lg"
                            disabled={isOperationDisabled || isSubmitting || !isValid}
                            onClick={() => setShowScheduleConfirmModal(true)}
                          >
                            <div className="d-flex justify-content-center align-items-center">
                              {t('scheduler.button_start')}
                              <Sprite symbol="caret-right" width="24" height="24" className="ms-1" />
                            </div>
                          </rb.Button>
                          <ScheduleConfirmModal
                            isShown={showScheduleConfirmModal}
                            onCancel={() => setShowScheduleConfirmModal(false)}
                            onConfirm={handleSubmit}
                            disabled={isOperationDisabled || isSubmitting || !isValid}
                          />
                        </rb.Form>
                      </>
                    )}
                  </Formik>

                  <rb.Row className="mt-2 mb-4">
                    <rb.Col className="d-flex justify-content-center">
                      <rb.Button
                        variant="outline-dark"
                        className="border-0 mb-2 d-inline-flex align-items-center"
                        onClick={() => setShowFeeConfigModal(true)}
                      >
                        <Sprite symbol="coins" width="24" height="24" className="me-1" />
                        {t('settings.show_fee_config')}
                      </rb.Button>
                      {showFeeConfigModal && (
                        <FeeConfigModal
                          show={showFeeConfigModal}
                          onSuccess={() => reloadFeeConfigValues()}
                          onHide={() => setShowFeeConfigModal(false)}
                          defaultActiveSectionKey={'cj_fee'}
                        />
                      )}
                    </rb.Col>
                  </rb.Row>
                </>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}
