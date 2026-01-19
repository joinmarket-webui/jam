import { HDKey } from '@scure/bip32'

/**
 * Derive account-level xpub from seed
 *
 * @param seed BIP32 seed
 * @param path HD key path (m / purpose' / coin_type' / account' / change / address_index), e.g. `m/84'/0'/0'`
 * @returns Extended public key (xpub)
 */
export function deriveAccountXpub(seed: Uint8Array, path: string): string {
  const root = HDKey.fromMasterSeed(seed)
  const key = root.derive(path)

  if (!key.publicExtendedKey) {
    throw new Error(`Failed to derive extended public key for path ${path}.`)
  }

  return key.publicExtendedKey
}
