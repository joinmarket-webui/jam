import { Network } from 'bitcoin-address-validation'
import type { TFunction } from 'i18next'
import { describe, expect, it, vi } from 'vitest'
import { JAM_SWEEP_MAX_MAX_NUMBER_OF_COLLABORATORS, JAM_SWEEP_MIN_MIN_NUMBER_OF_COLLABORATORS } from '@/constants/jam'
import type { AddressSummary, Jar } from '@/context/JamWalletInfoContext'
import type { Utxo } from '@/hooks/useQueryUtxos'
import { toBalanceSummary } from '@/lib/balanceSummary'
import { TX_FEE_UNITS, toJamFeeConfigValues } from '@/lib/feeConfig'
import {
  createSendFormSchema,
  initialNumberOfCollaborators,
  MIN_SEND_AMOUNT,
  toSendFormDefaultValues,
} from './SendForm.schema'

const t = vi.fn((key: string, options?: Record<string, unknown>) =>
  options ? `${key}:${JSON.stringify(options)}` : key,
) as unknown as TFunction<'translation', undefined>

const validMainnetAddress = '1BitcoinEaterAddressDontSend8MUo1T'
const validRegtestAddress = 'bcrt1q6rz28mcfaxtmd6v789l9rrlrusdprr9pz3cppk'
const sourceJarAddress = '1BitcoinEaterAddressDontSendDHyNcX'

const utxo = (overrides: Partial<Utxo>): Utxo => ({
  utxo: 'tx:0',
  address: 'bcrt1qsource',
  path: "m/84'/1'/0'/0/0",
  label: '',
  value: 100_000,
  tries: 0,
  tries_remaining: 3,
  external: false,
  mixdepth: 0,
  confirmations: 6,
  frozen: false,
  locktime: undefined,
  ...overrides,
})

const fbUtxo = (overrides: Partial<Utxo>) =>
  utxo({
    locktime: '2999-01-01 00:00:00',
    path: "m/84'/1'/0'/2/0:32503680000",
    ...overrides,
  })

const jar = (jarIndex: number, utxos: Utxo[]): Jar =>
  ({
    jarIndex,
    name: `Jar ${jarIndex}`,
    color: '#808080',
    balanceSummary: toBalanceSummary(utxos),
    utxos,
  }) as unknown as Jar

const jars = [
  jar(0, [utxo({ value: 10_000 })]),
  jar(1, []),
  jar(2, [utxo({ value: 21_000, frozen: true })]),
  jar(3, [
    utxo({ value: 42_000 }),
    fbUtxo({ utxo: 'non-frozen-fb:0', value: 21_000, frozen: false }),
    fbUtxo({ utxo: 'non-frozen-fb:1', value: 29_000, frozen: false }),
  ]),
] as Jar[]

const addressSummary = {
  [sourceJarAddress]: {
    address: sourceJarAddress,
    jarIndex: 0,
    used: false,
  },
} as unknown as AddressSummary

const validFormValues = {
  source: { fromJar: 0 },
  destination: { address: validMainnetAddress },
  amount: { isSweep: false, amount: MIN_SEND_AMOUNT },
  isCoinJoin: true,
  numCollaborators: 4,
  txFee: {
    txFeeUnit: TX_FEE_UNITS.BLOCKS,
    txFeeInBlocks: 6,
  },
}

describe('initialNumberOfCollaborators', () => {
  it('keeps the default collaborator count within supported bounds', () => {
    expect(initialNumberOfCollaborators(2)).toBeGreaterThanOrEqual(8)
    expect(initialNumberOfCollaborators(2)).toBeLessThanOrEqual(10)
    expect(initialNumberOfCollaborators(9)).toBeGreaterThanOrEqual(9)
  })
})

describe('toSendFormDefaultValues', () => {
  it('combines tx fee defaults with collaborator defaults', () => {
    const defaults = toSendFormDefaultValues({
      feeConfigValues: toJamFeeConfigValues({ tx_fees: '2500' }),
      minNumberOfCollaborators: 3,
    })

    expect(defaults.txFee).toEqual({
      txFeeUnit: TX_FEE_UNITS.SATS_PER_VBYTE,
      txFeeInBlocks: undefined,
      txFeeInSatsPerVbyte: 2.5,
    })
    expect(defaults.isCoinJoin).toBe(true)
    expect(defaults.numCollaborators).toBeGreaterThanOrEqual(8)
  })
})

