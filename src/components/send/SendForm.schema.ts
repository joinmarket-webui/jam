import { Network } from 'bitcoin-address-validation'
import type { TFunction } from 'i18next'
import * as yup from 'yup'
import { MAX_NUM_COLLABORATORS, TOTAL_COIN_SUPPLY } from '@/constants/jam'
import type { AddressSummary, Jar } from '@/context/JamWalletInfoContext'
import { TX_FEE_UNITS } from '@/lib/feeConfig'
import type { JamFeeConfigValues } from '@/lib/feeConfig'
import { destinationAddressField, sourceJarField } from '@/lib/formValidation'
import { isValidInteger, pseudoRandomInteger } from '@/lib/utils'
import type { AmountSats } from '@/types/global'
import { toTxFeeFormDefaultValues, createTxFeeFormSchema } from './TxFeeForm.schema'
import type { SendFormValues } from './types'

export const initialNumberOfCollaborators = (minValue: number): number => {
  const baseValue = minValue > 8 ? minValue + pseudoRandomInteger(0, 2) : pseudoRandomInteger(8, 10)

  return Math.min(baseValue, MAX_NUM_COLLABORATORS)
}

// min amount joinmarket is able to send (without erroring, last check with v0.9.11 on 2026-04-26)
export const MIN_SEND_AMOUNT: AmountSats = 292
export const MAX_SEND_AMOUNT: AmountSats = TOTAL_COIN_SUPPLY

const FORM_INPUT_DEFAULT_VALUES: Partial<SendFormValues> = {
  source: undefined,
  destination: undefined,
  amount: undefined,
  isCoinJoin: true,
  numCollaborators: undefined,
  txFee: {
    txFeeUnit: TX_FEE_UNITS.BLOCKS,
    txFeeInBlocks: undefined,
    txFeeInSatsPerVbyte: undefined,
  },
}

export const toSendFormDefaultValues = ({
  feeConfigValues,
  minNumberOfCollaborators,
}: {
  feeConfigValues: JamFeeConfigValues
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
  const invalidNumberOfCollaboratorsMessage = t('send.error_invalid_num_collaborators', {
    minNumCollaborators: minNumberOfCollaborators,
    maxNumCollaborators: MAX_NUM_COLLABORATORS,
  })
  return (
    yup
      .object({
        source: yup
          .object({
            fromJar: sourceJarField(t('send.feedback_invalid_source_jar'), (jarIndex) =>
              jars.some((it) => it.jarIndex === jarIndex),
            )
              .test(
                'valid-source-jar-must-unfreeze-utxos-test',
                t('send.feedback_invalid_source_jar_must_unfreeze_utxos'),
                (jarIndex) => {
                  const jar = jars.find((it) => it.jarIndex === jarIndex)
                  if (!jar) return true
                  if (jar.balanceSummary.calculatedAvailableBalanceInSats > 0) return true
                  return jar.balanceSummary.calculatedAvailableFrozenBalanceInSats <= 0
                },
              )
              .test(
                'valid-source-jar-has-funds-test',
                t('send.feedback_invalid_source_jar_no_available_utxos'),
                (jarIndex) => {
                  const jar = jars.find((it) => it.jarIndex === jarIndex)
                  if (!jar) return true
                  return jar.balanceSummary.calculatedAvailableBalanceInSats > 0
                },
              ),
          })
          .required(),
        destination: yup
          .object({
            fromJar: yup.number().optional(),
            address: destinationAddressField({
              network,
              addressSummary,
              messages: {
                invalid: t('send.feedback_invalid_destination_address'),
                networkMismatch: t('send.feedback_destination_network_mismatch'),
                reused: t('send.feedback_reused_address'),
              },
            }),
          })
          .required(),
        amount: yup
          .object()
          .shape({
            isSweep: yup.boolean().default(false).required(),
            sweepAmount: yup.number().when('isSweep', {
              is: (val: boolean) => val === true,
              then: (schema) => schema.integer().min(1).max(MAX_SEND_AMOUNT).required(),
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
                  .transform((value) => (isValidInteger(value) ? value : null))
                  .nonNullable(t('send.feedback_invalid_amount'))
                  .min(MIN_SEND_AMOUNT, t('send.feedback_invalid_amount'))
                  .max(MAX_SEND_AMOUNT, t('send.feedback_invalid_amount'))
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
              .transform((value) => (isValidInteger(value) ? value : null))
              .min(minNumberOfCollaborators, invalidNumberOfCollaboratorsMessage)
              .max(MAX_NUM_COLLABORATORS, invalidNumberOfCollaboratorsMessage)
              .required(invalidNumberOfCollaboratorsMessage),
          otherwise: (schema) =>
            schema
              .transform(() => null)
              .nullable()
              .optional(),
        }),
      })
      // eslint-disable-next-line unicorn/prefer-spread -- false positive
      .concat(createTxFeeFormSchema({ t }))
      .required()
      .test('address-not-from-source-jar-test', function (root) {
        // Note: `fromJar` might still be `undefined` at this point
        if (root.source.fromJar === undefined) return true
        const addressIsFromSourceJar = addressSummary[root.destination.address]?.jarIndex === root.source.fromJar
        if (!addressIsFromSourceJar) return true

        const errorMessage = t('send.feedback_address_from_source_jar')

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
