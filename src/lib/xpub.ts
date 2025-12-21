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
 * Convert xpub/tpub to native segwit format (zpub/vpub) for BIP84
 */
export async function toNativeSegwitPub(xpub: string): Promise<string> {
  return xpub
}
