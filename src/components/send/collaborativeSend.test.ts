import { describe, expect, it } from 'vitest'
import { TX_FEE_UNITS } from '@/lib/feeConfig'
import { buildCollaborativeSendRequest, buildNonCollaborativeSendRequest } from './collaborativeSend'
import type { SendFormValues } from './types'

const validAddress = 'bcrt1qrnz0thqslhxu86th069r9j6y7ldkgs2tzgf5wx' // regtest eater address

const baseValues = (): SendFormValues => ({
  source: { fromJar: 0 },
  destination: { address: validAddress, fromJar: undefined },
  amount: { isSweep: false, amount: 100_000, sweepAmount: undefined },
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

  it('maps sweep to amount_sats=0', () => {
    const request = buildCollaborativeSendRequest({
      ...baseValues(),
      amount: {
        isSweep: true,
        amount: undefined,
        sweepAmount: 500_000,
      },
    })

    expect(request.amount_sats).toBe(0)
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
    ).toThrowError('Invalid bitcoin address.')
  })

  it('throws for invalid number of collaborators', () => {
    expect(() =>
      buildCollaborativeSendRequest({
        ...baseValues(),
        numCollaborators: 0,
      }),
    ).toThrowError('Invalid number of collaborators.')
  })

  it('throws for invalid source jars', () => {
    expect(() =>
      buildCollaborativeSendRequest({
        ...baseValues(),
        source: { fromJar: undefined },
      } as unknown as SendFormValues),
    ).toThrowError('Invalid source jar.')

    expect(() =>
      buildCollaborativeSendRequest({
        ...baseValues(),
        source: { fromJar: -1 },
      }),
    ).toThrowError('Invalid source jar.')
  })

  it('throws for invalid send amounts', () => {
    expect(() =>
      buildCollaborativeSendRequest({
        ...baseValues(),
        amount: { isSweep: false, amount: 0, sweepAmount: undefined },
      }),
    ).toThrowError('Invalid amount.')

    expect(() =>
      buildCollaborativeSendRequest({
        ...baseValues(),
        amount: { isSweep: false, amount: 1.5, sweepAmount: undefined },
      }),
    ).toThrowError('Invalid amount.')
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
    ).toThrowError('Invalid transaction fee.')
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

  it('maps sweep direct sends to amount_sats=0', () => {
    const request = buildNonCollaborativeSendRequest({
      ...baseValues(),
      isCoinJoin: false,
      amount: {
        isSweep: true,
        amount: undefined,
        sweepAmount: 500_000,
      },
    })

    expect(request.amount_sats).toBe(0)
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
    ).toThrowError('Invalid amount given.')

    expect(() =>
      buildNonCollaborativeSendRequest({
        ...baseValues(),
        isCoinJoin: false,
        destination: { address: 'invalid', fromJar: undefined },
      }),
    ).toThrowError('Invalid bitcoin address given.')

    expect(() =>
      buildNonCollaborativeSendRequest({
        ...baseValues(),
        isCoinJoin: false,
        source: { fromJar: undefined },
      } as unknown as SendFormValues),
    ).toThrowError('Invalid source jar given.')

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
    ).toThrowError('Invalid amount given for sweep.')
  })
})
