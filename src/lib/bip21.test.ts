import { describe, it, expect } from 'vitest'
import { parseBip21Uri } from './bip21'

// Valid mainnet P2WPKH address for testing
const VALID_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'
// Valid testnet address
const VALID_TESTNET_ADDRESS = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx'

describe('parseBip21Uri', () => {
  describe('raw addresses', () => {
    it('parses a valid mainnet address', () => {
      const result = parseBip21Uri(VALID_ADDRESS)
      expect(result).toEqual({ address: VALID_ADDRESS })
    })

    it('parses a valid testnet address', () => {
      const result = parseBip21Uri(VALID_TESTNET_ADDRESS)
      expect(result).toEqual({ address: VALID_TESTNET_ADDRESS })
    })

    it('trims whitespace around address', () => {
      const result = parseBip21Uri(`  ${VALID_ADDRESS}  `)
      expect(result).toEqual({ address: VALID_ADDRESS })
    })

    it('returns undefined for invalid address', () => {
      expect(parseBip21Uri('notavalidaddress')).toBeUndefined()
    })

    it('returns undefined for empty string', () => {
      expect(parseBip21Uri('')).toBeUndefined()
    })
  })

  describe('BIP21 URIs', () => {
    it('parses bitcoin: URI with address only', () => {
      const result = parseBip21Uri(`bitcoin:${VALID_ADDRESS}`)
      expect(result).toEqual({ address: VALID_ADDRESS })
    })

    it('parses bitcoin: URI with amount', () => {
      const result = parseBip21Uri(`bitcoin:${VALID_ADDRESS}?amount=0.5`)
      expect(result).toEqual({ address: VALID_ADDRESS, amount: 50_000_000 })
    })

    it('parses bitcoin: URI with 1 BTC amount', () => {
      const result = parseBip21Uri(`bitcoin:${VALID_ADDRESS}?amount=1`)
      expect(result).toEqual({ address: VALID_ADDRESS, amount: 100_000_000 })
    })

    it('parses bitcoin: URI with small amount (1 sat)', () => {
      const result = parseBip21Uri(`bitcoin:${VALID_ADDRESS}?amount=0.00000001`)
      expect(result).toEqual({ address: VALID_ADDRESS, amount: 1 })
    })

    it('handles case-insensitive scheme', () => {
      const result = parseBip21Uri(`BITCOIN:${VALID_ADDRESS}?amount=0.1`)
      expect(result).toEqual({ address: VALID_ADDRESS, amount: 10_000_000 })
    })

    it('ignores extra query parameters', () => {
      const result = parseBip21Uri(`bitcoin:${VALID_ADDRESS}?amount=0.01&label=test&message=hello`)
      expect(result).toEqual({ address: VALID_ADDRESS, amount: 1_000_000, label: 'test', message: 'hello' })
    })

    it('returns undefined for invalid address in URI', () => {
      expect(parseBip21Uri('bitcoin:invalidaddress')).toBeUndefined()
    })

    it('returns undefined for empty address in URI', () => {
      expect(parseBip21Uri('bitcoin:?amount=1')).toBeUndefined()
    })

    it('ignores zero amount', () => {
      const result = parseBip21Uri(`bitcoin:${VALID_ADDRESS}?amount=0`)
      expect(result).toEqual({ address: VALID_ADDRESS })
    })

    it('ignores negative amount', () => {
      const result = parseBip21Uri(`bitcoin:${VALID_ADDRESS}?amount=-1`)
      expect(result).toEqual({ address: VALID_ADDRESS })
    })

    it('ignores non-numeric amount', () => {
      const result = parseBip21Uri(`bitcoin:${VALID_ADDRESS}?amount=abc`)
      expect(result).toEqual({ address: VALID_ADDRESS })
    })

    it('returns undefined for non-bitcoin URI scheme', () => {
      expect(parseBip21Uri(`ethereum:${VALID_ADDRESS}`)).toBeUndefined()
    })
  })

  describe('label parameter', () => {
    it('parses label from BIP21 URI', () => {
      const result = parseBip21Uri(`bitcoin:${VALID_ADDRESS}?label=Donation`)
      expect(result).toEqual({ address: VALID_ADDRESS, label: 'Donation' })
    })

    it('parses label with amount', () => {
      const result = parseBip21Uri(`bitcoin:${VALID_ADDRESS}?amount=0.01&label=Payment`)
      expect(result).toEqual({ address: VALID_ADDRESS, amount: 1_000_000, label: 'Payment' })
    })

    it('ignores empty label', () => {
      const result = parseBip21Uri(`bitcoin:${VALID_ADDRESS}?label=`)
      expect(result).toEqual({ address: VALID_ADDRESS })
    })

    it('decodes URL-encoded label', () => {
      const result = parseBip21Uri(`bitcoin:${VALID_ADDRESS}?label=My%20Wallet`)
      expect(result).toEqual({ address: VALID_ADDRESS, label: 'My Wallet' })
    })

    it('does not include label for raw address', () => {
      const result = parseBip21Uri(VALID_ADDRESS)
      expect(result).toEqual({ address: VALID_ADDRESS })
      expect(result).not.toHaveProperty('label')
    })
  })

  describe('message parameter', () => {
    it('parses message from BIP21 URI', () => {
      const result = parseBip21Uri(`bitcoin:${VALID_ADDRESS}?message=Invoice%20%231234`)
      expect(result).toEqual({ address: VALID_ADDRESS, message: 'Invoice #1234' })
    })

    it('parses message with amount and label', () => {
      const result = parseBip21Uri(`bitcoin:${VALID_ADDRESS}?amount=0.05&label=Shop&message=Order%20789`)
      expect(result).toEqual({ address: VALID_ADDRESS, amount: 5_000_000, label: 'Shop', message: 'Order 789' })
    })

    it('ignores empty message', () => {
      const result = parseBip21Uri(`bitcoin:${VALID_ADDRESS}?message=`)
      expect(result).toEqual({ address: VALID_ADDRESS })
    })

    it('does not include message for raw address', () => {
      const result = parseBip21Uri(VALID_ADDRESS)
      expect(result).not.toHaveProperty('message')
    })
  })
})
