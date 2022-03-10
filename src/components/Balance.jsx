import React, { useState, useEffect } from 'react'
import { BTC, SATS, btcToSats, satsToBtc } from '../utils'
import Sprite from './Sprite'

const DISPLAY_MODE_BTC = 0
const DISPLAY_MODE_SATS = 1
const DISPLAY_MODE_HIDDEN = 2

const getDisplayMode = (unit, showBalance) => {
  if (showBalance && unit === SATS) return DISPLAY_MODE_SATS
  if (showBalance && unit === BTC) return DISPLAY_MODE_BTC

  return DISPLAY_MODE_HIDDEN
}

const formatBtc = (value) => {
  const formatter = new Intl.NumberFormat('en-US', {
    minimumIntegerDigits: 1,
    minimumFractionDigits: 8,
  })

  const numberString = formatter.format(value)

  const decimalPoint = '\u002E'
  const nbHalfSpace = '\u202F'

  const [integerPart, fractionalPart] = numberString.split(decimalPoint)

  const formattedFractionalPart = fractionalPart
    .split('')
    .map((char, idx) => (idx === 2 || idx === 5 ? `${nbHalfSpace}${char}` : char))
    .join('')

  return integerPart + decimalPoint + formattedFractionalPart
}

const formatSats = (value) => {
  const formatter = new Intl.NumberFormat('en-US', {
    minimumIntegerDigits: 1,
    minimumFractionDigits: 0,
  })

  return formatter.format(value)
}

const BalanceComponent = ({ symbol, value, symbolIsPrefix }) => {
  return (
    <span className="d-inline-flex align-items-center">
      {symbolIsPrefix && symbol}
      <span className="d-inline-flex align-items-center slashed-zeroes">{value}</span>
      {!symbolIsPrefix && symbol}
    </span>
  )
}

export default function Balance({ value, unit, showBalance = false }) {
  const [unitMode, setUnitMode] = useState(getDisplayMode(unit, showBalance))

  useEffect(() => {
    setUnitMode(getDisplayMode(unit, showBalance))
  }, [unit, showBalance])

  if (unitMode === DISPLAY_MODE_HIDDEN) {
    return (
      <BalanceComponent
        symbol={
          <span className="d-inline-flex align-items-center text-muted">
            <Sprite symbol="hide" width="1.2em" height="1.2em" className="ps-1" />
          </span>
        }
        value={'*****'}
        symbolIsPrefix={false}
      />
    )
  }

  const valueIsSats = value === parseInt(value)
  const valueIsBtc = !valueIsSats && typeof value === 'string' && value.indexOf('.') > -1

  const btcSymbol = <span style={{ paddingRight: '0.1em' }}>{'\u20BF'}</span>
  const satSymbol = <Sprite symbol="sats" width="1.2em" height="1.2em" />

  if (valueIsBtc && unitMode === DISPLAY_MODE_BTC)
    return <BalanceComponent symbol={btcSymbol} value={formatBtc(value)} symbolIsPrefix={true} />
  if (valueIsSats && unitMode === DISPLAY_MODE_SATS)
    return <BalanceComponent symbol={satSymbol} value={formatSats(value)} symbolIsPrefix={false} />

  if (valueIsBtc && unitMode === DISPLAY_MODE_SATS)
    return <BalanceComponent symbol={satSymbol} value={formatSats(btcToSats(value))} symbolIsPrefix={false} />
  if (valueIsSats && unitMode === DISPLAY_MODE_BTC)
    return <BalanceComponent symbol={btcSymbol} value={formatBtc(satsToBtc(value))} symbolIsPrefix={true} />

  // Something unexpected happened. Simply render what was passed in the props.
  return <BalanceComponent symbol={unit} value={value} symbolIsPrefix={false} />
}
