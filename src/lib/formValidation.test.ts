import { Network } from 'bitcoin-address-validation'
import { describe, expect, it } from 'vitest'
import type { AddressSummary } from '@/context/JamWalletInfoContext'
import {
  destinationAddressField,
  isAddressOnNetwork,
  isReusedAddress,
  isValidAddress,
  sourceJarField,
} from './formValidation'

const mainnetAddress = '1BitcoinEaterAddressDontSend8MUo1T'
const testnetAddress = 'mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn'
const regtestBech32Address = 'bcrt1q6rz28mcfaxtmd6v789l9rrlrusdprr9pz3cppk'
const testnetBech32Address = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx'
// bech32m/taproot pair - same witness program, differing only by HRP (tb1p vs bcrt1p)
const testnetTaprootAddress = 'tb1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vq47zagq'
const regtestTaprootAddress = 'bcrt1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqc8gma6'
const regtestLegacyAddressLabeledTestnet = 'mkpZhYtJu2r87Js3pDiWJDmPte2NRZ8bJV'

const addressSummary = {
  [mainnetAddress]: { address: mainnetAddress, used: false },
} as unknown as AddressSummary

describe('isValidAddress', () => {
  it('accepts a valid address and rejects everything else', () => {
    expect(isValidAddress(mainnetAddress)).toBe(true)
    expect(isValidAddress('not-an-address')).toBe(false)
    expect(isValidAddress('')).toBe(false)
    expect(isValidAddress(undefined)).toBe(false)
    expect(isValidAddress(42)).toBe(false)
  })
})

describe('isAddressOnNetwork', () => {
  it('matches the address network', () => {
    expect(isAddressOnNetwork(mainnetAddress, Network.mainnet)).toBe(true)
    expect(isAddressOnNetwork(mainnetAddress, Network.testnet)).toBe(false)
    expect(isAddressOnNetwork(testnetAddress, Network.testnet)).toBe(true)
  })

  it('returns false for unparseable input instead of throwing', () => {
    expect(isAddressOnNetwork('not-an-address', Network.mainnet)).toBe(false)
  })

  it('distinguishes testnet and regtest for bech32 and bech32m addresses via their distinct HRP', () => {
    // bech32/bech32m addresses carry a network-specific prefix (tb1 vs bcrt1), so each is only
    // valid on its own network - a regtest address must not pass on a testnet wallet, nor vice versa.
    // bech32 (segwit v0):
    expect(isAddressOnNetwork(regtestBech32Address, Network.regtest)).toBe(true)
    expect(isAddressOnNetwork(regtestBech32Address, Network.testnet)).toBe(false)
    expect(isAddressOnNetwork(testnetBech32Address, Network.testnet)).toBe(true)
    expect(isAddressOnNetwork(testnetBech32Address, Network.regtest)).toBe(false)
    // bech32m (taproot):
    expect(isAddressOnNetwork(regtestTaprootAddress, Network.regtest)).toBe(true)
    expect(isAddressOnNetwork(regtestTaprootAddress, Network.testnet)).toBe(false)
    expect(isAddressOnNetwork(testnetTaprootAddress, Network.testnet)).toBe(true)
    expect(isAddressOnNetwork(testnetTaprootAddress, Network.regtest)).toBe(false)
    // ...and none pass on mainnet.
    expect(isAddressOnNetwork(regtestBech32Address, Network.mainnet)).toBe(false)
    expect(isAddressOnNetwork(testnetBech32Address, Network.mainnet)).toBe(false)
    expect(isAddressOnNetwork(regtestTaprootAddress, Network.mainnet)).toBe(false)
    expect(isAddressOnNetwork(testnetTaprootAddress, Network.mainnet)).toBe(false)
  })

  it('treats testnet and regtest as interchangeable for ambiguous base58 addresses', () => {
    // A base58 (P2PKH here; P2SH shares the trait) address on a regtest wallet is labeled "testnet"
    // by the library because the two share version bytes, so it must still be accepted on regtest.
    expect(isAddressOnNetwork(regtestLegacyAddressLabeledTestnet, Network.regtest)).toBe(true)
    expect(isAddressOnNetwork(regtestLegacyAddressLabeledTestnet, Network.testnet)).toBe(true)
    // mainnet is never ambiguous with testnet/regtest.
    expect(isAddressOnNetwork(mainnetAddress, Network.regtest)).toBe(false)
    expect(isAddressOnNetwork(mainnetAddress, Network.testnet)).toBe(false)
  })
})

describe('isReusedAddress', () => {
  it('is true only when the address is marked as used', () => {
    const usedSummary = {
      [mainnetAddress]: { address: mainnetAddress, used: true },
    } as unknown as AddressSummary

    expect(isReusedAddress(mainnetAddress, usedSummary)).toBe(true)
    expect(isReusedAddress(mainnetAddress, addressSummary)).toBe(false)
    expect(isReusedAddress('unknown-address', addressSummary)).toBe(false)
  })
})

describe('sourceJarField', () => {
  const schema = sourceJarField('invalid jar', (jarIndex) => [0, 1].includes(jarIndex))

  it('accepts a selectable integer jar index', () => {
    expect(schema.isValidSync(0)).toBe(true)
    expect(schema.isValidSync(1)).toBe(true)
  })

  it('rejects non-selectable, non-integer and missing values', () => {
    expect(schema.isValidSync(2)).toBe(false)
    expect(schema.isValidSync(1.5)).toBe(false)
    expect(schema.isValidSync(undefined)).toBe(false)
  })
})

describe('destinationAddressField', () => {
  const schema = destinationAddressField({
    network: Network.mainnet,
    addressSummary: {
      [mainnetAddress]: { address: mainnetAddress, used: false },
      [testnetAddress]: { address: testnetAddress, used: true },
    } as unknown as AddressSummary,
    messages: {
      invalid: 'invalid',
      networkMismatch: 'network-mismatch',
      reused: 'reused',
    },
  })

  it('accepts a valid, on-network, unused address', () => {
    expect(schema.isValidSync(mainnetAddress)).toBe(true)
  })

  it('trims surrounding whitespace before validating', () => {
    expect(schema.isValidSync(`  ${mainnetAddress}  `)).toBe(true)
  })

  it('rejects an invalid address with the invalid message', () => {
    expect(() => schema.validateSync('not-an-address')).toThrow('invalid')
  })

  it('reports only the invalid error for an invalid address (no cascading network/reuse errors)', () => {
    expect.assertions(1)
    try {
      schema.validateSync('not-an-address', { abortEarly: false })
    } catch (error) {
      expect((error as { errors: string[] }).errors).toEqual(['invalid'])
    }
  })

  it('rejects an address from the wrong network', () => {
    expect(() => schema.validateSync(testnetAddress)).toThrow('network-mismatch')
  })

  it('rejects a reused address', () => {
    const reusedSchema = destinationAddressField({
      network: Network.mainnet,
      addressSummary: {
        [mainnetAddress]: { address: mainnetAddress, used: true },
      } as unknown as AddressSummary,
      messages: { invalid: 'invalid', networkMismatch: 'network-mismatch', reused: 'reused' },
    })

    expect(() => reusedSchema.validateSync(mainnetAddress)).toThrow('reused')
  })
})
