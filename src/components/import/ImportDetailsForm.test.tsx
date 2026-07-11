import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { flushActUpdates } from '@/test/flushActUpdates'
import { ImportDetailsForm } from './ImportDetailsForm'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => key + (options ? ' ' + JSON.stringify(options) : ''),
  }),
}))

vi.mock('../dev/DevBadge', () => ({ DevBadge: () => <span data-testid="dev-badge" /> }))

vi.mock('../ui/accordion', () => ({
  Accordion: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AccordionItem: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AccordionTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AccordionContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

vi.mock('../ui/alert', () => ({
  Alert: ({ children, variant }: { children?: ReactNode; variant?: string }) => (
    <div data-variant={variant}>{children}</div>
  ),
  AlertDescription: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/field', () => ({
  Field: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  FieldDescription: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  FieldLabel: ({ children }: { children?: ReactNode }) => <label>{children}</label>,
}))

vi.mock('../ui/input-group', () => ({
  InputGroup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  InputGroupAddon: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  InputGroupInput: (props: Record<string, unknown>) => <input {...props} />,
}))

vi.mock('../ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
}))

vi.mock('../ui/tooltip', () => ({
  Tooltip: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
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

vi.mock('@/components/ui/spinner', () => ({ Spinner: () => <div data-testid="spinner" /> }))

const VALID_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const typeMnemonic = (value: string) => {
  fireEvent.change(screen.getByPlaceholderText('import_wallet.import_details.placeholder_mnemonic_phrase'), {
    target: { value },
  })
}

describe('ImportDetailsForm', () => {
  it('renders the mnemonic, blockheight and gaplimit fields', async () => {
    render(<ImportDetailsForm onSubmit={vi.fn()} />)
    expect(screen.getByText('import_wallet.import_details.label_mnemonic_phrase')).toBeInTheDocument()
    expect(document.querySelector('#blockheight')).toBeInTheDocument()
    expect(document.querySelector('#gaplimit')).toBeInTheDocument()
    await flushActUpdates()
  })

  it('shows a success alert when the mnemonic is a valid BIP-39 phrase', async () => {
    render(<ImportDetailsForm onSubmit={vi.fn()} />)
    typeMnemonic(VALID_MNEMONIC)
    expect(screen.getByText('import_wallet.import_details.text_mnemonic_valid')).toBeInTheDocument()
    await flushActUpdates()
  })

  it('warns and does not submit when the mnemonic is not recognized', async () => {
    const onSubmit = vi.fn()
    render(<ImportDetailsForm onSubmit={onSubmit} />)
    typeMnemonic('not a real seed phrase at all')
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() =>
      expect(screen.getByText('import_wallet.import_details.alert_mnemonic_not_recognized_title')).toBeInTheDocument(),
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits when all values are valid', async () => {
    const onSubmit = vi.fn()
    render(
      <ImportDetailsForm
        onSubmit={onSubmit}
        initialValues={{ mnemonicPhrase: VALID_MNEMONIC, blockheight: 700000, gaplimit: 50 }}
      />,
    )
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
  })

  it('shows a high-gaplimit warning above the threshold', async () => {
    render(
      <ImportDetailsForm
        onSubmit={vi.fn()}
        initialValues={{ mnemonicPhrase: VALID_MNEMONIC, blockheight: 700000, gaplimit: 9999 }}
      />,
    )
    expect(screen.getByText('import_wallet.import_details.alert_high_gaplimit_value')).toBeInTheDocument()
    await flushActUpdates()
  })

  it('renders a disabled submit button when disabled', async () => {
    render(<ImportDetailsForm onSubmit={vi.fn()} disabled />)
    const submit = document.querySelector('button[type="submit"]')
    expect(submit).toBeDisabled()
    await flushActUpdates()
  })
})
