import type { TumblerPhaseResponse } from '@joinmarket-webui/joinmarket-ng-api-ts/jm'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ScheduleEntryItem } from '@/components/sweep/ScheduleEntryItem'
import { toScheduleEntry } from '@/components/sweep/scheduleUtils'

const meta: Meta<typeof ScheduleEntryItem> = {
  title: 'Jam/ScheduleEntryItem',
  component: ScheduleEntryItem,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof ScheduleEntryItem>

const takerPhase: TumblerPhaseResponse = {
  kind: 'taker_coinjoin',
  index: 0,
  status: 'running',
  wait_seconds: 20.8818214051562,
  started_at: '2026-07-19T10:35:52.775747+00:00',
  finished_at: null,
  error: null,
  mixdepth: 0,
  amount: 0,
  amount_fraction: null,
  counterparty_count: 21,
  destination: 'INTERNAL',
  txid: null,
  duration_seconds: null,
  target_cj_count: null,
  idle_timeout_seconds: null,
  cj_served: null,
  attempt_count: 0,
}

const makerPhase: TumblerPhaseResponse = {
  kind: 'maker_session',
  index: 4,
  status: 'pending',
  wait_seconds: 1.5946546346591093,
  started_at: null,
  finished_at: null,
  error: null,
  mixdepth: null,
  amount: null,
  amount_fraction: null,
  counterparty_count: null,
  destination: null,
  txid: null,
  duration_seconds: 43200,
  target_cj_count: null,
  idle_timeout_seconds: 60,
  cj_served: 0,
  attempt_count: 0,
}

export const Active: Story = {
  args: {
    value: toScheduleEntry(takerPhase, []),
    active: true,
  },
}

export const Running: Story = {
  args: {
    value: toScheduleEntry(
      {
        ...takerPhase,
        status: 'running',
      },
      [],
    ),
    active: false,
  },
}

export const Pending: Story = {
  args: {
    value: toScheduleEntry(
      {
        ...takerPhase,
        status: 'pending',
      },
      [],
    ),
    active: false,
  },
}

export const Completed: Story = {
  args: {
    value: toScheduleEntry(
      {
        ...takerPhase,
        status: 'completed',
      },
      [],
    ),
    active: false,
  },
}

export const Skipped: Story = {
  args: {
    value: toScheduleEntry(
      {
        ...takerPhase,
        status: 'skipped',
      },
      [],
    ),
    active: false,
  },
}

export const Cancelled: Story = {
  args: {
    value: toScheduleEntry(
      {
        ...takerPhase,
        status: 'cancelled',
      },
      [],
    ),
    active: false,
  },
}

export const Failed: Story = {
  args: {
    value: toScheduleEntry(
      {
        ...takerPhase,
        status: 'failed',
        error: 'Error description',
      },
      [],
    ),
    active: false,
  },
}

export const Maker: Story = {
  args: {
    value: toScheduleEntry(makerPhase, []),
  },
}
