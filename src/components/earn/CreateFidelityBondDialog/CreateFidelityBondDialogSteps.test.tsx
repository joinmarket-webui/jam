import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CreateFidelityBondDialogSteps } from './CreateFidelityBondDialogSteps'
import type { useCreateFidelityBondWizard } from './useCreateFidelityBondWizard'

type Wizard = ReturnType<typeof useCreateFidelityBondWizard>

vi.mock('react-i18next', () => ({
  Trans: ({ i18nKey, children }: { i18nKey?: string; children?: ReactNode }) => (
    <div data-testid={`trans-${i18nKey}`}>{children}</div>
  ),
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/components/ui/jam/BitcoinQrCode', () => ({
  BitcoinAddressQrCode: () => <div data-testid="qr-code">QR</div>,
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatSats: (sats: number) => `${sats} sats`,
  clamp: (val: number, min: number, max: number) => Math.min(Math.max(val, min), max),
}))

vi.mock('@/lib/fidelityBondUtils', () => ({
  utxo: {
    isFidelityBond: vi.fn(),
  },
}))

const getBaseWizard = (): Wizard =>
  ({
    step: 'select_date',
    setSelectedLockdate: vi.fn(),
    selectedLockdate: '2025-01',
    selectedYear: '2025',
    selectedMonth: '01',
    minYear: 2024,
    minMonth: 1,
    yearOptions: [{ value: '2025', label: '2025' }],
    monthOptions: [{ value: '01', label: 'Jan' }],
    clampLockdate: vi.fn((x: unknown) => x),
    hasDuplicateLockdate: false,
    selectedDateLabel: 'Jan 2025',
    selectedJarIndex: 0,
    setSelectedJarIndex: vi.fn(),
    jarsWithUtxos: [],
    selectedUtxos: [],
    availableUtxos: [],
    utxoPage: 0,
    setUtxoPage: vi.fn(),
    toggleUtxoSelection: vi.fn(),
    selectAllUtxos: vi.fn(),
    deselectAllUtxos: vi.fn(),
    totalAmount: 1000,
    isUsingAllFunds: false,
    utxosToFreeze: [],
    confirmationChecked: false,
    setConfirmationChecked: vi.fn(),
    address: 'bc1...',
    timelockAddressQuery: { isLoading: false },
    txResult: null,
    frozenUtxos: [],
    t: (key: string) => key,
  }) as unknown as Wizard

describe('CreateFidelityBondDialogSteps', () => {
  it('renders select_date step', () => {
    const wizard = getBaseWizard()
    render(<CreateFidelityBondDialogSteps wizard={wizard} />)

    expect(screen.getByText('earn.fidelity_bond.select_date.description')).toBeInTheDocument()
    expect(screen.getByText('earn.fidelity_bond.select_date.form_label_month')).toBeInTheDocument()
    expect(screen.getByText('Jan 2025')).toBeInTheDocument()
  })

  it('renders select_jar step with jars', () => {
    const wizard = getBaseWizard()
    wizard.step = 'select_jar'
    wizard.jarsWithUtxos = [
      {
        jarIndex: 0,
        name: 'Jar 0',
        color: '#000',
        balanceSummary: { calculatedAvailableBalanceInSats: 5000 },
        utxos: [],
      },
    ] as unknown as Wizard['jarsWithUtxos']
    render(<CreateFidelityBondDialogSteps wizard={wizard} />)

    expect(screen.getByText('earn.fidelity_bond.select_jar.title')).toBeInTheDocument()
    expect(screen.getByText('Jar 0')).toBeInTheDocument()
    expect(screen.getByText('5000 sats')).toBeInTheDocument()
  })

  it('renders select_utxos step', () => {
    const wizard = getBaseWizard()
    wizard.step = 'select_utxos'
    wizard.availableUtxos = [
      { utxo: 'tx1:0', value: 1000, confirmations: 10 },
      { utxo: 'tx2:0', value: 2000, confirmations: 20 },
    ] as unknown as Wizard['availableUtxos']
    render(<CreateFidelityBondDialogSteps wizard={wizard} />)

    expect(screen.getByText('earn.fidelity_bond.select_utxos.title')).toBeInTheDocument()
    expect(screen.getByText('tx1:0')).toBeInTheDocument()
    expect(screen.getByText('tx2:0')).toBeInTheDocument()
  })

  it('renders freeze_utxos step', () => {
    const wizard = getBaseWizard()
    wizard.step = 'freeze_utxos'
    wizard.selectedUtxos = [{ utxo: 'tx1:0', value: 1000 }] as unknown as Wizard['selectedUtxos']
    wizard.utxosToFreeze = [{ utxo: 'tx1:0', value: 1000 }] as unknown as Wizard['utxosToFreeze']
    render(<CreateFidelityBondDialogSteps wizard={wizard} />)

    expect(screen.getByText('earn.fidelity_bond.freeze_utxos.title')).toBeInTheDocument()
    expect(screen.getByText('earn.fidelity_bond.freeze_utxos.label_selected_utxos')).toBeInTheDocument()
    expect(screen.getByText('earn.fidelity_bond.freeze_utxos.label_utxos_to_freeze')).toBeInTheDocument()
  })

  it('renders review step', () => {
    const wizard = getBaseWizard()
    wizard.step = 'review'
    render(<CreateFidelityBondDialogSteps wizard={wizard} />)

    expect(screen.getByText('earn.fidelity_bond.review_inputs.label_lock_date')).toBeInTheDocument()
    expect(screen.getByText('bc1...')).toBeInTheDocument()
    expect(screen.getByTestId('qr-code')).toBeInTheDocument()
  })

  it('renders creating step', () => {
    const wizard = getBaseWizard()
    wizard.step = 'creating'
    render(<CreateFidelityBondDialogSteps wizard={wizard} />)

    expect(screen.getByText('earn.fidelity_bond.text_creating')).toBeInTheDocument()
  })

  it('renders success step', () => {
    const wizard = getBaseWizard()
    wizard.step = 'success'
    wizard.txResult = { txinfo: { txid: '1234abcd' } }
    render(<CreateFidelityBondDialogSteps wizard={wizard} />)

    expect(screen.getByText('earn.fidelity_bond.create_fidelity_bond.success_text')).toBeInTheDocument()
    expect(screen.getByText('1234abcd')).toBeInTheDocument()
  })
})
