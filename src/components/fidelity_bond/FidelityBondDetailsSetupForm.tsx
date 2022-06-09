import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'

import { WalletInfo, CurrentWallet, Utxos, Account } from '../../context/WalletContext'
// @ts-ignore
import { useSettings } from '../../context/SettingsContext'

// @ts-ignore
import Balance from '../../components/Balance'
// @ts-ignore
import ToggleSwitch from '../../components/ToggleSwitch'
import { useBalanceSummary, WalletBalanceSummary } from '../../hooks/BalanceSummary'

import Sprite from './../Sprite'
import UtxoSelector from './UtxoSelector'
import AccountSelector from './AccountSelector'
import LockdateForm, { toYearsRange, lockdateToTimestamp, DEFAULT_MAX_TIMELOCK_YEARS } from './LockdateForm'

import { routes } from '../../constants/routes'
import * as Api from '../../libs/JmWalletApi'
import { isDebugFeatureEnabled } from '../../constants/debugFeatures'

const timeUtils = (() => {
  type Milliseconds = number
  type UnitKey = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second'

  type Units = {
    [key in UnitKey]: Milliseconds
  }

  const units: Units = {
    year: 24 * 60 * 60 * 1_000 * 365,
    month: (24 * 60 * 60 * 1_000 * 365) / 12,
    day: 24 * 60 * 60 * 1_000,
    hour: 60 * 60 * 1_000,
    minute: 60 * 1_000,
    second: 1_000,
  }

  type Locales = Intl.UnicodeBCP47LocaleIdentifier | Intl.UnicodeBCP47LocaleIdentifier[]
  const timeElapsed = (d1: Milliseconds, d2: Milliseconds = Date.now(), locales: Locales = 'en') => {
    const rtf = new Intl.RelativeTimeFormat(locales, { numeric: 'auto' })
    const elapsedInMillis: Milliseconds = d1 - d2

    for (let k of Object.keys(units) as UnitKey[]) {
      const limit: number = units[k]
      if (Math.abs(elapsedInMillis) > limit) {
        return rtf.format(Math.round(elapsedInMillis / limit), k)
      }
    }

    return rtf.format(Math.round(elapsedInMillis / units['second']), 'second')
  }

  return {
    timeElapsed,
  }
})()

interface SelectAccountStepProps {
  walletInfo: WalletInfo
  onSelected: (account: Account | null) => void
}

const SelectAccountStep = ({ walletInfo, onSelected }: SelectAccountStepProps) => {
  const accounts = useMemo(() => walletInfo.data.display.walletinfo.accounts, [walletInfo])
  const utxos = useMemo(() => walletInfo.data.utxos.utxos, [walletInfo])

  // TODO: this is a common pattern - try to generalize
  const utxosByAccount = useMemo(() => {
    return utxos.reduce((acc, utxo) => {
      const key = `${utxo.mixdepth}`
      acc[key] = acc[key] || []
      acc[key].push(utxo)
      return acc
    }, {} as { [key: string]: Utxos })
  }, [utxos])

  const availableAccounts = useMemo(() => {
    const accountsWithUtxos = Object.keys(utxosByAccount)
    return accounts.filter((it) => accountsWithUtxos.includes(it.account))
  }, [utxosByAccount, accounts])

  const selectableAccounts = useMemo(() => {
    return accounts.map((it) => ({
      ...it,
      disabled: !availableAccounts.includes(it),
      utxos: utxosByAccount[it.account] || [],
    }))
  }, [accounts, availableAccounts, utxosByAccount])

  const onChange = useCallback(
    (selected: Account[]) => {
      onSelected(selected.length === 1 ? selected[0] : null)
    },
    [onSelected]
  )

  return (
    <>
      <h4>Select Account</h4>
      {availableAccounts.length === 0 ? (
        <>
          <Link to={routes.receive} className="unstyled">
            <rb.Alert variant="info" className="mb-4">
              <rb.Row className="align-items-center">
                <rb.Col>
                  <>
                    No suitable account available. Fund your wallet and run the scheduler, before you create a Fidelity
                    Bond.
                  </>
                </rb.Col>
                <rb.Col xs="auto">
                  <Sprite symbol="caret-right" width="24px" height="24px" />
                </rb.Col>
              </rb.Row>
            </rb.Alert>
          </Link>
        </>
      ) : (
        <>
          <AccountSelector accounts={selectableAccounts} type="radio" onChange={onChange} />
        </>
      )}
    </>
  )
}

