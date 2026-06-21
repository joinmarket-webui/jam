import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { WalletFileName } from '@/lib/utils'
import { PasswordVerificationForm } from './PasswordVerificationForm'

const h = vi.hoisted(() => ({ hashResult: 'correct-hash', hashThrows: false }))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => key + (options ? ' ' + JSON.stringify(options) : ''),
  }),
}))

vi.mock('@/lib/hash', () => ({
  hashPassword: () => {
    if (h.hashThrows) return Promise.reject(new Error('hash boom'))
    return Promise.resolve(h.hashResult)
  },
}))

vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  debounce: (function_: (...args: unknown[]) => unknown) => function_,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
  }: {
    children?: ReactNode
    onClick?: () => void
    disabled?: boolean
    type?: 'button' | 'submit'
  }) => (
    <button onClick={onClick} disabled={disabled} type={type}>
      {children}
    </button>
  ),
}))

vi.mock('../ui/field', () => ({
  Field: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  FieldLabel: ({ children }: { children?: ReactNode }) => <label>{children}</label>,
}))

vi.mock('../ui/input-group', () => ({
  InputGroup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  InputGroupAddon: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  InputGroupInput: (props: Record<string, unknown>) => <input {...props} />,
}))

vi.mock('../ui/spinner', () => ({ Spinner: () => <div data-testid="spinner" /> }))

const walletFileName = 'wallet.jmdat' as WalletFileName

const renderForm = (overrides?: { onSubmit?: () => void; onCancel?: () => void }) =>
  render(
    <PasswordVerificationForm
      walletFileName={walletFileName}
      hashedPassword="correct-hash"
      onSubmit={overrides?.onSubmit ?? vi.fn()}
      onCancel={overrides?.onCancel}
      i18nKeyPrefix="settings.seed_modal.verification"
    />,
  )

const typePassword = (value: string) => {
  fireEvent.change(screen.getByPlaceholderText('settings.seed_modal.verification.placeholder_password'), {
    target: { value },
  })
}

describe('PasswordVerificationForm', () => {
  beforeEach(() => {
    h.hashResult = 'correct-hash'
    h.hashThrows = false
  })

  it('renders the password field and submit button', () => {
    renderForm()
    expect(screen.getByText('settings.seed_modal.verification.label_password')).toBeInTheDocument()
    expect(screen.getByText('settings.seed_modal.verification.text_button_submit')).toBeInTheDocument()
  })

  it('toggles password visibility', () => {
    renderForm()
    const input = screen.getByPlaceholderText('settings.seed_modal.verification.placeholder_password')
    expect(input).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: '' }))
    expect(input).toHaveAttribute('type', 'text')
  })

  it('submits when the password matches', async () => {
    const onSubmit = vi.fn()
    renderForm({ onSubmit })
    typePassword('hunter2')
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
  })

  it('shows an incorrect-password error and does not submit', async () => {
    h.hashResult = 'different-hash'
    const onSubmit = vi.fn()
    renderForm({ onSubmit })
    typePassword('wrong')
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() =>
      expect(screen.getByText('settings.seed_modal.verification.text_error_password_incorrect')).toBeInTheDocument(),
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows a generic error when hashing throws', async () => {
    h.hashThrows = true
    renderForm()
    typePassword('hunter2')
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() => expect(screen.getByText(/settings.seed_modal.verification.text_error/)).toBeInTheDocument())
  })

  it('invokes onCancel when the cancel button is clicked', () => {
    const onCancel = vi.fn()
    renderForm({ onCancel })
    fireEvent.click(screen.getByText('global.cancel'))
    expect(onCancel).toHaveBeenCalled()
  })
})
