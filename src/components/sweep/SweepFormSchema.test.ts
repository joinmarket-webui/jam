import type { TFunction } from 'i18next'
import { describe, expect, it } from 'vitest'
import type { AddressSummary } from '@/context/JamWalletInfoContext'
import {
  buildSweepDestinationValues,
  getSweepDestinationAddresses,
  sweepFormSchema,
  type SweepFormValues,
} from './SweepFormSchema'

const t = ((key: string) => key) as unknown as TFunction<'translation', undefined>
const validRegtestAddress = 'bcrt1qrnz0thqslhxu86th069r9j6y7ldkgs2tzgf5wx'

const validate = async (values: SweepFormValues, addressSummary = {} as AddressSummary) => {
  return await sweepFormSchema(addressSummary, t).validate(values, { abortEarly: false })
}

describe('sweepFormSchema', () => {
  it('builds empty destination defaults', () => {
    expect(buildSweepDestinationValues(3)).toEqual([{ address: '' }, { address: '' }, { address: '' }])
  })

  it('normalizes destination addresses', () => {
    expect(
      getSweepDestinationAddresses({
        destinations: [{ address: `  ${validRegtestAddress}  ` }],
      }),
    ).toEqual([validRegtestAddress])
  })

  it('rejects invalid addresses per destination field', async () => {
    await expect(
      validate({
        destinations: [{ address: 'invalid-address' }, { address: '' }],
      }),
    ).rejects.toMatchObject({
      inner: [
        expect.objectContaining({
          path: 'destinations[0].address',
          message: 'scheduler.feedback_invalid_destination_address',
        }),
        expect.objectContaining({
          path: 'destinations[1].address',
          message: 'scheduler.feedback_invalid_destination_address',
        }),
      ],
    })
  })

  it('rejects duplicate destination addresses', async () => {
    await expect(
      validate({
        destinations: [{ address: validRegtestAddress }, { address: validRegtestAddress }],
      }),
    ).rejects.toMatchObject({
      inner: [
        expect.objectContaining({
          path: 'destinations[0].address',
          message: 'scheduler.feedback_reused_destination_address',
        }),
        expect.objectContaining({
          path: 'destinations[1].address',
          message: 'scheduler.feedback_reused_destination_address',
        }),
      ],
    })
  })

  it('rejects reused wallet addresses', async () => {
    const usedAddress = validRegtestAddress
    const addressSummary = {
      [usedAddress]: {
        used: true,
      },
    } as unknown as AddressSummary

    await expect(
      validate(
        {
          destinations: [{ address: usedAddress }],
        },
        addressSummary,
      ),
    ).rejects.toMatchObject({
      inner: [
        expect.objectContaining({
          path: 'destinations[0].address',
          message: 'scheduler.feedback_reused_destination_address',
        }),
      ],
    })
  })
})