interface SelectUtxosStepProps {
  balanceSummary: WalletBalanceSummary
  account: Account
  utxos: Utxos
  onSelected: (utxos: Utxos) => void
}
const SelectUtxosStep = ({ balanceSummary, account, utxos, onSelected }: SelectUtxosStepProps) => {
  const settings = useSettings()
  const [selectedUtxos, setSelectedUtxos] = useState<Utxos>([])

  const selectedUtxosAmountSum = useMemo(
    () => selectedUtxos.reduce((acc, current) => acc + current.value, 0),
    [selectedUtxos]
  )

  useEffect(() => {
    setSelectedUtxos([])
  }, [utxos])

  useEffect(() => {
    onSelected(selectedUtxos)
  }, [selectedUtxos, onSelected])

  // TODO: add `calculatedTotalBalanceInSats`
  const walletTotalBalanceInSats = useMemo(
    () => balanceSummary.calculatedAvailableBalanceInSats + balanceSummary.calculatedFrozenOrLockedBalanceInSats,
    [balanceSummary]
  )

  const relativeSizeToTotalBalance = useMemo(() => {
    if (walletTotalBalanceInSats <= 0) return 0
    return selectedUtxosAmountSum / walletTotalBalanceInSats
  }, [selectedUtxosAmountSum, walletTotalBalanceInSats])

  return (
    <>
      <h2>Select UTXOs</h2>

      <rb.Card
        className="w-100"
        style={{
          position: 'sticky',
          top: '75px',
          zIndex: 10,
        }}
      >
        <rb.Card.Body style={{ padding: '0.25rem' }}>
          <rb.Table
            className="rounded"
            variant={settings.theme}
            style={{
              marginBottom: 0,
            }}
          >
            <tbody>
              <tr>
                <td>Account</td>
                <td className="text-end">#{account.account}</td>
              </tr>
              <tr>
                <td>Total sum of selected UTXOs</td>
                <td className="text-end">
                  <Balance
                    valueString={`${selectedUtxosAmountSum}`}
                    convertToUnit={settings.unit}
                    showBalance={settings.showBalance}
                  />
                </td>
              </tr>
              <tr>
                <td className="border-0">Relative size to your total balance</td>
                <td className="border-0 text-end">{(relativeSizeToTotalBalance * 100).toFixed(2)}%</td>
              </tr>
            </tbody>
          </rb.Table>
        </rb.Card.Body>
      </rb.Card>

      <div className="mt-3">
        <UtxoSelector utxos={utxos} onChange={setSelectedUtxos} />
      </div>
    </>
  )
}

