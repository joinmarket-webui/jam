import React, { useCallback } from 'react'
import * as rb from 'react-bootstrap'
import { Account, Utxos } from '../../context/WalletContext'
// @ts-ignore
import Balance from '../../components/Balance'

import PercentageBar from './PercentageBar'
import CheckboxCard from './CheckboxCard'

type WithDisabled = { disabled?: boolean }
type WithUtxos = { utxos: Utxos }
export type SelectableAccount = Account & WithUtxos & WithDisabled

interface AccountCheckboxProps {
  account: SelectableAccount
  checked: boolean
  disabled?: boolean
  onChange: (account: Account, checked: boolean) => void
  percentage?: number
  unit?: 'sats' | 'BTC'
  showBalance?: boolean
}

const AccountCheckbox = ({
  account,
  onChange,
  checked,
  percentage,
  unit = 'sats',
  showBalance = false,
}: AccountCheckboxProps) => {
  const _onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      return onChange(account, e.target.checked)
    },
    [account, onChange]
  )

  return (
    <CheckboxCard checked={checked} disabled={account.disabled} onChange={_onChange}>
      {percentage !== undefined && <PercentageBar percentage={percentage} highlight={checked} />}
      <rb.Stack className="align-items-start p-2">
        <div>Jar #{account.account}</div>
        <div>
          <Balance valueString={account.account_balance} convertToUnit={unit} showBalance={showBalance} />
        </div>
        <div>
          <small className="text-secondary">{account.utxos.length} output(s)</small>
          {percentage !== undefined && <small className="ps-1 text-secondary">| {`${percentage.toFixed(2)}%`}</small>}
        </div>
      </rb.Stack>
    </CheckboxCard>
  )
}

export default AccountCheckbox
