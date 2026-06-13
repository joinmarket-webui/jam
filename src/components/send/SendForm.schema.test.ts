import { Network } from 'bitcoin-address-validation'
import type { TFunction } from 'i18next'
import { describe, expect, it, vi } from 'vitest'
import type { AddressSummary, Jar } from '@/context/JamWalletInfoContext'
import { TX_FEE_UNITS, toJamFeeConfigValues } from '@/lib/feeConfig'
import {
  createSendFormSchema,
  initialNumberOfCollaborators,
  MIN_SEND_AMOUNT,
  toSendFormDefaultValues,
} from './SendForm.schema'

const t = vi.fn((key: string) => key) as unknown as TFunction<'translation', undefined>

const validMainnetAddress = '1BoatSLRHtKNngkdXEeobR76b53LETtpyT'
const sourceJarAddress = '1CounterpartyXXXXXXXXXXXXXXXUWLpVr'

const jars = [
  {
    jarIndex: 0,
    balanceSummary: {
      calculatedAvailableBalanceInSats: 10_000,
    },
  },
  {
    jarIndex: 1,
    balanceSummary: {
      calculatedAvailableBalanceInSats: 0,
    },
  },
] as Jar[]

const addressSummary = {
  [validMainnetAddress]: {
    address: validMainnetAddress,
    jarIndex: 2,
    used: false,
  },
  [sourceJarAddress]: {
    address: sourceJarAddress,
    jarIndex: 0,
    used: false,
  },
} as AddressSummary

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
  const schema = createSendFormSchema(jars, addressSummary, 3, Network.mainnet, t)

  it('accepts a valid coinjoin send', async () => {
    await expect(schema.validate(validFormValues)).resolves.toMatchObject(validFormValues)
  })

  it('rejects unavailable source jars', async () => {
    await expect(
      schema.validate({
        ...validFormValues,
        source: { fromJar: 1 },
        amount: { isSweep: true, sweepAmount: MIN_SEND_AMOUNT },
      }),
    ).rejects.toThrow('send.feedback_invalid_source_jar')
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
  })

  it('rejects invalid amounts and clears collaborators for direct sends', async () => {
    await expect(
      schema.validate({
        ...validFormValues,
        amount: { isSweep: false, amount: 11_000 },
      }),
    ).rejects.toThrow('send.feedback_amount_exceeds_balance')

    await expect(
      schema.validate({
        ...validFormValues,
        isCoinJoin: false,
        numCollaborators: 4,
      }),
    ).resolves.toMatchObject({
      isCoinJoin: false,
      numCollaborators: null,
    })
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
