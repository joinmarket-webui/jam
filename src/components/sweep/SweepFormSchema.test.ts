import { Network } from 'bitcoin-address-validation'
import type { TFunction } from 'i18next'
import { describe, expect, it, vi } from 'vitest'
import { ValidationError } from 'yup'
import {
  JAM_SWEEP_MAX_MAX_NUMBER_OF_COLLABORATORS,
  JAM_SWEEP_MAX_MIN_NUMBER_OF_COLLABORATORS,
  JAM_SWEEP_MAX_ROUNDING_CHANCE_PERCENT,
  JAM_SWEEP_MAX_TRANSACTIONS_PER_JAR,
  JAM_SWEEP_MIN_MAX_NUMBER_OF_COLLABORATORS,
  JAM_SWEEP_MIN_MIN_NUMBER_OF_COLLABORATORS,
  JAM_SWEEP_MIN_ROUNDING_CHANCE_PERCENT,
  JAM_SWEEP_MIN_TRANSACTIONS_PER_JAR,
} from '@/constants/jam'
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
const validMainnetAddress = '1BitcoinEaterAddressDontSend8MUo1T'

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

  it.each(['minNumberOfTransactionsPerJar', 'minNumberOfCollaborators', 'maxNumberOfCollaborators'] as const)(
    'rejects a fractional %s',
    async (field) => {
      const values = {
        ...buildSweepFormValuesDefaultValues(),
        destinations: [{ address: validRegtestAddress }],
        minNumberOfCollaborators: 5,
        maxNumberOfCollaborators: 9,
        minNumberOfTransactionsPerJar: 3,
      }

      await expect(validate(values)).resolves.toBeDefined()
      const error = await validate({ ...values, [field]: values[field] + 0.5 }).catch((error_: unknown) => error_)
      expect(error).toBeInstanceOf(ValidationError)
      expect((error as ValidationError).inner.map((it) => it.path)).toContain(field)
    },
  )

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

  it('rejects a number of destinations outside the allowed range', async () => {
    await expect(
      validate({
        ...buildSweepFormValuesDefaultValues(),
        destinations: [],
      }),
    ).rejects.toMatchObject({
      inner: [
        expect.objectContaining({
          path: 'destinations',
          message: 'scheduler.feedback_invalid_number_of_destination_addresses',
        }),
      ],
    })
  })

  it('rejects a minimum number of collaborators above the maximum', async () => {
    await expect(
      validate({
        ...buildSweepFormValuesDefaultValues(),
        destinations: [{ address: validRegtestAddress }],
        minNumberOfCollaborators: 8,
        maxNumberOfCollaborators: 6,
      }),
    ).rejects.toMatchObject({
      inner: [
        expect.objectContaining({
          path: 'maxNumberOfCollaborators',
          message: 'scheduler.feedback_invalid_min_max_collaborators',
        }),
      ],
    })
  })

  it('rejects minNumberOfCollaborators outside the allowed range', async () => {
    const defaultValues = buildSweepFormValuesDefaultValues()
    for (const invalidValue of [
      JAM_SWEEP_MIN_MIN_NUMBER_OF_COLLABORATORS - 1,
      JAM_SWEEP_MAX_MIN_NUMBER_OF_COLLABORATORS + 1,
    ]) {
      await expect(
        validate({
          ...defaultValues,
          destinations: [{ address: validRegtestAddress }],
          minNumberOfCollaborators: invalidValue,
          maxNumberOfCollaborators: Math.max(defaultValues.maxNumberOfCollaborators, invalidValue),
        }),
      ).rejects.toMatchObject({
        inner: expect.arrayContaining([
          expect.objectContaining({
            path: 'minNumberOfCollaborators',
            message: 'scheduler.feedback_invalid_min_value',
          }),
        ]),
      })
    }
  })

  it('rejects maxNumberOfCollaborators outside the allowed range', async () => {
    const defaultValues = buildSweepFormValuesDefaultValues()
    for (const invalidValue of [
      JAM_SWEEP_MIN_MAX_NUMBER_OF_COLLABORATORS - 1,
      JAM_SWEEP_MAX_MAX_NUMBER_OF_COLLABORATORS + 1,
    ]) {
      await expect(
        validate({
          ...defaultValues,
          destinations: [{ address: validRegtestAddress }],
          minNumberOfCollaborators: Math.min(JAM_SWEEP_MIN_MIN_NUMBER_OF_COLLABORATORS, invalidValue),
          maxNumberOfCollaborators: invalidValue,
        }),
      ).rejects.toMatchObject({
        inner: expect.arrayContaining([
          expect.objectContaining({
            path: 'maxNumberOfCollaborators',
            message: 'scheduler.feedback_invalid_max_value',
          }),
        ]),
      })
    }
  })

  it('rejects minNumberOfTransactionsPerJar outside the allowed range', async () => {
    const defaultValues = buildSweepFormValuesDefaultValues()
    for (const invalidValue of [JAM_SWEEP_MIN_TRANSACTIONS_PER_JAR - 1, JAM_SWEEP_MAX_TRANSACTIONS_PER_JAR + 1]) {
      await expect(
        validate({
          ...defaultValues,
          destinations: [{ address: validRegtestAddress }],
          minNumberOfTransactionsPerJar: invalidValue,
        }),
      ).rejects.toMatchObject({
        inner: [
          expect.objectContaining({
            path: 'minNumberOfTransactionsPerJar',
            message: 'scheduler.feedback_invalid_value',
          }),
        ],
      })
    }
  })

  it('rejects roundingChanceInPercent outside the allowed range', async () => {
    const defaultValues = buildSweepFormValuesDefaultValues()
    for (const invalidValue of [JAM_SWEEP_MIN_ROUNDING_CHANCE_PERCENT - 1, JAM_SWEEP_MAX_ROUNDING_CHANCE_PERCENT + 1]) {
      await expect(
        validate({
          ...defaultValues,
          destinations: [{ address: validRegtestAddress }],
          roundingChanceInPercent: invalidValue,
        }),
      ).rejects.toMatchObject({
        inner: [
          expect.objectContaining({
            path: 'roundingChanceInPercent',
            message: 'scheduler.feedback_invalid_value',
          }),
        ],
      })
    }
  })

  it('interpolates dynamic { min, max } parameters into validation error messages', () => {
    const tMock = vi.fn((key: string, options?: Record<string, unknown>) => {
      return options ? `${key}:${JSON.stringify(options)}` : key
    }) as unknown as TFunction<'translation', undefined>

    sweepFormSchema(
      {
        minNumberOfDestinations: 1,
        maxNumberOfDestinations: 5,
        addressSummary: {} as AddressSummary,
        network: Network.regtest,
      },
      tMock,
    )

    expect(tMock).toHaveBeenCalledWith('scheduler.feedback_invalid_min_value', {
      min: JAM_SWEEP_MIN_MIN_NUMBER_OF_COLLABORATORS.toLocaleString(),
      max: JAM_SWEEP_MAX_MIN_NUMBER_OF_COLLABORATORS.toLocaleString(),
    })
    expect(tMock).toHaveBeenCalledWith('scheduler.feedback_invalid_max_value', {
      min: JAM_SWEEP_MIN_MAX_NUMBER_OF_COLLABORATORS.toLocaleString(),
      max: JAM_SWEEP_MAX_MAX_NUMBER_OF_COLLABORATORS.toLocaleString(),
    })
    expect(tMock).toHaveBeenCalledWith('scheduler.feedback_invalid_value', {
      min: JAM_SWEEP_MIN_TRANSACTIONS_PER_JAR.toLocaleString(),
      max: JAM_SWEEP_MAX_TRANSACTIONS_PER_JAR.toLocaleString(),
    })
    expect(tMock).toHaveBeenCalledWith('scheduler.feedback_invalid_value', {
      min: JAM_SWEEP_MIN_ROUNDING_CHANCE_PERCENT.toLocaleString(),
      max: JAM_SWEEP_MAX_ROUNDING_CHANCE_PERCENT.toLocaleString(),
    })
  })

  it('rejects minNumberOfCollaborators outside the allowed range', async () => {
    const defaultValues = buildSweepFormValuesDefaultValues()
    for (const invalidValue of [
      JAM_SWEEP_MIN_MIN_NUMBER_OF_COLLABORATORS - 1,
      JAM_SWEEP_MAX_MIN_NUMBER_OF_COLLABORATORS + 1,
    ]) {
      await expect(
        validate({
          ...defaultValues,
          destinations: [{ address: validRegtestAddress }],
          minNumberOfCollaborators: invalidValue,
          maxNumberOfCollaborators: Math.max(defaultValues.maxNumberOfCollaborators, invalidValue),
        }),
      ).rejects.toMatchObject({
        inner: expect.arrayContaining([
          expect.objectContaining({
            path: 'minNumberOfCollaborators',
            message: 'scheduler.feedback_invalid_min_value',
          }),
        ]),
      })
    }
  })

  it('rejects maxNumberOfCollaborators outside the allowed range', async () => {
    const defaultValues = buildSweepFormValuesDefaultValues()
    for (const invalidValue of [
      JAM_SWEEP_MIN_MAX_NUMBER_OF_COLLABORATORS - 1,
      JAM_SWEEP_MAX_MAX_NUMBER_OF_COLLABORATORS + 1,
    ]) {
      await expect(
        validate({
          ...defaultValues,
          destinations: [{ address: validRegtestAddress }],
          minNumberOfCollaborators: Math.min(JAM_SWEEP_MIN_MIN_NUMBER_OF_COLLABORATORS, invalidValue),
          maxNumberOfCollaborators: invalidValue,
        }),
      ).rejects.toMatchObject({
        inner: expect.arrayContaining([
          expect.objectContaining({
            path: 'maxNumberOfCollaborators',
            message: 'scheduler.feedback_invalid_max_value',
          }),
        ]),
      })
    }
  })

  it('rejects minNumberOfTransactionsPerJar outside the allowed range', async () => {
    const defaultValues = buildSweepFormValuesDefaultValues()
    for (const invalidValue of [
      JAM_SWEEP_MIN_TRANSACTIONS_PER_JAR - 1,
      JAM_SWEEP_MAX_TRANSACTIONS_PER_JAR + 1,
    ]) {
      await expect(
        validate({
          ...defaultValues,
          destinations: [{ address: validRegtestAddress }],
          minNumberOfTransactionsPerJar: invalidValue,
        }),
      ).rejects.toMatchObject({
        inner: [
          expect.objectContaining({
            path: 'minNumberOfTransactionsPerJar',
            message: 'scheduler.feedback_invalid_value',
          }),
        ],
      })
    }
  })

  it('rejects roundingChanceInPercent outside the allowed range', async () => {
    const defaultValues = buildSweepFormValuesDefaultValues()
    for (const invalidValue of [
      JAM_SWEEP_MIN_ROUNDING_CHANCE_PERCENT - 1,
      JAM_SWEEP_MAX_ROUNDING_CHANCE_PERCENT + 1,
    ]) {
      await expect(
        validate({
          ...defaultValues,
          destinations: [{ address: validRegtestAddress }],
          roundingChanceInPercent: invalidValue,
        }),
      ).rejects.toMatchObject({
        inner: [
          expect.objectContaining({
            path: 'roundingChanceInPercent',
            message: 'scheduler.feedback_invalid_value',
          }),
        ],
      })
    }
  })

  it('interpolates dynamic { min, max } parameters into validation error messages', () => {
    const tMock = vi.fn((key: string, options?: Record<string, unknown>) => {
      return options ? `${key}:${JSON.stringify(options)}` : key
    }) as unknown as TFunction<'translation', undefined>

    sweepFormSchema(
      {
        minNumberOfDestinations: 1,
        maxNumberOfDestinations: 5,
        addressSummary: {} as AddressSummary,
        network: Network.regtest,
      },
      tMock,
    )

    expect(tMock).toHaveBeenCalledWith('scheduler.feedback_invalid_min_value', {
      min: JAM_SWEEP_MIN_MIN_NUMBER_OF_COLLABORATORS.toLocaleString(),
      max: JAM_SWEEP_MAX_MIN_NUMBER_OF_COLLABORATORS.toLocaleString(),
    })
    expect(tMock).toHaveBeenCalledWith('scheduler.feedback_invalid_max_value', {
      min: JAM_SWEEP_MIN_MAX_NUMBER_OF_COLLABORATORS.toLocaleString(),
      max: JAM_SWEEP_MAX_MAX_NUMBER_OF_COLLABORATORS.toLocaleString(),
    })
    expect(tMock).toHaveBeenCalledWith('scheduler.feedback_invalid_value', {
      min: JAM_SWEEP_MIN_TRANSACTIONS_PER_JAR.toLocaleString(),
      max: JAM_SWEEP_MAX_TRANSACTIONS_PER_JAR.toLocaleString(),
    })
    expect(tMock).toHaveBeenCalledWith('scheduler.feedback_invalid_value', {
      min: JAM_SWEEP_MIN_ROUNDING_CHANCE_PERCENT.toLocaleString(),
      max: JAM_SWEEP_MAX_ROUNDING_CHANCE_PERCENT.toLocaleString(),
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
