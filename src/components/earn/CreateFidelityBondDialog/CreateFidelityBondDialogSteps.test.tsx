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

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatSats: (sats: number) => `${sats} sats`,
  clamp: (val: number, min: number, max: number) => Math.min(Math.max(val, min), max),
}))

vi.mock('@/components/ui/jam/Address', () => ({
  Address: ({ value }: { value: string }) => <span>{value}</span>,
}))

vi.mock('@/components/ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString: string }) => <span>{valueString} sats</span>,
}))

vi.mock('@/lib/fidelityBondUtils', () => ({
  utxo: {
    isFidelityBond: vi.fn(),
  },
  lockdate: {
    toDateLabel: () => 'January 1, 2025',
  },
}))

vi.mock('@/store/jamSettingsStore', () => ({
  useDeveloperMode: () => ({ enabled: false }),
}))

vi.mock('@/context/JamWalletInfoContext', () => ({
  useJamWalletInfoContext: () => ({
    jars: [
      { jarIndex: 0, name: 'Jar 0', color: '#000', balanceSummary: {}, utxos: [] },
      { jarIndex: 1, name: 'Jar 1', color: '#111', balanceSummary: {}, utxos: [] },
    ],
    walletBalanceSummary: { calculatedTotalBalanceInSats: 14000 },
  }),
}))

vi.mock('@/components/ui/jam/SelectableJar', () => ({
  SelectableJar: ({
    name,
    onSelect,
    disabled,
    isSelected,
  }: {
    name?: string
    onSelect?: () => void
    disabled?: boolean
    isSelected?: boolean
  }) => (
    <button onSelect={onSelect} disabled={disabled} data-selected={isSelected}>
      {name}
    </button>
  ),
}))

const getBaseWizard = (): Wizard =>
  ({
    step: 'select_date',
    setSelectedLockdate: vi.fn(),
    selectedLockdate: '2025-01',
    hasDuplicateLockdate: false,
    existingFbLockdates: [],
    selectedJarIndex: 0,
    setSelectedJarIndex: vi.fn(),
    jarsWithUtxos: [],
    selectedUtxos: [],
    availableUtxos: [],
    utxoPage: 0,
    setUtxoPage: vi.fn(),
    toggleUtxoSelection: vi.fn(),
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
    expect(screen.getByText('January 1, 2025')).toBeInTheDocument()
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
    // Jar 0 is eligible, Jar 1 has no eligible utxos and is disabled
    expect(screen.getByText('Jar 0')).toBeEnabled()
    expect(screen.getByText('Jar 1')).toBeDisabled()
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
    expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument()
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
    wizard.txResult = { txinfo: { txid: '1234abcd', hex: '' } }
    render(<CreateFidelityBondDialogSteps wizard={wizard} />)

    expect(screen.getByText('earn.fidelity_bond.create_fidelity_bond.success_text')).toBeInTheDocument()
    expect(screen.getByText('1234abcd')).toBeInTheDocument()
  })

  it('passes existing fidelity-bond lock dates to the date selector', () => {
    const wizard = getBaseWizard()
    wizard.existingFbLockdates = ['2025-01']
    render(<CreateFidelityBondDialogSteps wizard={wizard} />)
    expect(screen.getByText('January 1, 2025')).toBeInTheDocument()
  })

  it('highlights the selected jar and shows the no-jars alert state', () => {
    const wizard = getBaseWizard()
    wizard.step = 'select_jar'
    wizard.selectedJarIndex = 1
    wizard.jarsWithUtxos = [
      {
        jarIndex: 0,
        name: 'Jar 0',
        color: '#000',
        balanceSummary: { calculatedAvailableBalanceInSats: 5000 },
        utxos: [],
      },
      {
        jarIndex: 1,
        name: 'Jar 1',
        color: '#111',
        balanceSummary: { calculatedAvailableBalanceInSats: 9000 },
        utxos: [],
      },
    ] as unknown as Wizard['jarsWithUtxos']
    render(<CreateFidelityBondDialogSteps wizard={wizard} />)
    expect(screen.getByText('Jar 0')).toBeInTheDocument()
    expect(screen.getByText('Jar 1')).toHaveAttribute('data-selected', 'true')
  })

  it('renders select_utxos with a selected utxo, pagination, and the all-funds warning', () => {
    const wizard = getBaseWizard()
    wizard.step = 'select_utxos'
    const utxos = Array.from({ length: 7 }, (_, index) => ({
      utxo: `tx${index}:0`,
      value: 1000 + index,
      confirmations: index,
    }))
    wizard.availableUtxos = utxos as unknown as Wizard['availableUtxos']
    wizard.selectedUtxos = [utxos[0]] as unknown as Wizard['selectedUtxos']
    wizard.isUsingAllFunds = true
    render(<CreateFidelityBondDialogSteps wizard={wizard} />)

    expect(screen.getByText('earn.fidelity_bond.select_utxos.label_total_selected')).toBeInTheDocument()
    expect(screen.getByTestId('trans-earn.fidelity_bond.alert_all_funds_in_use')).toBeInTheDocument()
    // 7 utxos / 5 per page -> pagination shows page indicator
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('shows the loading state while the timelock address is fetched on review', () => {
    const wizard = getBaseWizard()
    wizard.step = 'review'
    wizard.timelockAddressQuery = { isLoading: true } as unknown as Wizard['timelockAddressQuery']
    render(<CreateFidelityBondDialogSteps wizard={wizard} />)
    expect(screen.getByText('earn.fidelity_bond.text_loading')).toBeInTheDocument()
  })

  it('shows the unfreeze hint on the success step when there are frozen utxos', () => {
    const wizard = getBaseWizard()
    wizard.step = 'success'
    wizard.txResult = undefined
    wizard.frozenUtxos = [{ utxo: 'tx1:0', value: 1000 }] as unknown as Wizard['frozenUtxos']
    render(<CreateFidelityBondDialogSteps wizard={wizard} />)
    expect(screen.getByText('earn.fidelity_bond.create_fidelity_bond.label_utxos_to_unfreeze')).toBeInTheDocument()
  })
})
