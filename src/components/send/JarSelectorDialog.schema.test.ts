import { describe, expect, it } from 'vitest'
import { createJarSelectorDialogFormSchema } from './JarSelectorDialog.schema'

describe('createJarSelectorDialogFormSchema', () => {
  const schema = createJarSelectorDialogFormSchema([0, 2])

  it('accepts a selectable jar index', async () => {
    await expect(schema.validate({ jarIndex: 2 })).resolves.toEqual({ jarIndex: 2 })
  })

  it.each([{ jarIndex: 1 }, { jarIndex: undefined }])('rejects an unavailable jar index', async (values) => {
    await expect(schema.isValid(values)).resolves.toBe(false)
  })
})
