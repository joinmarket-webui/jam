const BTC_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumIntegerDigits: 1,
  minimumFractionDigits: 8,
  maximumFractionDigits: 8,
})

const SATS_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumIntegerDigits: 1,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const DECIMAL_POINT_CHAR = '\u002E'

export type FormatBtcProps = {
  spaceChar?: string
  deemphasize?: (char: string) => string | JSX.Element
}

const DEFAULT_FORMAT_BTC_PROPS: FormatBtcProps = {
  spaceChar: '\u2009',
  deemphasize: (char) => <span className="opacity-50">{char}</span>,
}

export const formatBtc = (
  value: number,
  {
    spaceChar = DEFAULT_FORMAT_BTC_PROPS.spaceChar!,
    deemphasize = DEFAULT_FORMAT_BTC_PROPS.deemphasize!,
  }: Partial<FormatBtcProps> = DEFAULT_FORMAT_BTC_PROPS,
) => {
  const numberString = BTC_FORMATTER.format(value)
  const [integerPart, fractionalPart] = numberString.split(DECIMAL_POINT_CHAR)

  const fractionPartArray = fractionalPart.split('')
  const integerPartIsZero = integerPart === '0'
  const fractionalPartStartsWithZero = fractionPartArray[0] === '0'

  let deemphasizeFlag = !integerPartIsZero || fractionalPartStartsWithZero
  const formattedFractionalPart = fractionPartArray
    .map((char) => {
      deemphasizeFlag = !integerPartIsZero || (deemphasizeFlag && char === '0')
      return deemphasizeFlag ? deemphasize(char) : char
    })
    .map((val, index) =>
      index === 2 || index === 5 ? (
        <>
          {spaceChar}
          {val}
        </>
      ) : (
        val
      ),
    )
    .reduce((prev, current) => (
      <>
        {prev}
        {current}
      </>
    ))

  const formattedIntegerPart = integerPartIsZero ? deemphasize(integerPart) : integerPart
  const formattedDecimalPoint = fractionalPartStartsWithZero ? deemphasize(DECIMAL_POINT_CHAR) : DECIMAL_POINT_CHAR

  return (
    <>
      {formattedIntegerPart}
      {formattedDecimalPoint}
      {formattedFractionalPart}
    </>
  )
}

export const formatSats = (value: number) => {
  return SATS_FORMATTER.format(value)
}
