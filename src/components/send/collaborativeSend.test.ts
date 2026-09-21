import { describe, expect, it } from 'vitest'
import { TX_FEE_UNITS } from '@/lib/feeConfig'
import { buildCollaborativeSendRequest, buildNonCollaborativeSendRequest } from './collaborativeSend'
import type { SendFormValues } from './types'

const validAddress = 'bcrt1qrnz0thqslhxu86th069r9j6y7ldkgs2tzgf5wx' // regtest eater address

const baseValues = (): SendFormValues => ({
  source: { fromJar: 0 },
  destination: { address: validAddress, fromJar: undefined },
  amount: { isSweep: false, amount: 100_000, sweepAmount: undefined, sweepUtxos: undefined },
  isCoinJoin: true,
  numCollaborators: 4,
  txFee: {
    txFeeUnit: 'blocks',
  },
})

describe('buildCollaborativeSendRequest', () => {
  it('builds request for standard collaborative send', () => {
    const request = buildCollaborativeSendRequest(baseValues())

    expect(request).toEqual({
      mixdepth: 0,
      amount_sats: 100_000,
      counterparties: 4,
      destination: validAddress,
    })
  })

  it('maps sweep to amount_sats=0 and passes the captured utxos as input_utxos', () => {
    const request = buildCollaborativeSendRequest({
      ...baseValues(),
      amount: {
        isSweep: true,
        amount: undefined,
        sweepAmount: 500_000,
        sweepUtxos: ['aaaa'.repeat(16) + ':0', 'bbbb'.repeat(16) + ':1'],
      },
    })

    expect(request.amount_sats).toBe(0)
    expect(request.input_utxos).toEqual(['aaaa'.repeat(16) + ':0', 'bbbb'.repeat(16) + ':1'])
  })

  it('throws when sweeping without any captured utxos', () => {
    expect(() =>
      buildCollaborativeSendRequest({
        ...baseValues(),
        amount: {
          isSweep: true,
          amount: undefined,
          sweepAmount: 500_000,
          sweepUtxos: [],
        },
      }),
    ).toThrow('Missing utxos to sweep.')
  })

  it('passes txfee when txFeeInBlocks is present', () => {
    const request = buildCollaborativeSendRequest({
      ...baseValues(),
      txFee: {
        txFeeUnit: TX_FEE_UNITS.BLOCKS,
        txFeeInBlocks: 3,
      },
    })

    expect(request.txfee).toBe(3)
  })

  it('passes txfee when txFeeInSatsPerVbyte is present', () => {
    const request = buildCollaborativeSendRequest({
      ...baseValues(),
      txFee: {
        txFeeUnit: TX_FEE_UNITS.SATS_PER_VBYTE,
        txFeeInSatsPerVbyte: 1 + 1 / 3,
      },
    })

    expect(request.txfee).toBe(1_334)
  })

  it('throws for invalid destination address', () => {
    expect(() =>
      buildCollaborativeSendRequest({
        ...baseValues(),
        destination: { address: 'invalid', fromJar: undefined },
      }),
    ).toThrow('Invalid bitcoin address.')
  })

  it('throws for invalid number of collaborators', () => {
    expect(() =>
      buildCollaborativeSendRequest({
        ...baseValues(),
        numCollaborators: 0,
      }),
    ).toThrow('Invalid number of collaborators.')
  })

  it('throws for invalid source jars', () => {
    expect(() =>
      buildCollaborativeSendRequest({
        ...baseValues(),
        source: { fromJar: undefined },
      } as unknown as SendFormValues),
    ).toThrow('Invalid source jar.')

    expect(() =>
      buildCollaborativeSendRequest({
        ...baseValues(),
        source: { fromJar: -1 },
      }),
    ).toThrow('Invalid source jar.')
  })

  it('throws for invalid send amounts', () => {
    expect(() =>
      buildCollaborativeSendRequest({
        ...baseValues(),
        amount: { isSweep: false, amount: 0, sweepAmount: undefined, sweepUtxos: undefined },
      }),
    ).toThrow('Invalid amount.')

    expect(() =>
      buildCollaborativeSendRequest({
        ...baseValues(),
        amount: { isSweep: false, amount: 1.5, sweepAmount: undefined, sweepUtxos: undefined },
      }),
    ).toThrow('Invalid amount.')
  })

  it('throws for invalid transaction fees', () => {
    expect(() =>
      buildCollaborativeSendRequest({
        ...baseValues(),
        txFee: {
          txFeeUnit: TX_FEE_UNITS.SATS_PER_VBYTE,
          txFeeInSatsPerVbyte: 0,
        },
      }),
    ).toThrow('Invalid transaction fee.')
  })
})

