import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchInfo } from './jam'

vi.mock('../config', () => ({
  buildAuthHeaderMap: (token: string) => ({ 'x-jm-authorization': `Bearer ${token}` }),
}))

describe('Jam API helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('fetches standalone info with auth headers', async () => {
    const response = Response.json({ backend: { name: 'joinmarket-ng', version: '0.33.0' } })
    vi.mocked(fetch).mockResolvedValue(response)

    await expect(fetchInfo({ token: 'token-123' })).resolves.toBe(response)

    expect(fetch).toHaveBeenCalledWith('/jam/api/v0/info', {
      headers: { 'x-jm-authorization': 'Bearer token-123' },
      signal: undefined,
    })
  })

  it('throws when a response status or content type is unexpected', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }))
    await expect(fetchInfo({ token: 'token-123' })).rejects.toThrow('Request failed with status 500')

    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { headers: { 'content-type': 'text/plain' } }))
    await expect(fetchInfo({ token: 'token-123' })).rejects.toThrow(
      'Expected content type application/json, got text/plain',
    )
  })
})
