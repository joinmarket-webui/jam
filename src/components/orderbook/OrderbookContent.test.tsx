import type React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { OrderbookOffer } from '@/lib/api/orderbook'
import { OrderbookContent } from './OrderbookContent'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { t: (key: string) => key, language: 'en', resolvedLanguage: 'en' },
  }),
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString: string }) => <span data-testid="balance">{valueString}</span>,
}))

const offers = vi.hoisted(() => ({ current: [] as unknown[] }))

vi.mock('@/lib/api/orderbook', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/orderbook')>()),
  fetchOrderbook: () => Promise.resolve({ offers: offers.current, fidelitybonds: [] }),
}))

const TOTAL_LIQUIDITY_LABEL = 'orderbook.market_summary_total_liquidity_label:'

const offer = (counterparty: string, oid: number, maxsize: number, minsize = 27_300): OrderbookOffer => ({
  counterparty,
  oid,
  ordertype: oid % 2 === 0 ? 'sw0reloffer' : 'sw0absoffer',
  minsize,
  maxsize,
  txfee: 0,
  cjfee: oid % 2 === 0 ? '0.0001' : 100,
  fidelity_bond_value: 0,
})

const renderWithOffers = async (value: OrderbookOffer[]) => {
  offers.current = value
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <OrderbookContent enabled={true} />
    </QueryClientProvider>,
  )

  const row = await waitFor(() => {
    const element = screen.getByText(TOTAL_LIQUIDITY_LABEL).closest('p')
    if (!element) throw new Error('total liquidity not rendered')
    return element
  })
  return Number(row.querySelector('[data-testid="balance"]')?.textContent)
}

describe('OrderbookContent market summary', () => {
  it('sums the maximum offer size of every maker', async () => {
    const totalLiquidity = await renderWithOffers([
      offer('maker-a', 0, 1_000_000),
      offer('maker-b', 0, 2_500_000),
      offer('maker-c', 0, 300_000),
    ])

    expect(totalLiquidity).toBe(3_800_000)
  })

  it('counts a maker advertising the same size range twice only once', async () => {
    const totalLiquidity = await renderWithOffers([
      offer('dual-offer-maker', 0, 8_388_608),
      offer('dual-offer-maker', 1, 8_388_608),
      offer('maker-b', 0, 1_000_000),
    ])

    expect(totalLiquidity).toBe(9_388_608)
  })

  it('counts a maker tiling one balance across several bands once, by its largest offer', async () => {
    const totalLiquidity = await renderWithOffers([
      offer('tiling-maker', 0, 144_912, 27_400),
      offer('tiling-maker', 1, 379_588, 144_913),
      offer('tiling-maker', 2, 979_175, 379_589),
      offer('tiling-maker', 3, 41_643_514, 979_176),
      offer('maker-b', 0, 1_000_000),
    ])

    expect(totalLiquidity).toBe(42_643_514)
  })

  it('splits offers of a dual-offer maker across the relative and absolute size range', async () => {
    const totalLiquidity = await renderWithOffers([
      offer('split-range-maker', 0, 551_777, 200_000),
      offer('split-range-maker', 1, 200_000, 30_000),
    ])

    expect(totalLiquidity).toBe(551_777)
  })
})
