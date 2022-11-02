import { useCallback, useEffect, useMemo, useState } from 'react'
import { BTC, SATS, btcToSats, satsToBtc, formatBtc, formatSats, isValidNumber } from '../utils'
import Sprite from './Sprite'
import * as rb from 'react-bootstrap'
import styles from './Balance.module.css'

const DISPLAY_MODE_BTC = 0
const DISPLAY_MODE_SATS = 1
const DISPLAY_MODE_HIDDEN = 2

const getDisplayMode = (unit, showBalance) => {
  if (showBalance && unit === SATS) return DISPLAY_MODE_SATS
  if (showBalance && unit === BTC) return DISPLAY_MODE_BTC

  return DISPLAY_MODE_HIDDEN
}

const BalanceComponent = ({ symbol, value, symbolIsPrefix }) => {
  return (
    <span className="d-inline-flex align-items-center">
      {symbolIsPrefix && symbol}
      <span className="d-inline-flex align-items-center slashed-zeroes balance-value">{value}</span>
      {!symbolIsPrefix && symbol}
    </span>
  )
}

/**
 * Render balances nicely formatted.
 *
 * @param {valueString}: The balance value to render.
 * Integer values are treated as SATS while decimal numbers with a decimal point (.) are treated as BTC.
 * For example:
 *  - 0, 10, 2100000000000000 are treated as a value in SATS; while
 *  - 0.00000000, 150.00000001, 21000000.00000000 are treated as a value in BTC.
 * @param {convertToUnit}: The unit to convert the `valueString` to.
 * Possible options are `BTC` and `SATS` from `src/utils.js`
 * @param {showBalance}: A flag indicating whether to render or hide the balance.
 * Hidden balances are masked with `*****`.
 * @param {loading}: A loading flag that renders a placeholder while true.
 * @param {enableVisibilityToggle}: A flag that controls whether the balance can mask/unmask when clicked
 */
export default function Balance({
  valueString,
  convertToUnit,
  showBalance = false,
  loading = false,
  enableVisibilityToggle = !showBalance,
}) {
  const [displayMode, setDisplayMode] = useState(DISPLAY_MODE_HIDDEN)
  const [isBalanceVisible, setIsBalanceVisible] = useState(showBalance)

  useEffect(() => {
    setIsBalanceVisible(showBalance)
  }, [showBalance])

  useEffect(() => {
    setDisplayMode(getDisplayMode(convertToUnit, isBalanceVisible))
  }, [convertToUnit, isBalanceVisible])

  const toggleVisibility = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()

    setIsBalanceVisible((current) => !current)
  }, [])

  const balanceComponent = useMemo(() => {
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

    if (typeof valueString !== 'string' || !isValidNumber(parseFloat(valueString))) {
      console.warn('<Balance /> component expects number input as string')
      return <BalanceComponent symbol="" value={valueString} symbolIsPrefix={false} />
    }

    // Treat integers as sats.
    const valueIsSats = valueString === parseInt(valueString, 10).toString()
    // Treat decimal numbers as btc.
    const valueIsBtc = !valueIsSats && !isNaN(parseFloat(valueString)) && valueString.indexOf('.') > -1

    const btcSymbol = (
      <span className="balance-symbol" style={{ paddingRight: '0.1em' }}>
        {'\u20BF'}
      </span>
    )
    const satSymbol = <Sprite className="balance-symbol" symbol="sats" width="1.2em" height="1.2em" />

    if (valueIsBtc && displayMode === DISPLAY_MODE_BTC)
      return <BalanceComponent symbol={btcSymbol} value={formatBtc(valueString)} symbolIsPrefix={true} />
    if (valueIsSats && displayMode === DISPLAY_MODE_SATS)
      return <BalanceComponent symbol={satSymbol} value={formatSats(valueString)} symbolIsPrefix={false} />

    if (valueIsBtc && displayMode === DISPLAY_MODE_SATS)
      return <BalanceComponent symbol={satSymbol} value={formatSats(btcToSats(valueString))} symbolIsPrefix={false} />
    if (valueIsSats && displayMode === DISPLAY_MODE_BTC)
      return <BalanceComponent symbol={btcSymbol} value={formatBtc(satsToBtc(valueString))} symbolIsPrefix={true} />

    console.warn('<Balance /> component cannot determine balance format')
    return <BalanceComponent symbol="" value={valueString} symbolIsPrefix={false} />
  }, [valueString, displayMode])

  if (loading) {
    return (
      <rb.Placeholder as="div" animation="wave">
        <rb.Placeholder
          data-testid="balance-component-placeholder"
          className={styles['balance-component-placeholder']}
        />
      </rb.Placeholder>
    )
  }

  if (!enableVisibilityToggle) {
    return <>{balanceComponent}</>
  } else {
    return (
      <span onClick={toggleVisibility} style={{ cursor: 'pointer' }}>
        {balanceComponent}
      </span>
    )
  }
}
