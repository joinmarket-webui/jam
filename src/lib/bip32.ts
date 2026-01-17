import { HDKey } from '@scure/bip32'
import { Network } from 'bitcoin-address-validation'

/**
 * Derive account-level xpub from mnemonic phrase
 * JoinMarket uses BIP84 (Native SegWit) with paths:
 * - Mainnet: m/84'/0'/account'
 * - Testnet: m/84'/1'/account'
 *
 * @param seed BIP39 mnemonic phrase (12 or 24 words)
 * @param path HD key path (m / purpose' / coin_type' / account' / change / address_index), e.g. `m/84'/0'/0'`
 * @returns Extended public key (xpub for mainnet, tpub for testnet)
 */
export function deriveAccountXpub(seed: Uint8Array, path: string): string {
  const root = HDKey.fromMasterSeed(seed)
  const accountKey = root.derive(path)

  if (!accountKey.publicExtendedKey) {
    throw new Error(`Failed to derive extended public key for path ${path}`)
  }

  return accountKey.publicExtendedKey
}

/**
 * Detect network type from wallet name or xpub prefix
 * JoinMarket testnet wallets typically use regtest for development
 *
 * @param walletFileName - Wallet file name
 * @param xpubSample - Optional sample xpub to detect from prefix
 * @returns 'mainnet' or 'testnet'
 */
export function detectNetwork(walletFileName: string, xpubSample?: string): Network {
  // Check xpub prefix if provided
  if (xpubSample) {
    if (xpubSample.startsWith('tpub') || xpubSample.startsWith('vpub')) {
      return Network.testnet
    }
    if (xpubSample.startsWith('xpub') || xpubSample.startsWith('zpub')) {
      return Network.mainnet
    }
  }

  // Check wallet filename for testnet/regtest indicators
  const lowerName = walletFileName.toLowerCase()
  if (lowerName.includes('testnet') || lowerName.includes('regtest') || lowerName.includes('test')) {
    return Network.testnet
  }

  // Default to mainnet
  return Network.mainnet
}
