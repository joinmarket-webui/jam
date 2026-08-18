import { useEffect, useMemo, useState, type MouseEvent, type MouseEventHandler, type PropsWithChildren } from 'react'
import { SnowflakeIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CurrencySymbol } from '@/components/ui/jam/CurrencySymbol'
import { useJamDisplayContext } from '@/context/JamDisplayContext'
import { cn, satsToBtc, tryBtcToSat, isValidNumber, getBtcParts, formatSats } from '@/lib/utils'
import type { AmountSats, Currency } from '@/types/global'
import styles from './Balance.module.css'

type DisplayMode = 'default' | Currency | 'hidden'

const BTC_SYMBOL = <CurrencySymbol currency="btc" className={styles.bitcoinSymbol} />

const SAT_SYMBOL = <CurrencySymbol currency="sats" className={styles.satsSymbol} />

const HIDE_SYMBOL = <CurrencySymbol currency="sats" isPrivate={true} className={styles.hideSymbol} />

const FROZEN_SYMBOL = <SnowflakeIcon data-testid="frozen-symbol" className={cn('size-[1em]', styles.frozenSymbol)} />

type ElementWithSymbolsProps = PropsWithChildren<{
  symbol?: React.ReactNode
  showSymbol?: boolean
  frozen?: boolean
  frozenSymbol?: boolean
  className?: string
  onClick?: MouseEventHandler
  'aria-label'?: string
  'aria-pressed'?: boolean
}>

const ElementWithSymbols = ({
  symbol,
  showSymbol = true,
  frozen = false,
  frozenSymbol = true,
  className,
  children,
  onClick,
  'aria-label': ariaLabel,
  'aria-pressed': ariaPressed,
}: ElementWithSymbolsProps) => {
  const sharedClassName = cn(
    'balance-hook inline-flex items-center',
    {
      'text-brand-info': frozen,
    },
    className,
  )

  const content = (
    <>
      {children}
      {showSymbol && symbol}
      {frozen && frozenSymbol && FROZEN_SYMBOL}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        className={cn(sharedClassName, 'appearance-none border-0 bg-transparent p-0')}
        onClick={onClick}
        aria-label={ariaLabel}
        aria-pressed={ariaPressed}
      >
        {content}
      </button>
    )
  }

  return <span className={sharedClassName}>{content}</span>
}

const DECIMAL_POINT_CHAR = '.'

interface BitcoinBalanceProps extends Omit<ElementWithSymbolsProps, 'symbol' | 'children'> {
  value: AmountSats
  fractionalPartSpacing?: boolean
  highlightSignificantDigits?: boolean
}

const BitcoinBalance = ({
  value,
  fractionalPartSpacing = true,
  highlightSignificantDigits = true,
  ...props
}: BitcoinBalanceProps) => {
  const btcValue = satsToBtc(String(value))
  const { sign, integerPart, fractionalPart, formatted } = getBtcParts(btcValue)

  const fractionPartArray = [...fractionalPart]
  const integerPartIsZero = integerPart === '0'
  const fractionalPartStartsWithZero = fractionPartArray[0] === '0'

  return (
    <ElementWithSymbols symbol={BTC_SYMBOL} {...props}>
      <span
        className={cn('slashed-zero tabular-nums select-all', styles.bitcoinAmount, {
          [styles.bitcoinAmountSpacing]: fractionalPartSpacing,
          [styles.bitcoinAmountColor]: highlightSignificantDigits,
        })}
        data-testid="bitcoin-amount"
        data-integer-part-is-zero={integerPartIsZero}
        data-fractional-part-starts-with-zero={fractionalPartStartsWithZero}
        data-raw-value={value}
        data-formatted-value={formatted}
      >
        {sign && <span>{sign}</span>}
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
    </ElementWithSymbols>
  )
}

interface SatsBalanceProps extends Omit<ElementWithSymbolsProps, 'symbol' | 'children'> {
  value: AmountSats
  highlightSignificantDigits?: boolean
}

const SatsBalance = ({ value, highlightSignificantDigits = true, ...props }: SatsBalanceProps) => {
  return (
    <ElementWithSymbols symbol={SAT_SYMBOL} {...props}>
      <span
        className={cn('slashed-zero tabular-nums select-all', {
          [styles.satsAmountColor]: highlightSignificantDigits,
        })}
        data-testid="sats-amount"
        data-raw-value={value}
      >
        {formatSats(value)}
      </span>
    </ElementWithSymbols>
  )
}

type HiddenBalanceProps = Omit<ElementWithSymbolsProps, 'symbol' | 'children'> & {
  hiddenAmountPlaceholder: string
}

const HiddenBalance = ({ hiddenAmountPlaceholder, ...props }: HiddenBalanceProps) => {
  return (
    <ElementWithSymbols symbol={HIDE_SYMBOL} frozenSymbol={false} {...props}>
      <span className="slashed-zero tabular-nums select-none">{hiddenAmountPlaceholder}</span>
    </ElementWithSymbols>
  )
}

