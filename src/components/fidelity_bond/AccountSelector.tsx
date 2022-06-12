import React, { useEffect, useState, useMemo } from 'react'
import * as rb from 'react-bootstrap'

import { Account } from '../../context/WalletContext'
// @ts-ignore
import { useSettings } from '../../context/SettingsContext'

// @ts-ignore
import Balance from '../Balance'
import PercentageBar from './PercentageBar'
import AccountCheckbox from './AccountCheckbox'
import { WalletBalanceSummary } from '../../hooks/BalanceSummary'

type SelectableAccount = Account & { disabled?: boolean }

interface AccountSelectorProps {
  balanceSummary: WalletBalanceSummary
  accounts: SelectableAccount[]
  onChange: (selectedAccount: Account | null) => void
  displayDisabledAccounts?: boolean
}
const AccountSelector = ({
  balanceSummary,
  accounts,
  onChange,
  displayDisabledAccounts = true,
}: AccountSelectorProps) => {
  const settings = useSettings()
  const [selected, setSelected] = useState<Account | null>(null)

  const selectableAccounts = useMemo(() => {
    return accounts.filter((it) => !it.disabled)
  }, [accounts])

  useEffect(() => {
    setSelected(null)
  }, [selectableAccounts])

  useEffect(() => {
    onChange(selected)
  }, [selected, onChange])

  return (
    <rb.Row xs={1} className="gap-2">
      {accounts.map((it) => {
        if (!displayDisabledAccounts && it.disabled) {
          return <></>
        }

        const accountIndex = parseInt(it.account, 10)
        const availableAccountBalance = balanceSummary.accountBalances
          .filter((balance) => balance.accountIndex === accountIndex)
          .reduce((acc, curr) => acc + curr.calculatedAvailableBalanceInSats, 0)

        const percentageOfTotal =
          balanceSummary.calculatedTotalBalanceInSats > 0
            ? (100 * availableAccountBalance) / balanceSummary.calculatedTotalBalanceInSats
            : undefined
        return (
          <rb.Col key={it.account} className="d-flex align-items-center">
            <AccountCheckbox
              account={it}
              checked={it === selected}
              disabled={availableAccountBalance === 0}
              onAccountSelected={(account) => {
                setSelected((current) => {
                  if (current === account) {
                    return null
                  }
                  return account
                })
              }}
            >
              {' '}
              <>
                {percentageOfTotal !== undefined && (
                  <PercentageBar percentage={percentageOfTotal} highlight={selected === it} />
                )}
                <rb.Stack className="align-items-start p-2">
                  <div>Jar #{it.account}</div>
                  <div>
                    <Balance
                      valueString={`${availableAccountBalance}`}
                      convertToUnit={settings.unit}
                      showBalance={settings.showBalance}
                    />
                  </div>
                  {percentageOfTotal !== undefined && (
                    <div className="text-secondary">
                      <small>{`${percentageOfTotal.toFixed(2)}%`}</small>
                    </div>
                  )}
                </rb.Stack>
              </>
            </AccountCheckbox>
          </rb.Col>
        )
      })}
    </rb.Row>
  )
}

export default AccountSelector
