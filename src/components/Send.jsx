import React, { useEffect, useState, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import * as rb from 'react-bootstrap'
import PageTitle from './PageTitle'
import ToggleSwitch from './ToggleSwitch'
import Sprite from './Sprite'
import Balance from './Balance'
import { useReloadCurrentWalletInfo, useCurrentWallet, useCurrentWalletInfo } from '../context/WalletContext'
import { useServiceInfo, useReloadServiceInfo } from '../context/ServiceInfoContext'
import { useLoadConfigValue } from '../context/ServiceConfigContext'
import { useSettings } from '../context/SettingsContext'
import { useBalanceSummary } from '../hooks/BalanceSummary'
import * as Api from '../libs/JmWalletApi'
import { SATS, formatBtc, formatSats } from '../utils'
import { routes } from '../constants/routes'
import styles from './Send.module.css'

const IS_COINJOIN_DEFAULT_VAL = true
// initial value for `minimum_makers` from the default joinmarket.cfg (last check on 2022-02-20 of v0.9.5)
const MINIMUM_MAKERS_DEFAULT_VAL = 4

// not cryptographically random. returned number is in range [min, max] (both inclusive).
const pseudoRandomNumber = (min, max) => {
  return Math.round(Math.random() * (max - min)) + min
}

const isValidAddress = (candidate) => {
  return typeof candidate === 'string' && !(candidate === '')
}

const isValidAccount = (candidate) => {
  const parsed = parseInt(candidate, 10)
  return !isNaN(parsed) && parsed >= 0
}

const isValidAmount = (candidate, isSweep) => {
  const parsed = parseInt(candidate, 10)
  return !isNaN(parsed) && (isSweep ? parsed === 0 : parsed > 0)
}

const isValidNumCollaborators = (candidate, minNumCollaborators) => {
  const parsed = parseInt(candidate, 10)
  return !isNaN(parsed) && parsed >= minNumCollaborators && parsed <= 99
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
                className={`${styles['collaborators-selector-button']} p-2 border border-1 rounded text-center${
                  !usesCustomNumCollaborators && numCollaborators === number
                    ? settings.theme === 'light'
                      ? ' border-dark'
                      : ` ${styles['selected-dark']}`
                    : ''
                }`}
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
            className={`${styles['collaborators-selector-input']} p-2 border border-1 rounded text-center${
              usesCustomNumCollaborators ? (settings.theme === 'light' ? ' border-dark' : ' selected-dark') : ''
            }`}
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

export default function Send() {
  const { t } = useTranslation()
  const wallet = useCurrentWallet()
  const walletInfo = useCurrentWalletInfo()

  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const serviceInfo = useServiceInfo()
  const reloadServiceInfo = useReloadServiceInfo()
  const loadConfigValue = useLoadConfigValue()
  const settings = useSettings()
  const location = useLocation()

  const isCoinjoinInProgress = useMemo(() => serviceInfo && serviceInfo.coinjoinInProgress, [serviceInfo])
  const isMakerRunning = useMemo(() => serviceInfo && serviceInfo.makerRunning, [serviceInfo])

  const [alert, setAlert] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [isCoinjoin, setIsCoinjoin] = useState(IS_COINJOIN_DEFAULT_VAL)
  const [minNumCollaborators, setMinNumCollaborators] = useState(MINIMUM_MAKERS_DEFAULT_VAL)
  const [isSweep, setIsSweep] = useState(false)

  const [waitForUtxosToBeSpent, setWaitForUtxosToBeSpent] = useState([])
  const [paymentSuccessfulInfoAlert, setPaymentSuccessfulInfoAlert] = useState(null)
  const [takerStartedInfoAlert, setTakerStartedInfoAlert] = useState(null)

  const isOperationDisabled = useMemo(
    () => isCoinjoinInProgress || isMakerRunning || waitForUtxosToBeSpent.length > 0,
    [isCoinjoinInProgress, isMakerRunning, waitForUtxosToBeSpent]
  )
  const [isInitializing, setIsInitializing] = useState(!isOperationDisabled)
  const isLoading = useMemo(
    () => isInitializing || waitForUtxosToBeSpent.length > 0,
    [isInitializing, waitForUtxosToBeSpent]
  )

  useEffect(() => {
    setTakerStartedInfoAlert((current) => (isCoinjoinInProgress ? current : null))
  }, [isCoinjoinInProgress])

  const initialDestination = null
  const initialAccount = 0
  const initialAmount = null
  const initialNumCollaborators = (minValue) => {
    const defaultNumber = pseudoRandomNumber(8, 10)

    if (minValue > 8) {
      return minValue + pseudoRandomNumber(0, 2)
    }

    return defaultNumber
  }

  const [destination, setDestination] = useState(initialDestination)
  const [account, setAccount] = useState(parseInt(location.state?.account, 10) || initialAccount)
  const [amount, setAmount] = useState(initialAmount)
  // see https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/USAGE.md#try-out-a-coinjoin-using-sendpaymentpy
  const [numCollaborators, setNumCollaborators] = useState(initialNumCollaborators(minNumCollaborators))
  const [formIsValid, setFormIsValid] = useState(false)

  const balanceSummary = useBalanceSummary(walletInfo)
  const accountBalanceOrNull = useMemo(
    () => (balanceSummary && balanceSummary.accountBalances[account]) || null,
    [balanceSummary, account]
  )

  useEffect(() => {
    if (
      isValidAddress(destination) &&
      isValidAccount(account) &&
      isValidAmount(amount, isSweep) &&
      (isCoinjoin ? isValidNumCollaborators(numCollaborators, minNumCollaborators) : true)
    ) {
      setFormIsValid(true)
    } else {
      setFormIsValid(false)
    }
  }, [destination, account, amount, numCollaborators, minNumCollaborators, isCoinjoin, isSweep])

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

          const message = err.message || t('send.error_loading_wallet_failed')
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
      const message = err.message || t('send.error_loading_wallet_failed')
      !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message })
    })

    const loadingWalletInfoAndUtxos = reloadCurrentWalletInfo({ signal: abortCtrl.signal }).catch((err) => {
      const message = err.message || t('send.error_loading_wallet_failed')
      !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message })
    })

    const loadingMinimumMakerConfig = loadConfigValue({
      signal: abortCtrl.signal,
      key: { section: 'POLICY', field: 'minimum_makers' },
    })
      .then((data) => {
        const minimumMakers = parseInt(data.value, 10)
        setMinNumCollaborators(minimumMakers)
        setNumCollaborators(initialNumCollaborators(minimumMakers))
      })
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })

    Promise.all([loadingServiceInfo, loadingWalletInfoAndUtxos, loadingMinimumMakerConfig]).finally(
      () => !abortCtrl.signal.aborted && setIsInitializing(false)
    )

    return () => abortCtrl.abort()
  }, [isOperationDisabled, wallet, reloadCurrentWalletInfo, reloadServiceInfo, loadConfigValue, t])

  const sendPayment = async (account, destination, amount_sats) => {
    setAlert(null)
    setPaymentSuccessfulInfoAlert(null)
    setIsSending(true)

    const requestContext = { walletName: wallet.name, token: wallet.token }

    let success = false
    try {
      const res = await Api.postDirectSend(requestContext, { mixdepth: account, destination, amount_sats })

      if (res.ok) {
        const {
          txinfo: { outputs, inputs },
        } = await res.json()
        const output = outputs.find((o) => o.address === destination)
        setPaymentSuccessfulInfoAlert({
          variant: 'success',
          message: t('send.alert_payment_successful', { amount: output.value_sats, address: output.address }),
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

  const startCoinjoin = async (account, destination, amount_sats, counterparties) => {
    setAlert(null)
    setIsSending(true)

    const requestContext = { walletName: wallet.name, token: wallet.token }
    let success = false
    try {
      const res = await Api.postCoinjoin(requestContext, {
        mixdepth: account,
        destination,
        amount_sats,
        counterparties,
      })

      if (res.ok) {
        const data = await res.json()
        console.log(data)
        setTakerStartedInfoAlert({
          variant: 'success',
          message: t('send.alert_coinjoin_started'),
        })
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

  const onSubmit = async (e) => {
    e.preventDefault()

    if (isLoading || isOperationDisabled) return

    const form = e.currentTarget
    const isValid = formIsValid

    if (isValid) {
      const counterparties = parseInt(numCollaborators, 10)

      if (isSweep && amount !== 0) {
        console.error('Sweep amount mismatch. This should not happen.')
        return
      }

      const success = isCoinjoin
        ? await startCoinjoin(account, destination, amount, counterparties)
        : await sendPayment(account, destination, amount)

      if (success) {
        setDestination(initialDestination)
        setAmount(initialAmount)
        setNumCollaborators(initialNumCollaborators(minNumCollaborators))
        setIsCoinjoin(IS_COINJOIN_DEFAULT_VAL)
        setIsSweep(false)

        form.reset()
      }
    }
  }

  const amountFieldValue = () => {
    if (amount === null || Number.isNaN(amount)) return ''

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
              <rb.Alert variant="info" className="mb-4">
                {t('send.text_coinjoin_already_running')}
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
          <rb.Alert variant={paymentSuccessfulInfoAlert.variant}>{paymentSuccessfulInfoAlert.message}</rb.Alert>
        )}
        {takerStartedInfoAlert && (
          <rb.Alert variant={takerStartedInfoAlert.variant}>{takerStartedInfoAlert.message}</rb.Alert>
        )}

        <rb.Form id="send-form" onSubmit={onSubmit} noValidate className={styles['send-form']}>
          <rb.Form.Group className="mb-4 flex-grow-1" controlId="account">
            <rb.Form.Label>
              {settings.useAdvancedWalletMode ? t('send.label_account_dev_mode') : t('send.label_account')}
            </rb.Form.Label>
            {isLoading ? (
              <rb.Placeholder as="div" animation="wave">
                <rb.Placeholder xs={12} className={styles['input-loader']} />
              </rb.Placeholder>
            ) : (
              <rb.Form.Select
                defaultValue={account}
                onChange={(e) => setAccount(parseInt(e.target.value, 10))}
                required
                className={`${styles['select']} slashed-zeroes`}
                isInvalid={!isValidAccount(account)}
                disabled={isOperationDisabled}
              >
                {balanceSummary &&
                  Object.values(balanceSummary.accountBalances)
                    .sort((lhs, rhs) => lhs.accountIndex - rhs.accountIndex)
                    .map(({ accountIndex, totalBalance, calculatedTotalBalanceInSats }) => (
                      <option key={accountIndex} value={accountIndex}>
                        {settings.useAdvancedWalletMode
                          ? t('send.account_selector_option_dev_mode', { number: accountIndex })
                          : t('send.account_selector_option', { number: accountIndex })}{' '}
                        {settings.showBalance &&
                          (settings.unit === 'sats'
                            ? `(${formatSats(calculatedTotalBalanceInSats)} sats)`
                            : `(\u20BF${formatBtc(totalBalance)})`)}
                      </option>
                    ))}
              </rb.Form.Select>
            )}
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
          <rb.Form.Group className="mb-4" controlId="destination">
            <rb.Form.Label>{t('send.label_recipient')}</rb.Form.Label>
            {isLoading ? (
              <rb.Placeholder as="div" animation="wave">
                <rb.Placeholder xs={12} className={styles['input-loader']} />
              </rb.Placeholder>
            ) : (
              <rb.Form.Control
                name="destination"
                placeholder={t('send.placeholder_recipient')}
                className={`${styles.input} slashed-zeroes`}
                value={destination || ''}
                required
                onChange={(e) => setDestination(e.target.value)}
                isInvalid={destination !== null && !isValidAddress(destination)}
                disabled={isOperationDisabled}
              />
            )}
            <rb.Form.Control.Feedback type="invalid">{t('send.feedback_invalid_recipient')}</rb.Form.Control.Feedback>
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
          variant={isCoinjoin ? 'dark' : 'danger'}
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
          ) : isCoinjoin ? (
            t('send.button_send')
          ) : (
            t('send.button_send_without_improved_privacy')
          )}
        </rb.Button>
      </div>
    </>
  )
}
