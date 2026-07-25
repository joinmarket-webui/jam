import { Network } from 'bitcoin-address-validation'
import type { TFunction } from 'i18next'
import { describe, expect, it } from 'vitest'
import type { AddressSummary } from '@/context/JamWalletInfoContext'
import { percentageToFactor } from '@/lib/utils'
import {
  buildSweepDestinationValues,
  buildSweepFormValuesDefaultValues,
  formValuesToTumblerParameters,
  sweepFormSchema,
  type SweepFormValues,
} from './SweepFormSchema'

const t = ((key: string) => key) as unknown as TFunction<'translation', undefined>
const validRegtestAddress = 'bcrt1qrnz0thqslhxu86th069r9j6y7ldkgs2tzgf5wx'
const validMainnetAddress = '1BoatSLRHtKNngkdXEeobR76b53LETtpyT'

const validate = async (
  values: SweepFormValues,
  addressSummary = {} as AddressSummary,
  network: Network = Network.regtest,
) => {
  return await sweepFormSchema(
    {
      minNumberOfDestinations: 1,
      maxNumberOfDestinations: 5,
      addressSummary,
      network,
    },
    t,
  ).validate(values, { abortEarly: false })
}

describe('sweepFormSchema', () => {
  it('builds empty destination defaults', () => {
    expect(buildSweepDestinationValues(3)).toEqual([{ address: '' }, { address: '' }, { address: '' }])
  })

  it('rejects invalid addresses per destination field', async () => {
    await expect(
      validate({
        ...buildSweepFormValuesDefaultValues(),
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

  it('rejects an address from the wrong network', async () => {
    await expect(
      validate({
        ...buildSweepFormValuesDefaultValues(),
        destinations: [{ address: validMainnetAddress }],
      }),
    ).rejects.toMatchObject({
      inner: [
        expect.objectContaining({
          path: 'destinations[0].address',
          message: 'scheduler.feedback_destination_network_mismatch',
        }),
      ],
    })
  })

  it('rejects duplicate destination addresses', async () => {
    await expect(
      validate({
        ...buildSweepFormValuesDefaultValues(),
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
          ...buildSweepFormValuesDefaultValues(),
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

describe('formValuesToTumblerParameters', () => {
  it('rejects reused wallet addresses', () => {
    const values = buildSweepFormValuesDefaultValues()
    const parameters = formValuesToTumblerParameters(values)

    expect(parameters).toEqual({
      include_maker_sessions: values.includeMakerSessions,
      maker_count_min: values.minNumberOfCollaborators,
      maker_count_max: values.maxNumberOfCollaborators,
      rounding_chance: percentageToFactor(values.roundingChanceInPercent, 2),
      mintxcount: values.minNumberOfTransactionsPerJar,
      maker_session_idle_timeout_seconds: values.makerSessionIdleTimeoutSeconds,
    })
  })
})
