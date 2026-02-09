import { useEffect, useMemo, useState, type MouseEventHandler } from 'react'
import { SnowflakeIcon } from 'lucide-react'
import { CurrencySymbol } from '@/components/ui/jam/CurrencySymbol'
import { useJamDisplayContext } from '@/context/JamDisplayContext'
import { cn, satsToBtc, tryBtcToSat, isValidNumber, formatBtc, formatSats } from '@/lib/utils'
import type { Currency } from '@/types/global'

type DisplayMode = 'default' | Currency | 'hidden'

const BTC_SYMBOL = <CurrencySymbol currency="btc" />

const SAT_SYMBOL = <CurrencySymbol currency="sats" />

const HIDE_SYMBOL = <CurrencySymbol currency="sats" isPrivate={true} />

const FROZEN_SYMBOL = <SnowflakeIcon data-testid="frozen-symbol" className="size-[1em]" />

interface ElementWithSymbolsProps {
  symbol?: React.ReactNode
  showSymbol?: boolean
  frozen?: boolean
  frozenSymbol?: boolean
  className?: string
  children: React.ReactNode
}

const ElementWithSymbols = ({
  symbol,
  showSymbol = true,
  frozen = false,
  frozenSymbol = true,
  className,
  children,
}: ElementWithSymbolsProps) => {
  return (
    <span
      className={cn(
        'balance-hook inline-flex items-center',
        {
          'light:text-blue-500/80 text-blue-500/80': frozen,
        },
        className,
      )}
    >
      {frozen && frozenSymbol && FROZEN_SYMBOL}
      {children}
      {showSymbol && symbol}
    </span>
  )
}

const DECIMAL_POINT_CHAR = '.'

interface BitcoinBalanceProps extends Omit<ElementWithSymbolsProps, 'symbol' | 'children'> {
  value: number
}

const BitcoinBalance = ({ value, ...props }: BitcoinBalanceProps) => {
  const numberString = formatBtc(value)
  const [integerPart, fractionalPart] = numberString.split(DECIMAL_POINT_CHAR)

  const fractionPartArray = [...fractionalPart]
  const integerPartIsZero = integerPart === '0'
  const fractionalPartStartsWithZero = fractionPartArray[0] === '0'

  return (
    <ElementWithSymbols symbol={BTC_SYMBOL} {...props}>
      <span
        className={cn('slashed-zero tabular-nums select-all')}
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
    </ElementWithSymbols>
  )
}

interface SatsBalanceProps extends Omit<ElementWithSymbolsProps, 'symbol' | 'children'> {
  value: number
}

const SatsBalance = ({ value, ...props }: SatsBalanceProps) => {
  return (
    <ElementWithSymbols symbol={SAT_SYMBOL} {...props}>
      <span className={cn('slashed-zero tabular-nums select-all')} data-testid="sats-amount" data-raw-value={value}>
        {formatSats(value)}
      </span>
    </ElementWithSymbols>
  )
}

type HiddenBalanceProps = Omit<ElementWithSymbolsProps, 'symbol' | 'children'>

const HiddenBalance = (props: HiddenBalanceProps) => {
  return (
    <ElementWithSymbols symbol={HIDE_SYMBOL} frozenSymbol={false} {...props}>
      <span className="slashed-zero tabular-nums select-none">{'*****'}</span>
    </ElementWithSymbols>
  )
}

interface BalanceComponentProps extends Omit<ElementWithSymbolsProps, 'symbol' | 'children'> {
  valueString: string
  convertToUnit?: Currency
  showBalance?: boolean
  enableVisibilityToggle?: boolean
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
export const BalanceComponent = ({
  valueString,
  convertToUnit,
  showBalance = false,
  enableVisibilityToggle,
  ...props
}: BalanceComponentProps) => {
  const [isBalanceVisible, setIsBalanceVisible] = useState(showBalance)
  const displayMode: DisplayMode = isBalanceVisible ? (convertToUnit ?? 'default') : 'hidden'

  useEffect(() => {
    setIsBalanceVisible(showBalance)
  }, [showBalance])

  const toggleVisibility: MouseEventHandler = (event) => {
    event.preventDefault()
    event.stopPropagation()

    setIsBalanceVisible((current) => !current)
  }

  const balanceComponent = useMemo(() => {
    if (displayMode === 'hidden') {
      return <HiddenBalance {...props} />
    }

    const valueNumber = Number.parseFloat(valueString)
    if (!isValidNumber(valueNumber)) {
      console.warn('<Balance /> component expects number input as string')
      return <ElementWithSymbols {...props}>{valueString}</ElementWithSymbols>
    }

    // Treat integers as sats.
    const valueIsSats = valueString === Number.parseInt(valueString, 10).toString()
    // Treat decimal numbers as btc.
    const valueIsBtc = !valueIsSats && valueString.includes('.')

    if (displayMode === 'btc') {
      if (valueIsBtc) {
        return <BitcoinBalance value={valueNumber} {...props} />
      } else {
        return <BitcoinBalance value={satsToBtc(valueString)} {...props} />
      }
    }

    if (displayMode === 'sats') {
      if (valueIsSats) {
        return <SatsBalance value={valueNumber} {...props} />
      } else {
        const valueInSats = tryBtcToSat(valueString)
        if (!isValidNumber(valueInSats)) {
          console.warn('<Balance /> component expects decimal BTC input in plain notation')
          return <ElementWithSymbols {...props}>{valueString}</ElementWithSymbols>
        }
        return <SatsBalance value={valueInSats} {...props} />
      }
    }

    if (displayMode === 'default') {
      if (valueIsSats) {
        return <SatsBalance value={valueNumber} {...props} />
      }
      if (valueIsBtc) {
        return <BitcoinBalance value={valueNumber} {...props} />
      }
    }

    console.warn('<Balance /> component cannot determine balance format')
    return <ElementWithSymbols {...props}>{valueString}</ElementWithSymbols>
  }, [valueString, displayMode, props])

  if (enableVisibilityToggle === false) {
    return <>{balanceComponent}</>
  } else {
    return (
      <span onClick={toggleVisibility} className="cursor-pointer">
        {balanceComponent}
      </span>
    )
  }
}

type BalanceProps = BalanceComponentProps

export const Balance = ({
  valueString,
  convertToUnit,
  showBalance, // TODO: rename: forceShowBalance
  enableVisibilityToggle,
  ...props
}: BalanceProps) => {
  const { currency: currencyFromSettings, isPrivate } = useJamDisplayContext()
  const isBalanceVisible = showBalance ?? isPrivate === false

  return (
    <BalanceComponent
      valueString={valueString}
      convertToUnit={convertToUnit ?? currencyFromSettings}
      showBalance={isBalanceVisible}
      enableVisibilityToggle={enableVisibilityToggle ?? !isBalanceVisible}
      {...props}
    />
  )
}
