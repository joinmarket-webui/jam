import { useMemo } from 'react'
import { DisplayLogo } from '@/components/DisplayLogo'
import { useJamDisplayContext } from '@/components/layout/display-mode-context'
import type { Currency } from '@/hooks/useDisplaySettings'
import { cn, satsToBtc, btcToSats, isValidNumber, formatBtc, formatSats, SATS, BTC } from '@/lib/utils'

const DISPLAY_MODE_BTC = 'btc'
const DISPLAY_MODE_SATS = 'sats'
const DISPLAY_MODE_HIDDEN = 'private'

const getDisplayMode = (
  unit: typeof SATS | typeof BTC | undefined,
  currency: Currency,
  isPrivate: boolean,
  showBalance: boolean,
) => {
  if (!showBalance || isPrivate) return DISPLAY_MODE_HIDDEN

  // If convertToUnit is specified, respect it, otherwise use context
  if (unit === BTC) return DISPLAY_MODE_BTC
  if (unit === SATS) return DISPLAY_MODE_SATS

  // Use context display mode when no specific unit is requested
  return currency
}

const BTC_SYMBOL = <DisplayLogo currency="btc" size="sm" />

const SAT_SYMBOL = <DisplayLogo currency="sats" size="sm" />

const FROZEN_SYMBOL = (
  <span data-testid="frozen-symbol" className="ml-1 text-blue-400">
    ❄️
  </span>
)

const HIDE_SYMBOL = <DisplayLogo currency="sats" isPrivate={true} size="sm" />

interface BalanceComponentProps {
  symbol?: React.ReactNode
  showSymbol?: boolean
  frozen?: boolean
  colored?: boolean
  frozenSymbol?: boolean
  className?: string
  children: React.ReactNode
}

const BalanceComponent = ({
  symbol,
  showSymbol = true,
  frozen = false,
  colored = true,
  frozenSymbol = true,
  className,
  children,
}: BalanceComponentProps) => {
  return (
    <span
      className={cn(
        'balance-hook inline-flex items-center font-mono text-sm',
        frozen && 'opacity-60',
        colored && 'text-green-600',
        className,
      )}
    >
      {showSymbol && symbol}
      {children}
      {frozen && frozenSymbol && FROZEN_SYMBOL}
    </span>
  )
}

const DECIMAL_POINT_CHAR = '.'

interface BitcoinBalanceProps extends Omit<BalanceComponentProps, 'symbol' | 'children'> {
  value: number
}

const BitcoinBalance = ({ value, colored = true, ...props }: BitcoinBalanceProps) => {
  const numberString = formatBtc(value)
  const [integerPart, fractionalPart] = numberString.split(DECIMAL_POINT_CHAR)

  const fractionPartArray = fractionalPart.split('')
  const integerPartIsZero = integerPart === '0'
  const fractionalPartStartsWithZero = fractionPartArray[0] === '0'

  return (
    <BalanceComponent symbol={BTC_SYMBOL} colored={colored} {...props}>
      <span
        className={cn('slashed-zeroes', colored && 'text-green-600')}
        data-testid="bitcoin-amount"
        data-integer-part-is-zero={integerPartIsZero}
        data-fractional-part-starts-with-zero={fractionalPartStartsWithZero}
        data-raw-value={value}
        data-formatted-value={numberString}
      >
        <span>{integerPart}</span>
        <span>{DECIMAL_POINT_CHAR}</span>
        <span>
          {fractionPartArray.map((digit, index) => (
            <span key={index} data-digit={digit}>
              {digit}
            </span>
          ))}
        </span>
      </span>
    </BalanceComponent>
  )
}

interface SatsBalanceProps extends Omit<BalanceComponentProps, 'symbol' | 'children'> {
  value: number
}

const SatsBalance = ({ value, colored = true, ...props }: SatsBalanceProps) => {
  return (
    <BalanceComponent symbol={SAT_SYMBOL} colored={colored} {...props}>
      <span
        className={cn('slashed-zeroes', colored && 'text-green-600')}
        data-testid="sats-amount"
        data-raw-value={value}
      >
        {formatSats(value)}
      </span>
    </BalanceComponent>
  )
}

interface BalanceProps extends Omit<BalanceComponentProps, 'symbol' | 'children'> {
  valueString: string
  convertToUnit?: typeof SATS | typeof BTC
  showBalance?: boolean
}

/**
 *
 * @param {valueString}: The balance value to render.
 * Integer values are treated as SATS while decimal numbers with a decimal point (.) are treated as BTC.
 * For example:
 *  - 0, 10, 2100000000000000 are treated as a value in SATS; while
 *  - 0.00000000, 150.00000001, 21000000.00000000 are treated as a value in BTC.
 * @param {convertToUnit}: The unit to convert the `valueString` to. If not specified, uses the global display mode.
 * @param {showBalance}: A flag indicating whether to render or hide the balance.
 * Hidden balances are masked with `*****`.
 */
export const Balance = ({ valueString, convertToUnit, showBalance = true, ...props }: BalanceProps) => {
  const { currency, isPrivate } = useJamDisplayContext()
  const displayMode = useMemo(
    () => getDisplayMode(convertToUnit, currency, isPrivate, showBalance),
    [convertToUnit, currency, isPrivate, showBalance],
  )

  const balanceComponent = useMemo(() => {
    if (displayMode === DISPLAY_MODE_HIDDEN) {
      return (
        <BalanceComponent symbol={HIDE_SYMBOL} {...props}>
          <span className="slashed-zeroes">{'*****'}</span>
        </BalanceComponent>
      )
    }

    const valueNumber = parseFloat(valueString)
    if (!isValidNumber(valueNumber)) {
      console.warn('<Balance /> component expects number input as string')
      return <BalanceComponent {...props}>{valueString}</BalanceComponent>
    }

    // Treat integers as sats.
    const valueIsSats = valueString === parseInt(valueString, 10).toString()
    // Treat decimal numbers as btc.
    const valueIsBtc = !valueIsSats && valueString.indexOf('.') > -1

    if (displayMode === DISPLAY_MODE_BTC) {
      if (valueIsBtc) {
        return <BitcoinBalance value={valueNumber} {...props} />
      } else {
        return <BitcoinBalance value={satsToBtc(valueString)} {...props} />
      }
    }

    if (displayMode === DISPLAY_MODE_SATS) {
      if (valueIsSats) {
        return <SatsBalance value={valueNumber} {...props} />
      } else {
        return <SatsBalance value={btcToSats(valueString)} {...props} />
      }
    }

    console.warn('<Balance /> component cannot determine balance format')
    return <BalanceComponent {...props}>{valueString}</BalanceComponent>
  }, [valueString, displayMode, props])

  return balanceComponent
}
