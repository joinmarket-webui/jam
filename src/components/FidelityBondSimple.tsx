import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import {
  useCurrentWallet,
  useCurrentWalletInfo,
  useReloadCurrentWalletInfo,
  WalletInfo,
  CurrentWallet,
  Utxos,
  Utxo,
  Account,
} from '../context/WalletContext'
import * as Api from '../libs/JmWalletApi'
// @ts-ignore
import DisplayUTXOs from './DisplayUTXOs'
// @ts-ignore
import Balance from '../components/Balance'
// @ts-ignore
import { useSettings } from '../context/SettingsContext'
// @ts-ignore
import ToggleSwitch from '../components/ToggleSwitch'

import { SATS } from '../utils'
import { useBalanceSummary, WalletBalanceSummary } from '../hooks/BalanceSummary'
import { routes } from '../constants/routes'
import Sprite from './Sprite'
import { useServiceInfo } from '../context/ServiceInfoContext'

type AlertWithMessage = rb.AlertProps & { message: string }

const dateToLockdate = (date: Date): Api.Lockdate =>
  `${date.getUTCFullYear()}-${date.getUTCMonth() >= 9 ? '' : '0'}${1 + date.getUTCMonth()}` as Api.Lockdate

const lockdateToTimestamp = (lockdate: Api.Lockdate): number => {
  const split = lockdate.split('-')
  return Date.UTC(parseInt(split[0], 10), parseInt(split[1], 10) - 1, 1, 0, 0, 0)
}

// a maximum of years for a timelock to be accepted
// this is useful in simple mode - when it should be prevented that users
// lock up their coins for an awful amount of time by accident.
// in "advanced" mode, this can be dropped or increased substantially
const DEFAULT_MAX_TIMELOCK_YEARS = 10

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
  const RELATIVE_TIME_FORMAT = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  const timeElapsed = (d1: Milliseconds, d2: Milliseconds = Date.now()) => {
    const elapsedInMillis: Milliseconds = d1 - d2

    for (let k of Object.keys(units) as UnitKey[]) {
      const limit: number = units[k]
      if (Math.abs(elapsedInMillis) > limit) {
        return RELATIVE_TIME_FORMAT.format(Math.round(elapsedInMillis / limit), k)
      }
    }

    return RELATIVE_TIME_FORMAT.format(Math.round(elapsedInMillis / units['second']), 'second')
  }

  return {
    timeElapsed,
  }
})()

interface LockdateFormProps {
  onChange: (lockdate: Api.Lockdate) => void
  maxYears?: number
}
const LockdateForm = ({ onChange, maxYears = DEFAULT_MAX_TIMELOCK_YEARS }: LockdateFormProps) => {
  const { t } = useTranslation()

  const now = new Date()
  const currentYear = now.getUTCFullYear()
  const currentMonth = 1 + now.getUTCMonth() // utc month ranges from [0, 11]

  const [lockdateYear, setLockdateYear] = useState(currentYear + 1)
  const [lockdateMonth, setLockdateMonth] = useState(currentMonth)

  useEffect(() => {
    const date = new Date(Date.UTC(lockdateYear, lockdateMonth - 1, 1, 0, 0, 0))
    console.log(date.toLocaleDateString())
    onChange(dateToLockdate(date))
  }, [lockdateYear, lockdateMonth, onChange])

  const minMonth = () => {
    if (lockdateYear > currentYear) {
      return 1
    }

    return currentMonth + 1 // can be '13' - which means it never is valid and user must adapt 'year'.
  }

  return (
    <rb.Row>
      <rb.Col xs={6}>
        <rb.Form.Group className="mb-4" controlId="locktimeYear">
          <rb.Form.Label form="fidelity-bond-form">
            <Trans i18nKey="fidelity_bond.form_create.label_locktime_year">Year</Trans>
          </rb.Form.Label>
          <rb.Form.Control
            name="year"
            type="number"
            value={lockdateYear}
            min={currentYear}
            max={currentYear + maxYears}
            placeholder={t('fidelity_bond.form_create.placeholder_locktime_year')}
            required
            onChange={(e) => setLockdateYear(parseInt(e.target.value, 10))}
            isInvalid={lockdateYear < currentYear || lockdateYear > currentYear + maxYears}
          />
          <rb.Form.Control.Feedback type="invalid">
            <Trans i18nKey="fidelity_bond.form_create.feedback_invalid_locktime_year">
              Please provide a valid value.
            </Trans>
          </rb.Form.Control.Feedback>
        </rb.Form.Group>
      </rb.Col>
      <rb.Col xs={6}>
        <rb.Form.Group className="mb-4" controlId="locktimeMonth">
          <rb.Form.Label form="fidelity-bond-form">
            <Trans i18nKey="fidelity_bond.form_create.label_locktime_month">Month</Trans>
          </rb.Form.Label>
          <rb.Form.Control
            name="month"
            type="number"
            value={lockdateMonth}
            min={minMonth()}
            step={1}
            max={12}
            placeholder={t('fidelity_bond.form_create.placeholder_locktime_month')}
            required
            onChange={(e) => setLockdateMonth(parseInt(e.target.value, 10))}
            isInvalid={lockdateMonth < minMonth()}
          />
          <rb.Form.Control.Feedback type="invalid">
            <Trans i18nKey="fidelity_bond.form_create.feedback_invalid_locktime_month">
              Please provide a valid value.
            </Trans>
          </rb.Form.Control.Feedback>
        </rb.Form.Group>
      </rb.Col>
    </rb.Row>
  )
}

