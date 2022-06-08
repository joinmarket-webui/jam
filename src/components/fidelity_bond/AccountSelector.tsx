import React, { useEffect, useState, useMemo, useCallback } from 'react'
import * as rb from 'react-bootstrap'

import { Account } from '../../context/WalletContext'
// @ts-ignore
import { useSettings } from '../../context/SettingsContext'
import AccountCheckbox, { SelectableAccount } from './AccountCheckbox'

interface AccountSelectorProps {
  accounts: SelectableAccount[]
  type?: 'checkbox' | 'radio'
  onChange: (selectedAccounts: Account[]) => void
  displayDisabledAccounts?: boolean
}
const AccountSelector = ({
  accounts,
  type = 'radio',
  onChange,
  displayDisabledAccounts = true,
}: AccountSelectorProps) => {
  const settings = useSettings()
  const [selected, setSelected] = useState<Account[]>([])

  const selectableAccounts = useMemo(() => {
    return accounts.filter((it) => !it.disabled)
  }, [accounts])

  const totalAmount = useMemo(() => {
    return accounts
      .map((it) => it.utxos.reduce((acc, curr) => acc + curr.value, 0))
      .reduce((acc, curr) => acc + curr, 0)
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
              checked={isSelected(it)}
              onChange={addOrRemove}
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
