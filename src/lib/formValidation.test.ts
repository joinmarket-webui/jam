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

const mainnetAddress = '1BoatSLRHtKNngkdXEeobR76b53LETtpyT'
const testnetAddress = 'mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn'

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
