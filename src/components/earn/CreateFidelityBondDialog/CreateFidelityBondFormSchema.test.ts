import type { TFunction } from 'i18next'
import { describe, expect, it } from 'vitest'
import * as fb from '@/lib/fidelityBondUtils'
import {
  CREATE_FIDELITY_BOND_FORM_DEFAULT_VALUES,
  createFidelityBondFormSchema,
  type CreateFidelityBondFormValues,
} from './CreateFidelityBondFormSchema'

const t = ((key: string) => key) as unknown as TFunction<'translation', undefined>
const lockdateOptions = [{ value: '2026-07' as fb.Lockdate }, { value: '2026-08' as fb.Lockdate }]
const jarIndexes = [0, 1]

const validate = async (values: CreateFidelityBondFormValues) => {
  return await createFidelityBondFormSchema(lockdateOptions, jarIndexes, t).validate(values, { abortEarly: false })
}

describe('createFidelityBondFormSchema', () => {
  it('provides defaults for the wizard form', () => {
    expect(CREATE_FIDELITY_BOND_FORM_DEFAULT_VALUES).toEqual({
      lockdate: undefined,
      source: {
        fromJar: undefined,
      },
      utxoIds: [],
      confirmationAccepted: false,
    })
  })

  it('accepts complete fidelity bond form values', async () => {
    await expect(
      validate({
        lockdate: '2026-07',
        source: {
          fromJar: 0,
        },
        utxoIds: ['txid:0'],
        confirmationAccepted: true,
      }),
    ).resolves.toEqual({
      lockdate: '2026-07',
      source: {
        fromJar: 0,
      },
      utxoIds: ['txid:0'],
      confirmationAccepted: true,
    })
  })

  it('rejects incomplete fidelity bond form values', async () => {
    await expect(validate(CREATE_FIDELITY_BOND_FORM_DEFAULT_VALUES)).rejects.toMatchObject({
      inner: [
        expect.objectContaining({ path: 'lockdate' }),
        expect.objectContaining({ path: 'source.fromJar' }),
        expect.objectContaining({ path: 'utxoIds' }),
        expect.objectContaining({ path: 'confirmationAccepted' }),
      ],
    })
  })

  it('rejects lockdates outside the generated options', async () => {
    await expect(
      validate({
        lockdate: '2025-01',
        source: {
          fromJar: 0,
        },
        utxoIds: ['txid:0'],
        confirmationAccepted: true,
      }),
    ).rejects.toMatchObject({
      inner: [expect.objectContaining({ path: 'lockdate' })],
    })
  })

  it('rejects jar index values that are not in the available jar list', async () => {
    await expect(
      validate({
        lockdate: '2026-07',
        source: {
          fromJar: 99,
        },
        utxoIds: ['txid:0'],
        confirmationAccepted: true,
      }),
    ).rejects.toMatchObject({
      inner: [expect.objectContaining({ path: 'source.fromJar' })],
    })
  })
})
