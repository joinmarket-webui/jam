import type { Meta, StoryObj } from '@storybook/react-vite'
import { SWEEP_PRECONDITION_DEFAULT_OPTIONS } from '@/components/sweep/preconditions'
import { PreconditionAlert } from '@/components/ui/jam/PreconditionAlert'
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
    utxo: `txid:${overrides.value ?? 0}`,
    value: 100_000,
    ...overrides,
  }) as Utxo

const meta: Meta<typeof PreconditionAlert> = {
  title: 'Jam/PreconditionAlert',
  component: PreconditionAlert,
  tags: ['autodocs'],
  args: {
    summary: DEFAULT_SUMMARY,
    i18nPrefix: 'send.coinjoin_precondition',
  },
}
export default meta

type Story = StoryObj<typeof PreconditionAlert>

// --- Send Flow Stories ---

export const SendDefault: Story = {
  args: {
    i18nPrefix: 'send.coinjoin_precondition',
  },
}

export const SendMissingUtxos: Story = {
  args: {
    i18nPrefix: 'send.coinjoin_precondition',
    summary: {
      ...DEFAULT_SUMMARY,
      numberOfMissingUtxos: 3,
    },
  },
}

export const SendMissingConfirmations: Story = {
  args: {
    i18nPrefix: 'send.coinjoin_precondition',
    summary: {
      ...DEFAULT_SUMMARY,
      numberOfMissingConfirmations: 3,
    },
  },
}

export const SendNonFrozenFidelityBondsPresent: Story = {
  args: {
    i18nPrefix: 'send.coinjoin_precondition',
    summary: {
      ...DEFAULT_SUMMARY,
      numberOfNonFrozenFidelityBondOutputs: 3,
    },
  },
}

export const SendRetryLockedUtxos: Story = {
  args: {
    i18nPrefix: 'send.coinjoin_precondition',
    summary: {
      ...DEFAULT_SUMMARY,
      retryLockedUtxos: [
        makeUtxo({ mixdepth: 0, value: 21 }),
        makeUtxo({ mixdepth: 1, value: 21_000 }),
        makeUtxo({ mixdepth: 2, value: 21_000_000 }),
      ],
    },
  },
}

export const SendMultiple: Story = {
  args: {
    i18nPrefix: 'send.coinjoin_precondition',
    summary: {
      ...DEFAULT_SUMMARY,
      numberOfMissingUtxos: 3,
      numberOfMissingConfirmations: 3,
      numberOfNonFrozenFidelityBondOutputs: 3,
      retryLockedUtxos: [
        makeUtxo({ mixdepth: 0, value: 21 }),
        makeUtxo({ mixdepth: 1, value: 21_000 }),
        makeUtxo({ mixdepth: 2, value: 21_000_000 }),
      ],
    },
  },
}

// --- Sweep Flow Stories ---

export const SweepDefault: Story = {
  args: {
    i18nPrefix: 'scheduler.precondition',
  },
}

export const SweepMissingUtxos: Story = {
  args: {
    i18nPrefix: 'scheduler.precondition',
    summary: {
      ...DEFAULT_SUMMARY,
      numberOfMissingUtxos: 3,
    },
  },
}

export const SweepMissingConfirmations: Story = {
  args: {
    i18nPrefix: 'scheduler.precondition',
    summary: {
      ...DEFAULT_SUMMARY,
      numberOfMissingConfirmations: 3,
    },
  },
}

export const SweepNonFrozenFidelityBondsPresent: Story = {
  args: {
    i18nPrefix: 'scheduler.precondition',
    summary: {
      ...DEFAULT_SUMMARY,
      numberOfNonFrozenFidelityBondOutputs: 3,
    },
  },
}

export const SweepRetryLockedUtxos: Story = {
  args: {
    i18nPrefix: 'scheduler.precondition',
    summary: {
      ...DEFAULT_SUMMARY,
      retryLockedUtxos: [
        makeUtxo({ mixdepth: 0, value: 21 }),
        makeUtxo({ mixdepth: 1, value: 21_000 }),
        makeUtxo({ mixdepth: 2, value: 21_000_000 }),
      ],
    },
  },
}

export const SweepMultiple: Story = {
  args: {
    i18nPrefix: 'scheduler.precondition',
    summary: {
      ...DEFAULT_SUMMARY,
      numberOfMissingUtxos: 3,
      numberOfMissingConfirmations: 3,
      numberOfNonFrozenFidelityBondOutputs: 3,
      retryLockedUtxos: [
        makeUtxo({ mixdepth: 0, value: 21 }),
        makeUtxo({ mixdepth: 1, value: 21_000 }),
        makeUtxo({ mixdepth: 2, value: 21_000_000 }),
      ],
    },
  },
}
