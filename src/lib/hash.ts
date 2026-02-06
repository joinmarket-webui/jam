import { pbkdf2Async } from '@noble/hashes/pbkdf2.js'
import { sha512 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'

// see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2 (last check: 2026-01)
export const DEFAULT_PBKDF_ITERATIONS = 210_000

/**
 * Securely hashes a password using PBKDF2 with SHA-512.
 * @param password The password to hash.
 * @param salt A salt value (should be unique per user).
 * @param iterations Number of PBKDF2 iterations (default: 210_000).
 * @returns The derived key as a hex string.
 * @throws {Error} If password hashing fails for any reason.
 */
export async function hashPassword(
  password: string,
  salt: string,
  iterations = DEFAULT_PBKDF_ITERATIONS,
): Promise<string> {
  try {
    const passwordBuffer = new TextEncoder().encode(password)
    const saltBuffer = new TextEncoder().encode(salt)
    const derivedKey = await pbkdf2Async(sha512, passwordBuffer, saltBuffer, { c: iterations, dkLen: 32 })
    return bytesToHex(derivedKey)
  } catch (error: unknown) {
    console.error('Password hashing failed:', error)
    const reason = (error instanceof Error ? (error.message ?? '') : '') || 'Unknown error'
    throw new Error(`Failed to hash password: ${reason}`)
  }
}
