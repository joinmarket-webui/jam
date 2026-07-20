import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SweepScheduleProgress } from './SweepScheduleProgress'
import { toSchedule } from './scheduleUtils'

vi.mock('react-i18next', () => ({
  Trans: ({ i18nKey, values }: { i18nKey: string; values?: Record<string, unknown> }) => (
    <span>
      {i18nKey}
      {values ? `:${JSON.stringify(values)}` : ''}
    </span>
  ),
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key),
  }),
}))

vi.mock('../ui/jam/Address', () => ({
  Address: ({ value }: { value?: string }) => <span data-testid="address">{value}</span>,
}))

describe('SweepScheduleProgress', () => {
  it('renders active schedule progress and stops it', () => {
    const schedule = toSchedule(
      {
        plan_id: 'any',
        wallet_name: 'wallet.jmdat',
        status: 'running',
        destinations: ['final-destination'],
        current_phase: 0,
        phases: [
          {
            kind: 'taker_coinjoin',
            index: 0,
            status: 'completed',
            wait_seconds: 80 * 60,
            started_at: '2026-07-19T10:35:52.775747+00:00',
            finished_at: '2026-07-19T10:36:17.645587+00:00',
            error: null,
            mixdepth: 0,
            amount: 0,
            amount_fraction: null,
            counterparty_count: 8,
            destination: 'INTERNAL',
            txid: '1'.repeat(64),
            duration_seconds: null,
            target_cj_count: null,
            idle_timeout_seconds: null,
            cj_served: null,
            attempt_count: 0,
          },
          {
            kind: 'taker_coinjoin',
            index: 1,
            status: 'running',
            wait_seconds: 5 * 60,
            started_at: '2026-07-19T10:39:11.684475+00:00',
            finished_at: null,
            error: null,
            mixdepth: 1,
            amount: 0,
            amount_fraction: null,
            counterparty_count: 8,
            destination: 'INTERNAL',
            txid: '2'.repeat(64),
            duration_seconds: null,
            target_cj_count: null,
            idle_timeout_seconds: null,
            cj_served: null,
            attempt_count: 0,
          },
          {
            kind: 'taker_coinjoin',
            index: 2,
            status: 'pending',
            wait_seconds: 0,
            started_at: null,
            finished_at: null,
            error: null,
            mixdepth: 2,
            amount: 0,
            amount_fraction: null,
            counterparty_count: 8,
            destination: 'final-destination',
            txid: null,
            duration_seconds: null,
            target_cj_count: null,
            idle_timeout_seconds: null,
            cj_served: null,
            attempt_count: 0,
          },
        ],
        created_at: '2009-01-03T10:35:51.466560+00:00',
        updated_at: '2009-01-03T10:35:52.775780+00:00',
        error: null,
        stale: false,
      },
      [],
    )

    render(<SweepScheduleProgress schedule={schedule} />)

    expect(screen.getByText('scheduler.progress_tldr_hours:{"length":"3","hours":"5"}')).toBeInTheDocument()
    expect(screen.getByText(/scheduler.progress_current_state_waiting_confirmation_title/u)).toBeInTheDocument()
    expect(screen.getByText(/scheduler.progress_current_state_waiting_confirmation_description/u)).toBeInTheDocument()
  })

  it('shows completed schedule', () => {
    const schedule = toSchedule(
      {
        plan_id: 'any',
        wallet_name: 'wallet.jmdat',
        status: 'completed',
        destinations: ['final-destination'],
        current_phase: 1,
        phases: [
          {
            kind: 'taker_coinjoin',
            index: 0,
            status: 'completed',
            wait_seconds: 60,
            started_at: '2026-07-19T10:35:52.775747+00:00',
            finished_at: '2026-07-19T10:36:17.645587+00:00',
            error: null,
            mixdepth: 0,
            amount: 0,
            amount_fraction: null,
            counterparty_count: 8,
            destination: 'INTERNAL',
            txid: '1'.repeat(64),
            duration_seconds: null,
            target_cj_count: null,
            idle_timeout_seconds: null,
            cj_served: null,
            attempt_count: 0,
          },
          {
            kind: 'taker_coinjoin',
            index: 1,
            status: 'completed',
            wait_seconds: 0,
            started_at: '2026-07-19T11:35:52.775747+00:00',
            finished_at: '2026-07-19T11:36:17.645587+00:00',
            error: null,
            mixdepth: 2,
            amount: 0,
            amount_fraction: null,
            counterparty_count: 8,
            destination: 'final-destination',
            txid: null,
            duration_seconds: null,
            target_cj_count: null,
            idle_timeout_seconds: null,
            cj_served: null,
            attempt_count: 0,
          },
        ],
        created_at: '2009-01-03T10:35:51.466560+00:00',
        updated_at: '2009-01-03T10:35:52.775780+00:00',
        error: null,
        stale: false,
      },
      [],
    )

    render(<SweepScheduleProgress schedule={schedule} />)

    expect(screen.getByText('scheduler.progress_tldr_hours:{"length":"2","hours":"3"}')).toBeInTheDocument()
    expect(screen.getByText('Scheduled sweep finished successfully.')).toBeInTheDocument()
  })

  it('shows failed schedule', () => {
    const schedule = toSchedule(
      {
        plan_id: 'any',
        wallet_name: 'wallet.jmdat',
        status: 'failed',
        destinations: ['final-destination'],
        current_phase: 1,
        phases: [
          {
            kind: 'taker_coinjoin',
            index: 0,
            status: 'completed',
            wait_seconds: 30,
            started_at: '2026-07-19T10:35:52.775747+00:00',
            finished_at: '2026-07-19T10:36:17.645587+00:00',
            error: null,
            mixdepth: 0,
            amount: 0,
            amount_fraction: null,
            counterparty_count: 8,
            destination: 'INTERNAL',
            txid: '1'.repeat(64),
            duration_seconds: null,
            target_cj_count: null,
            idle_timeout_seconds: null,
            cj_served: null,
            attempt_count: 0,
          },
          {
            kind: 'taker_coinjoin',
            index: 1,
            status: 'failed',
            wait_seconds: 0,
            started_at: '2026-07-19T11:35:52.775747+00:00',
            finished_at: '2026-07-19T11:36:17.645587+00:00',
            error: null,
            mixdepth: 2,
            amount: 0,
            amount_fraction: null,
            counterparty_count: 8,
            destination: 'final-destination',
            txid: null,
            duration_seconds: null,
            target_cj_count: null,
            idle_timeout_seconds: null,
            cj_served: null,
            attempt_count: 0,
          },
        ],
        created_at: '2009-01-03T10:35:51.466560+00:00',
        updated_at: '2009-01-03T10:35:52.775780+00:00',
        error: null,
        stale: false,
      },
      [],
    )

    render(<SweepScheduleProgress schedule={schedule} />)

    expect(screen.getByText('scheduler.progress_tldr_hours:{"length":"2","hours":"3"}')).toBeInTheDocument()
    expect(screen.getByText('Scheduled sweep failed.')).toBeInTheDocument()
  })

  it('shows cancelled schedule', () => {
    const schedule = toSchedule(
      {
        plan_id: 'any',
        wallet_name: 'wallet.jmdat',
        status: 'cancelled',
        destinations: ['final-destination'],
        current_phase: 1,
        phases: [
          {
            kind: 'taker_coinjoin',
            index: 0,
            status: 'completed',
            wait_seconds: 30,
            started_at: '2026-07-19T10:35:52.775747+00:00',
            finished_at: '2026-07-19T10:36:17.645587+00:00',
            error: null,
            mixdepth: 0,
            amount: 0,
            amount_fraction: null,
            counterparty_count: 8,
            destination: 'INTERNAL',
            txid: '1'.repeat(64),
            duration_seconds: null,
            target_cj_count: null,
            idle_timeout_seconds: null,
            cj_served: null,
            attempt_count: 0,
          },
          {
            kind: 'taker_coinjoin',
            index: 1,
            status: 'cancelled',
            wait_seconds: 0,
            started_at: '2026-07-19T11:35:52.775747+00:00',
            finished_at: '2026-07-19T11:36:17.645587+00:00',
            error: null,
            mixdepth: 2,
            amount: 0,
            amount_fraction: null,
            counterparty_count: 8,
            destination: 'final-destination',
            txid: null,
            duration_seconds: null,
            target_cj_count: null,
            idle_timeout_seconds: null,
            cj_served: null,
            attempt_count: 0,
          },
        ],
        created_at: '2009-01-03T10:35:51.466560+00:00',
        updated_at: '2009-01-03T10:35:52.775780+00:00',
        error: null,
        stale: false,
      },
      [],
    )

    render(<SweepScheduleProgress schedule={schedule} />)

    expect(screen.getByText('scheduler.progress_tldr_hours:{"length":"2","hours":"3"}')).toBeInTheDocument()
    expect(screen.getByText('Scheduled sweep cancelled.')).toBeInTheDocument()
  })
})
