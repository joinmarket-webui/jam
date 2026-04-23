import { getAddressInfo, validate as isValidBitcoinAddress, Network } from 'bitcoin-address-validation'
import type { TFunction } from 'i18next'
import * as yup from 'yup'
import { txFeeUnit } from '@/constants/jm'
import type { AddressSummary, Jar } from '@/context/JamWalletInfoContext'
import type { FeeConfigValues } from '@/lib/feeConfig'
import { pseudoRandomInteger } from '@/lib/utils'
import { toTxFeeFormDefaultValues, createTxFeeFormSchema } from './TxFeeForm.schema'
import type { SendFormValues } from './types'

export const initialNumberOfCollaborators = (minValue: number): number => {
  if (minValue > 8) {
    return minValue + pseudoRandomInteger(0, 2)
  }

  return pseudoRandomInteger(8, 10)
}

const MAX_NUM_COLLABORATORS = 99

const FORM_INPUT_DEFAULT_VALUES: Partial<SendFormValues> = {
  source: undefined,
  destination: undefined,
  amount: undefined,
  isCoinJoin: true,
  numCollaborators: undefined,
  txFee: {
    txFeeUnit: txFeeUnit.BLOCKS,
    txFeeInBlocks: undefined,
    txFeeInSatsPerVbyte: undefined,
  },
}

export const toSendFormDefaultValues = ({
  feeConfigValues,
  minNumberOfCollaborators,
}: {
  feeConfigValues: FeeConfigValues
  minNumberOfCollaborators: number
}): Partial<SendFormValues> => {
  return {
    ...FORM_INPUT_DEFAULT_VALUES,
    numCollaborators: initialNumberOfCollaborators(minNumberOfCollaborators),
    ...toTxFeeFormDefaultValues(feeConfigValues),
  }
}

export const createSendFormSchema = (
  jars: Jar[],
  addressSummary: AddressSummary,
  minNumberOfCollaborators: number,
  network: Network,
  t: TFunction,
) => {
  return (
    yup
      .object({
        source: yup
          .object({
            fromJar: yup
              .number()
              .integer(t('send.feedback_invalid_source_jar'))
              .required(t('send.feedback_invalid_source_jar'))
              .test(
                'valid-source-jar-index-test',
                t('send.feedback_invalid_source_jar'),
                (value) =>
                  (jars.find((it) => it.jarIndex === value)?.balanceSummary.calculatedAvailableBalanceInSats || 0) > 0,
              ),
          })
          .required(),
        destination: yup
          .object({
            fromJar: yup.number().optional(),
            address: yup
              .string()
              .required(t('send.feedback_invalid_destination_address'))
              .test('valid-address-test', t('send.feedback_invalid_destination_address'), (value) => {
                return isValidBitcoinAddress(value)
              })
              .test('network-mismatch-test', t('send.feedback_destination_network_mismatch'), (value) => {
                try {
                  return getAddressInfo(value).network === network
                } catch (_ignoredOnPurpose) {
                  return false
                }
              })
              .test('reused-address-test', t('send.feedback_reused_address'), (value) => {
                return addressSummary[value]?.used !== true
              }),
          })
          .required(),
        amount: yup
          .object()
          .shape({
            isSweep: yup.boolean().default(false).required(),
            sweepAmount: yup.number().when('isSweep', {
              is: (val: boolean) => val === true,
              then: (schema) =>
                schema
                  .integer()
                  .min(1)
                  .max(21_000_000 * 100_000_000)
                  .required(),
              otherwise: (schema) =>
                schema
                  .transform(() => null)
                  .nullable()
                  .optional(),
            }),
            amount: yup.number().when('isSweep', {
              is: (val: boolean) => val === true,
              then: (schema) =>
                schema
                  .transform(() => null)
                  .nullable()
                  .optional(),
              otherwise: (schema) =>
                schema
                  .integer(t('send.feedback_invalid_amount'))
                  .transform((value) => (Number.isSafeInteger(value) ? Number(value) : null))
                  .nonNullable(t('send.feedback_invalid_amount'))
                  .min(1, t('send.feedback_invalid_amount'))
                  .max(21_000_000 * 100_000_000, t('send.feedback_invalid_amount'))
                  .required(t('send.feedback_invalid_amount')),
            }),
          })
          .required(),
        isCoinJoin: yup.boolean().default(true).required(),
        numCollaborators: yup.number().when('isCoinJoin', {
          is: (val: boolean) => val === true,
          then: (schema) =>
            schema
              .integer()
              .default(initialNumberOfCollaborators(minNumberOfCollaborators))
              .min(
                minNumberOfCollaborators,
                t('send.error_invalid_num_collaborators', {
                  minNumCollaborators: minNumberOfCollaborators,
                  maxNumCollaborators: MAX_NUM_COLLABORATORS,
                }),
              )
              .max(
                MAX_NUM_COLLABORATORS,
                t('send.error_invalid_num_collaborators', {
                  minNumCollaborators: minNumberOfCollaborators,
                  maxNumCollaborators: MAX_NUM_COLLABORATORS,
                }),
              )
              .required(
                t('send.error_invalid_num_collaborators', {
                  minNumCollaborators: minNumberOfCollaborators,
                  maxNumCollaborators: MAX_NUM_COLLABORATORS,
                }),
              ),
          otherwise: (schema) =>
            schema
              .transform(() => null)
              .nullable()
              .optional(),
        }),
      })
      // eslint-disable-next-line unicorn/prefer-spread -- false positive
      .concat(createTxFeeFormSchema(t))
      .required()
      .test('address-not-from-source-jar-test', function (root) {
        // Note: `fromJar` might still be `undefined` at this point
        if (root.source.fromJar === undefined) return true
        const addressIsFromSourceJar = addressSummary[root.destination.address]?.jarIndex === root.source.fromJar
        if (!addressIsFromSourceJar) return true

        const errorMessage = t('send.feedback_address_from_source_jar', {
          /* TODO: i18n: remove defaultValue and add key to language files */
          defaultValue: 'This address is from the source jar. To preserve your privacy please choose a different one.',
        })

        return new yup.ValidationError(errorMessage, root.destination.address, 'destination.address', undefined, true)
      })
      .test('amount-exceeds-balance-test', function (root) {
        if (root.amount.isSweep) return true
        if (root.amount.amount === undefined || root.amount.amount === null) return true

        const sourceJar = jars.find((it) => it.jarIndex === root.source.fromJar)
        if (!sourceJar) return true

        const available = sourceJar.balanceSummary.calculatedAvailableBalanceInSats
        if (root.amount.amount <= available) return true

        return new yup.ValidationError(
          t('send.feedback_amount_exceeds_balance'),
          root.amount.amount,
          'amount.amount',
          undefined,
          true,
        )
      })
  )
}
