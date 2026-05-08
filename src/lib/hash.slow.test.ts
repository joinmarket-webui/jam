import { describe, it, expect } from 'vitest'
import { DEFAULT_PBKDF_ITERATIONS, hashPassword } from './hash'

// **NOTE**: Seems there are issues generating code coverage via v8 for long running/blocking tests.
// Externalized to own file for exclusion in coverage settings.
describe('hash (slow)', () => {
  it('hashPassword', { timeout: 20_000 }, async () => {
    expect(await hashPassword('test', 'Satoshi.jmdat', DEFAULT_PBKDF_ITERATIONS)).toBe(
      'da41454ecc40c48499decbca7b1df4595f0a856caada3f182d47293fbad03004',
    )
  })
})
