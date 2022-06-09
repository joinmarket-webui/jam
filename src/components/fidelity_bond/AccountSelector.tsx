import React, { useEffect, useState, useMemo } from 'react'
import * as rb from 'react-bootstrap'

import { Account } from '../../context/WalletContext'
// @ts-ignore
import { useSettings } from '../../context/SettingsContext'
import AccountCheckbox, { SelectableAccount } from './AccountCheckbox'

interface AccountSelectorProps {
  accounts: SelectableAccount[]
  onChange: (selectedAccount: Account | null) => void
  displayDisabledAccounts?: boolean
}
const AccountSelector = ({ accounts, onChange, displayDisabledAccounts = true }: AccountSelectorProps) => {
  const settings = useSettings()
  const [selected, setSelected] = useState<Account | null>(null)

  const selectableAccounts = useMemo(() => {
    return accounts.filter((it) => !it.disabled)
  }, [accounts])

  const totalAmount = useMemo(() => {
    return accounts
      .map((it) => it.utxos.reduce((acc, curr) => acc + curr.value, 0))
      .reduce((acc, curr) => acc + curr, 0)
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

        const utxosAmountSum = it.utxos.reduce((acc, curr) => acc + curr.value, 0)
        const percentageOfTotal = totalAmount > 0 ? (100 * utxosAmountSum) / totalAmount : undefined
        return (
          <rb.Col key={it.account} className="d-flex align-items-center">
            <AccountCheckbox
              account={it}
              checked={it === selected}
              onChange={(account) => {
                setSelected((current) => {
                  if (current === account) {
                    return null
                  }
                  return account
                })
              }}
              percentage={percentageOfTotal}
              unit={settings.unit}
              showBalance={settings.showBalance}
            />
          </rb.Col>
        )
      })}
    </rb.Row>
  )
}

export default AccountSelector