describe('createSendFormSchema', () => {
  const schema = createSendFormSchema(
    jars,
    addressSummary,
    JAM_SWEEP_MIN_MIN_NUMBER_OF_COLLABORATORS,
    Network.mainnet,
    t,
  )

  it('accepts a valid coinjoin send', async () => {
    await expect(schema.validate(validFormValues)).resolves.toMatchObject(validFormValues)
  })

  it('rejects source jars with zero balance', async () => {
    await expect(
      schema.validate({
        ...validFormValues,
        source: { fromJar: jars[1].jarIndex },
        amount: { isSweep: true, sweepAmount: MIN_SEND_AMOUNT },
      }),
    ).rejects.toThrow('send.feedback_invalid_source_jar')
  })

  it('rejects source jars without unfrozen balance', async () => {
    await expect(
      schema.validate({
        ...validFormValues,
        source: { fromJar: jars[2].jarIndex },
        amount: { isSweep: true, sweepAmount: MIN_SEND_AMOUNT },
      }),
    ).rejects.toThrow('send.feedback_invalid_source_jar_must_unfreeze_utxos')
  })

  it('rejects source jars without unfrozen fidelity bonds', async () => {
    await expect(
      schema.validate({
        ...validFormValues,
        source: { fromJar: jars[3].jarIndex },
        amount: { isSweep: true, sweepAmount: MIN_SEND_AMOUNT },
      }),
    ).rejects.toThrow('send.feedback_invalid_source_jar_must_freeze_fidelity_bonds:{"count":2}')
  })

  it('rejects reused or source-jar destination addresses', async () => {
    await expect(
      schema.validate({
        ...validFormValues,
        destination: { address: validMainnetAddress },
      }),
    ).resolves.toBeDefined()

    await expect(
      schema.validate({
        ...validFormValues,
        destination: { address: validMainnetAddress },
      }),
    ).resolves.toMatchObject({ destination: { address: validMainnetAddress } })

    await expect(
      createSendFormSchema(
        jars,
        {
          ...addressSummary,
          [validMainnetAddress]: { ...addressSummary[validMainnetAddress], used: true },
        },
        3,
        Network.mainnet,
        t,
      ).validate(validFormValues),
    ).rejects.toThrow('send.feedback_reused_address')

    await expect(
      schema.validate({
        ...validFormValues,
        destination: { address: sourceJarAddress },
      }),
    ).rejects.toThrow('send.feedback_address_from_source_jar')

    await expect(
      schema.validate({
        ...validFormValues,
        destination: { address: validRegtestAddress },
      }),
    ).rejects.toThrow('send.feedback_destination_network_mismatch')

    await expect(
      schema.validate({
        ...validFormValues,
        destination: { address: 'invalid' },
      }),
    ).rejects.toThrow('send.feedback_invalid_destination_address')
  })

  it('rejects invalid amounts and clears collaborators for direct sends', async () => {
    await expect(
      schema.validate({
        ...validFormValues,
        amount: {
          isSweep: false,
          amount: jars[validFormValues.source.fromJar].balanceSummary.calculatedTotalBalanceInSats + 1,
        },
      }),
    ).rejects.toThrow('send.feedback_amount_exceeds_balance')

    await expect(
      schema.validate({
        ...validFormValues,
        isCoinJoin: false,
        numCollaborators: 10,
      }),
    ).resolves.toMatchObject({
      isCoinJoin: false,
      numCollaborators: null,
    })
  })

  it('rejects invalid number of collaborators', async () => {
    await expect(
      schema.validate({
        ...validFormValues,
        numCollaborators: JAM_SWEEP_MIN_MIN_NUMBER_OF_COLLABORATORS - 1,
      }),
    ).rejects.toThrow('send.error_invalid_num_collaborators:{"minNumCollaborators":4,"maxNumCollaborators":20}')

    await expect(
      schema.validate({
        ...validFormValues,
        numCollaborators: JAM_SWEEP_MAX_MAX_NUMBER_OF_COLLABORATORS + 1,
      }),
    ).rejects.toThrow('send.error_invalid_num_collaborators:{"minNumCollaborators":4,"maxNumCollaborators":20}')

    await expect(
      schema.validate({
        ...validFormValues,
        numCollaborators: null,
      }),
    ).rejects.toThrow('send.error_invalid_num_collaborators:{"minNumCollaborators":4,"maxNumCollaborators":20}')
  })

  it('supports sweep sends with a sweep amount', async () => {
    await expect(
      schema.validate({
        ...validFormValues,
        amount: { isSweep: true, sweepAmount: 9_000, amount: 500 },
      }),
    ).resolves.toMatchObject({
      amount: { isSweep: true, sweepAmount: 9_000, amount: null },
    })
  })
})
