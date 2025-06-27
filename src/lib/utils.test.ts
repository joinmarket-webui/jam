import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cn, formatWalletName, JM_WALLET_FILE_EXTENSION, setIntervalDebounced, satsToBtc, btcToSats } from './utils'

describe('cn', () => {
  it('should merge class names correctly', () => {
    expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500')
    expect(cn('text-red-500', { 'bg-blue-500': true })).toBe('text-red-500 bg-blue-500')
    expect(cn('text-red-500', { 'bg-blue-500': false })).toBe('text-red-500')
  })

  it('should handle conflicting classes with tailwind-merge', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    expect(cn('p-4 px-8')).toBe('p-4 px-8')
  })
})

describe('formatWalletName', () => {
  it('should remove .jmdat extension from wallet names', () => {
    expect(formatWalletName('mywallet.jmdat')).toBe('mywallet')
    expect(formatWalletName('test_wallet.jmdat')).toBe('test_wallet')
  })

  it('should return the same string if no .jmdat extension is present', () => {
    expect(formatWalletName('mywallet')).toBe('mywallet')
    expect(formatWalletName('wallet.txt')).toBe('wallet.txt')
  })

  it('should use the correct wallet file extension', () => {
    expect(JM_WALLET_FILE_EXTENSION).toBe('.jmdat')
    expect('wallet' + JM_WALLET_FILE_EXTENSION).toBe('wallet.jmdat')
  })
})

describe('setIntervalDebounced', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.resetAllMocks()
    vi.useRealTimers()
  })

  it('should call the callback function after the specified delay', async () => {
    const callback = vi.fn().mockResolvedValue(undefined)
    const onTimerIdChanged = vi.fn()

    setIntervalDebounced(callback, 1000, onTimerIdChanged)

    expect(callback).not.toHaveBeenCalled()
    expect(onTimerIdChanged).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1000)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(onTimerIdChanged).toHaveBeenCalledTimes(2)
  })

  it('should call the onError handler when the callback throws an error', async () => {
    const error = new Error('Test error')
    const callback = vi.fn().mockRejectedValue(error)
    const onTimerIdChanged = vi.fn()
    const onError = vi.fn()

    setIntervalDebounced(callback, 1000, onTimerIdChanged, onError)

    await vi.advanceTimersByTimeAsync(1000)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(error, expect.any(Function))
  })

  it('should continue the loop when onError calls the loop function', async () => {
    const error = new Error('Test error')
    const callback = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(undefined)
    const onTimerIdChanged = vi.fn()
    const onError = vi.fn((_, loop) => loop())

    setIntervalDebounced(callback, 1000, onTimerIdChanged, onError)

    await vi.advanceTimersByTimeAsync(1000)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(error, expect.any(Function))

    await vi.advanceTimersByTimeAsync(1000)

    expect(callback).toHaveBeenCalledTimes(2)
  })
})

describe('satsToBtc', () => {
  it('should correctly convert satoshis to BTC', () => {
    expect(satsToBtc('100000000')).toBe(1)
    expect(satsToBtc('50000000')).toBe(0.5)
    expect(satsToBtc('1000')).toBe(0.00001)
    expect(satsToBtc('0')).toBe(0)
    expect(satsToBtc('123456789')).toBe(1.23456789)
  })
})

describe('btcToSats', () => {
  it('should correctly convert BTC to satoshis', () => {
    expect(btcToSats('1')).toBe(100000000)
    expect(btcToSats('0.5')).toBe(50000000)
    expect(btcToSats('0.00001')).toBe(1000)
    expect(btcToSats('0')).toBe(0)
  })

  it('should handle rounding', () => {
    expect(btcToSats('0.123456789')).toBe(12345679) // Rounds to nearest integer
    expect(btcToSats('0.000000004')).toBe(0) // Less than 0.5 sats rounds down
    expect(btcToSats('0.000000005')).toBe(1) // 0.5 sats or more rounds up
  })
})