interface SelectLockdateStepProps {
  utxos: Utxos
  onChange: (lockdate: Api.Lockdate) => void
}
const SelectLockdateStep = ({ utxos, onChange }: SelectLockdateStepProps) => {
  const { i18n } = useTranslation()
  const settings = useSettings()

  const [lockdate, setLockdate] = useState<Api.Lockdate | null>(null)
  const yearsRange = useMemo(() => {
    if (isDebugFeatureEnabled('allowCreatingExpiredFidelityBond')) {
      return toYearsRange(-1, DEFAULT_MAX_TIMELOCK_YEARS)
    }
    return toYearsRange(0, DEFAULT_MAX_TIMELOCK_YEARS)
  }, [])

  const timeTillUnlockString = useMemo(
    () =>
      lockdate &&
      timeUtils.timeElapsed(lockdateToTimestamp(lockdate), Date.now(), i18n.resolvedLanguage || i18n.language),
    [lockdate, i18n]
  )

  const selectedUtxosAmountSum = useMemo(() => utxos.reduce((acc, current) => acc + current.value, 0), [utxos])

  return (
    <>
      <h4>Select duration</h4>
      <rb.Card className="w-100">
        <rb.Card.Body>
          <rb.Form noValidate>
            <LockdateForm
              onChange={(it) => {
                setLockdate(it)
                onChange(it)
              }}
              yearsRange={yearsRange}
            />

            {timeTillUnlockString && <p className="lead text-center">Funds will unlock {timeTillUnlockString}</p>}
          </rb.Form>
        </rb.Card.Body>
      </rb.Card>

      <rb.Card className="w-100 mt-3">
        <rb.Card.Body style={{ padding: '0.25rem' }}>
          <rb.Table
            variant={settings.theme}
            style={{
              marginBottom: 0,
            }}
          >
            <tbody>
              <tr>
                <td>Fidelity Bond Size</td>
                <td className="text-end">
                  <Balance
                    valueString={`${selectedUtxosAmountSum}`}
                    convertToUnit={settings.unit}
                    showBalance={settings.showBalance}
                  />
                </td>
              </tr>
              <tr>
                <td>Locked until</td>
                <td className="text-end">{lockdate || '-'}</td>
              </tr>
              <tr>
                <td className="border-0">Duration</td>
                <td className="border-0 text-end">{timeTillUnlockString || '-'}</td>
              </tr>
            </tbody>
          </rb.Table>
        </rb.Card.Body>
      </rb.Card>
    </>
  )
}

interface ConfirmationStepProps {
  balanceSummary: WalletBalanceSummary
  account: Account
  utxos: Utxos
  lockdate: Api.Lockdate
  confirmed: boolean
  onChange: (confirmed: boolean) => void
}

const ConfirmationStep = ({ balanceSummary, account, utxos, lockdate, confirmed, onChange }: ConfirmationStepProps) => {
  const { t, i18n } = useTranslation()
  const settings = useSettings()

  const timeTillUnlockString = useMemo(
    () => timeUtils.timeElapsed(lockdateToTimestamp(lockdate), Date.now(), i18n.resolvedLanguage || i18n.language),
    [lockdate, i18n]
  )

  const selectedUtxosAmountSum = useMemo(() => utxos.reduce((acc, current) => acc + current.value, 0), [utxos])

  // TODO: add `calculatedTotalBalanceInSats`
  const walletTotalBalanceInSats = useMemo(
    () => balanceSummary.calculatedAvailableBalanceInSats + balanceSummary.calculatedFrozenOrLockedBalanceInSats,
    [balanceSummary]
  )

  const relativeSizeToTotalBalance = useMemo(() => {
    if (walletTotalBalanceInSats <= 0) return 0
    return selectedUtxosAmountSum / walletTotalBalanceInSats
  }, [selectedUtxosAmountSum, walletTotalBalanceInSats])

  return (
    <>
      <h4>Confirmation</h4>
      <p>Please review the summary of your inputs carefully.</p>

      <rb.Card className="w-100 mt-3">
        <rb.Card.Body style={{ padding: '0.25rem' }}>
          <rb.Table
            variant={settings.theme}
            style={{
              marginBottom: 0,
            }}
          >
            <tbody>
              <tr>
                <td>Account</td>
                <td className="text-end">#{account.account}</td>
              </tr>
              <tr>
                <td>Fidelity Bond Size</td>
                <td className="text-end">
                  <Balance
                    valueString={`${selectedUtxosAmountSum}`}
                    convertToUnit={settings.unit}
                    showBalance={settings.showBalance}
                  />
                </td>
              </tr>
              <tr>
                <td>Relative size to your total balance</td>
                <td className="text-end">{(relativeSizeToTotalBalance * 100).toFixed(2)} %</td>
              </tr>
              <tr>
                <td className="">Locked until</td>
                <td className="text-end">{lockdate}</td>
              </tr>
              <tr>
                <td className="border-0">Duration</td>
                <td className="border-0 text-end">{timeTillUnlockString}</td>
              </tr>
            </tbody>
          </rb.Table>
        </rb.Card.Body>
      </rb.Card>

      <div className="my-4 d-flex justify-content-center">
        {/* TODO: reset the toggle value (once that is implemented) when a user leaves the page, e.g. "Back" button */}
        <ToggleSwitch
          label={t('fidelity_bond.create_form.confirmation_toggle_title')}
          subtitle={t('fidelity_bond.create_form.confirmation_toggle_subtitle')}
          initialValue={confirmed}
          onToggle={(isToggled: boolean) => onChange(isToggled)}
        />
      </div>
    </>
  )
}

