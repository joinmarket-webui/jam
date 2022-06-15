import React, { PropsWithChildren, useCallback } from 'react'
import { Account } from '../../context/WalletContext'
import CheckboxCard, { CheckboxCardProps } from './CheckboxCard'

interface AccountCheckboxProps extends CheckboxCardProps {
  account: Account
  onAccountSelected: (account: Account, checked: boolean) => void
}

const AccountCheckbox = ({
  account,
  onAccountSelected,
  children,
  ...props
}: PropsWithChildren<AccountCheckboxProps>) => {
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      return onAccountSelected(account, e.target.checked)
    },
    [account, onAccountSelected]
  )

  return (
    <CheckboxCard {...props} onChange={onChange}>
      {children}
    </CheckboxCard>
  )
}

export default AccountCheckbox
