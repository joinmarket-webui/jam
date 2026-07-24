import { HDKey } from '@scure/bip32'

/**
 * Derive account-level xpub from seed
 *
 * @param seed BIP32 seed
 * @param path HD key path (m / purpose' / coin_type' / account' / change / address_index), e.g. `m/84'/0'/0'`
 * @returns Extended public key (xpub)
 */
export function deriveAccountXpubFromMasterSeed(seed: Uint8Array, path: string): string {
  return deriveAccountXpub(HDKey.fromMasterSeed(seed), path)
}
/**
 * Derive account-level xpub from HDKey
 *
 * @param root HDKey seed
 * @param path HD key path (m / purpose' / coin_type' / account' / change / address_index), e.g. `m/84'/0'/0'`
 * @returns Extended public key (xpub)
 */
export function deriveAccountXpub(root: HDKey, path: string): string {
  const key = root.derive(path)
  return key.publicExtendedKey
}
