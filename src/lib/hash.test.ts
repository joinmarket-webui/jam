import { describe, it, expect } from 'vitest'
import { DEFAULT_PBKDF_ITERATIONS, hashPassword } from './hash'

describe('hash', () => {
  it('DEFAULT_PBKDF_ITERATIONS', async () => {
    expect(DEFAULT_PBKDF_ITERATIONS).toBe(210_000)
  })

  it('hashPassword', async () => {
    expect(await hashPassword('password', 'salt', 1)).toBe(
      '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b',
    )
    expect(await hashPassword('test', 'Satoshi.jmdat', 1)).toBe(
      '6785848abc7bd4d99f0c39f6c731094bea9b1090c59b4009f466b455aa15a2c1',
    )
    expect(await hashPassword('test', 'Satoshi.jmdat', 21)).toBe(
      'a89fbf06eeab7c4a147203cc69eb064c0221f9cf16c293af8dc7e382307b3774',
    )

    expect(await hashPassword('test', 'Satoshi.jmdat', DEFAULT_PBKDF_ITERATIONS)).toBe(
      '60e35c0b8567402c1d8b804e986e3f2c0648f46f68171c8a3e7eb9e98bfb5d4d',
    )
  })
})
