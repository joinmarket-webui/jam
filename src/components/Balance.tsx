import { useCallback, useEffect, useMemo, useState } from 'react'
import { SATS, BTC, btcToSats, satsToBtc, formatBtc, formatSats, isValidNumber } from '../utils'
import Sprite from './Sprite'

const DISPLAY_MODE_BTC = 0
const DISPLAY_MODE_SATS = 1
const DISPLAY_MODE_HIDDEN = 2

const getDisplayMode = (unit: Unit, showBalance: boolean) => {
  if (showBalance && unit === SATS) return DISPLAY_MODE_SATS
  if (showBalance && unit === BTC) return DISPLAY_MODE_BTC

  return DISPLAY_MODE_HIDDEN
}

interface BalanceComponentProps {
  symbol: JSX.Element
  value: any
  symbolIsPrefix: boolean
}

const BalanceComponent = ({ symbol, value, symbolIsPrefix }: BalanceComponentProps) => {
  return (
    <span className="d-inline-flex align-items-center">
      {symbolIsPrefix && symbol}
      <span className="d-inline-flex align-items-center slashed-zeroes balance-value-hook">{value}</span>
      {!symbolIsPrefix && symbol}
    </span>
  )
}

/**
 * Options argument for Balance component.
 *
 * @param {valueString}: The balance value to render.
 * Integer values are treated as SATS while decimal numbers with a decimal point (.) are treated as BTC.
 * For example:
 *  - 0, 10, 2100000000000000 are treated as a value in SATS; while
 *  - 0.00000000, 150.00000001, 21000000.00000000 are treated as a value in BTC.
 * @param {convertToUnit}: The unit to convert the `valueString` to. Type {@link Unit}.
 * @param {showBalance}: A flag indicating whether to render or hide the balance.
 * Hidden balances are masked with `*****`.
 * @param {loading}: A loading flag that renders a placeholder while true.
 * @param {enableVisibilityToggle}: A flag that controls whether the balance can mask/unmask when clicked
 */
interface BalanceProps {
  valueString: string
  convertToUnit: Unit
  showBalance?: boolean
  enableVisibilityToggle?: boolean
}

/**
 * Render balances nicely formatted.
 */
export default function Balance({
  valueString,
  convertToUnit,
  showBalance = false,
  enableVisibilityToggle = !showBalance,
}: BalanceProps) {
  const [isBalanceVisible, setIsBalanceVisible] = useState(showBalance)
  const displayMode = useMemo(() => getDisplayMode(convertToUnit, isBalanceVisible), [convertToUnit, isBalanceVisible])

  useEffect(() => {
    setIsBalanceVisible(showBalance)
  }, [showBalance])

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

    const valueNumber = parseFloat(valueString)
    if (!isValidNumber(valueNumber)) {
      console.warn('<Balance /> component expects number input as string')
      return <BalanceComponent symbol={<></>} value={valueString} symbolIsPrefix={false} />
    }

    // Treat integers as sats.
    const valueIsSats = valueString === parseInt(valueString, 10).toString()
    // Treat decimal numbers as btc.
    const valueIsBtc = !valueIsSats && valueString.indexOf('.') > -1

    const btcSymbol = (
      <span className="balance-symbol-hook" style={{ paddingRight: '0.1em' }}>
        {'\u20BF'}
      </span>
    )
    const satSymbol = <Sprite className="balance-symbol-hook" symbol="sats" width="1.2em" height="1.2em" />

    if (valueIsBtc && displayMode === DISPLAY_MODE_BTC)
      return <BalanceComponent symbol={btcSymbol} value={formatBtc(valueNumber)} symbolIsPrefix={true} />
    if (valueIsSats && displayMode === DISPLAY_MODE_SATS)
      return <BalanceComponent symbol={satSymbol} value={formatSats(valueNumber)} symbolIsPrefix={false} />

    if (valueIsBtc && displayMode === DISPLAY_MODE_SATS)
      return <BalanceComponent symbol={satSymbol} value={formatSats(btcToSats(valueString))} symbolIsPrefix={false} />
    if (valueIsSats && displayMode === DISPLAY_MODE_BTC)
      return <BalanceComponent symbol={btcSymbol} value={formatBtc(satsToBtc(valueString))} symbolIsPrefix={true} />

    console.warn('<Balance /> component cannot determine balance format')
    return <BalanceComponent symbol={<></>} value={valueString} symbolIsPrefix={false} />
  }, [valueString, displayMode])

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
