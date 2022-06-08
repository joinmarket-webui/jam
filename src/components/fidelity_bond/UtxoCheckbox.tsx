import React from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Utxo } from '../../context/WalletContext'
// @ts-ignore
import Balance from '../../components/Balance'

import { SATS } from '../../utils'
import Sprite from '../Sprite'
import PercentageBar from './PercentageBar'

interface UtxoCheckboxProps {
  utxo: Utxo
  checked: boolean
  onChange: (utxo: Utxo, checked: boolean) => void
  percentage?: number
}
// TODO: use real checkboxes and harmonize with "AccountCheckbox"
const UtxoCheckbox = ({ utxo, checked, onChange, percentage }: UtxoCheckboxProps) => {
  const { t } = useTranslation()

  return (
    <>
      <rb.Card
        text={checked ? 'success' : undefined}
        border={checked ? 'success' : undefined}
        className="w-100"
        onClick={(e) => {
          e.stopPropagation()
          onChange(utxo, !checked)
        }}
        style={{ cursor: 'pointer', position: 'relative' }}
      >
        {percentage !== undefined && <PercentageBar percentage={percentage} highlight={checked} />}
        <rb.Card.Body style={{}}>
          <div className="d-flex align-items-center">
            <div
              className="d-flex align-items-center justify-content-center me-3"
              style={{
                width: '3rem',
                height: '3rem',
                backgroundColor: `${checked ? 'rgba(39, 174, 96, 1)' : 'rgba(222, 222, 222, 1)'}`,
                color: 'white',
                borderRadius: '50%',
              }}
            >
              {checked && <Sprite symbol="checkmark" width="24" height="24" />}
            </div>

            <rb.Stack className="align-items-start">
              <rb.Form.Check type="checkbox" className="d-none" label="" checked={checked} readOnly />
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
          </div>
        </rb.Card.Body>
      </rb.Card>
    </>
  )
}

export default UtxoCheckbox
