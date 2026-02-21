import { describe, expect, it } from 'vitest'
import { buildCollaborativeSendRequest } from './collaborativeSend'
import type { SendFormValues } from './types'

const validAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'

const baseValues = (): SendFormValues => ({
  source: { fromJar: 0 },
  destination: { address: validAddress, fromJar: undefined },
  amount: { isSweep: false, amount: 100_000, sweepAmount: undefined },
  isCoinJoin: true,
  numCollaborators: 4,
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

  it('passes txfee when present', () => {
    const request = buildCollaborativeSendRequest({
      ...baseValues(),
      txFee: { value: 3, unit: 'blocks' },
    })

    expect(request.txfee).toBe(3)
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
})
