import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchOrderbook, refreshOrderbook } from './orderbook'

describe('orderbook API helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('returns orderbook data when the response has offers', async () => {
    const orderbook = {
      offers: [{ counterparty: 'maker', oid: 0, ordertype: 'sw0reloffer' }],
      fidelitybonds: [{ counterparty: 'maker', amount: 1000, locktime: 123 }],
    }
    vi.mocked(fetch).mockResolvedValue(Response.json(orderbook))

    await expect(fetchOrderbook()).resolves.toEqual(orderbook)
    expect(fetch).toHaveBeenCalledWith('/obwatch/orderbook.json')
  })

  it('falls back to an empty orderbook for unexpected response shapes', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.mocked(fetch).mockResolvedValue(Response.json({ error: 'not ready' }))

    await expect(fetchOrderbook()).resolves.toEqual({ offers: [], fidelitybonds: [] })
    expect(warn).toHaveBeenCalledWith('Unexpected orderbook response structure:', { error: 'not ready' })

    warn.mockRestore()
  })

  it('throws for failed orderbook fetches', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }))

    await expect(fetchOrderbook()).rejects.toThrow('Failed to fetch orderbook: 503')
  })

  it('refreshes the orderbook without following local redirects', async () => {
    const response = new Response(null, { status: 204 })
    vi.mocked(fetch).mockResolvedValue(response)

    await expect(refreshOrderbook()).resolves.toBe(response)
    expect(fetch).toHaveBeenCalledWith('/obwatch/refreshorderbook', {
      method: 'POST',
      redirect: 'manual',
    })
  })
})
