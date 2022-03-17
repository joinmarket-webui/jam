import React, { useEffect } from 'react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as rb from 'react-bootstrap'
import PageTitle from './PageTitle'
import ToggleSwitch from './ToggleSwitch'
import { useCurrentWalletInfo, useSetCurrentWalletInfo, useCurrentWallet } from '../context/WalletContext'
import { useSettings } from '../context/SettingsContext'
import * as Api from '../libs/JmWalletApi'

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

const isValidAmount = (candidate) => {
  const parsed = parseInt(candidate, 10)
  return !isNaN(parsed) && parsed > 0
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

const enhanceTakerErrorMessageIfNecessary = async (requestContext, httpStatus, errorMessage) => {
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
      return `${errorMessage}`
    }
  }

  return errorMessage
}

export default function Send({ makerRunning, coinjoinInProcess }) {
  const { t } = useTranslation()
  const wallet = useCurrentWallet()
  const walletInfo = useCurrentWalletInfo()
  const setWalletInfo = useSetCurrentWalletInfo()
  const settings = useSettings()

  const location = useLocation()
  const [alert, setAlert] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isCoinjoin, setIsCoinjoin] = useState(false)
  const [isCoinjoinOptionEnabled, setIsCoinjoinOptionEnabled] = useState(!makerRunning && !coinjoinInProcess)
  const [minNumCollaborators, setMinNumCollaborators] = useState(MINIMUM_MAKERS_DEFAULT_VAL)

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
    const coinjoinOptionEnabled = !makerRunning && !coinjoinInProcess
    setIsCoinjoinOptionEnabled(coinjoinOptionEnabled)

    if (!coinjoinOptionEnabled && isCoinjoin) {
      setIsCoinjoin(false)
    }
  }, [makerRunning, coinjoinInProcess, isCoinjoin])

  useEffect(() => {
    if (
      isValidAddress(destination) &&
      isValidAccount(account) &&
      isValidAmount(amount) &&
      (isCoinjoin ? isValidNumCollaborators(numCollaborators, minNumCollaborators) : true)
    ) {
      setFormIsValid(true)
    } else {
      setFormIsValid(false)
    }
  }, [destination, account, amount, numCollaborators, minNumCollaborators, isCoinjoin])

  useEffect(() => {
    const abortCtrl = new AbortController()

    setAlert(null)
    setIsLoading(true)

    const requestContext = { walletName: wallet.name, token: wallet.token, signal: abortCtrl.signal }
    // Reload wallet info if not already available.
    const loadingWalletInfo = walletInfo
      ? Promise.resolve()
      : Api.getWalletDisplay(requestContext)
          .then((res) =>
            res.ok ? res.json() : Promise.reject(new Error(res.message || t('send.error_loading_wallet_failed')))
          )
          .then((data) => setWalletInfo(data.walletinfo))
          .catch((err) => {
            !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
          })

    const loadingMinimumMakerConfig = Api.postConfigGet(requestContext, { section: 'POLICY', field: 'minimum_makers' })
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error(res.message || t('send.error_loading_min_makers_failed')))
      )
      .then((data) => {
        const minimumMakers = parseInt(data.configvalue, 10)
        setMinNumCollaborators(minimumMakers)
        setNumCollaborators(initialNumCollaborators(minimumMakers))
      })
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })

    Promise.all([loadingWalletInfo, loadingMinimumMakerConfig]).finally(
      () => !abortCtrl.signal.aborted && setIsLoading(false)
    )

    return () => abortCtrl.abort()
  }, [wallet, walletInfo, setWalletInfo, t])

  const sendPayment = async (account, destination, amount_sats) => {
    const { name: walletName, token } = wallet

    setAlert(null)
    setIsSending(true)
    let success = false
    try {
      const res = await Api.postDirectSend({ walletName, token }, { mixdepth: account, destination, amount_sats })
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
        const { message } = await res.json()
        setAlert({ variant: 'danger', message })
      }
    } catch (e) {
      setAlert({ variant: 'danger', message: e.message })
    } finally {
      setIsSending(false)
    }

    return success
  }

  const startCoinjoin = async (account, destination, amount_sats, counterparties) => {
    const requestContext = { walletName: wallet.name, token: wallet.token }

    setAlert(null)
    setIsSending(true)
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
        setAlert({ variant: 'success', message: t('send.alert_coinjoin_started') })
        success = true
      } else {
        const { message } = await res.json()
        const displayMessage = await enhanceTakerErrorMessageIfNecessary(
          requestContext,
          res.status,
          `${message} ${t('send.taker_error_message_max_fees_config_missing')}`
        )

        setAlert({ variant: 'danger', message: displayMessage })
      }
    } catch (e) {
      setAlert({ variant: 'danger', message: e.message })
    } finally {
      setIsSending(false)
    }

    return success
  }

  const onSubmit = async (e) => {
    e.preventDefault()

    const form = e.currentTarget
    const isValid = formIsValid

    if (isValid) {
      const counterparties = parseInt(numCollaborators, 10)

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
            <div className="mb-4 p-3 border border-1 rounded">
              <small className="text-secondary">
                {makerRunning && t('send.text_maker_running')}
                {coinjoinInProcess && t('send.text_coinjoin_already_running')}
              </small>
            </div>
          </rb.Fade>

          {alert && (
            <rb.Alert className="slashed-zeroes" variant={alert.variant}>
              {alert.message}
            </rb.Alert>
          )}

          <rb.Form onSubmit={onSubmit} noValidate id="send-form">
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
                  walletInfo.accounts
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
            <rb.Form.Group className="mb-4" controlId="amount">
              <rb.Form.Label form="send-form">{t('send.label_amount')}</rb.Form.Label>
              <rb.Form.Control
                name="amount"
                type="number"
                value={amount || ''}
                className="slashed-zeroes"
                min={1}
                placeholder={t('send.placeholder_amount')}
                required
                onChange={(e) => setAmount(parseInt(e.target.value, 10))}
                isInvalid={amount !== null && !isValidAmount(amount)}
              />
              <rb.Form.Control.Feedback form="send-form" type="invalid">
                {t('send.feedback_invalid_amount')}
              </rb.Form.Control.Feedback>
            </rb.Form.Group>
            {isCoinjoinOptionEnabled && (
              <rb.Form.Group controlId="isCoinjoin" className={`${isCoinjoin ? 'mb-3' : ''}`}>
                <ToggleSwitch label={t('send.toggle_coinjoin')} onToggle={(isToggled) => setIsCoinjoin(isToggled)} />
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
