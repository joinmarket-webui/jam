import React from 'react'
import * as rb from 'react-bootstrap'
import { Account, Utxos } from '../../context/WalletContext'
// @ts-ignore
import Balance from '../../components/Balance'

import { SATS } from '../../utils'
import Sprite from '../Sprite'
import PercentageBar from './PercentageBar'

type WithDisabled = { disabled?: boolean }
type WithUtxos = { utxos: Utxos }
export type SelectableAccount = Account & WithUtxos & WithDisabled

interface AccountCheckboxProps {
  account: SelectableAccount
  checked: boolean
  onChange: (account: Account, checked: boolean) => void
  percentage?: number
}
const AccountCheckbox = ({ account, onChange, checked, percentage }: AccountCheckboxProps) => {
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
          text={checked ? 'success' : undefined}
          border={checked ? 'success' : undefined}
          className="w-100"
          onClick={(e) => {
            e.stopPropagation()
            if (!account.disabled) {
              onChange(account, !checked)
            }
          }}
          style={{ cursor: 'pointer', position: 'relative' }}
        >
          {percentage !== undefined && <PercentageBar percentage={percentage} highlight={checked} />}
          <rb.Card.Body>
            <div className="d-flex align-items-center">
              <div
                className="d-flex align-items-center justify-content-center me-3"
                style={{
                  width: '3rem',
                  height: '3rem',
                  backgroundColor: `${checked ? 'rgba(39, 174, 96, 1)' : 'rgba(222, 222, 222, 1)'}`,
                  color: `${checked ? 'white' : 'rgba(66, 66, 66, 1)'}`,
                  borderRadius: '50%',
                }}
              >
                {checked && <Sprite symbol="checkmark" width="24" height="24" />}
                {!checked && account.disabled && <Sprite symbol="cross" width="24" height="24" />}
              </div>

              <rb.Stack className="align-items-start">
                <div>Jar #{account.account}</div>
                <div>
                  <Balance valueString={account.account_balance} convertToUnit={SATS} showBalance={true} />
                </div>
                <div>
                  <small className="text-secondary">{account.utxos.length} output(s)</small>
                  {percentage !== undefined && (
                    <>
                      <small className="ps-1 text-secondary">| {`${percentage.toFixed(2)}%`}</small>
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

export default AccountCheckbox
