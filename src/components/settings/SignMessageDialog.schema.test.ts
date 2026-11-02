import type { TFunction } from 'i18next'
import { describe, expect, it, vi } from 'vitest'
import { createSignMessageDialogSchema, SIGN_MESSAGE_FORM_DEFAULT_VALUES } from './SignMessageDialog.schema'

const t = vi.fn((key: string) => key) as unknown as TFunction<'translation', undefined>

describe('createSignMessageDialogSchema', () => {
  const schema = createSignMessageDialogSchema({ t })

  it('validates correct address and message', async () => {
    const validValues = {
      addressOrPath: 'bc1qtestaddress',
      message: 'Hello World',
    }

    await expect(schema.validate(validValues)).resolves.toEqual(validValues)
  })

  it('trims whitespace around inputs', async () => {
    const untrimmedValues = {
      addressOrPath: '  bc1qtestaddress  ',
      message: '  Hello World  ',
    }

    await expect(schema.validate(untrimmedValues)).resolves.toEqual({
      addressOrPath: 'bc1qtestaddress',
      message: 'Hello World',
    })
  })

  it('rejects default empty values', async () => {
    await expect(schema.isValid(SIGN_MESSAGE_FORM_DEFAULT_VALUES)).resolves.toBe(false)
  })

  it.each([
    { addressOrPath: '', message: 'Test message' },
    { addressOrPath: ' '.repeat(3), message: 'Test message' },
  ])('rejects empty or whitespace-only addressOrPath', async (values) => {
    await expect(schema.validate(values)).rejects.toThrow('settings.sign_message_modal.feedback_invalid_address')
  })

  it.each([
    { addressOrPath: 'bc1qtestaddress', message: '' },
    { addressOrPath: 'bc1qtestaddress', message: ' '.repeat(3) },
  ])('rejects empty or whitespace-only message', async (values) => {
    await expect(schema.validate(values)).rejects.toThrow('settings.sign_message_modal.feedback_invalid_message')
  })
})
