import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SweepScheduleProgress } from './SweepScheduleProgress'
import type { Schedule } from './scheduleUtils'

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
  it('renders active schedule progress and stops it', async () => {
    const user = userEvent.setup()
    const onStop = vi.fn().mockResolvedValue(undefined)
    const schedule: Schedule = [
      {
        kind: 'taker_coinjoin',
        jarIndex: 0,
        amountFraction: 0,
        numberOfRequestedCounterparties: 8,
        internal: true,
        waitTimeInSeconds: 80 * 60,
        stateFlag: 1,
      },
      {
        kind: 'taker_coinjoin',
        jarIndex: 1,
        amountFraction: 0,
        numberOfRequestedCounterparties: 8,
        externalDestinationAddress: 'tx-destination',
        waitTimeInSeconds: 5 * 60,
        stateFlag: '8'.repeat(64),
      },
      {
        kind: 'taker_coinjoin',
        jarIndex: 2,
        amountFraction: 0,
        numberOfRequestedCounterparties: 8,
        externalDestinationAddress: 'final-destination',
        waitTimeInSeconds: 0,
        stateFlag: 0,
      },
    ]

    render(<SweepScheduleProgress schedule={schedule} isStopping={false} onStop={onStop} />)

    expect(screen.getByText(/scheduler.progress_tldr_hours/u)).toBeInTheDocument()
    expect(screen.getByText(/scheduler.progress_current_state_waiting_confirmation/u)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'scheduler.button_stop' }))
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('shows done and stopping states', () => {
    const schedule: Schedule = [
      {
        kind: 'taker_coinjoin',
        jarIndex: 0,
        amountFraction: 0,
        numberOfRequestedCounterparties: 8,
        internal: true,
        waitTimeInSeconds: 15,
        stateFlag: 1,
      },
      {
        kind: 'taker_coinjoin',
        jarIndex: 1,
        amountFraction: 0,
        numberOfRequestedCounterparties: 8,
        externalDestinationAddress: 'final-destination',
        waitTimeInSeconds: 0,
        stateFlag: 1,
      },
    ]

    const { rerender } = render(<SweepScheduleProgress schedule={schedule} isStopping={false} onStop={vi.fn()} />)

    expect(screen.getByText(/scheduler.progress_tldr_seconds/u)).toBeInTheDocument()
    expect(screen.getByText('scheduler.progress_done')).toBeInTheDocument()

    rerender(<SweepScheduleProgress schedule={schedule} isStopping onStop={vi.fn()} />)
    expect(screen.getByRole('button', { name: /scheduler\.button_stop/u })).toBeDisabled()
  })
})
