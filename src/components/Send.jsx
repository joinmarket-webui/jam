import React, { useEffect } from 'react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import * as rb from 'react-bootstrap'
import PageTitle from './PageTitle'
import ToggleSwitch from './ToggleSwitch'
import Sprite from './Sprite'
import Balance from './Balance'
import { useCurrentWalletInfo, useReloadCurrentWalletInfo, useCurrentWallet } from '../context/WalletContext'
import { useServiceInfo } from '../context/ServiceInfoContext'
import { useSettings } from '../context/SettingsContext'
import * as Api from '../libs/JmWalletApi'
import { btcToSats, SATS } from '../utils'
import './Send.css'

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

const CollaboratorsSelector = ({ numCollaborators, setNumCollaborators, minNumCollaborators }) => {
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
    <rb.Form noValidate className="collaborators-selector">
      <rb.Form.Group>
        <rb.Form.Label className="mb-0">{t('send.label_num_collaborators', { numCollaborators })}</rb.Form.Label>
        <div className="mb-2">
          <rb.Form.Text className="text-secondary">{t('send.description_num_collaborators')}</rb.Form.Text>
        </div>
        <div className="d-flex flex-row flex-wrap">
          {defaultCollaboratorsSelection.map((number) => {
            return (
              <rb.Button
                key={number}
                variant={settings.theme === 'light' ? 'white' : 'dark'}
                className={`p-2 border border-1 rounded text-center${
                  !usesCustomNumCollaborators && numCollaborators === number
                    ? settings.theme === 'light'
                      ? ' border-dark'
                      : ' selected-dark'
                    : ''
                }`}
                onClick={() => {
                  setUsesCustomNumCollaborators(false)
                  setNumCollaborators(number)
                }}
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
            className={`p-2 border border-1 rounded text-center${
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
  requestContext,
  httpStatus,
  errorMessage,
  onMaxFeeSettingsMissing
) => {
  const configExists = (section, field) => Api.postConfigGet(requestContext, { section, field }).then((res) => res.ok)

  const tryEnhanceMessage = httpStatus === 409
  if (tryEnhanceMessage) {
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

export default function Send() {
  const { t } = useTranslation()
  const wallet = useCurrentWallet()
  const walletInfo = useCurrentWalletInfo()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const serviceInfo = useServiceInfo()
  const settings = useSettings()

  const location = useLocation()
  const [alert, setAlert] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isCoinjoinOptionEnabled, setIsCoinjoinOptionEnabled] = useState(
    serviceInfo && !serviceInfo.makerRunning && !serviceInfo.coinjoinInProgress
  )
  const [isCoinjoin, setIsCoinjoin] = useState(isCoinjoinOptionEnabled)
  const [minNumCollaborators, setMinNumCollaborators] = useState(MINIMUM_MAKERS_DEFAULT_VAL)
  const [isSweep, setIsSweep] = useState(false)

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

  useEffect(() => {
    const coinjoinOptionEnabled = serviceInfo && !serviceInfo.makerRunning && !serviceInfo.coinjoinInProgress
    setIsCoinjoinOptionEnabled(coinjoinOptionEnabled)

    if (!coinjoinOptionEnabled && isCoinjoin) {
      setIsCoinjoin(false)
    }
  }, [serviceInfo, isCoinjoin])

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

  useEffect(() => {
    const abortCtrl = new AbortController()

    setAlert(null)
    setIsLoading(true)

    const loadingWalletInfoAndUtxos = reloadCurrentWalletInfo({ signal: abortCtrl.signal }).catch((err) => {
      const message = err.message || t('send.error_loading_wallet_failed')
      !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message })
    })

    const requestContext = { walletName: wallet.name, token: wallet.token, signal: abortCtrl.signal }
    const loadingMinimumMakerConfig = Api.postConfigGet(requestContext, { section: 'POLICY', field: 'minimum_makers' })
      .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res, t('send.error_loading_min_makers_failed'))))
      .then((data) => {
        const minimumMakers = parseInt(data.configvalue, 10)
        setMinNumCollaborators(minimumMakers)
        setNumCollaborators(initialNumCollaborators(minimumMakers))
      })
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })

    Promise.all([loadingWalletInfoAndUtxos, loadingMinimumMakerConfig]).finally(
      () => !abortCtrl.signal.aborted && setIsLoading(false)
    )

    return () => abortCtrl.abort()
  }, [wallet, reloadCurrentWalletInfo, t])

  const sendPayment = async (account, destination, amount_sats) => {
    setAlert(null)
    setIsSending(true)

    const requestContext = { walletName: wallet.name, token: wallet.token }

    let success = false
    try {
      const res = await Api.postDirectSend(requestContext, { mixdepth: account, destination, amount_sats })

      setIsSending(false)

      if (res.ok) {
        const {
          txinfo: { outputs },
        } = await res.json()
        const output = outputs.find((o) => o.address === destination)
        setAlert({
          variant: 'success',
          message: t('send.alert_payment_successful', { amount: output.value_sats, address: output.address }),
        })
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

      setIsSending(false)

      if (res.ok) {
        const data = await res.json()
        console.log(data)
        setAlert({ variant: 'success', message: t('send.alert_coinjoin_started') })
        success = true
      } else {
        const message = await Api.Helper.extractErrorMessage(res)
        const displayMessage = await enhanceTakerErrorMessageIfNecessary(
          requestContext,
          res.status,
          message,
          (errorMessage) => `${errorMessage} ${t('send.taker_error_message_max_fees_config_missing')}`
        )

        setAlert({ variant: 'danger', message: displayMessage })
      }
    } catch (e) {
      setIsSending(false)
      setAlert({ variant: 'danger', message: e.message })
    }

    return success
  }

  const onSubmit = async (e) => {
    e.preventDefault()

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
        setAccount(initialAccount)
        setAmount(initialAmount)
        setNumCollaborators(initialNumCollaborators(minNumCollaborators))
        setIsCoinjoin(false)
        form.reset()
      }
    }
  }

  const balanceBreakdown = (accountNumber) => {
    if (!walletInfo || !walletInfo.data.display.walletinfo.accounts || !walletInfo.data.utxos.utxos) {
      return null
    }

    const filtered = walletInfo.data.display.walletinfo.accounts.filter((account) => {
      return parseInt(account.account, 10) === accountNumber
    })

    if (filtered.length !== 1) {
      return null
    }

    const utxosByAccount = walletInfo.data.utxos.utxos.reduce((acc, utxo) => {
      acc[utxo.mixdepth] = acc[utxo.mixdepth] || []
      acc[utxo.mixdepth].push(utxo)
      return acc
    }, {})
    const accountUtxos = utxosByAccount[accountNumber] || []
    const frozenOrLockedUtxos = accountUtxos.filter((utxo) => utxo.frozen || utxo.locktime)
    const balanceFrozenOrLocked = frozenOrLockedUtxos.reduce((acc, utxo) => acc + utxo.value, 0)

    return {
      totalBalance: btcToSats(filtered[0].account_balance),
      frozenOrLockedBalance: balanceFrozenOrLocked,
    }
  }

  const amountFieldValue = () => {
    if (amount === null || Number.isNaN(amount)) return ''

    if (isSweep) {
      const breakdown = balanceBreakdown(account)

      if (!breakdown) return ''

      return breakdown.totalBalance - breakdown.frozenOrLockedBalance
    }

    return amount
  }

  const frozenOrLockedWarning = () => {
    const breakdown = balanceBreakdown(account)

    if (!breakdown) return null

    return (
      <div className="sweep-breakdown mt-2">
        <rb.Accordion flush>
          <rb.Accordion.Item eventKey="0">
            <rb.Accordion.Header>
              <div className="d-flex align-items-center justify-content-end w-100">
                {t('send.button_sweep_amount_breakdown')}
              </div>
            </rb.Accordion.Header>
            <rb.Accordion.Body className="my-4 p-0">
              <table className="table table-sm">
                <tbody>
                  <tr>
                    <td>{t('send.sweep_amount_breakdown_total_balance')}</td>
                    <td className="balance-col">
                      <Balance
                        valueString={breakdown.totalBalance.toString()}
                        convertToUnit={SATS}
                        showBalance={true}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>{t('send.sweep_amount_breakdown_frozen_balance')}</td>
                    <td className="balance-col">
                      <Balance
                        valueString={breakdown.frozenOrLockedBalance.toString()}
                        convertToUnit={SATS}
                        showBalance={true}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>{t('send.sweep_amount_breakdown_estimated_amount')}</td>
                    <td className="balance-col">
                      <Balance valueString={amountFieldValue().toString()} convertToUnit={SATS} showBalance={true} />
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mb-0 mt-4">
                <Trans i18nKey="send.sweep_amount_breakdown_explanation">
                  A sweep transaction will consume all UTXOs of a mixdepth leaving no coins behind except those that
                  have been
                  <a
                    href="https://github.com/JoinMarket-Org/joinmarket-clientserver#wallet-features"
                    target="_blank"
                    rel="noreferrer"
                  >
                    frozen
                  </a>
                  or
                  <a
                    href="https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/fidelity-bonds.md"
                    target="_blank"
                    rel="noreferrer"
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
                    rel="noreferrer"
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
      {isLoading ? (
        <div className="d-flex justify-content-center align-items-center">
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          {t('send.loading')}
        </div>
      ) : (
        <div className="send">
          <PageTitle title={t('send.title')} subtitle={t('send.subtitle')} />

          <rb.Fade in={!isCoinjoinOptionEnabled} mountOnEnter={true} unmountOnExit={true}>
            <rb.Alert variant="info" className="mb-4">
              {serviceInfo?.makerRunning && t('send.text_maker_running')}
              {serviceInfo?.coinjoinInProgress && t('send.text_coinjoin_already_running')}
            </rb.Alert>
          </rb.Fade>

          {alert && (
            <rb.Alert className="slashed-zeroes" variant={alert.variant}>
              {alert.message}
            </rb.Alert>
          )}

          <rb.Form onSubmit={onSubmit} noValidate id="send-form">
            <rb.Form.Group className="mb-4 flex-grow-1" controlId="account">
              <rb.Form.Label>
                {settings.useAdvancedWalletMode ? t('send.label_account_dev_mode') : t('send.label_account')}
              </rb.Form.Label>
              <rb.Form.Select
                defaultValue={account}
                onChange={(e) => setAccount(parseInt(e.target.value, 10))}
                required
                className="slashed-zeroes"
                isInvalid={!isValidAccount(account)}
              >
                {walletInfo &&
                  walletInfo.data.display.walletinfo.accounts
                    .sort((lhs, rhs) => lhs.account - rhs.account)
                    .map(({ account, account_balance: balance }) => (
                      <option key={account} value={account}>
                        {settings.useAdvancedWalletMode
                          ? t('send.account_selector_option_dev_mode', { number: account })
                          : t('send.account_selector_option', { number: account })}{' '}
                        {settings.showBalance && `(\u20BF${balance})`}
                      </option>
                    ))}
              </rb.Form.Select>
            </rb.Form.Group>
            <rb.Form.Group className={isSweep ? 'mb-0' : 'mb-4'} controlId="amount">
              <rb.Form.Label form="send-form">{t('send.label_amount')}</rb.Form.Label>
              <div className="position-relative">
                <rb.Form.Control
                  name="amount"
                  type="number"
                  value={amountFieldValue()}
                  className="slashed-zeroes"
                  min={1}
                  placeholder={t('send.placeholder_amount')}
                  required
                  onChange={(e) => setAmount(parseInt(e.target.value, 10))}
                  isInvalid={amount !== null && !isValidAmount(amount, isSweep)}
                  disabled={isSweep}
                />
                <rb.Button variant="outline-dark" className="button-sweep" onClick={() => setIsSweep(!isSweep)}>
                  {isSweep ? (
                    <div>{t('send.button_clear_sweep')}</div>
                  ) : (
                    <div>
                      <Sprite symbol="sweep" width="24px" height="24px" />
                      {t('send.button_sweep')}
                    </div>
                  )}
                </rb.Button>
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
              <rb.Form.Control
                name="destination"
                placeholder={t('send.placeholder_recipient')}
                className="slashed-zeroes"
                value={destination || ''}
                required
                onChange={(e) => setDestination(e.target.value)}
                isInvalid={destination !== null && !isValidAddress(destination)}
              />
              <rb.Form.Control.Feedback type="invalid">{t('send.feedback_invalid_recipient')}</rb.Form.Control.Feedback>
            </rb.Form.Group>
            {isCoinjoinOptionEnabled && (
              <rb.Form.Group controlId="isCoinjoin" className={`${isCoinjoin ? 'mb-3' : ''}`}>
                <ToggleSwitch
                  label={t('send.toggle_coinjoin')}
                  initialValue={isCoinjoin}
                  onToggle={(isToggled) => setIsCoinjoin(isToggled)}
                />
              </rb.Form.Group>
            )}
          </rb.Form>
          {isCoinjoin && (
            <CollaboratorsSelector
              numCollaborators={numCollaborators}
              setNumCollaborators={setNumCollaborators}
              minNumCollaborators={minNumCollaborators}
            />
          )}
          <rb.Button
            variant="dark"
            type="submit"
            disabled={isSending || !formIsValid}
            className="mt-4"
            form="send-form"
          >
            {isSending ? (
              <div>
                <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                {t('send.text_sending')}
              </div>
            ) : (
              t('send.button_send')
            )}
          </rb.Button>
        </div>
      )}
    </>
  )
}
