import { getAddressInfo, Network } from 'bitcoin-address-validation'
import { describe, expect, it } from 'vitest'
import type { AddressSummary } from '@/context/JamWalletInfoContext'
import {
  destinationAddressField,
  isAddressOnNetwork,
  isReusedAddress,
  isValidAddress,
  normalizeBitcoinAddress,
  sourceJarField,
  blockHeightField,
  INPUT_BLOCK_HEIGHT_MIN,
} from './formValidation'

const mainnetAddress = '1BitcoinEaterAddressDontSend8MUo1T'
const testnetAddress = 'mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn'
const mainnetBech32Address = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'
const mainnetTaprootAddress = 'bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr'
const regtestBech32Address = 'bcrt1q6rz28mcfaxtmd6v789l9rrlrusdprr9pz3cppk'
const testnetBech32Address = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx'
// bech32m/taproot pair - same witness program, differing only by HRP (tb1p vs bcrt1p)
const testnetTaprootAddress = 'tb1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vq47zagq'
const regtestTaprootAddress = 'bcrt1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqc8gma6'
const regtestLegacyAddressLabelledTestnet = 'mkpZhYtJu2r87Js3pDiWJDmPte2NRZ8bJV'

const addressSummary = {
  [mainnetAddress]: { address: mainnetAddress, used: false },
} as unknown as AddressSummary

describe('normalizeBitcoinAddress', () => {
  it('lowercases an all-uppercase bech32 address', () => {
    expect(normalizeBitcoinAddress(mainnetBech32Address.toUpperCase())).toBe(mainnetBech32Address)
    expect(normalizeBitcoinAddress(mainnetTaprootAddress.toUpperCase())).toBe(mainnetTaprootAddress)
    expect(normalizeBitcoinAddress(testnetBech32Address.toUpperCase())).toBe(testnetBech32Address)
    expect(normalizeBitcoinAddress(regtestTaprootAddress.toUpperCase())).toBe(regtestTaprootAddress)
  })

  it('leaves base58 addresses untouched - they are case-sensitive', () => {
    expect(normalizeBitcoinAddress(mainnetAddress)).toBe(mainnetAddress)
    expect(normalizeBitcoinAddress(mainnetAddress.toUpperCase())).toBe(mainnetAddress.toUpperCase())
    expect(normalizeBitcoinAddress(testnetAddress)).toBe(testnetAddress)
  })

  it('leaves lowercase and mixed-case input alone', () => {
    expect(normalizeBitcoinAddress(mainnetBech32Address)).toBe(mainnetBech32Address)
    const mixedCase = 'BC1Qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'
    expect(normalizeBitcoinAddress(mixedCase)).toBe(mixedCase)
    expect(isValidAddress(mixedCase)).toBe(false)
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeBitcoinAddress(`  ${mainnetBech32Address.toUpperCase()}  `)).toBe(mainnetBech32Address)
    expect(normalizeBitcoinAddress(`  ${mainnetAddress}  `)).toBe(mainnetAddress)
  })
})

describe('isValidAddress', () => {
  it.each([
    mainnetAddress,
    testnetAddress,
    regtestBech32Address,
    testnetBech32Address,
    testnetTaprootAddress,
    regtestTaprootAddress,
    regtestLegacyAddressLabelledTestnet,
  ])('accepts valid addresses', (address) => {
    expect(isValidAddress(address)).toBe(true)
  })

  it.each([
    mainnetBech32Address,
    mainnetTaprootAddress,
    testnetBech32Address,
    testnetTaprootAddress,
    regtestBech32Address,
    regtestTaprootAddress,
  ])('accepts the uppercase form of bech32 addresses', (address) => {
    expect(isValidAddress(address.toUpperCase())).toBe(true)
  })

  it('reject invalid addresses', () => {
    expect(isValidAddress('not-an-address')).toBe(false)
    expect(isValidAddress('')).toBe(false)
    expect(isValidAddress(undefined)).toBe(false)
    expect(isValidAddress(null)).toBe(false)
    expect(isValidAddress(42)).toBe(false)
  })
})

