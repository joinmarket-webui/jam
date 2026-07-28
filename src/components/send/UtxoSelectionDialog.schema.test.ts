import { describe, expect, it } from 'vitest'
import { createUtxoSelectionFormSchema } from './UtxoSelectionDialog.schema'

describe('createUtxoSelectionFormSchema', () => {
  const schema = createUtxoSelectionFormSchema(['tx-a:0', 'tx-b:1'])

  it('accepts selectable UTXO rows and a filter', async () => {
    const values = {
      filter: 'confirmed',
      rowSelection: { 'tx-a:0': true, 'tx-b:1': false },
    }
    await expect(schema.validate(values)).resolves.toEqual(values)
  })

  it('allows clearing the selection', async () => {
    await expect(schema.isValid({ filter: '', rowSelection: {} })).resolves.toBe(true)
  })

  it('rejects selected rows that are not available', async () => {
    await expect(schema.isValid({ filter: '', rowSelection: { 'unknown:0': true } })).resolves.toBe(false)
  })
})
