import { pbkdf2 } from '@noble/hashes/pbkdf2'
import { sha256 } from '@noble/hashes/sha2'

/**
 * Securely hashes a password using PBKDF2 with SHA-256.
 * @param password The password to hash.
 * @param salt A salt value (should be unique per user).
 * @param iterations Number of PBKDF2 iterations (default: 100,000).-
 * @returns The derived key as a hex string.
 * @throws {Error} If password hashing fails for any reason.
 */
export function hashPassword(password: string, salt: string, iterations = 100000): string {
  try {
    const passwordBuffer = new TextEncoder().encode(password)
    const saltBuffer = new TextEncoder().encode(salt)

    const derivedKey = pbkdf2(sha256, passwordBuffer, saltBuffer, { c: iterations, dkLen: 32 })

    // Convert Uint8Array to hex string
    return Array.from(derivedKey)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  } catch (error) {
    console.error('Password hashing failed:', error)
    throw new Error(`Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
