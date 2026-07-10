import { describe, it, expect } from 'vitest'
import { getErrorReason, normalizeAppError } from './errorReason'

describe('normalizeAppError', () => {
  it('normalizes direct string errors', () => {
    const context = 'backend exploded'

    const appError = normalizeAppError(context)
    expect(appError.message).toBe('backend exploded')
    expect(appError.error_message).toBe('backend exploded')
    expect(appError.error_description).toBeUndefined()
  })

  it('normalizes Error instances', () => {
    const context = new Error('request failed')

    const appError = normalizeAppError(context)
    expect(appError.message).toBe('request failed')
    expect(appError.error_message).toBe('request failed')
    expect(appError.error_description).toBeUndefined()
  })

  it('keeps message and error_description when present', () => {
    const context = {
      message: 'Request failed with status 400',
      error_description: 'Wallet is already unlocked',
    }
    const appError = normalizeAppError(context)
    expect(appError.message).toBe('Request failed with status 400')
    expect(appError.error_message).toBe('Request failed with status 400')
    expect(appError.error_description).toBe('Wallet is already unlocked')
  })

  it('uses error_description as message when message is missing', () => {
    const context = {
      error_description: 'Invalid wallet password',
    }
    const appError = normalizeAppError(context)
    expect(appError.message).toBe('Invalid wallet password')
    expect(appError.error_message).toBe(undefined)
    expect(appError.error_description).toBe('Invalid wallet password')
  })

  it('uses FastAPI string detail as the error description', () => {
    const context = {
      detail: 'Invalid wallet password',
    }
    const appError = normalizeAppError(context)
    expect(appError.message).toBe('Invalid wallet password')
    expect(appError.error_message).toBe(undefined)
    expect(appError.error_description).toBe('Invalid wallet password')
  })

  it('formats FastAPI validation detail arrays as readable descriptions', () => {
    const context = {
      detail: [
        { loc: ['body', 'password'], msg: 'field required' },
        { loc: ['query', 'force'], msg: 'Input should be a valid boolean' },
      ],
    }
    const appError = normalizeAppError(context)
    expect(appError.message).toBe('password: field required, force: Input should be a valid boolean')
    expect(appError.error_message).toBe(undefined)
    expect(appError.error_description).toBe('password: field required, force: Input should be a valid boolean')
  })

  it('keeps backend error_description ahead of FastAPI detail when both are present', () => {
    const context = {
      error_description: 'Wallet is already unlocked',
      detail: 'Ignored detail',
    }
    const appError = normalizeAppError(context)
    expect(appError.message).toBe('Wallet is already unlocked')
    expect(appError.error_description).toBe('Wallet is already unlocked')
  })

  it('returns fallback message for unknown contexts', () => {
    const context = {
      dont: 'trust',
      verify: true,
    }
    const appError = normalizeAppError(context)
    expect(appError.message).toBe('Unknown error')
    expect(appError.error_message).toBe(undefined)
    expect(appError.error_description).toBe(undefined)
  })
})

describe('getErrorReason', () => {
  it('returns fallback when nothing usable is present', () => {
    expect(getErrorReason(undefined, 'fallback')).toBe('fallback')
    expect(getErrorReason({}, 'fallback')).toBe('fallback')
    expect(getErrorReason(' '.repeat(3), 'fallback')).toBe('fallback')
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

  it('returns message when error_description is missing', () => {
    const error = {
      message: 'Request failed with status 422',
    }
    expect(getErrorReason(error, 'fallback')).toBe('Request failed with status 422')
  })

  it('returns FastAPI detail when legacy fields are missing', () => {
    const error = {
      detail: [{ loc: ['body', 'walletname'], msg: 'field required' }],
    }
    expect(getErrorReason(error, 'fallback')).toBe('walletname: field required')
  })

  it('returns fallback for non-normalized nested objects', () => {
    const error = {
      response: {
        data: {
          error_description: 'Invalid wallet password',
        },
      },
    }
    expect(getErrorReason(error, 'fallback')).toBe('fallback')
  })
})
