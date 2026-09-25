import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import i18n from '@/i18n/config'
import { ScheduleEntryItem } from './ScheduleEntryItem'
import { toScheduleEntry } from './scheduleUtils'

describe('ScheduleEntryItem', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  it('renders singular "counterparty" when numberOfRequestedCounterparties is 1', () => {
    const entry = toScheduleEntry(
      {
        index: 0,
        kind: 'taker_coinjoin',
        status: 'running',
        wait_seconds: 0,
        started_at: '2026-07-19T10:35:52.775747+00:00',
        finished_at: null,
        error: null,
        mixdepth: 0,
        amount: 0,
        amount_fraction: null,
        counterparty_count: 1,
        destination: 'INTERNAL',
        txid: null,
        duration_seconds: null,
        target_cj_count: null,
        idle_timeout_seconds: null,
        cj_served: null,
        attempt_count: 0,
      },
      [],
    )

    render(<ScheduleEntryItem value={entry} active={true} />)

    const desc = document.querySelector('[data-slot="item-description"]')
    expect(desc?.textContent).toContain('with 1 counterparty')
    expect(desc?.textContent).not.toContain('with 1 counterparties')
  })

  it('renders plural "counterparties" when numberOfRequestedCounterparties is greater than 1', () => {
    const entry = toScheduleEntry(
      {
        index: 0,
        kind: 'taker_coinjoin',
        status: 'running',
        wait_seconds: 0,
        started_at: '2026-07-19T10:35:52.775747+00:00',
        finished_at: null,
        error: null,
        mixdepth: 0,
        amount: 0,
        amount_fraction: null,
        counterparty_count: 5,
        destination: 'INTERNAL',
        txid: null,
        duration_seconds: null,
        target_cj_count: null,
        idle_timeout_seconds: null,
        cj_served: null,
        attempt_count: 0,
      },
      [],
    )

    render(<ScheduleEntryItem value={entry} active={true} />)

    const desc = document.querySelector('[data-slot="item-description"]')
    expect(desc?.textContent).toContain('with 5 counterparties')
  })

  it('renders maker session description when kind is maker_session', () => {
    const entry = toScheduleEntry(
      {
        index: 0,
        kind: 'maker_session',
        status: 'running',
        wait_seconds: 0,
        started_at: '2026-07-19T10:35:52.775747+00:00',
        finished_at: null,
        error: null,
        mixdepth: 0,
        amount: 0,
        amount_fraction: null,
        counterparty_count: null,
        destination: null,
        txid: null,
        duration_seconds: 120,
        target_cj_count: 3,
        idle_timeout_seconds: null,
        cj_served: null,
        attempt_count: 0,
      },
      [],
    )

    render(<ScheduleEntryItem value={entry} active={true} />)

    const desc = document.querySelector('[data-slot="item-description"]')
    expect(desc?.textContent).toContain('A collaborative transaction as')
    expect(screen.getByText('maker')).toBeInTheDocument()
  })
})
