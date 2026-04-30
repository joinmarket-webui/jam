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
    const validAddress = '1BoatSLRHtKNngkdXEeobR76b53LETtpyT'
    const errors = buildDestinationErrors([validAddress, validAddress, validAddress], {}, t)

    expect(errors).toEqual([
      'scheduler.feedback_reused_destination_address',
      'scheduler.feedback_reused_destination_address',
      'scheduler.feedback_reused_destination_address',
    ])
  })

  it('reports reused addresses from wallet history', () => {
    const usedAddress = '1BoatSLRHtKNngkdXEeobR76b53LETtpyT'
    const freshAddress = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'
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
