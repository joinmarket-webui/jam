/**
 * Securely hashes a password using PBKDF2 with SHA-256.
 * @param password The password to hash.
 * @param salt A salt value (should be unique per user).
 * @param iterations Number of PBKDF2 iterations (default: 100,000).
 * @returns The derived key as a hex string.
 */
export async function hashPassword(password: string, salt: string, iterations = 100000): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Web Crypto API not available')
  }
  const enc = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, [
    'deriveBits',
    'deriveKey',
  ])
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  )
  // Convert ArrayBuffer to hex string
  return Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
