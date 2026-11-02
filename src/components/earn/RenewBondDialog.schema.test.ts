import { describe, expect, it } from 'vitest'
import { createRenewBondFormSchema } from './RenewBondDialog.schema'

describe('createRenewBondFormSchema', () => {
  const renewBondFormSchema = createRenewBondFormSchema(['2030-01', '2030-02'])

  it('accepts a lockdate after confirmation', async () => {
    const values = { lockdate: '2030-01' as const, confirmationAccepted: true }
    await expect(renewBondFormSchema.validate(values)).resolves.toEqual(values)
  })

  it.each([
    { lockdate: undefined, confirmationAccepted: true },
    { lockdate: '2030-01' as const, confirmationAccepted: false },
  ])('rejects incomplete renewal values', async (values) => {
    await expect(renewBondFormSchema.isValid(values)).resolves.toBe(false)
  })

  it('rejects a lockdate that is not available (e.g. used by an existing bond)', async () => {
    const values = { lockdate: '2030-03' as const, confirmationAccepted: true }
    await expect(renewBondFormSchema.isValid(values)).resolves.toBe(false)
  })
})
