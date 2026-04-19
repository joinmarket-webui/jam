import { describe, expect, it } from 'vitest'
import { Network } from 'bitcoin-address-validation'
import type { TFunction } from 'i18next'
import type { AddressSummary, Jar } from '@/context/JamWalletInfoContext'
import type { SendFormValues } from './types'
import { MAX_NUM_COLLABORATORS, sendFormSchema } from './sendValidationSchema'

const validRegtestAddress = 'bcrt1qrnz0thqslhxu86th069r9j6y7ldkgs2tzgf5wx'
const validMainnetAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'

const t = ((key: string) => key) as unknown as TFunction

const jars: Jar[] = [
  {
    jarIndex: 0,
    name: 'jar-0',
    color: '#808080',
    balanceSummary: {
      calculatedTotalBalanceInSats: Number.MAX_SAFE_INTEGER,
      calculatedAvailableBalanceInSats: Number.MAX_SAFE_INTEGER,
      calculatedFrozenOrLockedBalanceInSats: 0,
    },
    utxos: [],
  },
]

const addressSummary: AddressSummary = {}

const baseValues = (): SendFormValues => ({
  source: { fromJar: 0 },
  destination: { address: validRegtestAddress, fromJar: undefined },
  amount: { isSweep: false, amount: 100_000, sweepAmount: undefined },
  txFee: undefined,
  isCoinJoin: true,
  numCollaborators: 2,
})

describe('sendFormSchema address validation', () => {
  const schema = sendFormSchema(jars, addressSummary, 2, Network.regtest, t)

  it('accepts a valid address for the configured network', async () => {
    await expect(schema.validate(baseValues())).resolves.toBeDefined()
  })

  it('rejects malformed address strings', async () => {
    await expect(
      schema.validate({
        ...baseValues(),
        destination: { address: 'not-an-address', fromJar: undefined },
      }),
    ).rejects.toThrow()
  })

  it('rejects null and undefined address values', async () => {
    await expect(
      schema.validate({
        ...baseValues(),
        destination: { address: null, fromJar: undefined },
      }),
    ).rejects.toThrow()

    await expect(
      schema.validate({
        ...baseValues(),
        destination: { address: undefined, fromJar: undefined },
      }),
    ).rejects.toThrow()
  })

  it('rejects valid addresses from another network', async () => {
    await expect(
      schema.validate({
        ...baseValues(),
        destination: { address: validMainnetAddress, fromJar: undefined },
      }),
    ).rejects.toThrow()
  })
})

describe('sendFormSchema amount validation', () => {
  const schema = sendFormSchema(jars, addressSummary, 2, Network.regtest, t)

  it('accepts a positive integer amount in non-sweep mode', async () => {
    await expect(
      schema.validate({
        ...baseValues(),
        amount: { isSweep: false, amount: 1, sweepAmount: undefined },
      }),
    ).resolves.toBeDefined()
  })

  it('rejects zero and negative amounts in non-sweep mode', async () => {
    await expect(
      schema.validate({
        ...baseValues(),
        amount: { isSweep: false, amount: 0, sweepAmount: undefined },
      }),
    ).rejects.toThrow()

    await expect(
      schema.validate({
        ...baseValues(),
        amount: { isSweep: false, amount: -1, sweepAmount: undefined },
      }),
    ).rejects.toThrow()
  })

  it('rejects NaN and invalid non-numeric strings in non-sweep mode', async () => {
    await expect(
      schema.validate({
        ...baseValues(),
        amount: { isSweep: false, amount: Number.NaN, sweepAmount: undefined },
      }),
    ).rejects.toThrow()

    await expect(
      schema.validate({
        ...baseValues(),
        amount: { isSweep: false, amount: 'abc', sweepAmount: undefined },
      }),
    ).rejects.toThrow()
  })

  it('rejects null and undefined amounts in non-sweep mode', async () => {
    await expect(
      schema.validate({
        ...baseValues(),
        amount: { isSweep: false, amount: null, sweepAmount: undefined },
      }),
    ).rejects.toThrow()

    await expect(
      schema.validate({
        ...baseValues(),
        amount: { isSweep: false, amount: undefined, sweepAmount: undefined },
      }),
    ).rejects.toThrow()
  })

  it('enforces upper bound and rejects extremely large values in non-sweep mode', async () => {
    await expect(
      schema.validate({
        ...baseValues(),
        amount: { isSweep: false, amount: 21_000_000 * 100_000_000, sweepAmount: undefined },
      }),
    ).resolves.toBeDefined()

    await expect(
      schema.validate({
        ...baseValues(),
        amount: { isSweep: false, amount: Number.MAX_SAFE_INTEGER, sweepAmount: undefined },
      }),
    ).rejects.toThrow()
  })

  it('accepts sweep with amount undefined and positive sweepAmount', async () => {
    await expect(
      schema.validate({
        ...baseValues(),
        amount: { isSweep: true, amount: undefined, sweepAmount: 50_000 },
      }),
    ).resolves.toBeDefined()
  })

  it('rejects zero and negative sweepAmount in sweep mode', async () => {
    await expect(
      schema.validate({
        ...baseValues(),
        amount: { isSweep: true, amount: undefined, sweepAmount: 0 },
      }),
    ).rejects.toThrow()

    await expect(
      schema.validate({
        ...baseValues(),
        amount: { isSweep: true, amount: undefined, sweepAmount: -1 },
      }),
    ).rejects.toThrow()
  })

  it('accepts sweep mode even when amount is zero, because amount is ignored in sweep mode', async () => {
    await expect(
      schema.validate({
        ...baseValues(),
        amount: { isSweep: true, amount: 0, sweepAmount: 100_000 },
      }),
    ).resolves.toBeDefined()
  })
})

describe('sendFormSchema collaborator validation', () => {
  const minCollaborators = 2
  const schema = sendFormSchema(jars, addressSummary, minCollaborators, Network.regtest, t)

  it('accepts collaborator counts at min and max boundaries', async () => {
    await expect(
      schema.validate({
        ...baseValues(),
        numCollaborators: minCollaborators,
      }),
    ).resolves.toBeDefined()

    await expect(
      schema.validate({
        ...baseValues(),
        numCollaborators: MAX_NUM_COLLABORATORS,
      }),
    ).resolves.toBeDefined()
  })

  it('rejects values below min and above max', async () => {
    await expect(
      schema.validate({
        ...baseValues(),
        numCollaborators: minCollaborators - 1,
      }),
    ).rejects.toThrow()

    await expect(
      schema.validate({
        ...baseValues(),
        numCollaborators: MAX_NUM_COLLABORATORS + 1,
      }),
    ).rejects.toThrow()
  })

  it('rejects zero, negative, NaN, null, and malformed collaborator values', async () => {
    await expect(
      schema.validate({
        ...baseValues(),
        numCollaborators: 0,
      }),
    ).rejects.toThrow()

    await expect(
      schema.validate({
        ...baseValues(),
        numCollaborators: -1,
      }),
    ).rejects.toThrow()

    await expect(
      schema.validate({
        ...baseValues(),
        numCollaborators: Number.NaN,
      }),
    ).rejects.toThrow()

    await expect(
      schema.validate({
        ...baseValues(),
        numCollaborators: null,
      }),
    ).rejects.toThrow()

    await expect(
      schema.validate({
        ...baseValues(),
        numCollaborators: '3',
      }),
    ).rejects.toThrow()
  })

  it('accepts undefined collaborators by applying schema default', async () => {
    await expect(
      schema.validate({
        ...baseValues(),
        numCollaborators: undefined,
      }),
    ).resolves.toBeDefined()
  })
})
