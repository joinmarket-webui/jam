import type { TFunction } from 'i18next'
import { describe, expect, it } from 'vitest'
import type { AddressSummary } from '@/context/JamWalletInfoContext'
import { buildDestinationErrors, normalizeDestinationAddresses } from './destinationValidation'

const t = ((key: string) => key) as unknown as TFunction

describe('buildDestinationErrors', () => {
  it('ignores invalid addresses for duplicate/reuse checks', () => {
    const errors = buildDestinationErrors(['invalid-address', '', 'also-invalid'], {}, t)

    expect(errors).toEqual([undefined, undefined, undefined])
  })

  it('reports duplicate addresses', () => {
    const validAddress = '1BitcoinEaterAddressDontSend8MUo1T'
    const errors = buildDestinationErrors([validAddress, validAddress, validAddress], {}, t)

    expect(errors).toEqual([
      'scheduler.feedback_reused_destination_address',
      'scheduler.feedback_reused_destination_address',
      'scheduler.feedback_reused_destination_address',
    ])
  })

  it('reports duplicates that differ only in bech32 casing', () => {
    const address = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'
    const errors = buildDestinationErrors([address, address.toUpperCase()], {}, t)

    expect(errors).toEqual([
      'scheduler.feedback_reused_destination_address',
      'scheduler.feedback_reused_destination_address',
    ])
  })

  it('reports reused addresses from wallet history', () => {
    const usedAddress = '1BitcoinEaterAddressDontSend8MUo1T'
    const freshAddress = '1BitcoinEaterAddressDontSendDHyNcX'
    const addressSummary = {
      [usedAddress]: {
        used: true,
      },
      [freshAddress]: {
        used: false,
      },
    } as unknown as AddressSummary

    const errors = buildDestinationErrors([usedAddress, freshAddress, freshAddress + 'x'], addressSummary, t)

    expect(errors).toEqual(['scheduler.feedback_reused_destination_address', undefined, undefined])
  })
})

describe('normalizeDestinationAddresses', () => {
  it('normalizes a list of bitcoin addresses', () => {
    const addresses = [
      ' bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq ',
      'BC1QAR0SRRR7XFKVY5L643LYDNW9RE59GTZZWF5MDQ',
      '1BitcoinEaterAddressDontSend8MUo1T',
    ]

    expect(normalizeDestinationAddresses(addresses)).toEqual([
      'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      '1BitcoinEaterAddressDontSend8MUo1T',
    ])
  })

  it('handles empty address list', () => {
    expect(normalizeDestinationAddresses([])).toEqual([])
  })
})
