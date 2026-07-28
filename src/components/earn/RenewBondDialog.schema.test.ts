import { describe, expect, it } from 'vitest'
import { renewBondFormSchema } from './RenewBondDialog.schema'

describe('renewBondFormSchema', () => {
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
})
