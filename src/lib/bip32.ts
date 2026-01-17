import { HDKey } from '@scure/bip32'
import { mnemonicToSeedSync } from '@scure/bip39'

/**
 * Derive account-level xpub from mnemonic phrase
 * JoinMarket uses BIP84 (Native SegWit) with paths:
 * - Mainnet: m/84'/0'/account'
 * - Testnet: m/84'/1'/account'
 *
 * @param mnemonic - BIP39 mnemonic phrase (12 or 24 words)
 * @param account - Account index (default: 0)
 * @param network - 'mainnet' or 'testnet' (default: 'mainnet')
 * @returns Extended public key (xpub for mainnet, tpub for testnet)
 */
export function deriveAccountXpub(
  mnemonic: string,
  account: number = 0,
  network: 'mainnet' | 'testnet' = 'mainnet',
): string {
  // Convert mnemonic to seed
  const seed = mnemonicToSeedSync(mnemonic)

  // Create HD key from seed
  const root = HDKey.fromMasterSeed(seed)

  // Derive account level key: m/84'/coin_type'/account'
  const coinType = network === 'mainnet' ? 0 : 1
  const path = `m/84'/${coinType}'/${account}'`
  const accountKey = root.derive(path)

  if (!accountKey.publicExtendedKey) {
    throw new Error(`Failed to derive extended public key for path ${path}`)
  }

  return accountKey.publicExtendedKey
}

/**
 * Derive xpubs for multiple accounts
 *
 * @param mnemonic - BIP39 mnemonic phrase
 * @param accountCount - Number of accounts to derive (default: 5, JoinMarket's default mixdepths)
 * @param network - 'mainnet' or 'testnet'
 * @returns Array of xpubs, one for each account
 */
export function deriveAccountXpubs(
  mnemonic: string,
  accountCount: number = 5,
  network: 'mainnet' | 'testnet' = 'mainnet',
): string[] {
  const xpubs: string[] = []

  for (let i = 0; i < accountCount; i++) {
    xpubs.push(deriveAccountXpub(mnemonic, i, network))
  }

  return xpubs
}

/**
 * Detect network type from wallet name or xpub prefix
 * JoinMarket testnet wallets typically use regtest for development
 *
 * @param walletFileName - Wallet file name
 * @param xpubSample - Optional sample xpub to detect from prefix
 * @returns 'mainnet' or 'testnet'
 */
export function detectNetwork(walletFileName: string, xpubSample?: string): 'mainnet' | 'testnet' {
  // Check xpub prefix if provided
  if (xpubSample) {
    if (xpubSample.startsWith('tpub') || xpubSample.startsWith('vpub')) {
      return 'testnet'
    }
    if (xpubSample.startsWith('xpub') || xpubSample.startsWith('zpub')) {
      return 'mainnet'
    }
  }

  // Check wallet filename for testnet/regtest indicators
  const lowerName = walletFileName.toLowerCase()
  if (lowerName.includes('testnet') || lowerName.includes('regtest') || lowerName.includes('test')) {
    return 'testnet'
  }

  // Default to mainnet
  return 'mainnet'
}
