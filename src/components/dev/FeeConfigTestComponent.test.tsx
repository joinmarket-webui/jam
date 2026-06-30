import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FeeConfigTestComponent } from './FeeConfigTestComponent'

vi.mock('@/hooks/useFeeConfigValidation', () => ({
  useFeeConfigValidation: () => ({}),
}))

vi.mock('@/components/settings/fees/FeeConfigDialog', () => ({
  FeeConfigDialog: ({ open }: { open?: boolean }) => <div data-testid="fee-config-dialog" data-open={open} />,
}))

vi.mock('@/components/ui/jam/FeeConfigErrorAlert', () => ({
  FeeConfigErrorAlert: ({ onOpenFeeConfig }: { onOpenFeeConfig: () => void }) => (
    <div data-testid="fee-config-error-alert">
      <button onClick={onOpenFeeConfig}>Open Error Alert Dialog</button>
    </div>
  ),
}))

describe('FeeConfigTestComponent', () => {
  it('renders correctly', () => {
    render(<FeeConfigTestComponent walletFileName="test.jmdat" />)

    expect(screen.getByText('🧪 Fee Config Error Test Component')).toBeInTheDocument()
    expect(screen.getByText('Show Error')).toBeInTheDocument()
    expect(screen.getByText('Open Fee Config Dialog')).toBeInTheDocument()
    expect(screen.queryByTestId('fee-config-error-alert')).not.toBeInTheDocument()
  })

  it('toggles error alert', () => {
    render(<FeeConfigTestComponent walletFileName="test.jmdat" />)

    const toggleButton = screen.getByText('Show Error')
    fireEvent.click(toggleButton)

    expect(screen.getByText('Hide Error')).toBeInTheDocument()
    expect(screen.getByTestId('fee-config-error-alert')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Hide Error'))
    expect(screen.queryByTestId('fee-config-error-alert')).not.toBeInTheDocument()
  })

  it('opens dialog via button', () => {
    render(<FeeConfigTestComponent walletFileName="test.jmdat" />)

    const openDialogButton = screen.getByText('Open Fee Config Dialog')
    fireEvent.click(openDialogButton)

    expect(screen.getByTestId('fee-config-dialog')).toHaveAttribute('data-open', 'true')
  })

  it('opens dialog via error alert', () => {
    render(<FeeConfigTestComponent walletFileName="test.jmdat" />)

    fireEvent.click(screen.getByText('Show Error'))

    const alertButton = screen.getByText('Open Error Alert Dialog')
    fireEvent.click(alertButton)

    expect(screen.getByTestId('fee-config-dialog')).toHaveAttribute('data-open', 'true')
  })
})
