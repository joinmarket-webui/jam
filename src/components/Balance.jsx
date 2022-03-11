import React, { useState, useEffect } from 'react'
import { BTC, SATS, btcToSats, satsToBtc } from '../utils'
import Sprite from './Sprite'

const DISPLAY_MODE_BTC = 0
const DISPLAY_MODE_SATS = 1
const DISPLAY_MODE_HIDDEN = 2

const decimalPoint = '\u002E'
const nbHalfSpace = '\u202F'

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

export default function Balance({ valueString, convertToUnit, showBalance = false }) {
  const [displayMode, setDisplayMode] = useState(DISPLAY_MODE_HIDDEN)

  useEffect(() => {
    setDisplayMode(getDisplayMode(convertToUnit, showBalance))
  }, [convertToUnit, showBalance])

  if (displayMode === DISPLAY_MODE_HIDDEN) {
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

  if (typeof valueString !== 'string') {
    console.warn('<Balance /> component expects string input')
    return <BalanceComponent symbol={''} value={valueString} symbolIsPrefix={false} />
  }

  // Treat integers as sats.
  const valueIsSats = valueString === Number.parseInt(valueString).toString()
  // Treat decimal numbers as btc.
  const valueIsBtc = !valueIsSats && !Number.isNaN(Number.parseFloat(valueString)) && valueString.indexOf('.') > -1

  const btcSymbol = <span style={{ paddingRight: '0.1em' }}>{'\u20BF'}</span>
  const satSymbol = <Sprite symbol="sats" width="1.2em" height="1.2em" />

  if (valueIsBtc && displayMode === DISPLAY_MODE_BTC)
    return <BalanceComponent symbol={btcSymbol} value={formatBtc(valueString)} symbolIsPrefix={true} />
  if (valueIsSats && displayMode === DISPLAY_MODE_SATS)
    return <BalanceComponent symbol={satSymbol} value={formatSats(valueString)} symbolIsPrefix={false} />

  if (valueIsBtc && displayMode === DISPLAY_MODE_SATS)
    return <BalanceComponent symbol={satSymbol} value={formatSats(btcToSats(valueString))} symbolIsPrefix={false} />
  if (valueIsSats && displayMode === DISPLAY_MODE_BTC)
    return <BalanceComponent symbol={btcSymbol} value={formatBtc(satsToBtc(valueString))} symbolIsPrefix={true} />

  console.warn('<Balance /> component cannot determine balance format')
  return <BalanceComponent symbol={''} value={valueString} symbolIsPrefix={false} />
}
