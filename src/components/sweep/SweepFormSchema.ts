import { validate as isValidBitcoinAddress } from 'bitcoin-address-validation'
import type { TFunction } from 'i18next'
import * as yup from 'yup'
import type { AddressSummary } from '@/context/JamWalletInfoContext'
import { buildDestinationErrors, normalizeDestinationAddresses } from './destinationValidation'

export type SweepFormValues = {
  destinations: Array<{
    address: string
  }>
}

export type SweepResolverContext = {
  addressSummary: AddressSummary
}

export const buildSweepDestinationValues = (count: number): SweepFormValues['destinations'] =>
  Array.from({ length: count }, () => ({ address: '' }))

export const getSweepDestinationAddresses = (values: SweepFormValues): string[] =>
  normalizeDestinationAddresses(values.destinations.map((destination) => destination.address))

const buildDestinationErrorList = (
  destinations: SweepFormValues['destinations'],
  addressSummary: AddressSummary,
  t: TFunction<'translation', undefined>,
): yup.ValidationError | true => {
  const errors = buildDestinationErrors(
    destinations.map((destination) => destination.address),
    addressSummary,
    t,
  )

  const innerErrors = errors
    .map((error, index) =>
      error ? new yup.ValidationError(error, destinations[index]?.address, `destinations[${index}].address`) : null,
    )
    .filter((error): error is yup.ValidationError => error !== null)

  if (innerErrors.length === 0) {
    return true
  }

  return new yup.ValidationError(innerErrors)
}

export const sweepFormSchema = (t: TFunction<'translation', undefined>): yup.ObjectSchema<SweepFormValues> => {
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
                .test('valid-sweep-destination', invalidDestinationAddressMessage, function (value) {
                  if (typeof value !== 'string' || value.trim() === '' || !isValidBitcoinAddress(value)) {
                    return this.createError({ message: invalidDestinationAddressMessage })
                  }

                  return true
                }),
            })
            .required(),
        )
        .test('unique-destination-addresses', function (value: SweepFormValues['destinations'] | undefined) {
          const destinations = value ?? []
          const context = this.options.context as SweepResolverContext | undefined
          const addressSummary = context?.addressSummary ?? ({} as AddressSummary)

          return buildDestinationErrorList(destinations, addressSummary, t)
        })
        .required(),
    })
    .required()
}
