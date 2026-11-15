import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { JamDisplayContextProvider } from '@/context/JamDisplayContextProvider'
import type { Jar } from '@/context/JamWalletInfoContext'
import type { Utxo } from '@/hooks/useQueryUtxos'
import type { JamFeeConfigValues } from '@/lib/feeConfig'
import { TX_FEE_UNITS } from '@/lib/feeConfig'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import PaymentConfirmDialog from './PaymentConfirmDialog'
import type { SendFormValues } from './types'

vi.mock('react-i18next', () => ({
  Trans: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../ui/jam/Address', () => ({
  Address: ({ value }: { value: string }) => <span>address:{value}</span>,
}))

const feeConfigValues: JamFeeConfigValues = {
  maxCjAbsoluteFee: 500,
  maxCjRelativeFee: 0.001,
  txFeeFactor: 0.2,
  txFee: {
    txFeeInBlocks: 3,
    txFeeUnit: TX_FEE_UNITS.BLOCKS,
  },
}

const sourceJar = {
  balanceSummary: {
    calculatedAvailableBalanceInSats: 25_000_000,
    calculatedTotalBalanceInSats: 25_000_000,
    calculatedConfirmedAvailableBalanceInSats: 25_000_000,
    calculatedAvailableFrozenBalanceInSats: 0,
    calculatedFrozenOrLockedBalanceInSats: 0,
  },
  color: '#c94f7c',
  jarIndex: 2,
  name: 'Cherry',
  utxos: [],
} as unknown as Jar

const sweepUtxo = {
  utxo: `${'ab'.repeat(32)}:0`,
  address: 'bcrt1qawrj5s6krgu688ev6relf0lwn044vmdxrfyn99',
  value: 25_000_000,
  frozen: false,
  locktime: undefined,
} as unknown as Utxo

// collaborative sweep of 25,000,000 sats with 10 collaborators:
// max collaborator fee is 10 × max(⌈25,000,000 × 0.001⌉, 500) = 250,000 sats (1%)
const sweepValues: SendFormValues = {
  amount: {
    amount: undefined,
    isSweep: true,
    sweepAmount: 25_000_000,
    sweepUtxos: [sweepUtxo.utxo],
  },
  destination: {
    address: 'bcrt1qvpvsjflmwvyam5zqsxger8sel63kjl5rcfs2nw',
    fromJar: undefined,
  },
  isCoinJoin: true,
  numCollaborators: 10,
  source: {
    fromJar: 2,
  },
  txFee: {
    txFeeInBlocks: 3,
    txFeeInSatsPerVbyte: undefined,
    txFeeUnit: TX_FEE_UNITS.BLOCKS,
  },
}

const renderDialog = () =>
  render(
    <JamDisplayContextProvider>
      <PaymentConfirmDialog
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        values={sweepValues}
        meta={{ feeConfigValues, sourceJar, availableUtxos: [sweepUtxo] }}
      />
    </JamDisplayContextProvider>,
  )

const collaboratorFeeRow = () => {
  const label = screen.getByText('send.confirm_send_modal.label_estimated_max_collaborator_fee')
  return label.nextElementSibling as HTMLElement
}

afterEach(() => {
  jamSettingsStore.getState().clear()
})

describe('PaymentConfirmDialog in private mode', () => {
  it('hides the collaborator fee when private mode is enabled', () => {
    jamSettingsStore.getState().update({ privateMode: true })

    renderDialog()

    expect(within(collaboratorFeeRow()).getByText('*****')).toBeInTheDocument()
    expect(document.querySelector('[data-raw-value]')).not.toBeInTheDocument()
  })

  it('reveals the collaborator fee on click when private mode is enabled', () => {
    jamSettingsStore.getState().update({ privateMode: true })

    renderDialog()

    fireEvent.click(within(collaboratorFeeRow()).getByRole('button', { name: 'settings.show_balance' }))

    expect(within(collaboratorFeeRow()).getByTestId('sats-amount')).toHaveAttribute('data-raw-value', '250000')
  })

  it('shows the collaborator fee when private mode is disabled', () => {
    jamSettingsStore.getState().update({ privateMode: false })

    renderDialog()

    expect(within(collaboratorFeeRow()).getByTestId('sats-amount')).toHaveAttribute('data-raw-value', '250000')
  })
})
