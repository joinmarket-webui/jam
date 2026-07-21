import type { TFunction } from 'i18next'
import * as yup from 'yup'
import { JM_MINIMUM_MAKERS_DEFAULT, JM_NG_DEFAULT_TUMBLER_PARAMS } from '@/constants/jm'
import type { AddressSummary } from '@/context/JamWalletInfoContext'
import { isValidAddress } from '@/lib/formValidation'
import { factorToPercentage, isValidNumber, pseudoRandomInteger } from '@/lib/utils'
import type { Factor } from '@/types/global'
import { buildDestinationErrors, normalizeDestinationAddresses } from './destinationValidation'

export type SweepFormValues = {
  destinations: Array<{
    address: string
  }>
  useInsecureTestingSettings: boolean
  includeMakerSessions: boolean
  roundingChanceInPercent: number
  minNumberOfCollaborators: number
  maxNumberOfCollaborators: number
  minNumberOfTransactionsPerJar: number
}

export type SweepResolverContext = {
  addressSummary: AddressSummary
}

export const MIN_DESTINATION_ADDRESS_COUNT_DEV = 1
export const MIN_DESTINATION_ADDRESS_COUNT_PROD = 3

export const MIN_MIN_NUMBER_OF_COLLABORATORS = Math.max(1, JM_MINIMUM_MAKERS_DEFAULT)
export const MAX_MAX_NUMBER_OF_COLLABORATORS =
  MIN_MIN_NUMBER_OF_COLLABORATORS +
  pseudoRandomInteger(MIN_MIN_NUMBER_OF_COLLABORATORS * 4, MIN_MIN_NUMBER_OF_COLLABORATORS * 5 + 1)

export const MIN_ROUNDING_CHANCE_FACTOR: Factor = 0.1
export const MAX_ROUNDING_CHANCE_FACTOR: Factor = 0.9

export const buildSweepFormValuesDefaultValues = (): SweepFormValues => {
  const minNumberOfCollaborators = Math.max(
    MIN_MIN_NUMBER_OF_COLLABORATORS,
    JM_NG_DEFAULT_TUMBLER_PARAMS.maker_count_min + pseudoRandomInteger(0, 1),
  )
  const maxNumberOfCollaborators = Math.min(
    MAX_MAX_NUMBER_OF_COLLABORATORS,
    Math.max(minNumberOfCollaborators + 3, JM_NG_DEFAULT_TUMBLER_PARAMS.maker_count_max + pseudoRandomInteger(-1, 2)),
  )

  return {
    destinations: buildSweepDestinationValues(MIN_DESTINATION_ADDRESS_COUNT_PROD),
    includeMakerSessions: JM_NG_DEFAULT_TUMBLER_PARAMS.include_maker_sessions,
    roundingChanceInPercent: Math.max(
      0,
      Math.min(100, factorToPercentage(JM_NG_DEFAULT_TUMBLER_PARAMS.rounding_chance) + pseudoRandomInteger(-5, 5)),
    ),
    useInsecureTestingSettings: false,
    minNumberOfCollaborators,
    maxNumberOfCollaborators,
    minNumberOfTransactionsPerJar: JM_NG_DEFAULT_TUMBLER_PARAMS.mintxcount,
  }
}

export const buildSweepDestinationValues = (count: number): SweepFormValues['destinations'] =>
  Array.from({ length: count }, () => ({ address: '' }))

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

export const sweepFormSchema = (
  addressSummary: AddressSummary,
  t: TFunction<'translation', undefined>,
): yup.ObjectSchema<SweepFormValues> => {
  const invalidDestinationAddressMessage = t('scheduler.feedback_invalid_destination_address')

  return yup
    .object({
      destinations: yup
        .array()
        .of(
          yup
            .object({
              // TODO: use formValidation#destinationAddressField ?
              address: yup
                .string()
                .transform((_, originalValue: unknown) =>
                  typeof originalValue === 'string' ? normalizeDestinationAddresses([originalValue])[0] : '',
                )
                .defined()
                .test('valid-sweep-destination', invalidDestinationAddressMessage, function (value) {
                  if (!isValidAddress(value)) {
                    return false
                  }

                  return true
                }),
            })
            .required(),
        )
        .test('unique-destination-addresses', function (value: SweepFormValues['destinations'] | undefined) {
          const destinations = value ?? []
          return buildDestinationErrorList(destinations, addressSummary, t)
        })
        .required(),
      useInsecureTestingSettings: yup.boolean().default(false).required(),
      includeMakerSessions: yup.boolean().default(true).required(),
      roundingChanceInPercent: yup
        .number()
        .transform((value) => (isValidNumber(value) ? value : null))
        .min(factorToPercentage(MIN_ROUNDING_CHANCE_FACTOR))
        .max(factorToPercentage(MAX_ROUNDING_CHANCE_FACTOR))
        .required(),
      minNumberOfCollaborators: yup
        .number()
        .transform((value) => (isValidNumber(value) ? value : null))
        .min(1)
        .required(),
      maxNumberOfCollaborators: yup
        .number()
        .transform((value) => (isValidNumber(value) ? value : null))
        .min(1)
        .required(),
      minNumberOfTransactionsPerJar: yup
        .number()
        .transform((value) => (isValidNumber(value) ? value : null))
        .min(2)
        .required(),
    })
    .test('min-max-collaborators-test', function (root) {
      if (root.minNumberOfCollaborators === undefined) return true
      if (root.maxNumberOfCollaborators === undefined) return true

      if (root.minNumberOfCollaborators > root.maxNumberOfCollaborators) {
        // TODO: i18n
        const errorMessage = t('scheduler.feedback_invalid_min_max_collaborators', {
          defaultValue: 'Please provide valid values for minimum and maximum number of collaborators.',
        })
        return new yup.ValidationError(
          errorMessage,
          root.maxNumberOfCollaborators,
          'maxNumberOfCollaborators',
          undefined,
          true,
        )
      }

      return true
    })
    .required()
}
