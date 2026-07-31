import type { Meta, StoryObj } from '@storybook/react-vite'
import { SweepPreconditionAlert } from '@/components/sweep/SweepPreconditionAlert'
import { SWEEP_PRECONDITION_DEFAULT_OPTIONS } from '@/components/sweep/preconditions'
import type { Utxo } from '@/hooks/useQueryUtxos'

const DEFAULT_SUMMARY = Object.freeze({
  isFulfilled: false,
  options: SWEEP_PRECONDITION_DEFAULT_OPTIONS,
  numberOfMissingUtxos: 0,
  numberOfMissingConfirmations: 0,
  numberOfNonFrozenFidelityBondOutputs: 0,
  retryLockedUtxos: [],
})

const makeUtxo = (overrides: Partial<Utxo> = {}): Utxo =>
  ({
    address: 'bc1qsource',
    confirmations: 6,
    frozen: false,
    label: '',
    locktime: undefined,
    mixdepth: 0,
    path: '',
    tries_remaining: 3,
    utxo: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b:0',
    value: 100_000,
    ...overrides,
  }) as Utxo

const meta: Meta<typeof SweepPreconditionAlert> = {
  title: 'Jam/SweepPreconditionAlert',
  component: SweepPreconditionAlert,
  tags: ['autodocs'],
  args: {
    summary: DEFAULT_SUMMARY,
  },
}
export default meta

type Story = StoryObj<typeof SweepPreconditionAlert>

export const Default: Story = {}

export const MissingUtxos: Story = {
  args: {
    summary: {
      ...DEFAULT_SUMMARY,
      numberOfMissingUtxos: 3,
    },
  },
}

export const MissingConfirmations: Story = {
  args: {
    summary: {
      ...DEFAULT_SUMMARY,
      numberOfMissingConfirmations: 3,
    },
  },
}

export const NonFrozenFidelityBondsPresent: Story = {
  args: {
    summary: {
      ...DEFAULT_SUMMARY,
      numberOfNonFrozenFidelityBondOutputs: 3,
    },
  },
}

export const RetryLockedUtxos: Story = {
  args: {
    summary: {
      ...DEFAULT_SUMMARY,
      retryLockedUtxos: [
        makeUtxo({
          mixdepth: 0,
          value: 21,
        }),
        makeUtxo({
          mixdepth: 1,
          value: 21_000,
        }),
        makeUtxo({
          mixdepth: 2,
          value: 21_000_000,
        }),
      ],
    },
  },
}

export const Multiple: Story = {
  args: {
    summary: {
      ...DEFAULT_SUMMARY,
      numberOfMissingUtxos: 3,
      numberOfMissingConfirmations: 3,
      numberOfNonFrozenFidelityBondOutputs: 3,
      retryLockedUtxos: [
        makeUtxo({
          mixdepth: 0,
          value: 21,
        }),
        makeUtxo({
          mixdepth: 1,
          value: 21_000,
        }),
        makeUtxo({
          mixdepth: 2,
          value: 21_000_000,
        }),
      ],
    },
  },
}
