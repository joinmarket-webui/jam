import { isValidAddress, normalizeBitcoinAddress } from '@/lib/formValidation'
import { tryBtcToSat } from '@/lib/utils'
import type { AmountSats, BitcoinAddress } from '@/types/global'

const BITCOIN_URI_SCHEME = 'bitcoin:'

export type Bip21ParseResult = {
  address: BitcoinAddress
  amount?: AmountSats
  label?: string
  message?: string
  fromUri: boolean
}

const readParameters = (queryString: string) => {
  const byLowercaseName = new Map<string, string>()
  for (const [name, value] of new URLSearchParams(queryString)) {
    const key = name.toLowerCase()
    if (!byLowercaseName.has(key)) {
      byLowercaseName.set(key, value)
    }
  }
  return (name: string) => byLowercaseName.get(name)
}

export const parseBip21Uri = (raw: string): Bip21ParseResult | undefined => {
  const trimmed = raw.trim()

  // BIP21: bitcoin:<address>?amount=<btc>&...
  if (!trimmed.toLowerCase().startsWith(BITCOIN_URI_SCHEME)) {
    // raw address (no URI scheme)
    const address = normalizeBitcoinAddress(trimmed)
    if (isValidAddress(address)) {
      return { address, fromUri: false }
    }
    return undefined
  }

  const withoutScheme = trimmed.slice(BITCOIN_URI_SCHEME.length)
  const queryStringIndex = withoutScheme.indexOf('?')
  const addressPart = queryStringIndex === -1 ? withoutScheme : withoutScheme.slice(0, queryStringIndex)
  const queryString = queryStringIndex === -1 ? '' : withoutScheme.slice(queryStringIndex + 1)

  const address = normalizeBitcoinAddress(addressPart)
  if (!isValidAddress(address)) {
    return undefined
  }

  const result: Bip21ParseResult = { address, fromUri: true }

  if (queryString) {
    const getParameter = readParameters(queryString)
    const amountBtc = getParameter('amount')
    if (amountBtc !== undefined) {
      const satValue = tryBtcToSat(amountBtc)
      if (satValue !== undefined && satValue > 0) {
        result.amount = satValue
      }
    }
    const label = getParameter('label')
    if (label) {
      result.label = label
    }
    const message = getParameter('message')
    if (message) {
      result.message = message
    }
  }

  return result
}
