import { describe, it, expect } from 'vitest'
import { DEFAULT_PBKDF_ITERATIONS, hashPassword } from './hash'

describe('hash', () => {
  it('DEFAULT_PBKDF_ITERATIONS', () => {
    expect(DEFAULT_PBKDF_ITERATIONS).toBe(210_000)
  })

  it('hashPassword', async () => {
    expect(await hashPassword('', '', 1)).toBe('6d2ecbbbfb2e6dcd7056faf9af6aa06eae594391db983279a6bf27e0eb228614')
    expect(await hashPassword('password', 'salt', 1)).toBe(
      '867f70cf1ade02cff3752599a3a53dc4af34c7a669815ae5d513554e1c8cf252',
    )
    expect(await hashPassword('test', 'Satoshi.jmdat', 21)).toBe(
      '1acb29f6e7c841823a9a2369d2f2cc7e9ee19c78621c4d7194d1f45eb0d5e8ed',
    )
    expect(await hashPassword('test', 'Satoshi.jmdat', DEFAULT_PBKDF_ITERATIONS)).toBe(
      'da41454ecc40c48499decbca7b1df4595f0a856caada3f182d47293fbad03004',
    )
  })
})
