import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@/i18n/config'
import { CreateWalletForm } from './CreateWalletForm'

const renderCreateWalletForm = ({ wallets = ['existing.jmdat'], onSubmit = vi.fn(), disabled = false } = {}) => {
  render(
    <CreateWalletForm
      wallets={wallets}
      onSubmit={onSubmit}
      disabled={disabled}
      submitButtonText={({ isSubmitting }) => (isSubmitting ? 'Creating' : 'Create')}
    />,
  )

  return { onSubmit }
}

describe('<CreateWalletForm />', () => {
  it('submits valid wallet details', async () => {
    const { onSubmit } = renderCreateWalletForm()

    await userEvent.type(screen.getByLabelText('Wallet name'), 'new-wallet')
    await userEvent.type(screen.getByLabelText('Password to unlock the wallet'), 'secret')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          walletName: 'new-wallet',
          password: 'secret',
          confirmPassword: 'secret',
        },
        expect.anything(),
      ),
    )
  })

  it('shows validation errors for invalid values', async () => {
    const { onSubmit } = renderCreateWalletForm()

    await userEvent.type(screen.getByLabelText('Wallet name'), 'existing')
    await userEvent.type(screen.getByLabelText('Password to unlock the wallet'), 'secret')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'different')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(
      await screen.findByText('Please choose another wallet name. This one is already in use.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Given passwords do not match.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('toggles password visibility and supports disabled state', async () => {
    renderCreateWalletForm({ disabled: true })

    const passwordInput = screen.getByLabelText('Password to unlock the wallet')
    const confirmPasswordInput = screen.getByLabelText('Confirm password')

    expect(passwordInput).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled()

    const toggleButtons = screen.getAllByRole('button', { name: '' })
    await userEvent.click(toggleButtons[0])
    await userEvent.click(toggleButtons[1])

    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(confirmPasswordInput).toHaveAttribute('type', 'text')
  })
})
