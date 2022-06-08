import React, { useEffect, useState, useMemo, useCallback } from 'react'
import * as rb from 'react-bootstrap'
import { Utxos, Utxo } from '../../context/WalletContext'

import UtxoCheckbox from './UtxoCheckbox'

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

  const utxosTotalAmountSum = useMemo(() => utxos.reduce((acc, current) => acc + current.value, 0), [utxos])

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
  }, [selected, onChange])

  return (
    <div>
      {sortedUtxos.length === 0 ? (
        <>No selectable utxos</>
      ) : (
        <rb.Row xs={1} className="gap-2">
          {sortedUtxos.map((it) => {
            const percentageOfTotal = utxosTotalAmountSum > 0 ? (100 * it.value) / utxosTotalAmountSum : undefined
            return (
              <rb.Col key={it.utxo} className="d-flex align-items-center">
                <UtxoCheckbox
                  utxo={it}
                  checked={isSelected(it)}
                  onChange={addOrRemove}
                  percentage={percentageOfTotal}
                />
              </rb.Col>
            )
          })}
        </rb.Row>
      )}
    </div>
  )
}

export default UtxoSelector
