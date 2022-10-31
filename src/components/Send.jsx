import { useEffect, useState, useMemo, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import * as rb from 'react-bootstrap'
import classNames from 'classnames'
import PageTitle from './PageTitle'
import ToggleSwitch from './ToggleSwitch'
import Sprite from './Sprite'
import Balance from './Balance'
import JarSelectorModal from './JarSelectorModal'

import { useReloadCurrentWalletInfo, useCurrentWalletInfo } from '../context/WalletContext'
import { useServiceInfo, useReloadServiceInfo } from '../context/ServiceInfoContext'
import { useLoadConfigValue } from '../context/ServiceConfigContext'
import { useSettings } from '../context/SettingsContext'
import { estimateMaxCollaboratorFee, toTxFeeValueUnit, useLoadFeeConfigValues } from '../hooks/Fees'
import { buildCoinjoinRequirementSummary } from '../hooks/CoinjoinRequirements'

import * as Api from '../libs/JmWalletApi'
import { SATS, formatBtc, formatSats, isValidNumber } from '../utils'
import { routes } from '../constants/routes'
import { ConfirmModal } from './Modal'
import { CoinjoinPreconditionViolationAlert } from './CoinjoinPreconditionViolationAlert'
import { jarInitial, jarName } from './jars/Jar'

import styles from './Send.module.css'

const IS_COINJOIN_DEFAULT_VAL = true
// initial value for `minimum_makers` from the default joinmarket.cfg (last check on 2022-02-20 of v0.9.5)
const MINIMUM_MAKERS_DEFAULT_VAL = 4

const INITIAL_DESTINATION = null
const INITIAL_SOURCE_JAR_INDEX = 0
const INITIAL_AMOUNT = null

const initialNumCollaborators = (minValue) => {
  const defaultNumber = pseudoRandomNumber(8, 10)

  if (minValue > 8) {
    return minValue + pseudoRandomNumber(0, 2)
  }

  return defaultNumber
}

// not cryptographically random. returned number is in range [min, max] (both inclusive).
const pseudoRandomNumber = (min, max) => {
  return Math.round(Math.random() * (max - min)) + min
}

const isValidAddress = (candidate) => {
  return typeof candidate === 'string' && !(candidate === '')
}

const isValidJarIndex = (candidate) => {
  const parsed = parseInt(candidate, 10)
  return isValidNumber(parsed) && parsed >= 0
}

const isValidAmount = (candidate, isSweep) => {
  const parsed = parseInt(candidate, 10)
  return isValidNumber(parsed) && (isSweep ? parsed === 0 : parsed > 0)
}

const isValidNumCollaborators = (candidate, minNumCollaborators) => {
  const parsed = parseInt(candidate, 10)
  return isValidNumber(parsed) && parsed >= minNumCollaborators && parsed <= 99
}

const CollaboratorsSelector = ({ numCollaborators, setNumCollaborators, minNumCollaborators, disabled = false }) => {
  const { t } = useTranslation()
  const settings = useSettings()

  const [usesCustomNumCollaborators, setUsesCustomNumCollaborators] = useState(false)

  const validateAndSetCustomNumCollaborators = (candidate) => {
    if (isValidNumCollaborators(candidate, minNumCollaborators)) {
      setNumCollaborators(candidate)
    } else {
      setNumCollaborators(null)
    }
  }

  var defaultCollaboratorsSelection = [8, 9, 10]
  if (minNumCollaborators > 8) {
    defaultCollaboratorsSelection = [minNumCollaborators, minNumCollaborators + 1, minNumCollaborators + 2]
  }

  return (
    <rb.Form noValidate className={styles['collaborators-selector']} disabled={disabled}>
      <rb.Form.Group>
        <rb.Form.Label className="mb-0">{t('send.label_num_collaborators', { numCollaborators })}</rb.Form.Label>
        <div className="mb-2">
          <rb.Form.Text className="text-secondary">{t('send.description_num_collaborators')}</rb.Form.Text>
        </div>
        <div className={`${styles['collaborators-selector-flex']} d-flex flex-row flex-wrap`}>
          {defaultCollaboratorsSelection.map((number) => {
            return (
              <rb.Button
                key={number}
                variant={settings.theme === 'light' ? 'white' : 'dark'}
                className={classNames(
                  styles['collaborators-selector-button'],
                  'p-2',
                  'border',
                  'border-1',
                  'rounded',
                  'text-center',
                  {
                    'border-dark':
                      !usesCustomNumCollaborators && numCollaborators === number && settings.theme === 'light',
                    [styles['selected-dark']]:
                      !usesCustomNumCollaborators && numCollaborators === number && settings.theme !== 'light',
                  }
                )}
                onClick={() => {
                  setUsesCustomNumCollaborators(false)
                  setNumCollaborators(number)
                }}
                disabled={disabled}
              >
                {number}
              </rb.Button>
            )
          })}
          <rb.Form.Control
            type="number"
            min={minNumCollaborators}
            max={99}
            isInvalid={!isValidNumCollaborators(numCollaborators, minNumCollaborators)}
            placeholder={t('send.input_num_collaborators_placeholder')}
            defaultValue=""
            className={classNames(
              styles['collaborators-selector-input'],
              'p-2',
              'border',
              'border-1',
              'rounded',
              'text-center',
              {
                'border-dark': usesCustomNumCollaborators && settings.theme === 'light',
                [styles['selected-dark']]: usesCustomNumCollaborators && settings.theme !== 'light',
              }
            )}
            onChange={(e) => {
              setUsesCustomNumCollaborators(true)
              validateAndSetCustomNumCollaborators(e.target.value)
            }}
            onClick={(e) => {
              if (e.target.value !== '') {
                setUsesCustomNumCollaborators(true)
                validateAndSetCustomNumCollaborators(parseInt(e.target.value, 10))
              }
            }}
            disabled={disabled}
          />
          {usesCustomNumCollaborators && (
            <rb.Form.Control.Feedback type="invalid">
              {t('send.error_invalid_num_collaborators', { minNumCollaborators, maxNumCollaborators: 99 })}
            </rb.Form.Control.Feedback>
          )}
        </div>
      </rb.Form.Group>
    </rb.Form>
  )
}

const enhanceDirectPaymentErrorMessageIfNecessary = async (httpStatus, errorMessage, onBadRequest) => {
  const tryEnhanceMessage = httpStatus === 400
  if (tryEnhanceMessage) {
    return onBadRequest(errorMessage)
  }

  return errorMessage
}

const enhanceTakerErrorMessageIfNecessary = async (
  loadConfigValue,
  httpStatus,
  errorMessage,
  onMaxFeeSettingsMissing
) => {
  const tryEnhanceMessage = httpStatus === 409
  if (tryEnhanceMessage) {
    const abortCtrl = new AbortController()

    const configExists = (section, field) =>
      loadConfigValue({
        signal: abortCtrl.signal,
        key: { section, field },
      })
        .then((val) => val.value !== null)
        .catch(() => false)

    const maxFeeSettingsPresent = await Promise.all([
      configExists('POLICY', 'max_cj_fee_rel'),
      configExists('POLICY', 'max_cj_fee_abs'),
    ])
      .then((arr) => arr.every((e) => e))
      .catch(() => false)

    if (!maxFeeSettingsPresent) {
      return onMaxFeeSettingsMissing(errorMessage)
    }
  }

  return errorMessage
}

function SweepAccordionToggle({ eventKey }) {
  const { t } = useTranslation()
  return (
    <button type="button" className={styles['accordion-button']} onClick={rb.useAccordionButton(eventKey)}>
      {t('send.button_sweep_amount_breakdown')}
    </button>
  )
}

function PaymentConfirmModal({
  isShown,
  title,
  onCancel,
  onConfirm,
  data: { sourceJarId, destination, amount, isSweep, isCoinjoin, numCollaborators, feeConfigValues },
}) {
  const { t } = useTranslation()
  const settings = useSettings()

  const estimatedMaxCollaboratorFee = useMemo(() => {
    if (!amount || !isCoinjoin || !numCollaborators || !feeConfigValues) return null
    if (!isValidNumber(feeConfigValues.max_cj_fee_abs) || !isValidNumber(feeConfigValues.max_cj_fee_rel)) return null
    return estimateMaxCollaboratorFee({
      amount,
      collaborators: numCollaborators,
      maxFeeAbs: feeConfigValues.max_cj_fee_abs,
      maxFeeRel: feeConfigValues.max_cj_fee_rel,
    })
  }, [amount, isCoinjoin, numCollaborators, feeConfigValues])

  const miningFeeText = useMemo(() => {
    if (!feeConfigValues) return null
    if (!isValidNumber(feeConfigValues.tx_fees) || !isValidNumber(feeConfigValues.tx_fees_factor)) return null

    const unit = toTxFeeValueUnit(feeConfigValues.tx_fees)
    if (!unit) {
      return null
    } else if (unit === 'blocks') {
      return t('send.confirm_send_modal.text_miner_fee_in_targeted_blocks', { count: feeConfigValues.tx_fees })
    } else {
      const feeTargetInSatsPerVByte = feeConfigValues.tx_fees / 1_000
      if (feeConfigValues.tx_fees_factor === 0) {
        return t('send.confirm_send_modal.text_miner_fee_in_satspervbyte_exact', {
          value: feeTargetInSatsPerVByte.toLocaleString(undefined, {
            maximumFractionDigits: Math.log10(1_000),
          }),
        })
      }

      const minFeeSatsPerVByte = Math.max(1, feeTargetInSatsPerVByte * (1 - feeConfigValues.tx_fees_factor))
      const maxFeeSatsPerVByte = feeTargetInSatsPerVByte * (1 + feeConfigValues.tx_fees_factor)

      return t('send.confirm_send_modal.text_miner_fee_in_satspervbyte_randomized', {
        min: minFeeSatsPerVByte.toLocaleString(undefined, {
          maximumFractionDigits: 1,
        }),
        max: maxFeeSatsPerVByte.toLocaleString(undefined, {
          maximumFractionDigits: 1,
        }),
      })
    }
  }, [t, feeConfigValues])

  return (
    <ConfirmModal isShown={isShown} title={title} onCancel={onCancel} onConfirm={onConfirm}>
      <rb.Container className="mt-2">
        <rb.Row className="mt-2 mb-3">
          <rb.Col xs={12} className="text-center">
            {isCoinjoin ? (
              <strong className="text-success">{t('send.confirm_send_modal.text_collaborative_tx_enabled')}</strong>
            ) : (
              <strong className="text-danger">{t('send.confirm_send_modal.text_collaborative_tx_disabled')}</strong>
            )}
          </rb.Col>
        </rb.Row>
        <rb.Row>
          <rb.Col xs={4} md={3} className="text-end">
            <strong>{t('send.confirm_send_modal.label_source_jar')}</strong>
          </rb.Col>
          <rb.Col xs={8} md={9} className="text-start">
            {t('send.confirm_send_modal.text_source_jar', { jarId: sourceJarId })}
          </rb.Col>
        </rb.Row>
        <rb.Row>
          <rb.Col xs={4} md={3} className="text-end">
            <strong>{t('send.confirm_send_modal.label_recipient')}</strong>
          </rb.Col>
          <rb.Col xs={8} md={9} className="text-start text-break slashed-zeroes">
            {destination}
          </rb.Col>
        </rb.Row>
        <rb.Row>
          <rb.Col xs={4} md={3} className="text-end">
            <strong>{t('send.confirm_send_modal.label_amount')}</strong>
          </rb.Col>
          <rb.Col xs={8} md={9} className="text-start">
            {isSweep ? (
              <>
                <Trans i18nKey="send.confirm_send_modal.text_sweep_balance">
                  Sweep
                  <Balance valueString={amount} convertToUnit={settings.unit} showBalance={true} />
                </Trans>
                <rb.OverlayTrigger
                  placement="right"
                  overlay={
                    <rb.Popover>
                      <rb.Popover.Body>{t('send.confirm_send_modal.text_sweep_info_popover')}</rb.Popover.Body>
                    </rb.Popover>
                  }
                >
                  <div className="d-inline-flex align-items-center">
                    <Sprite className={styles.infoIcon} symbol="info" width="13" height="13" />
                  </div>
                </rb.OverlayTrigger>
              </>
            ) : (
              <Balance valueString={amount} convertToUnit={settings.unit} showBalance={true} />
            )}
          </rb.Col>
        </rb.Row>

        {miningFeeText && (
          <rb.Row>
            <rb.Col xs={4} md={3} className="text-end">
              <strong>{t('send.confirm_send_modal.label_miner_fee')}</strong>
            </rb.Col>
            <rb.Col xs={8} md={9} className="text-start">
              {miningFeeText}
            </rb.Col>
          </rb.Row>
        )}
        {isCoinjoin && (
          <rb.Row>
            <rb.Col xs={4} md={3} className="text-end">
              <strong>{t('send.confirm_send_modal.label_num_collaborators')}</strong>
            </rb.Col>
            <rb.Col xs={8} md={9} className="text-start">
              {numCollaborators}
            </rb.Col>
          </rb.Row>
        )}
        {estimatedMaxCollaboratorFee && (
          <rb.Row>
            <rb.Col xs={4} md={3} className="text-end">
              <strong>{t('send.confirm_send_modal.label_estimated_max_collaborator_fee')}</strong>
            </rb.Col>
            <rb.Col xs={8} md={9} className="d-inline-flex align-items-center text-start">
              <div>
                &le;
                <Balance
                  valueString={`${estimatedMaxCollaboratorFee}`}
                  convertToUnit={settings.unit}
                  showBalance={true}
                />
                <rb.OverlayTrigger
                  placement="right"
                  overlay={
                    <rb.Popover>
                      <rb.Popover.Body>
                        {t('send.confirm_send_modal.text_estimated_max_collaborator_fee_info_popover')}
                      </rb.Popover.Body>
                    </rb.Popover>
                  }
                >
                  <div className="d-inline-flex align-items-center">
                    <Sprite className={styles.infoIcon} symbol="info" width="13" height="13" />
                  </div>
                </rb.OverlayTrigger>
              </div>
            </rb.Col>
          </rb.Row>
        )}
      </rb.Container>
    </ConfirmModal>
  )
}

export default function Send({ wallet }) {
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

  const [alert, setAlert] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [isCoinjoin, setIsCoinjoin] = useState(IS_COINJOIN_DEFAULT_VAL)
  const [minNumCollaborators, setMinNumCollaborators] = useState(MINIMUM_MAKERS_DEFAULT_VAL)
  const [isSweep, setIsSweep] = useState(false)
  const [destinationJarPickerShown, setDestinationJarPickerShown] = useState(false)
  const [destinationJar, setDestinationJar] = useState(null)
  const [destinationIsReusedAddress, setDestinationIsReusedAddress] = useState(false)

  const [feeConfigValues, setFeeConfigValues] = useState(null)

  const [waitForUtxosToBeSpent, setWaitForUtxosToBeSpent] = useState([])
  const [paymentSuccessfulInfoAlert, setPaymentSuccessfulInfoAlert] = useState(null)

  const isOperationDisabled = useMemo(
    () => isCoinjoinInProgress || isMakerRunning || waitForUtxosToBeSpent.length > 0,
    [isCoinjoinInProgress, isMakerRunning, waitForUtxosToBeSpent]
  )
  const [isInitializing, setIsInitializing] = useState(!isOperationDisabled)
  const isLoading = useMemo(
    () => isInitializing || waitForUtxosToBeSpent.length > 0,
    [isInitializing, waitForUtxosToBeSpent]
  )

  const [destination, setDestination] = useState(INITIAL_DESTINATION)
  const [sourceJarIndex, setSourceJarIndex] = useState(
    parseInt(location.state?.account, 10) || INITIAL_SOURCE_JAR_INDEX
  )
  const [amount, setAmount] = useState(INITIAL_AMOUNT)
  // see https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/USAGE.md#try-out-a-coinjoin-using-sendpaymentpy
  const [numCollaborators, setNumCollaborators] = useState(initialNumCollaborators(minNumCollaborators))
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
  const submitButtonRef = useRef(null)
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

      reloadCurrentWalletInfo({ signal: abortCtrl.signal })
        .then((data) => {
          if (abortCtrl.signal.aborted) return

          const outputs = data.data.utxos.utxos.map((it) => it.utxo)
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

    setAlert(null)
    setIsInitializing(true)

    // reloading service info is important, is it must be known as soon as possible
    // if the operation is even allowed, i.e. if no other service is running
    const loadingServiceInfo = reloadServiceInfo({ signal: abortCtrl.signal }).catch((err) => {
      // reusing "wallet failed" message here is okay, as session info also contains wallet information
      const message = t('global.errors.error_loading_wallet_failed', {
        reason: err.message || t('global.errors.reason_unknown'),
      })
      !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message })
    })

    const loadingWalletInfoAndUtxos = reloadCurrentWalletInfo({ signal: abortCtrl.signal }).catch((err) => {
      const message = t('global.errors.error_loading_wallet_failed', {
        reason: err.message || t('global.errors.reason_unknown'),
      })
      !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message })
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
        setFeeConfigValues(null)
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

  const sendPayment = async (sourceJarIndex, destination, amount_sats) => {
    setAlert(null)
    setPaymentSuccessfulInfoAlert(null)
    setIsSending(true)

    const requestContext = { walletName: wallet.name, token: wallet.token }

    let success = false
    try {
      const res = await Api.postDirectSend(requestContext, { mixdepth: sourceJarIndex, destination, amount_sats })

      if (res.ok) {
        const {
          txinfo: { outputs, inputs, txid },
        } = await res.json()
        const output = outputs.find((o) => o.address === destination)
        setPaymentSuccessfulInfoAlert({
          variant: 'success',
          message: t('send.alert_payment_successful', {
            amount: output.value_sats,
            address: output.address,
            txid,
          }),
        })
        setWaitForUtxosToBeSpent(inputs.map((it) => it.outpoint))
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
    } catch (e) {
      setIsSending(false)
      setAlert({ variant: 'danger', message: e.message })
    }

    return success
  }

  const startCoinjoin = async (sourceJarIndex, destination, amount_sats, counterparties) => {
    setAlert(null)
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
    } catch (e) {
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
    setAlert(null)

    const abortCtrl = new AbortController()
    return Api.getTakerStop({ signal: abortCtrl.signal, walletName: wallet.name, token: wallet.token }).catch((err) => {
      setAlert({ variant: 'danger', message: err.message })
    })
  }

  const onSubmit = async (e) => {
    e.preventDefault()

    if (isLoading || isOperationDisabled) return

    setPaymentSuccessfulInfoAlert(null)

    const form = e.currentTarget
    const isValid = formIsValid

    if (isValid) {
      if (!showConfirmSendModal) {
        setShowConfirmSendModal(true)
        return
      }

      setShowConfirmSendModal(false)

      const counterparties = parseInt(numCollaborators, 10)

      if (isSweep && amount !== 0) {
        console.error('Sweep amount mismatch. This should not happen.')
        return
      }

      const success = isCoinjoin
        ? await startCoinjoin(sourceJarIndex, destination, amount, counterparties)
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

  const amountFieldValue = () => {
    if (amount === null || !isValidNumber(amount)) return ''

    if (isSweep) {
      if (!accountBalanceOrNull) return ''
      return `${accountBalanceOrNull.calculatedAvailableBalanceInSats}`
    }

    return amount
  }

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
                        valueString={accountBalanceOrNull.totalBalance}
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
                      <Balance valueString={amountFieldValue().toString()} convertToUnit={SATS} showBalance={true} />
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
            totalBalance={walletInfo.balanceSummary.totalBalance}
            disabledJar={sourceJarIndex}
            onCancel={() => setDestinationJarPickerShown(false)}
            onConfirm={(selectedJar) => {
              setDestinationJarPickerShown(false)

              const externalBranch = walletInfo.data.display.walletinfo.accounts[selectedJar].branches.find(
                (branch) => {
                  return branch.branch.split('\t')[0] === 'external addresses'
                }
              )

              const newEntry = externalBranch.entries.find((entry) => entry.status === 'new')

              if (newEntry) {
                setDestination(newEntry.address)
                setDestinationJar(selectedJar)
              } else {
                console.error(`Cannot find a new address in mixdepth ${selectedJar}`)
              }
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
                    .map(({ accountIndex, totalBalance, calculatedTotalBalanceInSats }) => (
                      <option key={accountIndex} value={accountIndex}>
                        {jarName(accountIndex)}{' '}
                        {settings.showBalance &&
                          (settings.unit === 'sats'
                            ? `(${formatSats(calculatedTotalBalanceInSats)} sats)`
                            : `(\u20BF${formatBtc(totalBalance)})`)}
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
                    value={amountFieldValue()}
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
        </rb.Form>
        {isCoinjoin && (
          <CollaboratorsSelector
            numCollaborators={numCollaborators}
            setNumCollaborators={setNumCollaborators}
            minNumCollaborators={minNumCollaborators}
            disabled={isLoading || isOperationDisabled}
          />
        )}
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

        <ConfirmModal
          isShown={showConfirmAbortModal}
          title={t('send.confirm_abort_modal.title')}
          onCancel={() => setShowConfirmAbortModal(false)}
          onConfirm={() => abortCoinjoin()}
        >
          {t('send.confirm_abort_modal.text_body')}
        </ConfirmModal>

        <PaymentConfirmModal
          isShown={showConfirmSendModal}
          title={t('send.confirm_send_modal.title')}
          onCancel={() => setShowConfirmSendModal(false)}
          onConfirm={() => {
            submitButtonRef.current?.click()
          }}
          data={{
            sourceJarId: jarInitial(sourceJarIndex),
            destination,
            amount: amountFieldValue().toString(),
            isSweep,
            isCoinjoin,
            numCollaborators,
            feeConfigValues,
          }}
        />
      </div>
    </>
  )
}
