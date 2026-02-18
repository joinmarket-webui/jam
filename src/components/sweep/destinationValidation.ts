import { validate as isValidBitcoinAddress } from 'bitcoin-address-validation'
import type { TFunction } from 'i18next'
import type { AddressSummary } from '@/context/JamWalletInfoContext'

const normalizeAddress = (value: string): string => value.trim()

export const buildDestinationErrors = (
  addresses: string[],
  addressSummary: AddressSummary,
  t: TFunction,
): Array<string | undefined> => {
  const normalizedAddresses = addresses.map((address) => normalizeAddress(address))
  const counts = normalizedAddresses.reduce((acc, address) => {
    if (address === '') {
      return acc
    }

    acc.set(address, (acc.get(address) ?? 0) + 1)
    return acc
  }, new Map<string, number>())

  return normalizedAddresses.map((address) => {
    if (address === '' || !isValidBitcoinAddress(address)) {
      return t('scheduler.feedback_invalid_destination_address')
    }

    const isReusedAddress = addressSummary[address]?.used === true
    const isDuplicateAddress = (counts.get(address) ?? 0) > 1

    if (isReusedAddress || isDuplicateAddress) {
      return t('scheduler.feedback_reused_destination_address')
    }

    return undefined
  })
}

export const normalizeDestinationAddresses = (addresses: string[]): string[] => {
  return addresses.map((address) => normalizeAddress(address))
}
