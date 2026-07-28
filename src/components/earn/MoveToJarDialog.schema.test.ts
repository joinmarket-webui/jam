import { describe, expect, it } from 'vitest'
import { createMoveToJarFormSchema } from './MoveToJarDialog.schema'

describe('createMoveToJarFormSchema', () => {
  const schema = createMoveToJarFormSchema([0, 2])

  it('accepts an available destination jar', async () => {
    await expect(schema.validate({ destinationJarIndex: 2 })).resolves.toEqual({ destinationJarIndex: 2 })
  })

  it.each([{ destinationJarIndex: 1 }, { destinationJarIndex: undefined }])(
    'rejects an unavailable destination jar',
    async (values) => {
      await expect(schema.isValid(values)).resolves.toBe(false)
    },
  )
})
