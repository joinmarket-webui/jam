import { useEffect, useState, useMemo, useRef, FormEventHandler } from 'react'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import * as rb from 'react-bootstrap'
import classNames from 'classnames'
import * as Api from '../../libs/JmWalletApi'
import PageTitle from '../PageTitle'
import ToggleSwitch from '../ToggleSwitch'
import Sprite from '../Sprite'
import Balance from '../Balance'
import { ConfirmModal } from '../Modal'
import { jarFillLevel, jarName, SelectableJar } from '../jars/Jar'
import JarSelectorModal from '../JarSelectorModal'
import { PaymentConfirmModal } from '../PaymentConfirmModal'
import { CoinjoinPreconditionViolationAlert } from '../CoinjoinPreconditionViolationAlert'
import CollaboratorsSelector from './CollaboratorsSelector'
import Accordion from '../Accordion'
import FeeConfigModal, { FeeConfigSectionKey } from '../settings/FeeConfigModal'
import { useFeeConfigValues, useEstimatedMaxCollaboratorFee } from '../../hooks/Fees'

import { useReloadCurrentWalletInfo, useCurrentWalletInfo, CurrentWallet } from '../../context/WalletContext'
import { useServiceInfo, useReloadServiceInfo } from '../../context/ServiceInfoContext'
import { useLoadConfigValue } from '../../context/ServiceConfigContext'
import { buildCoinjoinRequirementSummary } from '../../hooks/CoinjoinRequirements'

import { routes } from '../../constants/routes'
import { JM_MINIMUM_MAKERS_DEFAULT } from '../../constants/config'
import { SATS, formatSats, isValidNumber } from '../../utils'

import {
  enhanceDirectPaymentErrorMessageIfNecessary,
  enhanceTakerErrorMessageIfNecessary,
  initialNumCollaborators,
  isValidAddress,
  isValidAmount,
  isValidJarIndex,
  isValidNumCollaborators,
} from './helpers'
import styles from './Send.module.css'
import FeeBreakdown from './FeeBreakdown'

const IS_COINJOIN_DEFAULT_VAL = true

const INITIAL_DESTINATION = null
const INITIAL_SOURCE_JAR_INDEX = null
const INITIAL_AMOUNT = null

