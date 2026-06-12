import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchFeatures, fetchLog } from './jam'

vi.mock('../config', () => ({
  buildAuthHeaderMap: (token: string) => ({ 'x-jm-authorization': `Bearer ${token}` }),
}))

describe('Jam API helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('fetches feature flags with auth headers', async () => {
    const response = Response.json({ features: { logs: true } })
    vi.mocked(fetch).mockResolvedValue(response)

    await expect(fetchFeatures({ token: 'token-123' })).resolves.toBe(response)

    expect(fetch).toHaveBeenCalledWith('/jam/api/v0/features', {
      headers: { 'x-jm-authorization': 'Bearer token-123' },
      signal: undefined,
    })
  })

  it('fetches encoded log filenames and validates plain text responses', async () => {
    const response = new Response('log content', {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
    vi.mocked(fetch).mockResolvedValue(response)

    await expect(fetchLog({ token: 'token-123', fileName: 'wallet log.txt' })).resolves.toBe(response)

    expect(fetch).toHaveBeenCalledWith('/jam/api/v0/log/wallet%20log.txt', {
      headers: { 'x-jm-authorization': 'Bearer token-123' },
      signal: undefined,
    })
  })

  it('throws when a response status or content type is unexpected', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }))
    await expect(fetchFeatures({ token: 'token-123' })).rejects.toThrow('Request failed with status 500')

    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { headers: { 'content-type': 'text/plain' } }))
    await expect(fetchFeatures({ token: 'token-123' })).rejects.toThrow(
      'Expected content type application/json, got text/plain',
    )
  })
})
