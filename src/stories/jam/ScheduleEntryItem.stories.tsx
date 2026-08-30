import type { TumblerPhaseResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ScheduleEntryItem } from '@/components/sweep/ScheduleEntryItem'
import { toScheduleEntry } from '@/components/sweep/scheduleUtils'
import type { Jar } from '@/context/JamWalletInfoContext'

const meta: Meta<typeof ScheduleEntryItem> = {
  title: 'Jam/ScheduleEntryItem',
  component: ScheduleEntryItem,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof ScheduleEntryItem>

const jars: Jar[] = [
  {
    balanceSummary: {
      calculatedAvailableBalanceInSats: 100_000,
      calculatedConfirmedAvailableBalanceInSats: 100_000,
      calculatedAvailableFrozenBalanceInSats: 0,
      calculatedFrozenOrLockedBalanceInSats: 0,
      calculatedTotalBalanceInSats: 100_000,
    },
    color: '#e2b86a',
    jarIndex: 0,
    name: 'Jar Zero',
    utxos: [],
  },
]

const takerPhase: TumblerPhaseResponse = {
  kind: 'taker_coinjoin',
  index: 0,
  status: 'running',
  wait_seconds: 20.8818214051562,
  started_at: '2026-07-19T10:35:52.775747+00:00',
  finished_at: null,
  error: null,
  mixdepth: jars[0].jarIndex,
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

export const Maker: Story = {
  args: {
    value: toScheduleEntry(makerPhase, jars),
  },
}

export const Active: Story = {
  args: {
    value: toScheduleEntry(takerPhase, jars),
    active: true,
  },
}

export const ActiveExternal: Story = {
  args: {
    value: toScheduleEntry(
      {
        ...takerPhase,
        destination: 'bcrt1qdestinationaddress123456789',
      },
      jars,
    ),
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
      jars,
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
      jars,
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
        finished_at: '2026-07-19T10:35:52.775747+00:00',
      },
      jars,
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
      jars,
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
      jars,
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
      jars,
    ),
    active: false,
  },
}