type SweepAccordionToggleProps = {
  eventKey: string
}
function SweepAccordionToggle({ eventKey }: SweepAccordionToggleProps) {
  const { t } = useTranslation()
  return (
    <button type="button" className={styles.accordionButton} onClick={rb.useAccordionButton(eventKey)}>
      {t('send.button_sweep_amount_breakdown')}
    </button>
  )
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

  const isCoinjoinInProgress = useMemo(() => serviceInfo?.coinjoinInProgress === true, [serviceInfo])
  const isMakerRunning = useMemo(() => serviceInfo?.makerRunning === true, [serviceInfo])
  const isRescanningInProgress = useMemo(() => serviceInfo?.rescanning === true, [serviceInfo])

  const [alert, setAlert] = useState<SimpleAlert>()
  const [isSending, setIsSending] = useState(false)
  const [isCoinjoin, setIsCoinjoin] = useState(IS_COINJOIN_DEFAULT_VAL)
  const [minNumCollaborators, setMinNumCollaborators] = useState(JM_MINIMUM_MAKERS_DEFAULT)
  const [isSweep, setIsSweep] = useState(false)
  const [destinationJarPickerShown, setDestinationJarPickerShown] = useState(false)
  const [destinationJar, setDestinationJar] = useState<JarIndex | null>(null)
  const [destinationIsReusedAddress, setDestinationIsReusedAddress] = useState(false)

  const [feeConfigValues, reloadFeeConfigValues] = useFeeConfigValues()
  const [activeFeeConfigModalSection, setActiveFeeConfigModalSection] = useState<FeeConfigSectionKey>()
  const [showFeeConfigModal, setShowFeeConfigModal] = useState(false)

  const [waitForUtxosToBeSpent, setWaitForUtxosToBeSpent] = useState([])
  const [paymentSuccessfulInfoAlert, setPaymentSuccessfulInfoAlert] = useState<SimpleAlert>()

  const isOperationDisabled = useMemo(
    () => isCoinjoinInProgress || isMakerRunning || isRescanningInProgress || waitForUtxosToBeSpent.length > 0,
    [isCoinjoinInProgress, isMakerRunning, isRescanningInProgress, waitForUtxosToBeSpent],
  )
  const [isInitializing, setIsInitializing] = useState(!isOperationDisabled)
  const isLoading = useMemo(
    () => !walletInfo || isInitializing || waitForUtxosToBeSpent.length > 0,
    [walletInfo, isInitializing, waitForUtxosToBeSpent],
  )

  const [destination, setDestination] = useState<Api.BitcoinAddress | null>(INITIAL_DESTINATION)
  const [sourceJarIndex, setSourceJarIndex] = useState<JarIndex | null>(INITIAL_SOURCE_JAR_INDEX)
  const [amount, setAmount] = useState<number | null>(INITIAL_AMOUNT)
  // see https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/USAGE.md#try-out-a-coinjoin-using-sendpaymentpy
  const [numCollaborators, setNumCollaborators] = useState<number | null>(initialNumCollaborators(minNumCollaborators))

  const sortedAccountBalances = useMemo(() => {
    if (!walletInfo) return []
    return Object.values(walletInfo.balanceSummary.accountBalances).sort(
      (lhs, rhs) => lhs.accountIndex - rhs.accountIndex,
    )
  }, [walletInfo])

  useEffect(
    function preSelectSourceJarIfPossible() {
      if (isLoading) return

      const jarsWithBalance = sortedAccountBalances.filter((it) => it.calculatedAvailableBalanceInSats > 0)
      setSourceJarIndex((current) => {
        if (jarsWithBalance.length === 0) return null

        const currentJarHasBalance = current !== null && jarsWithBalance.some((it) => it.accountIndex === current)
        if (currentJarHasBalance) return current
        return jarsWithBalance[0].accountIndex
      })
    },
    [isLoading, sourceJarIndex, sortedAccountBalances],
  )

  const accountBalance = useMemo(() => {
    if (sourceJarIndex === null) return null
    return sortedAccountBalances[sourceJarIndex]
  }, [sortedAccountBalances, sourceJarIndex])

  const sourceJarUtxos = useMemo(() => {
    if (!walletInfo || sourceJarIndex === null) return null
    return walletInfo.data.utxos.utxos.filter((it) => it.mixdepth === sourceJarIndex)
  }, [walletInfo, sourceJarIndex])

  const sourceJarCoinjoinPreconditionSummary = useMemo(() => {
    if (sourceJarUtxos === null) return null
    return buildCoinjoinRequirementSummary(sourceJarUtxos)
  }, [sourceJarUtxos])

  const estimatedMaxCollaboratorFee = useEstimatedMaxCollaboratorFee({
    feeConfigValues,
    amount: isSweep && accountBalance ? accountBalance.calculatedAvailableBalanceInSats : amount,
    numCollaborators,
    isCoinjoin,
  })

  const [showConfirmAbortModal, setShowConfirmAbortModal] = useState(false)
  const [showConfirmSendModal, setShowConfirmSendModal] = useState(false)
  const submitButtonRef = useRef<HTMLButtonElement>(null)
  const submitButtonOptions = useMemo(() => {
    if (!isLoading) {
      if (!isCoinjoin) {
        return {
          variant: 'danger',
          text: t('send.button_send_without_improved_privacy'),
        }
      } else if (sourceJarCoinjoinPreconditionSummary?.isFulfilled === false) {
        return {
          variant: 'warning',
          text: t('send.button_send_despite_warning'),
        }
      }
    }

    return {
      variant: 'dark',
      text: t('send.button_send'),
    }
  }, [isLoading, isCoinjoin, sourceJarCoinjoinPreconditionSummary, t])

  const formIsValid = useMemo(() => {
    return (
      isValidAddress(destination) &&
      !destinationIsReusedAddress &&
      isValidJarIndex(sourceJarIndex ?? -1) &&
      isValidAmount(amount, isSweep) &&
      (isCoinjoin ? isValidNumCollaborators(numCollaborators, minNumCollaborators) : true)
    )
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

  useEffect(() => setAmount(isSweep ? 0 : null), [isSweep])

  // This callback is responsible for updating `waitForUtxosToBeSpent` while
  // the wallet is synchronizing. The wallet needs some time after a tx is sent
  // to reflect the changes internally. In order to show the actual balance,
  // all outputs in `waitForUtxosToBeSpent` must have been removed from the
  // wallet's utxo set.
  useEffect(
    function updateWaitForUtxosToBeSpentHook() {
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
    },
    [waitForUtxosToBeSpent, reloadCurrentWalletInfo, t],
  )

  useEffect(
    function initialize() {
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

      const loadingWalletInfoAndUtxos = reloadCurrentWalletInfo
        .reloadUtxos({ signal: abortCtrl.signal })
        .catch((err) => {
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
          if (abortCtrl.signal.aborted) return
          setAlert({ variant: 'danger', message: err.message })
        })

      Promise.all([loadingServiceInfo, loadingWalletInfoAndUtxos, loadingMinimumMakerConfig]).finally(
        () => !abortCtrl.signal.aborted && setIsInitializing(false),
      )

      return () => abortCtrl.abort()
    },
    [isOperationDisabled, wallet, reloadCurrentWalletInfo, reloadServiceInfo, loadConfigValue, t],
  )

  useEffect(
    function checkReusedDestinationAddressHook() {
      if (destination !== null && walletInfo?.addressSummary[destination]) {
        if (walletInfo.addressSummary[destination].status !== 'new') {
          setDestinationIsReusedAddress(true)
          return
        }
      }

      setDestinationIsReusedAddress(false)
    },
    [walletInfo, destination],
  )

  const sendPayment = async (
    sourceJarIndex: JarIndex,
    destination: Api.BitcoinAddress,
    amount_sats: Api.AmountSats,
  ) => {
    setAlert(undefined)
    setPaymentSuccessfulInfoAlert(undefined)
    setIsSending(true)

    let success = false
    try {
      const res = await Api.postDirectSend({ ...wallet }, { mixdepth: sourceJarIndex, destination, amount_sats })

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
          (errorMessage) => `${errorMessage} ${t('send.direct_payment_error_message_bad_request')}`,
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

  const startCoinjoin = async (
    sourceJarIndex: JarIndex,
    destination: Api.BitcoinAddress,
    amount_sats: Api.AmountSats,
    counterparties: number,
  ) => {
    setAlert(undefined)
    setIsSending(true)

    let success = false
    try {
      const res = await Api.postCoinjoin(
        { ...wallet },
        {
          mixdepth: sourceJarIndex,
          destination,
          amount_sats,
          counterparties,
        },
      )

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
          (errorMessage) => `${errorMessage} ${t('send.taker_error_message_max_fees_config_missing')}`,
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
    return Api.getTakerStop({ ...wallet, signal: abortCtrl.signal }).catch((err) => {
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
      if (isSweep && amount !== 0) {
        console.error('Sanity check failed: Sweep amount mismatch. This should not happen.')
        return
      }
      if (sourceJarIndex === null || !destination || amount === null || (isCoinjoin && numCollaborators === null)) {
        console.error('Sanity check failed: Form is invalid and is missing required values. This should not happen.')
        return
      }

      if (!showConfirmSendModal) {
        setShowConfirmSendModal(true)
        return
      }

      setShowConfirmSendModal(false)

      const success = isCoinjoin
        ? await startCoinjoin(sourceJarIndex, destination, amount, numCollaborators!)
        : await sendPayment(sourceJarIndex, destination, amount)

      if (success) {
        setDestination(INITIAL_DESTINATION)
        setDestinationJar(null)
        setAmount(INITIAL_AMOUNT)
        setNumCollaborators(initialNumCollaborators(minNumCollaborators))
        setIsCoinjoin(IS_COINJOIN_DEFAULT_VAL)
        setIsSweep(false)

        form.reset()
      }
    }
  }

  const amountFieldValue = useMemo(() => {
    if (amount === null || !isValidNumber(amount)) return ''

    if (isSweep) {
      if (!accountBalance) return ''
      return `${accountBalance.calculatedAvailableBalanceInSats}`
    }

    return amount.toString()
  }, [accountBalance, amount, isSweep])

  const frozenOrLockedWarning = useMemo(() => {
    if (!accountBalance || amountFieldValue === '') return <></>

    return (
      <div className={`${styles.sweepBreakdown} mt-2`}>
        <rb.Accordion flush>
          <rb.Accordion.Item eventKey="0">
            <SweepAccordionToggle eventKey="0" />
            <rb.Accordion.Body className="my-4 p-0">
              <table className={`${styles.sweepBreakdownTable} table table-sm`}>
                <tbody>
                  <tr>
                    <td>{t('send.sweep_amount_breakdown_total_balance')}</td>
                    <td className={styles.balanceCol}>
                      <Balance
                        valueString={accountBalance.calculatedTotalBalanceInSats.toString()}
                        convertToUnit={SATS}
                        showBalance={true}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>{t('send.sweep_amount_breakdown_frozen_balance')}</td>
                    <td className={styles.balanceCol}>
                      <Balance
                        valueString={accountBalance.calculatedFrozenOrLockedBalanceInSats.toString()}
                        convertToUnit={SATS}
                        showBalance={true}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>{t('send.sweep_amount_breakdown_estimated_amount')}</td>
                    <td className={styles.balanceCol}>
                      <Balance valueString={amountFieldValue} convertToUnit={SATS} showBalance={true} />
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className={`${styles.sweepBreakdownParagraph} mb-0 mt-4`}>
                <Trans i18nKey="send.sweep_amount_breakdown_explanation">
                  A sweep transaction will consume all UTXOs of a mixdepth leaving no coins behind except those that
                  have been
                  <a
                    href="https://github.com/JoinMarket-Org/joinmarket-clientserver#wallet-features"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.sweepBreakdownAnchor}
                  >
                    frozen
                  </a>
                  or
                  <a
                    href="https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/fidelity-bonds.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.sweepBreakdownAnchor}
                  >
                    time-locked
                  </a>
                  . Mining fees and collaborator fees will be deducted from the amount so as to leave zero change. The
                  exact transaction amount can only be calculated by JoinMarket at the point when the transaction is
                  made. Therefore the estimated amount shown might deviate from the actually sent amount. Refer to the
                  <a
                    href="https://github.com/JoinMarket-Org/JoinMarket-Docs/blob/master/High-level-design.md#joinmarket-transaction-types"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.sweepBreakdownAnchor}
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
  }, [amountFieldValue, accountBalance, t])

  return (
    <>
      <div
        className={classNames({
          [styles.serviceRunning]: isMakerRunning || isCoinjoinInProgress,
        })}
      >
        <PageTitle title={t('send.title')} subtitle={t('send.subtitle')} />
        <rb.Fade in={isOperationDisabled} mountOnEnter={true} unmountOnExit={true}>
          <>
            {isMakerRunning && (
              <Link to={routes.earn} className="unstyled">
                <rb.Alert variant="info" className="mb-4">
                  <rb.Row className="align-items-center">
                    <rb.Col>{t('send.text_maker_running')}</rb.Col>
                    <rb.Col xs="auto">
                      <Sprite symbol="caret-right" width="24" height="24" />
                    </rb.Col>
                  </rb.Row>
                </rb.Alert>
              </Link>
            )}
            {isCoinjoinInProgress && (
              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-center mb-2">
                  <div className="d-flex align-items-center justify-content-center alert alert-success rounded-circle p-3">
                    <Sprite symbol="clock" width="32" height="32" />
                  </div>
                </div>
                <rb.Alert variant="success" className="d-flex align-items-center">
                  {t('send.text_coinjoin_already_running')}
                  <Sprite className="ms-auto" symbol="joining" width="20" height="20" />
                </rb.Alert>
                <rb.Button
                  variant="none"
                  className="w-100 mb-4"
                  disabled={showConfirmAbortModal}
                  onClick={() => abortCoinjoin()}
                >
                  <div className="d-flex justify-content-center align-items-center">
                    <Sprite symbol="cancel" width="24" height="24" className="me-1" />
                    {t('global.abort')}
                  </div>
                </rb.Button>
              </div>
            )}
          </>
        </rb.Fade>
        {alert && (
          <rb.Alert className="slashed-zeroes" variant={alert.variant}>
            {alert.message}
          </rb.Alert>
        )}
        {paymentSuccessfulInfoAlert && (
          <>
            <div className="d-flex align-items-center justify-content-center mb-2">
              <div className="d-flex align-items-center justify-content-center alert alert-success rounded-circle p-3">
                <Sprite symbol="checkmark" width="24" height="24" />
              </div>
            </div>
            <rb.Alert className="small slashed-zeroes break-word" variant={paymentSuccessfulInfoAlert.variant}>
              {paymentSuccessfulInfoAlert.message}
            </rb.Alert>
          </>
        )}
        {!isLoading && walletInfo && (
          <JarSelectorModal
            isShown={destinationJarPickerShown}
            title={t('send.title_jar_selector')}
            accountBalances={walletInfo.balanceSummary.accountBalances}
            totalBalance={walletInfo.balanceSummary.calculatedTotalBalanceInSats}
            disabledJar={sourceJarIndex ?? undefined}
            onCancel={() => setDestinationJarPickerShown(false)}
            onConfirm={(selectedJar) => {
              const abortCtrl = new AbortController()
              return Api.getAddressNew({
                ...wallet,
                signal: abortCtrl.signal,
                mixdepth: selectedJar,
              })
                .then((res) =>
                  res.ok ? res.json() : Api.Helper.throwError(res, t('receive.error_loading_address_failed')),
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

        <rb.Form id="send-form" onSubmit={onSubmit} noValidate className={styles.sendForm}>
          <rb.Form.Group className="mb-4 flex-grow-1" controlId="sourceJarIndex">
            <rb.Form.Label>{t('send.label_source_jar')}</rb.Form.Label>
            {!walletInfo || sortedAccountBalances.length === 0 ? (
              <rb.Placeholder as="div" animation="wave">
                <rb.Placeholder className={styles.sourceJarsPlaceholder} />
              </rb.Placeholder>
            ) : (
              <div className={styles.sourceJarsContainer}>
                {sortedAccountBalances.map((it) => (
                  <SelectableJar
                    key={it.accountIndex}
                    index={it.accountIndex}
                    balance={it.calculatedAvailableBalanceInSats}
                    frozenBalance={it.calculatedFrozenOrLockedBalanceInSats}
                    isSelectable={!isOperationDisabled && !isLoading && it.calculatedAvailableBalanceInSats > 0}
                    isSelected={it.accountIndex === sourceJarIndex}
                    fillLevel={jarFillLevel(
                      it.calculatedTotalBalanceInSats,
                      walletInfo.balanceSummary.calculatedTotalBalanceInSats,
                    )}
                    variant={
                      it.accountIndex === sourceJarIndex &&
                      isCoinjoin &&
                      sourceJarCoinjoinPreconditionSummary?.isFulfilled === false
                        ? 'warning'
                        : undefined
                    }
                    onClick={(jarIndex) => setSourceJarIndex(jarIndex)}
                  />
                ))}
              </div>
            )}
          </rb.Form.Group>

          {!isLoading &&
            !isOperationDisabled &&
            isCoinjoin &&
            sourceJarCoinjoinPreconditionSummary?.isFulfilled === false && (
              <div className="mb-4">
                <CoinjoinPreconditionViolationAlert
                  summary={sourceJarCoinjoinPreconditionSummary}
                  i18nPrefix="send.coinjoin_precondition."
                />
              </div>
            )}

          <rb.Form.Group className="mb-4" controlId="destination">
            <rb.Form.Label>{t('send.label_recipient')}</rb.Form.Label>
            <div className="position-relative">
              {isLoading ? (
                <rb.Placeholder as="div" animation="wave">
                  <rb.Placeholder xs={12} className={styles.inputLoader} />
                </rb.Placeholder>
              ) : (
                <>
                  <rb.Form.Control
                    name="destination"
                    placeholder={t('send.placeholder_recipient')}
                    className={classNames('slashed-zeroes', styles.input, {
                      [styles.jarInput]: destinationJar !== null,
                    })}
                    value={destinationJar !== null ? `${jarName(destinationJar)} (${destination})` : destination || ''}
                    required
                    onChange={(e) => {
                      const value = e.target.value
                      setDestination(value === '' ? null : value)
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
                      className={styles.buttonJarSelector}
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
                  <rb.Placeholder xs={12} className={styles.inputLoader} />
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
                    className={styles.buttonSweep}
                    onClick={() => setIsSweep((current) => !current)}
                    disabled={isOperationDisabled || sourceJarIndex === null}
                  >
                    <div className={styles.buttonSweepItem}>
                      {isSweep ? (
                        <>{t('send.button_clear_sweep')}</>
                      ) : (
                        <>
                          <Sprite symbol="sweep" width="24px" height="24px" />
                          {t('send.button_sweep')}
                        </>
                      )}
                    </div>
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
            {isSweep && <>{frozenOrLockedWarning}</>}
          </rb.Form.Group>
          <Accordion title={t('send.sending_options')}>
            <rb.Form.Group controlId="isCoinjoin" className="mb-3">
              <ToggleSwitch
                label={t('send.toggle_coinjoin')}
                subtitle={t('send.toggle_coinjoin_subtitle')}
                toggledOn={isCoinjoin}
                onToggle={(isToggled) => setIsCoinjoin(isToggled)}
                disabled={isLoading || isOperationDisabled}
              />
            </rb.Form.Group>
            <div className={isCoinjoin ? 'mb-4 d-block' : 'd-none'}>
              <CollaboratorsSelector
                numCollaborators={numCollaborators}
                setNumCollaborators={setNumCollaborators}
                minNumCollaborators={minNumCollaborators}
                disabled={isLoading || isOperationDisabled}
              />

              <rb.Form.Group className="mt-4">
                <rb.Form.Label className="mb-0">
                  {t('send.fee_breakdown.title', {
                    maxCollaboratorFee: estimatedMaxCollaboratorFee
                      ? `≤${formatSats(estimatedMaxCollaboratorFee)} sats`
                      : '...',
                  })}
                </rb.Form.Label>
                <rb.Form.Text className="d-block text-secondary mb-2">
                  <Trans
                    i18nKey="send.fee_breakdown.subtitle"
                    components={{
                      1: (
                        <span
                          onClick={() => {
                            setActiveFeeConfigModalSection('cj_fee')
                            setShowFeeConfigModal(true)
                          }}
                          className="text-decoration-underline link-secondary"
                        />
                      ),
                    }}
                  />
                </rb.Form.Text>
                <rb.Form.Text className="d-flex align-items-center mb-4">
                  <Sprite className="rounded-circle border border-1 me-2" symbol="info" width="18" height="18" />
                  <Trans
                    i18nKey="send.fee_breakdown.alert_collaborator_fee_note"
                    parent="div"
                    components={{
                      1: (
                        <span
                          onClick={() => {
                            setActiveFeeConfigModalSection('tx_fee')
                            setShowFeeConfigModal(true)
                          }}
                          className="text-decoration-underline link-secondary"
                        />
                      ),
                    }}
                  />
                </rb.Form.Text>

                {accountBalance && (
                  <FeeBreakdown
                    feeConfigValues={feeConfigValues}
                    numCollaborators={numCollaborators}
                    amount={isSweep ? accountBalance.calculatedAvailableBalanceInSats : amount}
                    onClick={() => {
                      setActiveFeeConfigModalSection('cj_fee')
                      setShowFeeConfigModal(true)
                    }}
                  />
                )}

                {showFeeConfigModal && (
                  <FeeConfigModal
                    show={showFeeConfigModal}
                    onSuccess={() => reloadFeeConfigValues()}
                    onHide={() => setShowFeeConfigModal(false)}
                    defaultActiveSectionKey={activeFeeConfigModalSection}
                  />
                )}
              </rb.Form.Group>
            </div>
          </Accordion>
        </rb.Form>
        <rb.Button
          ref={submitButtonRef}
          className={classNames('w-100', 'mb-4', styles.sendButton)}
          variant={submitButtonOptions.variant}
          size="lg"
          type="submit"
          disabled={isOperationDisabled || isLoading || isSending || !formIsValid}
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
              sourceJarIndex: sourceJarIndex!,
              destination: destination!,
              amount: parseInt(amountFieldValue, 10),
              isSweep,
              isCoinjoin,
              numCollaborators: numCollaborators!,
              feeConfigValues,
            }}
          />
        )}
      </div>
    </>
  )
}