describe('isAddressOnNetwork', () => {
  it('matches the address network', () => {
    expect(isAddressOnNetwork(mainnetAddress, Network.mainnet)).toBe(true)
    expect(isAddressOnNetwork(mainnetAddress, Network.testnet)).toBe(false)
    expect(isAddressOnNetwork(testnetAddress, Network.mainnet)).toBe(false)
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
    expect(getAddressInfo(regtestLegacyAddressLabelledTestnet).network, 'sanity check').toBe(Network.testnet)

    // A base58 (P2PKH here; P2SH shares the trait) address on a regtest wallet is labeled "testnet"
    // by the library because the two share version bytes, so it must still be accepted on regtest.
    expect(isAddressOnNetwork(regtestLegacyAddressLabelledTestnet, Network.regtest)).toBe(true)
    expect(isAddressOnNetwork(regtestLegacyAddressLabelledTestnet, Network.testnet)).toBe(true)
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

  it('detects reuse regardless of bech32 casing', () => {
    const usedSummary = {
      [mainnetBech32Address]: { address: mainnetBech32Address, used: true },
    } as unknown as AddressSummary

    expect(isReusedAddress(mainnetBech32Address, usedSummary)).toBe(true)
    expect(isReusedAddress(mainnetBech32Address.toUpperCase(), usedSummary)).toBe(true)
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

describe('blockHeightField', () => {
  // eslint-disable-next-line unicorn/consistent-function-scoping -- okay in tests
  const invalidMessage = ({ min, max }: { min: number; max: number }) => `Invalid blockheight ${min}-${max}`

  it('handles currentBlockHeight = 0', () => {
    const schema = blockHeightField({ currentBlockHeight: 0, messages: { invalid: invalidMessage } })
    // min should be 0, max should be 0
    expect(schema.isValidSync(-1)).toBe(false)
    expect(schema.isValidSync(0)).toBe(true)
    expect(schema.isValidSync(1)).toBe(false)
  })

  it('handles currentBlockHeight = undefined', () => {
    const schema = blockHeightField({ currentBlockHeight: undefined, messages: { invalid: invalidMessage } })
    // min should be 0, max should be Number.MAX_SAFE_INTEGER
    expect(schema.isValidSync(-1)).toBe(false)
    expect(schema.isValidSync(0)).toBe(true)
    expect(schema.isValidSync(100)).toBe(true)
    expect(schema.isValidSync(Number.MAX_SAFE_INTEGER + 1)).toBe(false)
  })

  it('handles currentBlockHeight = null', () => {
    // @ts-expect-error Intentionally pass null to test JS boundary cases
    const schema = blockHeightField({ currentBlockHeight: null, messages: { invalid: invalidMessage } })
    expect(schema.isValidSync(-1)).toBe(false)
    expect(schema.isValidSync(0)).toBe(true)
    expect(schema.isValidSync(100)).toBe(true)
  })

  it('handles currentBlockHeight > minBlockHeight', () => {
    const schema = blockHeightField({ currentBlockHeight: 100, messages: { invalid: invalidMessage } })
    // min should be 0, max should be 100
    expect(schema.isValidSync(-1)).toBe(false)
    expect(schema.isValidSync(0)).toBe(true)
    expect(schema.isValidSync(50)).toBe(true)
    expect(schema.isValidSync(100)).toBe(true)
    expect(schema.isValidSync(101)).toBe(false)
  })

  it('handles currentBlockHeight == minBlockHeight (0)', () => {
    const schema = blockHeightField({
      currentBlockHeight: INPUT_BLOCK_HEIGHT_MIN,
      messages: { invalid: invalidMessage },
    })
    expect(schema.isValidSync(INPUT_BLOCK_HEIGHT_MIN - 1)).toBe(false)
    expect(schema.isValidSync(INPUT_BLOCK_HEIGHT_MIN)).toBe(true)
    expect(schema.isValidSync(INPUT_BLOCK_HEIGHT_MIN + 1)).toBe(false)
  })
})
