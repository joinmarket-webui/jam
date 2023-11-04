const BTC_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumIntegerDigits: 1,
  minimumFractionDigits: 8,
})

const SATS_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumIntegerDigits: 1,
  minimumFractionDigits: 0,
})

const _decimalPoint = '\u002E'
const _nbHalfSpace = '\u202F'

export type FormatBtcProps = {
  deemphasize?: (char: string) => string | JSX.Element
}

const DEFAULT_FORMAT_BTC_PROPS = {
  deemphasize: (char: string) => <span className="opacity-50">{char}</span>,
}

export const formatBtc = (
  value: number,
  { deemphasize = DEFAULT_FORMAT_BTC_PROPS.deemphasize }: FormatBtcProps = DEFAULT_FORMAT_BTC_PROPS,
) => {
  const numberString = BTC_FORMATTER.format(value)
  const [integerPart, fractionalPart] = numberString.split(_decimalPoint)

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
          {_nbHalfSpace}
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
  const formattedDecimalPoint = fractionalPartStartsWithZero ? deemphasize(_decimalPoint) : _decimalPoint

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
