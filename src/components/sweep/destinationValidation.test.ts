import type { TFunction } from 'i18next'
import { describe, expect, it } from 'vitest'
import type { AddressSummary } from '@/context/JamWalletInfoContext'
import { buildDestinationErrors } from './destinationValidation'

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
