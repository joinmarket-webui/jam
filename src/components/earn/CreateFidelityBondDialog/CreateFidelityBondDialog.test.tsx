import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CreateFidelityBondDialog } from './CreateFidelityBondDialog'

const mockWizard = {
  step: 'select_date',
  error: null,
  frozenUtxos: [],
  utxosToFreeze: [] as unknown[],
  freezeUtxo: { isPending: false },
  unfreezeUtxo: { isPending: false },
  directSend: { isPending: false },
  handleOpenChange: vi.fn(),
  handleBack: vi.fn(),
  handleNext: vi.fn(),
  handleUnfreezeUtxos: vi.fn(),
  canProceed: () => true,
  getStepNumber: () => 0,
  t: (key: string) => key,
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('./useCreateFidelityBondWizard', () => ({
  useCreateFidelityBondWizard: () => mockWizard,
}))

vi.mock('./CreateFidelityBondDialogSteps', () => ({
  CreateFidelityBondDialogSteps: () => <div data-testid="steps-component">Steps Component</div>,
}))

vi.mock('./StepProgress', () => ({
  StepProgress: ({ currentStep }: { currentStep: number }) => <div data-testid="step-progress">{currentStep}</div>,
}))

describe('CreateFidelityBondDialog', () => {
  it('renders correctly on first step', () => {
    render(<CreateFidelityBondDialog open={true} onOpenChange={vi.fn()} walletFileName="wallet.jmdat" />)

    expect(screen.getByText('earn.fidelity_bond.create_fidelity_bond.title')).toBeInTheDocument()
    expect(screen.getByTestId('steps-component')).toBeInTheDocument()
    expect(screen.getByTestId('step-progress')).toHaveTextContent('0')

    // Check buttons
    expect(screen.queryByText('global.back')).not.toBeInTheDocument()
    expect(screen.getByText('earn.fidelity_bond.select_date.text_secondary_button')).toBeInTheDocument()
    expect(screen.getByText('earn.fidelity_bond.select_date.text_primary_button')).toBeInTheDocument()
  })

  it('renders correctly on review step', () => {
    mockWizard.step = 'review'
    mockWizard.getStepNumber = () => 3

    render(<CreateFidelityBondDialog open={true} onOpenChange={vi.fn()} walletFileName="wallet.jmdat" />)

    expect(screen.getByText('global.back')).toBeInTheDocument()
    expect(screen.getByText('earn.fidelity_bond.review_inputs.text_primary_button')).toBeInTheDocument()
  })

  it('renders correctly on success step', () => {
    mockWizard.step = 'success'

    render(<CreateFidelityBondDialog open={true} onOpenChange={vi.fn()} walletFileName="wallet.jmdat" />)

    expect(screen.queryByTestId('step-progress')).not.toBeInTheDocument()
    expect(screen.getByText('earn.fidelity_bond.create_fidelity_bond.text_primary_button')).toBeInTheDocument()
  })

  it('renders correctly on freeze_utxos step', () => {
    mockWizard.step = 'freeze_utxos'

    render(<CreateFidelityBondDialog open={true} onOpenChange={vi.fn()} walletFileName="wallet.jmdat" />)

    expect(screen.getByText('earn.fidelity_bond.freeze_utxos.text_primary_button_all_frozen')).toBeInTheDocument()

    mockWizard.utxosToFreeze = [{}]
    render(<CreateFidelityBondDialog open={true} onOpenChange={vi.fn()} walletFileName="wallet.jmdat" />)

    expect(screen.getByText('earn.fidelity_bond.freeze_utxos.text_primary_button')).toBeInTheDocument()
  })
})
