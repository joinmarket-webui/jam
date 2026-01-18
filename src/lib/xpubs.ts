import { sha256 } from '@noble/hashes/sha2.js'
import { createBase58check } from '@scure/base'

const base58check = createBase58check(sha256)

const uint8ArrayfromHex = (hex: string) => {
  const match = hex.match(/.{1,2}/g)
  if (match === null) {
    throw new Error('Cannot convert hex to Uint8Array: Invalid hex string.')
  }
  return Uint8Array.from(hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [])
}

// version bytes for extended serialization of public and private keys.
// taken from https://github.com/satoshilabs/slips/blob/master/slip-0132.md
const XPUB_VERSION_BYTES = {
  xpub: uint8ArrayfromHex('0488b21e'),
  ypub: uint8ArrayfromHex('049d7cb2'),
  Ypub: uint8ArrayfromHex('0295b43f'),
  zpub: uint8ArrayfromHex('04b24746'),
  Zpub: uint8ArrayfromHex('02aa7ed3'),
  tpub: uint8ArrayfromHex('043587cf'),
  upub: uint8ArrayfromHex('044a5262'),
  Upub: uint8ArrayfromHex('024289ef'),
  vpub: uint8ArrayfromHex('045f1cf6'),
  Vpub: uint8ArrayfromHex('02575483'),
}

export type XpubFormat = keyof typeof XPUB_VERSION_BYTES

/*
 * This function takes an extended public key (with any version bytes, it doesn't need to be an xpub)
 * and converts it to an extended public key formatted with the desired version bytes
 * @param xpub: an extended public key in base58 format. Example: xpub6CpihtY9HVc1jNJWCiXnRbpXm5BgVNKqZMsM4XqpDcQigJr6AHNwaForLZ3kkisDcRoaXSUms6DJNhxFtQGeZfWAQWCZQe1esNetx5Wqe4M
 * @param targetFormat: a string representing the desired format; must exist in the XPUB_VERSION_BYTES mapping defined above. Example: Zpub
 */
export function convertExtendedPublicKey(xpub: string, targetFormat: XpubFormat) {
  const versionBytes = XPUB_VERSION_BYTES[targetFormat]
  if (!versionBytes) {
    throw new Error('Invalid target format: Unknown version bytes.')
  }

  try {
    const decodedXpub = base58check.decode(xpub.trim())
    const decodedXpubWithoutVersion = decodedXpub.slice(versionBytes.length)
    const merged = new Uint8Array(versionBytes.length + decodedXpubWithoutVersion.length)
    merged.set(versionBytes)
    merged.set(decodedXpubWithoutVersion, versionBytes.length)
    return base58check.encode(merged)
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : undefined
    throw new Error(`Invalid extended public key: ${reason ?? 'Unknown reason.'}`)
  }
}