interface UtxoCheckboxProps {
  utxo: Utxo
  onChange: (selected: boolean) => void
  initialValue?: boolean
}
const UtxoCheckbox = ({ utxo, onChange, initialValue = false }: UtxoCheckboxProps) => {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<boolean>(initialValue)

  useEffect(() => {
    onChange(selected)
  }, [selected])

  return (
    <>
      <rb.OverlayTrigger
        trigger="focus"
        placement="top"
        overlay={
          <rb.Popover>
            <rb.Popover.Header as="h3">{utxo.value}</rb.Popover.Header>
            <rb.Popover.Body>
              <div className="slashed-zeroes">{utxo.utxo}</div>
            </rb.Popover.Body>
          </rb.Popover>
        }
      >
        <rb.Card
          text={selected ? 'success' : undefined}
          border={selected ? 'success' : undefined}
          className="w-100"
          onClick={(e) => {
            e.stopPropagation()
            setSelected((current) => !current)
          }}
          style={{ cursor: 'pointer' }}
        >
          <rb.Card.Body>
            <div className="d-flex align-items-center">
              <div
                className="d-flex align-items-center justify-content-center me-3"
                style={{
                  width: '3rem',
                  height: '3rem',
                  backgroundColor: `${selected ? 'rgba(39, 174, 96, 1)' : 'rgba(222, 222, 222, 1)'}`,
                  color: 'white',
                  borderRadius: '50%',
                }}
              >
                {selected && <Sprite symbol="checkmark" width="24" height="24" />}
              </div>

              <rb.Stack className="align-items-start">
                <Balance valueString={`${utxo.value}`} convertToUnit={SATS} showBalance={true} />

                <rb.Form.Check type="checkbox" className="d-none" label="" checked={selected} readOnly />
                <div>
                  <small className="text-secondary">{utxo.confirmations} Confirmations</small>
                </div>
                <div>
                  {utxo.label && <span className="me-2 badge bg-light">{utxo.label}</span>}
                  {utxo.frozen && (
                    <>
                      <span className="me-2 badge bg-info">{t('current_wallet_advanced.label_frozen')}</span>
                      {selected && <span className="small text-warning">Will be unfrozen automatically</span>}
                    </>
                  )}
                </div>
              </rb.Stack>
            </div>
          </rb.Card.Body>
        </rb.Card>
      </rb.OverlayTrigger>
    </>
  )
}