describe('buildNonCollaborativeSendRequest', () => {
  it('builds request for standard direct send', () => {
    const request = buildNonCollaborativeSendRequest({
      ...baseValues(),
      isCoinJoin: false,
    })

    expect(request).toEqual({
      amount_sats: 100_000,
      destination: validAddress,
      mixdepth: 0,
      txfee: undefined,
    })
  })

  it('maps sweep direct sends to amount_sats=0 and passes the captured utxos as input_utxos', () => {
    const request = buildNonCollaborativeSendRequest({
      ...baseValues(),
      isCoinJoin: false,
      amount: {
        isSweep: true,
        amount: undefined,
        sweepAmount: 500_000,
        sweepUtxos: ['aaaa'.repeat(16) + ':0'],
      },
    })

    expect(request.amount_sats).toBe(0)
    expect(request.input_utxos).toEqual(['aaaa'.repeat(16) + ':0'])
  })

  it('throws for direct-send sweep without any captured utxos', () => {
    expect(() =>
      buildNonCollaborativeSendRequest({
        ...baseValues(),
        isCoinJoin: false,
        amount: {
          isSweep: true,
          amount: undefined,
          sweepAmount: 500_000,
          sweepUtxos: [],
        },
      }),
    ).toThrow('Missing utxos to sweep.')
  })

  it('passes direct-send txfee values', () => {
    expect(
      buildNonCollaborativeSendRequest({
        ...baseValues(),
        isCoinJoin: false,
        txFee: {
          txFeeUnit: TX_FEE_UNITS.BLOCKS,
          txFeeInBlocks: 2,
        },
      }).txfee,
    ).toBe(2)

    expect(
      buildNonCollaborativeSendRequest({
        ...baseValues(),
        isCoinJoin: false,
        txFee: {
          txFeeUnit: TX_FEE_UNITS.SATS_PER_VBYTE,
          txFeeInSatsPerVbyte: 1.25,
        },
      }).txfee,
    ).toBe(1_250)
  })

  it('throws for invalid direct-send input', () => {
    expect(() =>
      buildNonCollaborativeSendRequest({
        ...baseValues(),
        isCoinJoin: false,
        amount: undefined,
      } as unknown as SendFormValues),
    ).toThrow('Invalid amount given.')

    expect(() =>
      buildNonCollaborativeSendRequest({
        ...baseValues(),
        isCoinJoin: false,
        destination: { address: 'invalid', fromJar: undefined },
      }),
    ).toThrow('Invalid bitcoin address given.')

    expect(() =>
      buildNonCollaborativeSendRequest({
        ...baseValues(),
        isCoinJoin: false,
        source: { fromJar: undefined },
      } as unknown as SendFormValues),
    ).toThrow('Invalid source jar given.')

    expect(() =>
      buildNonCollaborativeSendRequest({
        ...baseValues(),
        isCoinJoin: false,
        amount: {
          isSweep: true,
          amount: 100_000,
          sweepAmount: 500_000,
        },
      } as unknown as SendFormValues),
    ).toThrow('Invalid amount given for sweep.')
  })
})
