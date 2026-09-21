import type { TFunction } from 'i18next'
import type { AddressSummary } from '@/context/JamWalletInfoContext'
import { isReusedAddress, isValidAddress, normalizeBitcoinAddress } from '@/lib/formValidation'

export const buildDestinationErrors = (
  addresses: string[],
  addressSummary: AddressSummary,
  t: TFunction,
): Array<string | undefined> => {
  const normalizedAddresses = addresses.map((address) => normalizeBitcoinAddress(address))
  const counts = normalizedAddresses.reduce((acc, address) => {
    if (!isValidAddress(address)) {
      return acc
    }

    acc.set(address, (acc.get(address) ?? 0) + 1)
    return acc
  }, new Map<string, number>())

  return normalizedAddresses.map((address) => {
    if (!isValidAddress(address)) {
      return undefined
    }

    const isDuplicateAddress = (counts.get(address) ?? 0) > 1
    if (isDuplicateAddress || isReusedAddress(address, addressSummary)) {
      return t('scheduler.feedback_reused_destination_address')
    }

    return undefined
  })
}

export const normalizeDestinationAddresses = (addresses: string[]): string[] => {
  return addresses.map((address) => normalizeBitcoinAddress(address))
}
