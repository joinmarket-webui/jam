import type { Network } from 'bitcoin-address-validation'
import type { TFunction } from 'i18next'
import * as yup from 'yup'
import {
  JAM_SWEEP_DESTINATION_ADDRESSES_DEFAULT_COUNT,
  JAM_SWEEP_MAKER_SESSION_IDLE_MIN_TIMEOUT_SECONDS,
  JAM_SWEEP_MAKER_SESSION_IDLE_TIMEOUT_SECONDS,
  JAM_SWEEP_MAX_MAX_NUMBER_OF_COLLABORATORS,
  JAM_SWEEP_MAX_MIN_NUMBER_OF_COLLABORATORS,
  JAM_SWEEP_MAX_ROUNDING_CHANCE_PERCENT,
  JAM_SWEEP_MAX_TRANSACTIONS_PER_JAR,
  JAM_SWEEP_MIN_MAX_NUMBER_OF_COLLABORATORS,
  JAM_SWEEP_MIN_MIN_NUMBER_OF_COLLABORATORS,
  JAM_SWEEP_MIN_ROUNDING_CHANCE_PERCENT,
  JAM_SWEEP_MIN_TRANSACTIONS_PER_JAR,
} from '@/constants/jam'
import { JM_NG_DEFAULT_TUMBLER_PARAMS, type TumblerParameters } from '@/constants/jm'
import type { AddressSummary } from '@/context/JamWalletInfoContext'
import { isAddressOnNetwork, isValidAddress } from '@/lib/formValidation'
import { factorToPercentage, isValidNumber, percentageToFactor, pseudoRandomInteger } from '@/lib/utils'
import type { Seconds } from '@/types/global'
import { buildDestinationErrors, normalizeDestinationAddresses } from './destinationValidation'

export type SweepFormValues = {
  destinations: Array<{
    address: string
  }>
  useInsecureTestingSettings: boolean
  includeMakerSessions: boolean
  makerSessionIdleTimeoutSeconds: Seconds
  minNumberOfCollaborators: number
  maxNumberOfCollaborators: number
  minNumberOfTransactionsPerJar: number
  roundingChanceInPercent: number
}

export const formValuesToTumblerParameters = (values: SweepFormValues): Partial<TumblerParameters> => {
  return {
    include_maker_sessions: values.includeMakerSessions,
    maker_count_min: values.minNumberOfCollaborators,
    maker_count_max: values.maxNumberOfCollaborators,
    rounding_chance: percentageToFactor(values.roundingChanceInPercent, 2),
    mintxcount: values.minNumberOfTransactionsPerJar,
    maker_session_idle_timeout_seconds: values.makerSessionIdleTimeoutSeconds,
  }
}

export type SweepResolverContext = {
  addressSummary: AddressSummary
}

