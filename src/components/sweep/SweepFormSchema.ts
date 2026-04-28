import type { TFunction } from 'i18next'
import * as yup from 'yup'
import type { AddressSummary } from '@/context/JamWalletInfoContext'
import { buildDestinationErrors, normalizeDestinationAddresses } from './destinationValidation'

export type SweepFormValues = {
  destinations: Array<{
    address: string
  }>
}

export const buildSweepDestinationValues = (count: number): SweepFormValues['destinations'] =>
  Array.from({ length: count }, () => ({ address: '' }))

export const getSweepDestinationAddresses = (values: SweepFormValues): string[] =>
  normalizeDestinationAddresses(values.destinations.map((destination) => destination.address))

const getDestinationIndex = (path?: string): number | undefined => {
  const match = path?.match(/^destinations\[(\d+)\]\.address$/)
  if (!match) return undefined
  return Number.parseInt(match[1], 10)
}

const getRootDestinations = (context: yup.TestContext): SweepFormValues['destinations'] | undefined => {
  const rootValue = context.from?.at(-1)?.value as Partial<SweepFormValues> | undefined
  return rootValue?.destinations
}

export const sweepFormSchema = (addressSummary: AddressSummary, t: TFunction<'translation', undefined>) => {
  const invalidDestinationAddressMessage = t('scheduler.feedback_invalid_destination_address')

  return yup
    .object({
      destinations: yup
        .array()
        .of(
          yup
            .object({
              address: yup
                .string()
                .transform((_, originalValue: unknown) =>
                  typeof originalValue === 'string' ? normalizeDestinationAddresses([originalValue])[0] : '',
                )
                .defined()
                .test('valid-sweep-destination', invalidDestinationAddressMessage, function () {
                  const destinations = getRootDestinations(this)
                  const index = getDestinationIndex(this.path)

                  if (!destinations || index === undefined) {
                    return this.createError({ message: invalidDestinationAddressMessage })
                  }

                  const errors = buildDestinationErrors(
                    destinations.map((destination) => destination.address),
                    addressSummary,
                    t,
                  )
                  const error = errors[index]

                  return error === undefined || this.createError({ message: error })
                }),
            })
            .required(),
        )
        .required(),
    })
    .required()
}
