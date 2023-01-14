import { useEffect, useState, useMemo, useRef, FormEventHandler } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import * as rb from 'react-bootstrap'
import classNames from 'classnames'
import PageTitle from '../PageTitle'
import ToggleSwitch from '../ToggleSwitch'
import Sprite from '../Sprite'
import Balance from '../Balance'
import { ConfirmModal } from '../Modal'
import JarSelectorModal from '../JarSelectorModal'
import { PaymentConfirmModal } from '../PaymentConfirmModal'
import { CoinjoinPreconditionViolationAlert } from '../CoinjoinPreconditionViolationAlert'

import { useReloadCurrentWalletInfo, useCurrentWalletInfo, CurrentWallet } from '../../context/WalletContext'
import { useServiceInfo, useReloadServiceInfo } from '../../context/ServiceInfoContext'
import { useLoadConfigValue } from '../../context/ServiceConfigContext'
import { useSettings } from '../../context/SettingsContext'
import { FeeValues, useLoadFeeConfigValues } from '../../hooks/Fees'
import { buildCoinjoinRequirementSummary } from '../../hooks/CoinjoinRequirements'

import * as Api from '../../libs/JmWalletApi'
import { SATS, formatBtc, formatSats, satsToBtc, isValidNumber } from '../../utils'
import { routes } from '../../constants/routes'
import { jarName } from '../jars/Jar'

import styles from './Send.module.css'
import CollaboratorsSelector from './CollaboratorsSelector'
import {
  enhanceDirectPaymentErrorMessageIfNecessary,
  enhanceTakerErrorMessageIfNecessary,
  initialNumCollaborators,
  isValidAddress,
  isValidAmount,
  isValidJarIndex,
  isValidNumCollaborators,
} from './helpers'

const IS_COINJOIN_DEFAULT_VAL = true
// initial value for `minimum_makers` from the default joinmarket.cfg (last check on 2022-02-20 of v0.9.5)
const MINIMUM_MAKERS_DEFAULT_VAL = 4

const INITIAL_DESTINATION = null
const INITIAL_SOURCE_JAR_INDEX = 0
const INITIAL_AMOUNT = null

type SweepAccordionToggleProps = {
  eventKey: string
}
function SweepAccordionToggle({ eventKey }: SweepAccordionToggleProps) {
  const { t } = useTranslation()
  return (
    <button type="button" className={styles['accordion-button']} onClick={rb.useAccordionButton(eventKey)}>
      {t('send.button_sweep_amount_breakdown')}
    </button>
  )
}

type Alert = {
  variant: 'success' | 'danger'
  message: string
}

