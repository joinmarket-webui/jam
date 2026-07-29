import { validate as isValidBitcoinAddress } from 'bitcoin-address-validation'
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

export const parseBip21Uri = (raw: string): Bip21ParseResult | undefined => {
  const trimmed = raw.trim()

  // BIP21: bitcoin:<address>?amount=<btc>&...
  if (!trimmed.toLowerCase().startsWith(BITCOIN_URI_SCHEME)) {
    // raw address (no URI scheme)
    if (isValidBitcoinAddress(trimmed)) {
      return { address: trimmed, fromUri: false }
    }
    return undefined
  }

  const withoutScheme = trimmed.slice(BITCOIN_URI_SCHEME.length)
  const [addressPart, queryString] = withoutScheme.split('?', 2)

  if (!addressPart || !isValidBitcoinAddress(addressPart)) {
    return undefined
  }

  const result: Bip21ParseResult = { address: addressPart, fromUri: true }

  if (queryString) {
    const parameters = new URLSearchParams(queryString)
    const amountBtc = parameters.get('amount')
    if (amountBtc !== null) {
      const satValue = tryBtcToSat(amountBtc)
      if (satValue !== undefined && satValue > 0) {
        result.amount = satValue
      }
    }
    const label = parameters.get('label')
    if (label) {
      result.label = label
    }
    const message = parameters.get('message')
    if (message) {
      result.message = message
    }
  }

  return result
}
