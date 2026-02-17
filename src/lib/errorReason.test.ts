import { describe, it, expect } from 'vitest'
import { getErrorReason, normalizeAppError } from './errorReason'

describe('normalizeAppError', () => {
  it('normalizes direct string errors', () => {
    expect(normalizeAppError('backend exploded')).toEqual({ message: 'backend exploded' })
  })

  it('normalizes Error instances', () => {
    expect(normalizeAppError(new Error('request failed'))).toEqual({ message: 'request failed' })
  })

  it('keeps message and error_description when present', () => {
    const error = {
      message: 'Request failed with status 400',
      error_description: 'Wallet is already unlocked',
    }
    expect(normalizeAppError(error)).toEqual({
      message: 'Request failed with status 400',
      error_description: 'Wallet is already unlocked',
    })
  })

  it('uses error_description as message when message is missing', () => {
    const error = {
      error_description: 'Invalid wallet password',
    }
    expect(normalizeAppError(error)).toEqual({
      message: 'Invalid wallet password',
      error_description: 'Invalid wallet password',
    })
  })
})

describe('getErrorReason', () => {
  it('returns fallback when nothing usable is present', () => {
    expect(getErrorReason(undefined, 'fallback')).toBe('fallback')
    expect(getErrorReason({}, 'fallback')).toBe('fallback')
    expect(getErrorReason('   ', 'fallback')).toBe('fallback')
  })

  it('returns direct string errors', () => {
    expect(getErrorReason('backend exploded', 'fallback')).toBe('backend exploded')
  })

  it('prefers backend error_description over message', () => {
    const error = {
      message: 'Request failed with status 400',
      error_description: 'Wallet is already unlocked',
    }
    expect(getErrorReason(error, 'fallback')).toBe('Wallet is already unlocked')
  })

  it('prefers detail over message when error_description is missing', () => {
    const error = {
      message: 'Request failed with status 422',
      detail: 'Seed phrase checksum failed',
    }
    expect(getErrorReason(error, 'fallback')).toBe('Seed phrase checksum failed')
  })

  it('extracts nested backend reason from response.data', () => {
    const error = {
      response: {
        data: {
          error_description: 'Invalid wallet password',
        },
      },
    }
    expect(getErrorReason(error, 'fallback')).toBe('Invalid wallet password')
  })

  it('extracts nested backend reason from error payload', () => {
    const error = {
      error: {
        detail: 'Coinjoin is currently in progress',
      },
    }
    expect(getErrorReason(error, 'fallback')).toBe('Coinjoin is currently in progress')
  })
})
