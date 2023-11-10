import { MouseEventHandler, useCallback, useEffect, useMemo, useState } from 'react'
import classNames from 'classnames'
import Sprite from './Sprite'
import { SATS, BTC, btcToSats, satsToBtc, isValidNumber, formatBtc, formatSats } from '../utils'
import styles from './Balance.module.css'

const DISPLAY_MODE_BTC = 0
const DISPLAY_MODE_SATS = 1
const DISPLAY_MODE_HIDDEN = 2

const getDisplayMode = (unit: Unit, showBalance: boolean) => {
  if (showBalance && unit === SATS) return DISPLAY_MODE_SATS
  if (showBalance && unit === BTC) return DISPLAY_MODE_BTC

  return DISPLAY_MODE_HIDDEN
}

const DECIMAL_POINT_CHAR = '.'

const BitcoinAmountComponent = ({ value }: { value: number }) => {
  const numberString = formatBtc(value)
  const [integerPart, fractionalPart] = numberString.split(DECIMAL_POINT_CHAR)

  const fractionPartArray = fractionalPart.split('')
  const integerPartIsZero = integerPart === '0'
  const fractionalPartStartsWithZero = fractionPartArray[0] === '0'

  return (
    <span
      className={`${styles.bitcoinAmount} slashed-zeroes`}
      data-testid="bitcoin-amount"
      data-integer-part-is-zero={integerPartIsZero}
      data-fractional-part-starts-with-zero={fractionalPartStartsWithZero}
      data-raw-value={value}
      data-formatted-value={numberString}
    >
      <span className={styles.integerPart}>{integerPart}</span>
      <span className={styles.decimalPoint}>{DECIMAL_POINT_CHAR}</span>
      <span className={styles.fractionalPart}>
        {fractionPartArray.map((digit, index) => (
          <span key={index} data-digit={digit}>
            {digit}
          </span>
        ))}
      </span>
    </span>
  )
}

const SatsAmountComponent = ({ value }: { value: number }) => {
  return (
    <span className={`${styles.satsAmount} slashed-zeroes`} data-testid="sats-amount" data-raw-value={value}>
      {formatSats(value)}
    </span>
  )
}

const BTC_SYMBOL = <span className={styles.bitcoinSymbol}>{'\u20BF'}</span>

const SAT_SYMBOL = <Sprite className={styles.satsSymbol} symbol="sats" width="1.2em" height="1.2em" />

const FROZEN_SYMBOL = (
  <Sprite className={`${styles.frozenSymbol} frozen-symbol-hook`} symbol="snowflake" width="1.2em" height="1.2em" />
)

interface BalanceComponentProps {
  symbol: JSX.Element
  value: JSX.Element
  frozen?: boolean
}

const BalanceComponent = ({ symbol, value, frozen = false }: BalanceComponentProps) => {
  return (
    <span
      className={classNames(styles.balance, 'balance-hook', 'd-inline-flex align-items-center', {
        [styles.frozen]: frozen,
      })}
    >
      {frozen && FROZEN_SYMBOL}
      {value}
      {symbol}
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
  frozen?: boolean
}

/**
 * Render balances nicely formatted.
 */
export default function Balance({
  valueString,
  convertToUnit,
  showBalance = false,
  enableVisibilityToggle = !showBalance,
  frozen = false,
}: BalanceProps) {
  const [isBalanceVisible, setIsBalanceVisible] = useState(showBalance)
  const displayMode = useMemo(() => getDisplayMode(convertToUnit, isBalanceVisible), [convertToUnit, isBalanceVisible])

  useEffect(() => {
    setIsBalanceVisible(showBalance)
  }, [showBalance])

  const toggleVisibility: MouseEventHandler = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()

    setIsBalanceVisible((current) => !current)
  }, [])

  const balanceComponent = useMemo(() => {
    if (displayMode === DISPLAY_MODE_HIDDEN) {
      return (
        <BalanceComponent
          symbol={<Sprite symbol="hide" width="1.2em" height="1.2em" className={styles.hideSymbol} />}
          value={<span className="slashed-zeroes">{'*****'}</span>}
          frozen={frozen}
        />
      )
    }

    const valueNumber = parseFloat(valueString)
    if (!isValidNumber(valueNumber)) {
      console.warn('<Balance /> component expects number input as string')
      return <BalanceComponent symbol={<></>} value={<>{valueString}</>} frozen={frozen} />
    }

    // Treat integers as sats.
    const valueIsSats = valueString === parseInt(valueString, 10).toString()
    // Treat decimal numbers as btc.
    const valueIsBtc = !valueIsSats && valueString.indexOf('.') > -1

    if (valueIsBtc && displayMode === DISPLAY_MODE_BTC)
      return (
        <BalanceComponent symbol={BTC_SYMBOL} value={<BitcoinAmountComponent value={valueNumber} />} frozen={frozen} />
      )
    if (valueIsSats && displayMode === DISPLAY_MODE_SATS)
      return (
        <BalanceComponent symbol={SAT_SYMBOL} value={<SatsAmountComponent value={valueNumber} />} frozen={frozen} />
      )

    if (valueIsBtc && displayMode === DISPLAY_MODE_SATS)
      return (
        <BalanceComponent
          symbol={SAT_SYMBOL}
          value={<SatsAmountComponent value={btcToSats(valueString)} />}
          frozen={frozen}
        />
      )
    if (valueIsSats && displayMode === DISPLAY_MODE_BTC)
      return (
        <BalanceComponent
          symbol={BTC_SYMBOL}
          value={<BitcoinAmountComponent value={satsToBtc(valueString)} />}
          frozen={frozen}
        />
      )

    console.warn('<Balance /> component cannot determine balance format')
    return <BalanceComponent symbol={<></>} value={<>{valueString}</>} frozen={frozen} />
  }, [valueString, displayMode, frozen])

  if (!enableVisibilityToggle) {
    return <>{balanceComponent}</>
  } else {
    return (
      <span onClick={toggleVisibility} className="cursor-pointer">
        {balanceComponent}
      </span>
    )
  }
}
