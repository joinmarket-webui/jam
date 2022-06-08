import React, { useCallback } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Utxo } from '../../context/WalletContext'
// @ts-ignore
import Balance from '../../components/Balance'

import { SATS } from '../../utils'
import PercentageBar from './PercentageBar'
import CheckboxCard from './CheckboxCard'

interface UtxoCheckboxProps {
  utxo: Utxo
  checked: boolean
  disabled?: boolean
  onChange: (utxo: Utxo, checked: boolean) => void
  percentage?: number
}

const UtxoCheckbox = ({ utxo, checked, disabled = false, onChange, percentage }: UtxoCheckboxProps) => {
  const { t } = useTranslation()

  const _onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      return onChange(utxo, e.target.checked)
    },
    [utxo, onChange]
  )

  return (
    <CheckboxCard checked={checked} disabled={disabled} onChange={_onChange}>
      {percentage !== undefined && <PercentageBar percentage={percentage} highlight={checked} />}
      <rb.Stack className="align-items-start p-2">
        <Balance valueString={`${utxo.value}`} convertToUnit={SATS} showBalance={true} />

        {percentage !== undefined && <div>{`${percentage.toFixed(2)}%`}</div>}
        <div>
          <small className="text-secondary">{utxo.confirmations} Confirmations</small>
        </div>
        <div>
          {utxo.label && <span className="me-2 badge bg-light">{utxo.label}</span>}
          {utxo.frozen && (
            <>
              <span className="me-2 badge bg-info">{t('current_wallet_advanced.label_frozen')}</span>
              {checked && <span className="small text-warning">Will be unfrozen automatically</span>}
            </>
          )}
        </div>
      </rb.Stack>
    </CheckboxCard>
  )
}

export default UtxoCheckbox