interface UtxoSelectorProps {
  utxos: Utxos
  type?: 'checkbox' | 'radio'
  onChange: (selectedUtxos: Utxos) => void
}
const UtxoSelector = ({ utxos, type = 'checkbox', onChange }: UtxoSelectorProps) => {
  const sortedUtxos = useMemo<Utxos>(() => {
    return [...utxos].sort((a, b) => {
      if (a.value !== b.value) return a.value > b.value ? -1 : 1
      if (a.confirmations !== b.confirmations) return a.confirmations > b.confirmations ? -1 : 1
      return 0
    })
  }, [utxos])
  const [selected, setSelected] = useState<Utxos>([])

  useEffect(() => {
    setSelected([])
  }, [utxos])

  const isSelected = useCallback(
    (utxo: Utxo) => {
      return selected.includes(utxo)
    },
    [selected]
  )

  const addOrRemove = useCallback(
    (utxo: Utxo) => {
      setSelected((current) => {
        if (isSelected(utxo)) {
          return current.filter((it) => it !== utxo)
        }
        return type === 'checkbox' ? [...current, utxo] : [utxo]
      })
    },
    [isSelected, type]
  )

  useEffect(() => {
    onChange(selected)
  }, [selected])

  return (
    <div>
      {sortedUtxos.length === 0 ? (
        <>No selectable utxos</>
      ) : (
        <>
          {sortedUtxos.map((it) => {
            return (
              <div key={it.utxo} onClick={() => addOrRemove(it)} className="d-flex align-items-center mb-2">
                <UtxoCheckbox utxo={it} onChange={() => addOrRemove(it)} />
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

type WithDisabled = { disabled?: boolean }
type WithUtxos = { utxos: Utxos }
type SelectableAccount = Account & WithUtxos & WithDisabled

interface AccountCheckboxProps {
  account: SelectableAccount
  selected: boolean
  onChange: (selected: boolean) => void
}
const AccountCheckbox = ({ account, onChange, selected }: AccountCheckboxProps) => {
  const { t } = useTranslation()
  return (
    <>
      <rb.OverlayTrigger
        trigger="focus"
        placement="top"
        overlay={
          <rb.Popover>
            <rb.Popover.Header as="h3">{account.account}</rb.Popover.Header>
            <rb.Popover.Body>
              <div className="slashed-zeroes">{account.account_balance}</div>
            </rb.Popover.Body>
          </rb.Popover>
        }
      >
        <rb.Card
          text={selected ? 'success' : undefined}
          border={selected ? 'success' : undefined}
          className="w-100"
          onClick={(e) => {
            e.stopPropagation()
            if (!account.disabled) {
              onChange(!selected)
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <rb.Card.Body>
            <div className="d-flex align-items-center">
              <div
                className="d-flex align-items-center justify-content-center me-3"
                style={{
                  width: '3rem',
                  height: '3rem',
                  backgroundColor: `${selected ? 'rgba(39, 174, 96, 1)' : 'rgba(222, 222, 222, 1)'}`,
                  color: `${selected ? 'white' : 'rgba(66, 66, 66, 1)'}`,
                  borderRadius: '50%',
                }}
              >
                {selected && <Sprite symbol="checkmark" width="24" height="24" />}
                {!selected && account.disabled && <Sprite symbol="cross" width="24" height="24" />}
              </div>

              <rb.Stack className="align-items-start">
                <div>Jar #{account.account}</div>
                <div>
                  <Balance valueString={account.account_balance} convertToUnit={SATS} showBalance={true} />
                </div>
                <div>
                  <small className="text-secondary">{account.utxos.length} output(s)</small>
                </div>
              </rb.Stack>
            </div>
          </rb.Card.Body>
        </rb.Card>
      </rb.OverlayTrigger>
    </>
  )
}

interface AccountSelectorProps {
  accounts: SelectableAccount[]
  type?: 'checkbox' | 'radio'
  onChange: (selectedAccounts: Account[]) => void
}
const AccountSelector = ({ accounts, type = 'radio', onChange }: AccountSelectorProps) => {
  const [selected, setSelected] = useState<Account[]>([])

  const selectableAccounts = useMemo(() => {
    return accounts.filter((it) => !it.disabled)
  }, [accounts])
  const disabledAccounts = useMemo(() => {
    return accounts.filter((it) => !!it.disabled)
  }, [accounts])

  useEffect(() => {
    setSelected([])
  }, [selectableAccounts])

  const isSelected = useCallback(
    (account: Account) => {
      return selected.includes(account)
    },
    [selected]
  )

  const addOrRemove = useCallback(
    (account: Account) => {
      setSelected((current) => {
        if (isSelected(account)) {
          return current.filter((it) => it !== account)
        }
        return type === 'checkbox' ? [...current, account] : [account]
      })
    },
    [isSelected, type]
  )

  useEffect(() => {
    onChange(selected)
  }, [selected])

  return (
    <rb.Row xs={1} className="gap-2">
      {selectableAccounts.length > 0 &&
        selectableAccounts.map((it) => {
          return (
            <rb.Col key={it.account} className="d-flex align-items-center">
              <AccountCheckbox account={it} selected={isSelected(it)} onChange={() => addOrRemove(it)} />
            </rb.Col>
          )
        })}
    </rb.Row>
  )
}

interface SelectAccountStepProps {
  walletInfo: WalletInfo
  onSelected: (account: Account | null) => void
}

const SelectAccountStep = ({ walletInfo, onSelected }: SelectAccountStepProps) => {
  const { t } = useTranslation()
  const accounts = useMemo(() => walletInfo.data.display.walletinfo.accounts, [walletInfo])
  const utxos = useMemo(() => walletInfo.data.utxos.utxos, [walletInfo])
  const balanceSummary = useBalanceSummary(walletInfo)

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

  const availableAccountBalances = useMemo(() => {
    if (balanceSummary === null) return []

    const availableAccountIndices = availableAccounts.map((it) => parseInt(it.account, 10))
    return balanceSummary.accountBalances.filter((it) => availableAccountIndices.includes(it.accountIndex))
  }, [availableAccounts, balanceSummary])

  const selectableAccounts = useMemo(() => {
    return accounts.map((it) => ({
      ...it,
      disabled: !availableAccounts.includes(it),
      utxos: utxosByAccount[it.account] || [],
    }))
  }, [accounts, availableAccounts, utxosByAccount])

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
          <AccountSelector
            accounts={selectableAccounts}
            type="radio"
            onChange={(selected) => onSelected(selected.length === 1 ? selected[0] : null)}
          />
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
                  <Balance valueString={`${selectedUtxosAmountSum}`} convertToUnit={SATS} showBalance={true} />
                </td>
              </tr>
              <tr>
                <td className="border-0">Relative size to your total balance</td>
                <td className="border-0 text-end">{(relativeSizeToTotalBalance * 100).toFixed(2)} %</td>
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
  const settings = useSettings()
  const [lockdate, setLockdate] = useState<Api.Lockdate | null>(null)
  const timeTillUnlockString = useMemo(
    () => lockdate && timeUtils.timeElapsed(lockdateToTimestamp(lockdate), Date.now()),
    [lockdate]
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
                  <Balance valueString={`${selectedUtxosAmountSum}`} convertToUnit={SATS} showBalance={true} />
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
  const { t } = useTranslation()
  const settings = useSettings()

  const timeTillUnlockString = useMemo(
    () => timeUtils.timeElapsed(lockdateToTimestamp(lockdate), Date.now()),
    [lockdate]
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
                  <Balance valueString={`${selectedUtxosAmountSum}`} convertToUnit={SATS} showBalance={true} />
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
        <ToggleSwitch
          label={t('create_wallet.confirmation_toggle_fidelity_bond_summary')}
          defaultChecked={confirmed}
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
          <SelectAccountStep walletInfo={walletInfo} onSelected={(target) => setSelectedAccount(target)} />

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
            onSelected={(target) => setSelectedUtxos(target)}
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
                {/*t('fidelity_bond.proceed_with_amount', { amount: selectedUtxosAmountSum })*/}
                {`Proceed with`}
                {` `}
                <Balance valueString={`${selectedUtxosAmountSum}`} convertToUnit={SATS} showBalance={true} />
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
            {t('fidelity_bond.button_create')}
          </rb.Button>

          <rb.Button variant="link" type="button" className="w-100 mt-4" onClick={() => setStep(2)}>
            {t('global.back')}
          </rb.Button>
        </div>
      )}
    </div>
  )
}

/**
 * - freeze all utxos except the selected ones
 * - unfreze any frozen selected utxo
 * - return frozen utxo ids
 */
const prepareFidelityBondSweepTransaction = async (
  currentWallet: CurrentWallet,
  walletInfo: WalletInfo,
  selectedUtxos: Utxos
): Promise<Api.UtxoId[]> => {
  const { name: walletName, token } = currentWallet

  const selectedMixdepth = selectedUtxos[0].mixdepth // all utxos from same account!

  // sanity check
  const sameAccountCheck = selectedUtxos.every((it) => it.mixdepth === selectedMixdepth)
  if (!sameAccountCheck) {
    throw new Error('Given utxos must be from the same account')
  }

  const allUtxosInAccount = walletInfo.data.utxos.utxos.filter((it) => it.mixdepth === selectedMixdepth)

  const otherUtxos = allUtxosInAccount.filter((it) => !selectedUtxos.includes(it))
  const eligibleForFreeze = otherUtxos.filter((it) => !it.frozen)
  const eligibleForUnfreeze = selectedUtxos.filter((it) => it.frozen)

  const freezePromises = eligibleForFreeze.map((it) => {
    return Api.postFreeze({ walletName, token }, { utxo: it.utxo, freeze: true })
  })
  const unfreezePromises = eligibleForUnfreeze.map((it) => {
    return Api.postFreeze({ walletName, token }, { utxo: it.utxo, freeze: false })
  })

  console.debug('Freezing other utxos', eligibleForFreeze)
  await Promise.all(freezePromises)

  console.debug('Unfreeze eligible utxos', eligibleForUnfreeze)
  await Promise.all(unfreezePromises)

  return eligibleForFreeze.map((it) => it.utxo)
}

/**
 * Send funds to a timelocked address with a collaborative sweep transactions.
 * The transaction will have no change output.
 *
 * Steps:
 * - freeze all utxos except the selected ones
 * - sweep collaborative transaction to locktime address
 * - return frozen utxo ids
 *
 * The returned utxos SHOULD be unfrozen by the caller
 * once the collaborative transaction finished.
 *
 * @return list of utxo ids that were automatically frozen and
 */
const sweepToFidelityBond = async (
  currentWallet: CurrentWallet,
  account: Account,
  timelockedDestinationAddress: Api.BitcoinAddress
): Promise<Response> => {
  const { name: walletName, token } = currentWallet

  return await Api.postCoinjoin(
    { walletName, token },
    {
      mixdepth: parseInt(account.account, 10),
      destination: timelockedDestinationAddress,
      amount_sats: 0, // sweep
      counterparties: 1, // TODO: how to choose? When in doubt, use same mechanism as on "Send" page
    }
  )
}

export const FidelityBondSimple = () => {
  const { t } = useTranslation()
  const currentWallet = useCurrentWallet()
  const currentWalletInfo = useCurrentWalletInfo()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const serviceInfo = useServiceInfo()

  const isCoinjoinInProgress = useMemo(() => serviceInfo && serviceInfo.coinjoinInProgress, [serviceInfo])
  const isMakerRunning = useMemo(() => serviceInfo && serviceInfo.makerRunning, [serviceInfo])

  const [alert, setAlert] = useState<AlertWithMessage | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isCreateSuccess, setIsCreateSuccess] = useState(false)
  const [isCreateError, setIsCreateError] = useState(false)
  const [frozenUtxoIds, setFrozenUtxoIds] = useState<Api.UtxoId[] | null>(null)

  const [waitForTakerToFinish, setWaitForTakerToFinish] = useState(false)

  useEffect(() => {
    if (isCreating) return
    if (!isCreateSuccess && !isCreateError) return
    if (isCoinjoinInProgress === null) return

    setWaitForTakerToFinish(isCoinjoinInProgress)
  }, [isCreating, isCreateSuccess, isCreateError, isCoinjoinInProgress])

  const utxos = useMemo(
    () => (currentWalletInfo === null ? [] : currentWalletInfo.data.utxos.utxos),
    [currentWalletInfo]
  )
  const fidelityBonds = useMemo(() => (utxos === null ? null : utxos.filter((utxo) => utxo.locktime)), [utxos])

  useEffect(() => {
    if (!currentWallet) {
      setAlert({ variant: 'danger', message: t('current_wallet.error_loading_failed') })
      setIsLoading(false)
      setIsInitializing(false)
      return
    }

    const abortCtrl = new AbortController()

    setAlert(null)
    setIsLoading(true)

    reloadCurrentWalletInfo({ signal: abortCtrl.signal })
      .catch((err) => {
        const message = err.message || t('current_wallet.error_loading_failed')
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message })
      })
      .finally(() => {
        if (abortCtrl.signal.aborted) return

        setIsLoading(false)
        setIsInitializing(false)
      })

    return () => abortCtrl.abort()
  }, [currentWallet, reloadCurrentWalletInfo, t])

  useEffect(() => {
    if (isCreating) return
    if (!isCreateSuccess && !isCreateError) return
    if (waitForTakerToFinish) return

    const abortCtrl = new AbortController()
    setIsLoading(true)

    reloadCurrentWalletInfo({ signal: abortCtrl.signal })
      .catch((err) => {
        const message = err.message || t('current_wallet.error_loading_failed')
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message })
      })
      .finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [waitForTakerToFinish, isCreating, isCreateSuccess, isCreateError])

  useEffect(() => {
    if (!isLoading) return
    if (!currentWallet) return
    if (waitForTakerToFinish) return
    if (!isCreateSuccess && !isCreateError) return
    if (frozenUtxoIds === null || frozenUtxoIds.length === 0) return

    const { name: walletName, token } = currentWallet

    const unfreezePromises = frozenUtxoIds.map((utxoId) => {
      return Api.postFreeze({ walletName, token }, { utxo: utxoId, freeze: false })
    })

    const abortCtrl = new AbortController()
    setIsLoading(true)

    Promise.all(unfreezePromises)
      .catch((err) => {
        if (abortCtrl.signal.aborted) return

        const message = err.message || t('fidelity_bond.error_while_unfreezing_utxos')
        setAlert({ variant: 'danger', message })
      })
      .finally(() => {
        if (abortCtrl.signal.aborted) return

        setIsLoading(false)

        // reset the utxos regardless of success or error
        // there is generally nothing that can be done if
        // if the call does not success - otherwise this results
        // in endlessly trying to unfreeze the utxos
        setFrozenUtxoIds(null)
      })

    return () => abortCtrl.abort()
  }, [isLoading, waitForTakerToFinish, isCreateSuccess, isCreateError, frozenUtxoIds, currentWallet])

  const onSubmit = async (
    selectedAccount: Account,
    selectedUtxos: Utxos,
    selectedLockdate: Api.Lockdate,
    timelockedDestinationAddress: Api.BitcoinAddress
  ) => {
    if (isCreating) return
    if (!currentWallet) return
    if (!currentWalletInfo) return
    if (selectedUtxos.length === 0) return

    setIsCreating(true)
    try {
      const frozenUtxoIds = await prepareFidelityBondSweepTransaction(currentWallet, currentWalletInfo, selectedUtxos)
      // TODO: consider storing utxo id hashes in local storage..
      // that way we can revert any changes if a user leaves the page beofe the unfreezing happens
      setFrozenUtxoIds(frozenUtxoIds)

      await sweepToFidelityBond(currentWallet, selectedAccount, timelockedDestinationAddress)
      setWaitForTakerToFinish(true)
      setIsCreateSuccess(true)
    } catch (error) {
      setIsCreateError(true)
      throw error
    } finally {
      setIsCreating(false)
    }
  }

  // TODO: use alert like in other screens
  if (isMakerRunning) {
    return <>Creating Fidelity Bonds is temporarily disabled: Earn is active.</>
  }
  if (!waitForTakerToFinish && isCoinjoinInProgress) {
    return <>Creating Fidelity Bonds is temporarily disabled: A collaborative transaction is in progress.</>
  }

  return (
    <div>
      {isInitializing || isLoading ? (
        <div className="d-flex justify-content-center align-items-center">
          <rb.Spinner animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          {t('global.loading')}
        </div>
      ) : (
        <>
          {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}

          {currentWallet && currentWalletInfo && fidelityBonds && fidelityBonds.length === 0 && (
            <>
              {waitForTakerToFinish || isCreateSuccess || isCreateError ? (
                <>
                  <>
                    {waitForTakerToFinish ? (
                      <div className="d-flex justify-content-center align-items-center">
                        <rb.Spinner animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                        {t('fidelity_bond.transaction_in_progress')}
                      </div>
                    ) : (
                      <>
                        <>
                          {isCreateSuccess && (
                            <div className="d-flex justify-content-center align-items-center">Success!</div>
                          )}
                          {isCreateError && (
                            <div className="d-flex justify-content-center align-items-center">Error!</div>
                          )}
                        </>
                      </>
                    )}
                  </>
                </>
              ) : (
                <FidelityBondDetailsSetupForm
                  currentWallet={currentWallet}
                  walletInfo={currentWalletInfo}
                  onSubmit={onSubmit}
                />
              )}
            </>
          )}

          {fidelityBonds && fidelityBonds.length > 0 && (
            <>
              {fidelityBonds.length > 0 && (
                <div className="mt-2 mb-4">
                  <h5>{t('current_wallet_advanced.title_fidelity_bonds')}</h5>
                  <DisplayUTXOs utxos={fidelityBonds} />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
