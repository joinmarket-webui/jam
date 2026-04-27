import { describe, expect, it } from 'vitest'
import { buildCollaborativeSendRequest } from './collaborativeSend'
import type { SendFormValues } from './types'

const validAddress = 'bcrt1qrnz0thqslhxu86th069r9j6y7ldkgs2tzgf5wx'

const baseValues = (): SendFormValues => ({
    source: { fromJar: 0 },
    destination: { address: validAddress, fromJar: undefined },
    amount: { isSweep: false, amount: 100_000, sweepAmount: undefined },
    isCoinJoin: true,
    numCollaborators: 4,
})

describe('buildCollaborativeSendRequest address and amount validation', () => {
    it('accepts valid address and positive amount', () => {
        expect(buildCollaborativeSendRequest(baseValues())).toMatchObject({
            destination: validAddress,
            amount_sats: 100_000,
        })
    })

    it('rejects malformed, null, and undefined addresses', () => {
        expect(() =>
            buildCollaborativeSendRequest(
                {
                    ...baseValues(),
                    destination: { address: 'invalid-address', fromJar: undefined },
                } as unknown as SendFormValues,
            ),
        ).toThrowError('Invalid bitcoin address.')

        expect(() =>
            buildCollaborativeSendRequest(
                {
                    ...baseValues(),
                    destination: { address: null, fromJar: undefined },
                } as unknown as SendFormValues,
            ),
        ).toThrowError('Invalid bitcoin address.')

        expect(() =>
            buildCollaborativeSendRequest(
                {
                    ...baseValues(),
                    destination: { address: undefined, fromJar: undefined },
                } as unknown as SendFormValues,
            ),
        ).toThrowError('Invalid bitcoin address.')
    })

    it('rejects zero, negative, NaN, invalid-string, and null amounts in non-sweep mode', () => {
        expect(() =>
            buildCollaborativeSendRequest({
                ...baseValues(),
                amount: { isSweep: false, amount: 0, sweepAmount: undefined },
            }),
        ).toThrowError('Invalid amount.')

        expect(() =>
            buildCollaborativeSendRequest({
                ...baseValues(),
                amount: { isSweep: false, amount: -100, sweepAmount: undefined },
            }),
        ).toThrowError('Invalid amount.')

        expect(() =>
            buildCollaborativeSendRequest({
                ...baseValues(),
                amount: { isSweep: false, amount: Number.NaN, sweepAmount: undefined },
            }),
        ).toThrowError('Invalid amount.')

        expect(() =>
            buildCollaborativeSendRequest(
                {
                    ...baseValues(),
                    amount: { isSweep: false, amount: '1000', sweepAmount: undefined },
                } as unknown as SendFormValues,
            ),
        ).toThrowError('Invalid amount.')

        expect(() =>
            buildCollaborativeSendRequest(
                {
                    ...baseValues(),
                    amount: { isSweep: false, amount: null, sweepAmount: undefined },
                } as unknown as SendFormValues,
            ),
        ).toThrowError('Invalid amount.')
    })

    it('treats sweep as amount_sats=0 regardless of regular amount field', () => {
        expect(
            buildCollaborativeSendRequest({
                ...baseValues(),
                amount: { isSweep: true, amount: undefined, sweepAmount: 500_000 },
            }).amount_sats,
        ).toBe(0)

        expect(
            buildCollaborativeSendRequest(
                {
                    ...baseValues(),
                    amount: { isSweep: true, amount: 0, sweepAmount: 500_000 },
                } as unknown as SendFormValues,
            ).amount_sats,
        ).toBe(0)
    })

    it('accepts extremely large safe integer amounts', () => {
        const request = buildCollaborativeSendRequest({
            ...baseValues(),
            amount: { isSweep: false, amount: Number.MAX_SAFE_INTEGER, sweepAmount: undefined },
        })

        expect(request.amount_sats).toBe(Number.MAX_SAFE_INTEGER)
    })
})

describe('buildCollaborativeSendRequest collaborator validation', () => {
    it('accepts boundary collaborator count of 1', () => {
        const request = buildCollaborativeSendRequest({
            ...baseValues(),
            numCollaborators: 1,
        })

        expect(request.counterparties).toBe(1)
    })

    it('rejects zero, negative, NaN, null, undefined, and malformed collaborator values', () => {
        expect(() =>
            buildCollaborativeSendRequest({
                ...baseValues(),
                numCollaborators: 0,
            }),
        ).toThrowError('Invalid number of collaborators.')

        expect(() =>
            buildCollaborativeSendRequest({
                ...baseValues(),
                numCollaborators: -1,
            }),
        ).toThrowError('Invalid number of collaborators.')

        expect(() =>
            buildCollaborativeSendRequest({
                ...baseValues(),
                numCollaborators: Number.NaN,
            }),
        ).toThrowError('Invalid number of collaborators.')

        expect(() =>
            buildCollaborativeSendRequest(
                {
                    ...baseValues(),
                    numCollaborators: null,
                } as unknown as SendFormValues,
            ),
        ).toThrowError('Invalid number of collaborators.')

        expect(() =>
            buildCollaborativeSendRequest({
                ...baseValues(),
                numCollaborators: undefined,
            }),
        ).toThrowError('Invalid number of collaborators.')

        expect(() =>
            buildCollaborativeSendRequest(
                {
                    ...baseValues(),
                    numCollaborators: '3',
                } as unknown as SendFormValues,
            ),
        ).toThrowError('Invalid number of collaborators.')
    })
})