export const buildSweepFormValuesDefaultValues = (): SweepFormValues => {
  const minNumberOfCollaborators = Math.min(
    JAM_SWEEP_MAX_MAX_NUMBER_OF_COLLABORATORS,
    Math.max(
      JAM_SWEEP_MIN_MIN_NUMBER_OF_COLLABORATORS,
      JM_NG_DEFAULT_TUMBLER_PARAMS.maker_count_min + pseudoRandomInteger(0, 2),
    ),
  )

  const maxNumberOfCollaborators = Math.min(
    JAM_SWEEP_MAX_MAX_NUMBER_OF_COLLABORATORS,
    Math.max(minNumberOfCollaborators + 3, JM_NG_DEFAULT_TUMBLER_PARAMS.maker_count_max + pseudoRandomInteger(-1, 2)),
  )

  const countingChangeInPercent = Math.max(
    JAM_SWEEP_MIN_ROUNDING_CHANCE_PERCENT,
    Math.min(
      JAM_SWEEP_MAX_ROUNDING_CHANCE_PERCENT,
      factorToPercentage(JM_NG_DEFAULT_TUMBLER_PARAMS.rounding_chance) + pseudoRandomInteger(-5, 5),
    ),
  )

  const minNumberOfTransactionsPerJar = JM_NG_DEFAULT_TUMBLER_PARAMS.mintxcount + pseudoRandomInteger(0, 1)
  return {
    destinations: buildSweepDestinationValues(JAM_SWEEP_DESTINATION_ADDRESSES_DEFAULT_COUNT),
    useInsecureTestingSettings: false,
    includeMakerSessions: JM_NG_DEFAULT_TUMBLER_PARAMS.include_maker_sessions,
    roundingChanceInPercent: countingChangeInPercent,
    makerSessionIdleTimeoutSeconds: JAM_SWEEP_MAKER_SESSION_IDLE_TIMEOUT_SECONDS,
    minNumberOfCollaborators,
    maxNumberOfCollaborators,
    minNumberOfTransactionsPerJar,
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
  {
    minNumberOfDestinations,
    maxNumberOfDestinations,
    addressSummary,
    network,
  }: {
    minNumberOfDestinations: number
    maxNumberOfDestinations: number
    addressSummary: AddressSummary
    network: Network
  },
  t: TFunction<'translation', undefined>,
): yup.ObjectSchema<SweepFormValues> => {
  const invalidDestinationAddressMessage = t('scheduler.feedback_invalid_destination_address')
  const networkMismatchDestinationAddressMessage = t('scheduler.feedback_destination_network_mismatch')
  const invalidNumberOfDestinationsMessage = t('send.feedback_invalid_number_of_destination_addresses', {
    // TODO: i18n
    defaultValue: 'Please provide between {{ min }} and {{ max }} destination addresses.',
    min: minNumberOfDestinations.toLocaleString(),
    max: maxNumberOfDestinations.toLocaleString(),
  })

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
                .test('valid-sweep-destination', invalidDestinationAddressMessage, (value) => isValidAddress(value))
                // Only run once the address itself is valid, so an invalid address surfaces a
                // single, correct error instead of also reporting a network mismatch.
                .test(
                  'sweep-destination-network-mismatch',
                  networkMismatchDestinationAddressMessage,
                  (value) => !isValidAddress(value) || isAddressOnNetwork(value, network),
                ),
            })
            .required(),
        )
        .required(invalidNumberOfDestinationsMessage)
        .min(minNumberOfDestinations, invalidNumberOfDestinationsMessage)
        .max(maxNumberOfDestinations, invalidNumberOfDestinationsMessage)
        .test('unique-destination-addresses', function (value: SweepFormValues['destinations']) {
          const destinations = value ?? []
          return buildDestinationErrorList(destinations, addressSummary, t)
        }),
      useInsecureTestingSettings: yup.boolean().default(false).required(),
      includeMakerSessions: yup.boolean().default(true).required(),
      roundingChanceInPercent: yup
        .number()
        .transform((value) => (isValidNumber(value) ? value : null))
        .min(JAM_SWEEP_MIN_ROUNDING_CHANCE_PERCENT)
        .max(JAM_SWEEP_MAX_ROUNDING_CHANCE_PERCENT)
        .required(),
      minNumberOfCollaborators: yup
        .number()
        .transform((value) => (isValidNumber(value) ? value : null))
        .min(JAM_SWEEP_MIN_MIN_NUMBER_OF_COLLABORATORS)
        .max(JAM_SWEEP_MAX_MIN_NUMBER_OF_COLLABORATORS)
        .required(),
      maxNumberOfCollaborators: yup
        .number()
        .transform((value) => (isValidNumber(value) ? value : null))
        .min(JAM_SWEEP_MIN_MAX_NUMBER_OF_COLLABORATORS)
        .max(JAM_SWEEP_MAX_MAX_NUMBER_OF_COLLABORATORS)
        .required(),
      minNumberOfTransactionsPerJar: yup
        .number()
        .transform((value) => (isValidNumber(value) ? value : null))
        .min(JAM_SWEEP_MIN_TRANSACTIONS_PER_JAR)
        .max(JAM_SWEEP_MAX_TRANSACTIONS_PER_JAR)
        .required(),
      makerSessionIdleTimeoutSeconds: yup
        .number()
        .transform((value) => (isValidNumber(value) ? value : null))
        .min(JAM_SWEEP_MAKER_SESSION_IDLE_MIN_TIMEOUT_SECONDS)
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
