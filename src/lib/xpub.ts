/**
 * Extract xpub/tpub from a branch string
 * Example: "m/84'/1'/0'/0 tpubDCXYZ..." -> "tpubDCXYZ..."
 */
export function extractXpubFromBranch(branchStr: string): string | null {
  const match = branchStr.match(/([xtyvz]pub[a-zA-Z0-9]+)/)
  return match ? match[1] : null
}

/**
 * Extract derivation path from a branch string
 * Example: "m/84'/1'/0'/0 tpubDCXYZ..." -> "m/84'/1'/0'/0"
 */
export function extractDerivationPath(branchStr: string): string | null {
  const match = branchStr.match(/(m\/[\d'/]+)/)
  return match ? match[1] : null
}

/**
 * Base58 alphabet for Bitcoin addresses
 */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/**
 * Decode base58check string to bytes
 */
function base58Decode(str: string): Uint8Array {
  const bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    let carry = BASE58_ALPHABET.indexOf(str[i])
    if (carry < 0) throw new Error('Invalid base58 character')

    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58
      bytes[j] = carry & 0xff
      carry >>= 8
    }

    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }

  // Add leading zeros
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    bytes.push(0)
  }

  return new Uint8Array(bytes.reverse())
}

/**
 * Encode bytes to base58check string
 */
function base58Encode(buffer: Uint8Array): string {
  const digits = [0]

  for (let i = 0; i < buffer.length; i++) {
    let carry = buffer[i]
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8
      digits[j] = carry % 58
      carry = (carry / 58) | 0
    }

    while (carry > 0) {
      digits.push(carry % 58)
      carry = (carry / 58) | 0
    }
  }

  // Add leading zeros
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
    digits.push(0)
  }

  return digits
    .reverse()
    .map((d) => BASE58_ALPHABET[d])
    .join('')
}

/**
 * Convert xpub/tpub to native segwit format (zpub/vpub) for BIP84
 * Uses SLIP-0132 version bytes:
 * - xpub (0x0488b21e) -> zpub (0x04b24746) for mainnet P2WPKH
 * - tpub (0x043587cf) -> vpub (0x045f1cf6) for testnet P2WPKH
 */
export async function toNativeSegwitPub(xpub: string): Promise<string> {
  try {
    // Decode the extended public key
    const decoded = base58Decode(xpub)

    if (decoded.length !== 82) {
      // Invalid length, return original
      return xpub
    }

    // Extract version bytes (first 4 bytes)
    const version = (decoded[0] << 24) | (decoded[1] << 16) | (decoded[2] << 8) | decoded[3]

    // SLIP-0132 version mapping
    let newVersion: number
    if (version === 0x0488b21e) {
      // xpub -> zpub (mainnet)
      newVersion = 0x04b24746
    } else if (version === 0x043587cf) {
      // tpub -> vpub (testnet)
      newVersion = 0x045f1cf6
    } else {
      // Already in native segwit format or unknown, return original
      return xpub
    }

    // Create new buffer with updated version
    const newDecoded = new Uint8Array(decoded)
    newDecoded[0] = (newVersion >> 24) & 0xff
    newDecoded[1] = (newVersion >> 16) & 0xff
    newDecoded[2] = (newVersion >> 8) & 0xff
    newDecoded[3] = newVersion & 0xff

    // Re-encode with new version
    return base58Encode(newDecoded)
  } catch (error) {
    console.error('Error converting xpub to native segwit format:', error)
    // If conversion fails, return the original xpub
    return xpub
  }
}