type SendProps = {
  wallet: CurrentWallet
}
export default function Send({ wallet }: SendProps) {
  const { t } = useTranslation()
  const walletInfo = useCurrentWalletInfo()

  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const serviceInfo = useServiceInfo()
  const reloadServiceInfo = useReloadServiceInfo()
  const loadConfigValue = useLoadConfigValue()
  const loadFeeConfigValues = useLoadFeeConfigValues()
  const settings = useSettings()
  const location = useLocation()

  const isCoinjoinInProgress = useMemo(() => serviceInfo && serviceInfo.coinjoinInProgress, [serviceInfo])
  const isMakerRunning = useMemo(() => serviceInfo && serviceInfo.makerRunning, [serviceInfo])

  const [alert, setAlert] = useState<Alert>()
  const [isSending, setIsSending] = useState(false)
  const [isCoinjoin, setIsCoinjoin] = useState(IS_COINJOIN_DEFAULT_VAL)
  const [minNumCollaborators, setMinNumCollaborators] = useState(MINIMUM_MAKERS_DEFAULT_VAL)
  const [isSweep, setIsSweep] = useState(false)
  const [destinationJarPickerShown, setDestinationJarPickerShown] = useState(false)
  const [destinationJar, setDestinationJar] = useState<number | null>(null)
  const [destinationIsReusedAddress, setDestinationIsReusedAddress] = useState(false)

  const [feeConfigValues, setFeeConfigValues] = useState<FeeValues>()

  const [waitForUtxosToBeSpent, setWaitForUtxosToBeSpent] = useState([])
  const [paymentSuccessfulInfoAlert, setPaymentSuccessfulInfoAlert] = useState<Alert>()

  const isOperationDisabled = useMemo(
    () => isCoinjoinInProgress || isMakerRunning || waitForUtxosToBeSpent.length > 0,
    [isCoinjoinInProgress, isMakerRunning, waitForUtxosToBeSpent]
  )
  const [isInitializing, setIsInitializing] = useState(!isOperationDisabled)
  const isLoading = useMemo(
    () => isInitializing || waitForUtxosToBeSpent.length > 0,
    [isInitializing, waitForUtxosToBeSpent]
  )

  const [destination, setDestination] = useState<string | null>(INITIAL_DESTINATION)
  const [sourceJarIndex, setSourceJarIndex] = useState(
    parseInt(location.state?.account, 10) || INITIAL_SOURCE_JAR_INDEX
  )
  const [amount, setAmount] = useState<number | null>(INITIAL_AMOUNT)
  // see https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/USAGE.md#try-out-a-coinjoin-using-sendpaymentpy
  const [numCollaborators, setNumCollaborators] = useState<number | null>(initialNumCollaborators(minNumCollaborators))
  const [formIsValid, setFormIsValid] = useState(false)

  const accountBalanceOrNull = useMemo(
    () => (walletInfo && walletInfo.balanceSummary.accountBalances[sourceJarIndex]) || null,
    [walletInfo, sourceJarIndex]
  )

  const sourceJarUtxos = useMemo(() => {
    if (!walletInfo) return null

    return walletInfo.data.utxos.utxos.filter((it) => it.mixdepth === sourceJarIndex)
  }, [walletInfo, sourceJarIndex])

  const coinjoinPreconditionSummary = useMemo(
    () => buildCoinjoinRequirementSummary(sourceJarUtxos || []),
    [sourceJarUtxos]
  )

  const [showConfirmAbortModal, setShowConfirmAbortModal] = useState(false)
  const [showConfirmSendModal, setShowConfirmSendModal] = useState(false)
  const submitButtonRef = useRef<HTMLButtonElement>(null)
  const submitButtonOptions = useMemo(() => {
    if (!isInitializing) {
      if (!isCoinjoin)
        return {
          variant: 'danger',
          text: t('send.button_send_without_improved_privacy'),
        }
      if (!coinjoinPreconditionSummary.isFulfilled)
        return {
          variant: 'warning',
          text: t('send.button_send_despite_warning'),
        }
    }

    return {
      variant: 'dark',
      text: t('send.button_send'),
    }
  }, [isInitializing, isCoinjoin, coinjoinPreconditionSummary, t])

  useEffect(() => {
    if (
      isValidAddress(destination) &&
      !destinationIsReusedAddress &&
      isValidJarIndex(sourceJarIndex) &&
      isValidAmount(amount, isSweep) &&
      (isCoinjoin ? isValidNumCollaborators(numCollaborators, minNumCollaborators) : true)
    ) {
      setFormIsValid(true)
    } else {
      setFormIsValid(false)
    }
  }, [
    destination,
    sourceJarIndex,
    amount,
    numCollaborators,
    minNumCollaborators,
    isCoinjoin,
    isSweep,
    destinationIsReusedAddress,
  ])

  useEffect(() => {
    if (isSweep) {
      setAmount(0)
    } else {
      setAmount(null)
    }
  }, [isSweep])

  // This callback is responsible for updating the `isLoading` flag while the
  // wallet is synchronizing. The wallet needs some time after a tx is sent
  // to reflect the changes internally. In order to show the actual balance,
  // all outputs in `waitForUtxosToBeSpent` must have been removed from the
  // wallet's utxo set.
  useEffect(() => {
    if (waitForUtxosToBeSpent.length === 0) return

    const abortCtrl = new AbortController()

    // Delaying the poll requests gives the wallet some time to synchronize
    // the utxo set and reduces amount of http requests
    const initialDelayInMs = 250
    const timer = setTimeout(() => {
      if (abortCtrl.signal.aborted) return

      reloadCurrentWalletInfo
        .reloadUtxos({ signal: abortCtrl.signal })
        .then((res) => {
          if (abortCtrl.signal.aborted) return
          const outputs = res.utxos.map((it) => it.utxo)
          const utxosStillPresent = waitForUtxosToBeSpent.filter((it) => outputs.includes(it))
          setWaitForUtxosToBeSpent([...utxosStillPresent])
        })

        .catch((err) => {
          if (abortCtrl.signal.aborted) return

          // Stop waiting for wallet synchronization on errors, but inform
          // the user that loading the wallet info failed
          setWaitForUtxosToBeSpent([])

          const message = t('global.errors.error_reloading_wallet_failed', {
            reason: err.message || t('global.errors.reason_unknown'),
          })
          setAlert({ variant: 'danger', message })
        })
    }, initialDelayInMs)

    return () => {
      abortCtrl.abort()
      clearTimeout(timer)
    }
  }, [waitForUtxosToBeSpent, reloadCurrentWalletInfo, t])

  useEffect(() => {
    if (isOperationDisabled) {
      setIsInitializing(false)
      return
    }

    const abortCtrl = new AbortController()

    setAlert(undefined)
    setIsInitializing(true)

    // reloading service info is important, is it must be known as soon as possible
    // if the operation is even allowed, i.e. if no other service is running
    const loadingServiceInfo = reloadServiceInfo({ signal: abortCtrl.signal }).catch((err) => {
      if (abortCtrl.signal.aborted) return
      // reusing "wallet failed" message here is okay, as session info also contains wallet information
      const message = t('global.errors.error_loading_wallet_failed', {
        reason: err.message || t('global.errors.reason_unknown'),
      })
      setAlert({ variant: 'danger', message })
    })

    const loadingWalletInfoAndUtxos = reloadCurrentWalletInfo.reloadUtxos({ signal: abortCtrl.signal }).catch((err) => {
      if (abortCtrl.signal.aborted) return
      const message = t('global.errors.error_loading_wallet_failed', {
        reason: err.message || t('global.errors.reason_unknown'),
      })
      setAlert({ variant: 'danger', message })
    })

    const loadingMinimumMakerConfig = loadConfigValue({
      signal: abortCtrl.signal,
      key: { section: 'POLICY', field: 'minimum_makers' },
    })
      .then((data) => {
        if (abortCtrl.signal.aborted) return

        const minimumMakers = parseInt(data.value, 10)
        setMinNumCollaborators(minimumMakers)
        setNumCollaborators(initialNumCollaborators(minimumMakers))
      })
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })

    const loadFeeValues = loadFeeConfigValues(abortCtrl.signal)
      .then((data) => {
        if (abortCtrl.signal.aborted) return
        setFeeConfigValues(data)
      })
      .catch((e) => {
        if (abortCtrl.signal.aborted) return
        // As fee config is not essential, don't raise an error on purpose.
        // Fee settings cannot be displayed, but making a payment is still possible.
        setFeeConfigValues(undefined)
      })

    Promise.all([loadingServiceInfo, loadingWalletInfoAndUtxos, loadingMinimumMakerConfig, loadFeeValues]).finally(
      () => !abortCtrl.signal.aborted && setIsInitializing(false)
    )

    return () => abortCtrl.abort()
  }, [isOperationDisabled, wallet, reloadCurrentWalletInfo, reloadServiceInfo, loadConfigValue, loadFeeConfigValues, t])

  useEffect(() => {
    if (destination !== null && walletInfo?.addressSummary[destination]) {
      if (walletInfo?.addressSummary[destination].status !== 'new') {
        setDestinationIsReusedAddress(true)
        return
      }
    }

    setDestinationIsReusedAddress(false)
  }, [walletInfo, destination])

  type SendPayment = (
    sourceJarIndex: number,
    destination: string | null,
    amount_sats: number | null
  ) => Promise<boolean>

  const sendPayment: SendPayment = async (sourceJarIndex, destination, amount_sats) => {
    if (!destination || amount_sats === null) {
      setAlert({ variant: 'danger', message: 'Missing destination or amount' })
      return false
    }
    setAlert(undefined)
    setPaymentSuccessfulInfoAlert(undefined)
    setIsSending(true)

    const requestContext = { walletName: wallet.name, token: wallet.token }

    let success = false
    try {
      const res = await Api.postDirectSend(requestContext, { mixdepth: sourceJarIndex, destination, amount_sats })

      if (res.ok) {
        // TODO: add type for json response
        const {
          txinfo: { outputs, inputs, txid },
        } = await res.json()
        const output = outputs.find((o: any) => o.address === destination)
        setPaymentSuccessfulInfoAlert({
          variant: 'success',
          message: t('send.alert_payment_successful', {
            amount: output.value_sats,
            address: output.address,
            txid,
          }),
        })
        setWaitForUtxosToBeSpent(inputs.map((it: any) => it.outpoint))
        success = true
      } else {
        const message = await Api.Helper.extractErrorMessage(res)
        const displayMessage = await enhanceDirectPaymentErrorMessageIfNecessary(
          res.status,
          message,
          (errorMessage) => `${errorMessage} ${t('send.direct_payment_error_message_bad_request')}`
        )
        setAlert({ variant: 'danger', message: displayMessage })
      }

      setIsSending(false)
    } catch (e: any) {
      setIsSending(false)
      setAlert({ variant: 'danger', message: e.message })
    }

    return success
  }

  type StartCoinjoin = (
    sourceJarIndex: number,
    destination: string | null,
    amount_sats: number | null,
    counterparties: number | null
  ) => Promise<boolean>
  const startCoinjoin: StartCoinjoin = async (sourceJarIndex, destination, amount_sats, counterparties) => {
    if (!destination || amount_sats === null || counterparties === null) {
      setAlert({ variant: 'danger', message: 'Missing destination or amount' })
      return false
    }
    setAlert(undefined)
    setIsSending(true)

    const requestContext = { walletName: wallet.name, token: wallet.token }
    let success = false
    try {
      const res = await Api.postCoinjoin(requestContext, {
        mixdepth: sourceJarIndex,
        destination,
        amount_sats,
        counterparties,
      })

      if (res.ok) {
        const data = await res.json()
        console.log(data)
        success = true
      } else {
        const message = await Api.Helper.extractErrorMessage(res)
        const displayMessage = await enhanceTakerErrorMessageIfNecessary(
          loadConfigValue,
          res.status,
          message,
          (errorMessage) => `${errorMessage} ${t('send.taker_error_message_max_fees_config_missing')}`
        )

        setAlert({ variant: 'danger', message: displayMessage })
      }

      setIsSending(false)
    } catch (e: any) {
      setIsSending(false)
      setAlert({ variant: 'danger', message: e.message })
    }

    return success
  }

  useEffect(() => {
    // hide the abort modal, if a user wants to abort a running transaction,
    // but the transaction failed or succeeded in the meantime
    if (showConfirmAbortModal && !isCoinjoinInProgress) {
      setShowConfirmAbortModal(false)
    }
  }, [isCoinjoinInProgress, showConfirmAbortModal])

  const abortCoinjoin = async () => {
    if (!isCoinjoinInProgress) {
      setShowConfirmAbortModal(false)
      return
    }

    if (!showConfirmAbortModal) {
      setShowConfirmAbortModal(true)
      return
    }

    setShowConfirmAbortModal(false)
    setAlert(undefined)

    const abortCtrl = new AbortController()
    return Api.getTakerStop({ signal: abortCtrl.signal, walletName: wallet.name, token: wallet.token }).catch((err) => {
      setAlert({ variant: 'danger', message: err.message })
    })
  }

  const onSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()

    if (isLoading || isOperationDisabled) return

    setPaymentSuccessfulInfoAlert(undefined)

    const form = e.currentTarget
    const isValid = formIsValid

    if (isValid) {
      if (!showConfirmSendModal) {
        setShowConfirmSendModal(true)
        return
      }

      setShowConfirmSendModal(false)

      if (isSweep && amount !== 0) {
        console.error('Sweep amount mismatch. This should not happen.')
        return
      }

      const success = isCoinjoin
        ? await startCoinjoin(sourceJarIndex, destination, amount, numCollaborators)
        : await sendPayment(sourceJarIndex, destination, amount)

      if (success) {
        setDestination(INITIAL_DESTINATION)
        setAmount(INITIAL_AMOUNT)
        setNumCollaborators(initialNumCollaborators(minNumCollaborators))
        setIsCoinjoin(IS_COINJOIN_DEFAULT_VAL)
        setIsSweep(false)
        setDestinationJar(null)

        form.reset()
      }
    }
  }

  const amountFieldValue = useMemo(() => {
    if (amount === null || !isValidNumber(amount)) return ''

    if (isSweep) {
      if (!accountBalanceOrNull) return ''
      return `${accountBalanceOrNull.calculatedAvailableBalanceInSats}`
    }

    return amount.toString()
  }, [accountBalanceOrNull, amount, isSweep])

  const frozenOrLockedWarning = () => {
    if (!accountBalanceOrNull) return null

    return (
      <div className={`${styles['sweep-breakdown']} mt-2`}>
        <rb.Accordion flush>
          <rb.Accordion.Item eventKey="0">
            <SweepAccordionToggle eventKey="0" />
            <rb.Accordion.Body className="my-4 p-0">
              <table className={`${styles['sweep-breakdown-table']} table table-sm`}>
                <tbody>
                  <tr>
                    <td>{t('send.sweep_amount_breakdown_total_balance')}</td>
                    <td className={styles['balance-col']}>
                      <Balance
                        valueString={accountBalanceOrNull.calculatedTotalBalanceInSats.toString()}
                        convertToUnit={SATS}
                        showBalance={true}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>{t('send.sweep_amount_breakdown_frozen_balance')}</td>
                    <td className={styles['balance-col']}>
                      <Balance
                        valueString={accountBalanceOrNull.calculatedFrozenOrLockedBalanceInSats.toString()}
                        convertToUnit={SATS}
                        showBalance={true}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>{t('send.sweep_amount_breakdown_estimated_amount')}</td>
                    <td className={styles['balance-col']}>
                      <Balance valueString={amountFieldValue} convertToUnit={SATS} showBalance={true} />
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className={`${styles['sweep-breakdown-paragraph']} mb-0 mt-4`}>
                <Trans i18nKey="send.sweep_amount_breakdown_explanation">
                  A sweep transaction will consume all UTXOs of a mixdepth leaving no coins behind except those that
                  have been
                  <a
                    href="https://github.com/JoinMarket-Org/joinmarket-clientserver#wallet-features"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles['sweep-breakdown-anchor']}
                  >
                    frozen
                  </a>
                  or
                  <a
                    href="https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/fidelity-bonds.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles['sweep-breakdown-anchor']}
                  >
                    time-locked
                  </a>
                  . Onchain transaction fees and market maker fees will be deducted from the amount so as to leave zero
                  change. The exact transaction amount can only be calculated by JoinMarket at the point when the
                  transaction is made. Therefore the estimated amount shown might deviate from the actually sent amount.
                  Refer to the
                  <a
                    href="https://github.com/JoinMarket-Org/JoinMarket-Docs/blob/master/High-level-design.md#joinmarket-transaction-types"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles['sweep-breakdown-anchor']}
                  >
                    JoinMarket documentation
                  </a>
                  for more details.
                </Trans>
              </p>
            </rb.Accordion.Body>
          </rb.Accordion.Item>
        </rb.Accordion>
      </div>
    )
  }

  return (
    <>
      <div className={`${isMakerRunning || isCoinjoinInProgress ? styles['service-running'] : ''}`}>
        <PageTitle title={t('send.title')} subtitle={t('send.subtitle')} />
        <rb.Fade in={isOperationDisabled} mountOnEnter={true} unmountOnExit={true}>
          <>
            {isMakerRunning && (
              <Link to={routes.earn} className="unstyled">
                <rb.Alert variant="info" className="mb-4">
                  <rb.Row className="align-items-center">
                    <rb.Col>{t('send.text_maker_running')}</rb.Col>
                    <rb.Col xs="auto">
                      <Sprite symbol="caret-right" width="24px" height="24px" />
                    </rb.Col>
                  </rb.Row>
                </rb.Alert>
              </Link>
            )}
            {isCoinjoinInProgress && (
              <rb.Alert variant="info" className="mb-4 d-flex align-items-center">
                {t('send.text_coinjoin_already_running')}

                <rb.Button
                  variant={'outline-light'}
                  className="ms-auto"
                  disabled={showConfirmAbortModal}
                  onClick={() => abortCoinjoin()}
                >
                  {t('global.abort')}
                </rb.Button>
              </rb.Alert>
            )}
          </>
        </rb.Fade>
        {alert && (
          <rb.Alert className="slashed-zeroes" variant={alert.variant}>
            {alert.message}
          </rb.Alert>
        )}
        {paymentSuccessfulInfoAlert && (
          <rb.Alert className="small slashed-zeroes break-word" variant={paymentSuccessfulInfoAlert.variant}>
            {paymentSuccessfulInfoAlert.message}
          </rb.Alert>
        )}
        {!isLoading && !isOperationDisabled && isCoinjoin && !coinjoinPreconditionSummary.isFulfilled && (
          <div className="mb-4">
            <CoinjoinPreconditionViolationAlert
              summary={coinjoinPreconditionSummary}
              i18nPrefix="send.coinjoin_precondition."
            />
          </div>
        )}
        {!isLoading && walletInfo && (
          <JarSelectorModal
            isShown={destinationJarPickerShown}
            title={t('send.title_jar_selector')}
            accountBalances={walletInfo.balanceSummary.accountBalances}
            totalBalance={walletInfo.balanceSummary.calculatedTotalBalanceInSats}
            disabledJar={sourceJarIndex}
            onCancel={() => setDestinationJarPickerShown(false)}
            onConfirm={(selectedJar) => {
              const abortCtrl = new AbortController()
              return Api.getAddressNew({
                signal: abortCtrl.signal,
                walletName: wallet.name,
                token: wallet.token,
                mixdepth: selectedJar,
              })
                .then((res) =>
                  res.ok ? res.json() : Api.Helper.throwError(res, t('receive.error_loading_address_failed'))
                )
                .then((data) => {
                  if (abortCtrl.signal.aborted) return
                  setDestination(data.address)
                  setDestinationJar(selectedJar)
                  setDestinationJarPickerShown(false)
                })
                .catch((err) => {
                  if (abortCtrl.signal.aborted) return
                  setAlert({ variant: 'danger', message: err.message })
                  setDestinationJarPickerShown(false)
                })
            }}
          />
        )}
        <rb.Form id="send-form" onSubmit={onSubmit} noValidate className={styles['send-form']}>
          <rb.Form.Group className="mb-4 flex-grow-1" controlId="sourceJarIndex">
            <rb.Form.Label>{t('send.label_source_jar')}</rb.Form.Label>
            {isLoading ? (
              <rb.Placeholder as="div" animation="wave">
                <rb.Placeholder xs={12} className={styles['input-loader']} />
              </rb.Placeholder>
            ) : (
              <rb.Form.Select
                defaultValue={sourceJarIndex}
                onChange={(e) => setSourceJarIndex(parseInt(e.target.value, 10))}
                required
                className={`${styles['select']} slashed-zeroes`}
                isInvalid={!isValidJarIndex(sourceJarIndex)}
                disabled={isOperationDisabled}
              >
                {walletInfo &&
                  Object.values(walletInfo.balanceSummary.accountBalances)
                    .sort((lhs, rhs) => lhs.accountIndex - rhs.accountIndex)
                    .map(({ accountIndex, calculatedTotalBalanceInSats }) => (
                      <option key={accountIndex} value={accountIndex}>
                        {jarName(accountIndex)}{' '}
                        {settings.showBalance &&
                          (settings.unit === SATS
                            ? `(${formatSats(calculatedTotalBalanceInSats)} sats)`
                            : `(\u20BF${formatBtc(satsToBtc(calculatedTotalBalanceInSats.toString()))})`)}
                      </option>
                    ))}
              </rb.Form.Select>
            )}
          </rb.Form.Group>
          <rb.Form.Group className="mb-4" controlId="destination">
            <rb.Form.Label>{t('send.label_recipient')}</rb.Form.Label>
            <div className="position-relative">
              {isLoading ? (
                <rb.Placeholder as="div" animation="wave">
                  <rb.Placeholder xs={12} className={styles['input-loader']} />
                </rb.Placeholder>
              ) : (
                <>
                  <rb.Form.Control
                    name="destination"
                    placeholder={t('send.placeholder_recipient')}
                    className={classNames('slashed-zeroes', styles['input'], {
                      [styles['jar-input']]: destinationJar !== null,
                    })}
                    value={destinationJar !== null ? `${jarName(destinationJar)} (${destination})` : destination || ''}
                    required
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '') {
                        setDestination(null)
                      } else {
                        setDestination(e.target.value)
                      }
                    }}
                    isInvalid={(destination !== null && !isValidAddress(destination)) || destinationIsReusedAddress}
                    disabled={isOperationDisabled || destinationJar !== null}
                  />
                  {destinationIsReusedAddress && (
                    <rb.Form.Control.Feedback type="invalid">
                      {t('send.feedback_reused_address')}
                    </rb.Form.Control.Feedback>
                  )}
                  {!destinationIsReusedAddress && (
                    <rb.Button
                      variant="outline-dark"
                      className={styles['button-jar-selector']}
                      onClick={() => {
                        if (destinationJar !== null) {
                          setDestinationJar(null)
                          setDestination(INITIAL_DESTINATION)
                        } else {
                          setDestinationJarPickerShown(true)
                        }
                      }}
                      disabled={isOperationDisabled}
                    >
                      {destinationJar !== null ? (
                        <div className="d-flex justify-content-center align-items-center">
                          <Sprite symbol="cancel" width="26" height="26" />
                        </div>
                      ) : (
                        <div className="d-flex justify-content-center align-items-center">
                          <Sprite
                            symbol="jar-closed-empty"
                            width="28px"
                            height="28px"
                            style={{ paddingBottom: '0.2rem' }}
                          />
                        </div>
                      )}
                    </rb.Button>
                  )}
                </>
              )}
            </div>
          </rb.Form.Group>
          <rb.Form.Group className={isSweep ? 'mb-0' : 'mb-4'} controlId="amount">
            <rb.Form.Label form="send-form">{t('send.label_amount')}</rb.Form.Label>
            <div className="position-relative">
              {isLoading ? (
                <rb.Placeholder as="div" animation="wave">
                  <rb.Placeholder xs={12} className={styles['input-loader']} />
                </rb.Placeholder>
              ) : (
                <>
                  <rb.Form.Control
                    name="amount"
                    type="number"
                    value={amountFieldValue}
                    className={`${styles.input} slashed-zeroes`}
                    min={1}
                    placeholder={t('send.placeholder_amount')}
                    required
                    onChange={(e) => setAmount(parseInt(e.target.value, 10))}
                    isInvalid={amount !== null && !isValidAmount(amount, isSweep)}
                    disabled={isSweep || isOperationDisabled}
                  />
                  <rb.Button
                    variant="outline-dark"
                    className={styles['button-sweep']}
                    onClick={() => setIsSweep(!isSweep)}
                    disabled={isOperationDisabled}
                  >
                    {isSweep ? (
                      <div className={styles['button-sweep-item']}>{t('send.button_clear_sweep')}</div>
                    ) : (
                      <div className={styles['button-sweep-item']}>
                        <Sprite symbol="sweep" width="24px" height="24px" />
                        {t('send.button_sweep')}
                      </div>
                    )}
                  </rb.Button>
                </>
              )}
            </div>
            <rb.Form.Control.Feedback
              className={amount !== null && !isValidAmount(amount, isSweep) ? 'd-block' : 'd-none'}
              // @ts-ignore FIXME: "Property 'form' does not exist on type..."
              form="send-form"
              type="invalid"
            >
              {t('send.feedback_invalid_amount')}
            </rb.Form.Control.Feedback>
            {isSweep && frozenOrLockedWarning()}
          </rb.Form.Group>
          <rb.Form.Group controlId="isCoinjoin" className={`${isCoinjoin ? 'mb-3' : ''}`}>
            <ToggleSwitch
              label={t('send.toggle_coinjoin')}
              subtitle={t('send.toggle_coinjoin_subtitle')}
              toggledOn={isCoinjoin}
              onToggle={(isToggled) => setIsCoinjoin(isToggled)}
              disabled={isLoading || isOperationDisabled}
            />
          </rb.Form.Group>
          {isCoinjoin && (
            <CollaboratorsSelector
              numCollaborators={numCollaborators}
              setNumCollaborators={setNumCollaborators}
              minNumCollaborators={minNumCollaborators}
              disabled={isLoading || isOperationDisabled}
            />
          )}
        </rb.Form>
        <rb.Button
          ref={submitButtonRef}
          variant={submitButtonOptions.variant}
          type="submit"
          disabled={isOperationDisabled || isLoading || isSending || !formIsValid}
          className={`${styles['button']} ${styles['send-button']} mt-4`}
          form="send-form"
        >
          {isSending ? (
            <div className="d-flex justify-content-center align-items-center">
              <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              {t('send.text_sending')}
            </div>
          ) : (
            <>{submitButtonOptions.text}</>
          )}
        </rb.Button>
        {showConfirmAbortModal && (
          <ConfirmModal
            isShown={showConfirmAbortModal}
            title={t('send.confirm_abort_modal.title')}
            onCancel={() => setShowConfirmAbortModal(false)}
            onConfirm={() => abortCoinjoin()}
          >
            {t('send.confirm_abort_modal.text_body')}
          </ConfirmModal>
        )}
        {showConfirmSendModal && (
          <PaymentConfirmModal
            isShown={true}
            title={t('send.confirm_send_modal.title')}
            onCancel={() => setShowConfirmSendModal(false)}
            onConfirm={() => {
              submitButtonRef.current?.click()
            }}
            data={{
              sourceJarIndex,
              destination: destination as string,
              amount: parseInt(amountFieldValue, 10),
              isSweep,
              isCoinjoin,
              numCollaborators: numCollaborators as number,
              feeConfigValues,
            }}
          />
        )}
      </div>
    </>
  )
}