interface FidelityBondDetailsSetupFormProps {
  currentWallet: CurrentWallet
  walletInfo: WalletInfo
  onSubmit: (
    account: Account,
    utxos: Utxos,
    lockdate: Api.Lockdate,
    timelockedAddress: Api.BitcoinAddress
  ) => Promise<unknown>
}

const FidelityBondDetailsSetupForm = ({ currentWallet, walletInfo, onSubmit }: FidelityBondDetailsSetupFormProps) => {
  const { t } = useTranslation()
  const settings = useSettings()
  const balanceSummary = useBalanceSummary(walletInfo)

  const utxos = useMemo(() => (walletInfo === null ? [] : walletInfo.data.utxos.utxos), [walletInfo])

  const [step, setStep] = useState<number>(0)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [selectedUtxos, setSelectedUtxos] = useState<Utxos | null>(null)
  const [selectedLockdate, setSelectedLockdate] = useState<Api.Lockdate | null>(null)
  const [userConfirmed, setUserConfirmed] = useState(false)

  const selectedUtxosAmountSum = useMemo(
    () => selectedUtxos?.reduce((acc, current) => acc + current.value, 0),
    [selectedUtxos]
  )

  // TODO: this is a common pattern - try to generalize
  const utxosByAccount = useMemo(() => {
    return utxos.reduce((acc, utxo) => {
      const key = `${utxo.mixdepth}`
      acc[key] = acc[key] || []
      acc[key].push(utxo)
      return acc
    }, {} as { [key: string]: Utxos })
  }, [utxos])

  useEffect(() => {
    if (selectedAccount === null) {
      setStep(0)
    }
  }, [selectedAccount])

  useEffect(() => {
    // TODO: toggle button has no way to reflect this change currently
    setUserConfirmed(false)
  }, [step, selectedAccount, selectedUtxos, selectedLockdate])

  /**
   * Log the timelocked address to console in development mode!
   * This will enable devs to send to the address
   * in another way than dictated by this view.
   */
  useEffect(() => {
    if (!selectedLockdate) return
    if (!isDebugFeatureEnabled('logFidelityBondAddressToConsole')) return

    const abortCtrl = new AbortController()
    Api.getAddressTimelockNew({
      walletName: currentWallet.name,
      token: currentWallet.token,
      signal: abortCtrl.signal,
      lockdate: selectedLockdate,
    })
      .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res)))
      .then((data) => data.address)
      .then((timelockedAddress) => console.info(`Address with lockdate '${selectedLockdate}':`, timelockedAddress))
      .catch((error) => console.warn(`Could not fetch address with lockdate '${selectedLockdate}':`, error))

    return () => {
      abortCtrl.abort()
    }
  }, [currentWallet, selectedLockdate])

  const _onSubmit = async (account: Account, utxos: Utxos, lockdate: Api.Lockdate) => {
    if (!currentWallet) return
    if (utxos.length === 0) return

    const allUtxosInAccount = utxosByAccount[account.account]

    // sanity check
    const sameAccountCheck = utxos.every((it) => allUtxosInAccount.includes(it))
    if (!sameAccountCheck) {
      throw new Error('Given utxos must be from the same account')
    }

    const { name: walletName, token } = currentWallet
    const timelockedDestinationAddress = await Api.getAddressTimelockNew({
      walletName,
      token,
      lockdate,
    })
      .then((res) =>
        res.ok ? res.json() : Api.Helper.throwError(res, t('fidelity_bond.error_loading_timelock_address_failed'))
      )
      .then((data) => data.address)

    return await onSubmit(account, utxos, lockdate, timelockedDestinationAddress)
  }

  return (
    <div>
      <div className="d-flex justify-items-center align-items-center">
        <h3>Step {step + 1}</h3>
        {step > 0 && (
          <rb.Button
            variant="link"
            type="button"
            className="ms-auto align-self-start"
            onClick={() => setStep(step - 1)}
          >
            {t('global.back')}
          </rb.Button>
        )}
      </div>

      {walletInfo && (
        <div className={`${step !== 0 ? 'd-none' : ''}`}>
          <SelectAccountStep walletInfo={walletInfo} onSelected={setSelectedAccount} />

          <rb.Button
            variant="dark"
            type="button"
            size="lg"
            className="w-100 mt-4"
            disabled={selectedAccount === null}
            onClick={() => setStep(1)}
          >
            {t('global.next')}
          </rb.Button>
        </div>
      )}
      {balanceSummary && selectedAccount && (
        <div className={`${step !== 1 ? 'd-none' : ''}`}>
          <SelectUtxosStep
            balanceSummary={balanceSummary}
            account={selectedAccount}
            utxos={utxosByAccount[selectedAccount.account]}
            onSelected={setSelectedUtxos}
          />

          <rb.Button
            variant="dark"
            type="button"
            size="lg"
            className="w-100 mt-4"
            disabled={selectedUtxos === null || selectedUtxos.length === 0}
            onClick={() => setStep(2)}
          >
            {!selectedUtxosAmountSum ? (
              t('global.next')
            ) : (
              <>
                Proceed with
                {` `}
                <Balance
                  valueString={`${selectedUtxosAmountSum}`}
                  convertToUnit={settings.unit}
                  showBalance={settings.showBalance}
                />
              </>
            )}
          </rb.Button>

          <rb.Button variant="link" type="button" className="w-100 mt-4" onClick={() => setStep(0)}>
            {t('global.back')}
          </rb.Button>
        </div>
      )}

      {balanceSummary && selectedAccount && selectedUtxos && (
        <div className={`${step !== 2 ? 'd-none' : ''}`}>
          <SelectLockdateStep utxos={selectedUtxos} onChange={setSelectedLockdate} />

          <rb.Button
            variant="dark"
            type="button"
            size="lg"
            className="w-100 mt-4"
            disabled={selectedLockdate === null}
            onClick={() => setStep(3)}
          >
            {t('global.next')}
          </rb.Button>

          <rb.Button variant="link" type="button" className="w-100 mt-4" onClick={() => setStep(1)}>
            {t('global.back')}
          </rb.Button>
        </div>
      )}

      {balanceSummary && selectedAccount && selectedUtxos && selectedLockdate && (
        <div className={`${step !== 3 ? 'd-none' : ''}`}>
          <ConfirmationStep
            balanceSummary={balanceSummary}
            account={selectedAccount}
            utxos={selectedUtxos}
            lockdate={selectedLockdate}
            confirmed={userConfirmed}
            onChange={setUserConfirmed}
          />

          <rb.Button
            variant="dark"
            type="button"
            size="lg"
            className="w-100 mt-4"
            disabled={!userConfirmed}
            onClick={() => _onSubmit(selectedAccount, selectedUtxos, selectedLockdate)}
          >
            {t('fidelity_bond.create_form.button_create')}
          </rb.Button>

          <rb.Button variant="link" type="button" className="w-100 mt-4" onClick={() => setStep(2)}>
            {t('global.back')}
          </rb.Button>
        </div>
      )}
    </div>
  )
}

export default FidelityBondDetailsSetupForm
