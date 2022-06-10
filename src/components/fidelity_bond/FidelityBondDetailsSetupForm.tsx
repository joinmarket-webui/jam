import React, { useEffect, useMemo, useState } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'

import { WalletInfo, CurrentWallet, Account } from '../../context/WalletContext'
// @ts-ignore
import { useSettings } from '../../context/SettingsContext'

// @ts-ignore
import Balance from '../../components/Balance'
// @ts-ignore
import ToggleSwitch from '../../components/ToggleSwitch'
import { useBalanceSummary, WalletBalanceSummary } from '../../hooks/BalanceSummary'

import AccountSelector from './AccountSelector'
import LockdateForm, { toYearsRange, DEFAULT_MAX_TIMELOCK_YEARS } from './LockdateForm'

import * as Api from '../../libs/JmWalletApi'
import { isDebugFeatureEnabled } from '../../constants/debugFeatures'

interface SelectAccountStepProps {
  balanceSummary: WalletBalanceSummary
  accounts: Account[]
  onChange: (account: Account | null) => void
}

const SelectAccountStep = ({ balanceSummary, accounts, onChange }: SelectAccountStepProps) => {
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  useEffect(() => {
    onChange(selectedAccount)
  }, [selectedAccount, onChange])

  return (
    <>
      <h4>Select Account</h4>
      <AccountSelector balanceSummary={balanceSummary} accounts={accounts} onChange={setSelectedAccount} />
    </>
  )
}

interface SelectLockdateStepProps {
  onChange: (lockdate: Api.Lockdate | null) => void
}
const SelectLockdateStep = ({ onChange }: SelectLockdateStepProps) => {
  const yearsRange = useMemo(() => {
    if (isDebugFeatureEnabled('allowCreatingExpiredFidelityBond')) {
      return toYearsRange(-1, DEFAULT_MAX_TIMELOCK_YEARS)
    }
    return toYearsRange(0, DEFAULT_MAX_TIMELOCK_YEARS)
  }, [])

  return (
    <>
      <h4>Select duration</h4>
      <rb.Card className="w-100 mt-3">
        <rb.Card.Body>
          <rb.Form noValidate>
            <LockdateForm onChange={onChange} yearsRange={yearsRange} />
          </rb.Form>
        </rb.Card.Body>
      </rb.Card>
    </>
  )
}

interface ConfirmationStepProps {
  balanceSummary: WalletBalanceSummary
  account: Account
  lockdate: Api.Lockdate
  confirmed: boolean
  onChange: (confirmed: boolean) => void
}

const ConfirmationStep = ({ balanceSummary, account, lockdate, confirmed, onChange }: ConfirmationStepProps) => {
  const { t } = useTranslation()
  const settings = useSettings()

  const accountAvailableBalanceInSats = useMemo(
    () =>
      balanceSummary.accountBalances
        .filter((it) => it.accountIndex === parseInt(account.account, 10))
        .reduce((acc, curr) => acc + curr.calculatedAvailableBalanceInSats, 0),
    [balanceSummary, account]
  )

  // TODO: add `calculatedTotalBalanceInSats`
  const walletTotalBalanceInSats = useMemo(
    () => balanceSummary.calculatedAvailableBalanceInSats + balanceSummary.calculatedFrozenOrLockedBalanceInSats,
    [balanceSummary]
  )

  const relativeSizeToTotalBalance = useMemo(() => {
    if (walletTotalBalanceInSats <= 0) return 0
    return accountAvailableBalanceInSats / walletTotalBalanceInSats
  }, [accountAvailableBalanceInSats, walletTotalBalanceInSats])

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
                <td>
                  Fidelity Bond Size
                  <br />
                  <small className="text-secondary">Excluding transaction fees</small>
                </td>
                <td className="text-end">
                  <Balance
                    valueString={`${accountAvailableBalanceInSats}`}
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
                <td className="border-0">Locked until</td>
                <td className="border-0 text-end">{lockdate}</td>
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
  onSubmit: (account: Account, lockdate: Api.Lockdate, timelockedAddress: Api.BitcoinAddress) => Promise<unknown>
}

const FidelityBondDetailsSetupForm = ({ currentWallet, walletInfo, onSubmit }: FidelityBondDetailsSetupFormProps) => {
  const { t } = useTranslation()
  const balanceSummary = useBalanceSummary(walletInfo)
  const accounts = useMemo(() => walletInfo.data.display.walletinfo.accounts, [walletInfo])

  const [step, setStep] = useState<number>(0)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [selectedLockdate, setSelectedLockdate] = useState<Api.Lockdate | null>(null)
  const [userConfirmed, setUserConfirmed] = useState(false)

  useEffect(() => {
    if (selectedAccount === null) {
      setStep(0)
    }
  }, [selectedAccount])

  useEffect(() => {
    // TODO: toggle button has no way to reflect this change currently
    setUserConfirmed(false)
  }, [step, selectedAccount, selectedLockdate])

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

  const _onSubmit = async (account: Account, lockdate: Api.Lockdate) => {
    if (!currentWallet) return

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

    return await onSubmit(account, lockdate, timelockedDestinationAddress)
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

      {balanceSummary && (
        <div className={`${step !== 0 ? 'd-none' : ''}`}>
          <SelectAccountStep balanceSummary={balanceSummary} accounts={accounts} onChange={setSelectedAccount} />

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
          <SelectLockdateStep onChange={setSelectedLockdate} />

          <rb.Button
            variant="dark"
            type="button"
            size="lg"
            className="w-100 mt-4"
            disabled={selectedLockdate === null}
            onClick={() => setStep(2)}
          >
            {t('global.next')}
          </rb.Button>

          <rb.Button variant="link" type="button" className="w-100 mt-4" onClick={() => setStep(0)}>
            {t('global.back')}
          </rb.Button>
        </div>
      )}

      {balanceSummary && selectedAccount && selectedLockdate && (
        <div className={`${step !== 2 ? 'd-none' : ''}`}>
          <ConfirmationStep
            balanceSummary={balanceSummary}
            account={selectedAccount}
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
            onClick={() => _onSubmit(selectedAccount, selectedLockdate)}
          >
            {t('fidelity_bond.create_form.button_create')}
          </rb.Button>

          <rb.Button variant="link" type="button" className="w-100 mt-4" onClick={() => setStep(1)}>
            {t('global.back')}
          </rb.Button>
        </div>
      )}
    </div>
  )
}

export default FidelityBondDetailsSetupForm