type BalanceComponentProps = Omit<ElementWithSymbolsProps, 'symbol' | 'children'> & {
  valueString: string
  convertToUnit?: Currency
  showBalance?: boolean
  enableVisibilityToggle?: boolean
  hiddenAmountPlaceholder: HiddenBalanceProps['hiddenAmountPlaceholder']
  fractionalPartSpacing?: boolean
  highlightSignificantDigits?: boolean
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
 */
export const BalanceComponent = ({
  valueString,
  convertToUnit,
  showBalance = false,
  enableVisibilityToggle,
  ...props
}: BalanceComponentProps) => {
  const { t } = useTranslation()
  const [isBalanceVisible, setIsBalanceVisible] = useState(showBalance)
  const displayMode = useMemo<DisplayMode>(() => {
    return isBalanceVisible ? (convertToUnit ?? 'default') : 'hidden'
  }, [isBalanceVisible, convertToUnit])

  useEffect(() => {
    const timerId = setTimeout(() => setIsBalanceVisible(showBalance), 4)
    return () => clearTimeout(timerId)
  }, [showBalance])

  const elementProps = useMemo(() => {
    const toggleVisibility: MouseEventHandler = (event) => {
      event.preventDefault()
      event.stopPropagation()
      setIsBalanceVisible((current) => !current)
    }
    const onClickHandler = enableVisibilityToggle === false ? undefined : toggleVisibility
    const isInteractive = Boolean(onClickHandler || props.onClick)

    return {
      ...props,
      className: cn(props.className, {
        'cursor-pointer': isInteractive,
      }),
      onClick: isInteractive
        ? (event: MouseEvent<HTMLButtonElement>) => {
            onClickHandler?.(event)
            props.onClick?.(event)
          }
        : undefined,
      'aria-label': onClickHandler
        ? t(isBalanceVisible ? 'settings.hide_balance' : 'settings.show_balance')
        : undefined,
      'aria-pressed': onClickHandler ? !isBalanceVisible : undefined,
    }
  }, [props, enableVisibilityToggle, isBalanceVisible, t])

  const element = useMemo(() => {
    if (displayMode === 'hidden') {
      return <HiddenBalance {...elementProps} />
    }

    const valueNumber = Number.parseFloat(valueString)
    if (!isValidNumber(valueNumber)) {
      console.warn('<Balance /> component expects number input as string')
      return <ElementWithSymbols {...elementProps}>{valueString}</ElementWithSymbols>
    }

    // Treat integers as sats.
    const valueIsSats = valueString === Number.parseInt(valueString, 10).toString()
    // Treat decimal numbers as btc.
    const valueIsBtc = !valueIsSats && valueString.includes('.')

    if (valueIsSats) {
      if (displayMode === 'default' || displayMode === 'sats') {
        return <SatsBalance {...elementProps} value={valueNumber} />
      }
      if (displayMode === 'btc') {
        return <BitcoinBalance {...elementProps} value={valueNumber} />
      }
    }
    if (valueIsBtc) {
      const valueInSats = tryBtcToSat(valueString)
      if (!isValidNumber(valueInSats)) {
        console.warn('<Balance /> component expects decimal BTC input in plain notation')
        return <ElementWithSymbols {...elementProps}>{valueString}</ElementWithSymbols>
      }
      if (displayMode === 'default' || displayMode === 'btc') {
        return <BitcoinBalance {...elementProps} value={valueInSats} />
      }
      if (displayMode === 'sats') {
        return <SatsBalance {...elementProps} value={valueInSats} />
      }
    }

    console.warn('<Balance /> component cannot determine balance format')
    return <ElementWithSymbols {...elementProps}>{valueString}</ElementWithSymbols>
  }, [valueString, displayMode, elementProps])

  return element
}

type BalanceProps = Omit<BalanceComponentProps, 'hiddenAmountPlaceholder'> & {
  hiddenAmountPlaceholder?: HiddenBalanceProps['hiddenAmountPlaceholder']
}

export const Balance = ({
  valueString,
  convertToUnit,
  showBalance, // TODO: rename: forceShowBalance
  enableVisibilityToggle,
  hiddenAmountPlaceholder,
  ...props
}: BalanceProps) => {
  const displayContext = useJamDisplayContext()
  const isBalanceVisible = useMemo(
    () => showBalance ?? displayContext.isPrivate === false,
    [showBalance, displayContext.isPrivate],
  )

  return (
    <BalanceComponent
      valueString={valueString}
      convertToUnit={convertToUnit ?? displayContext.currency}
      showBalance={isBalanceVisible}
      enableVisibilityToggle={enableVisibilityToggle ?? !isBalanceVisible}
      hiddenAmountPlaceholder={hiddenAmountPlaceholder ?? displayContext.hiddenAmountPlaceholder}
      {...props}
    />
  )
}
