import type { ReactNode } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { WalletInfoApiObject } from '@/hooks/useQueryDisplayWallet'
import type { WalletFileName } from '@/lib/utils'
import { SignMessageDialog } from './SignMessageDialog'

type ChildrenProps = { children: ReactNode }
type DialogProps = ChildrenProps & { open?: boolean; onOpenChange?: (open: boolean) => void }

const h = vi.hoisted(() => ({
  walletInfo: undefined as WalletInfoApiObject | undefined,
  mutateAsync: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
  toastSuccess: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (message: string) => {
      h.toastSuccess(message)
    },
  },
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

vi.mock('@/hooks/useQueryDisplayWallet', () => ({
  useQueryDisplayWallet: () => ({
    walletInfo: h.walletInfo,
  }),
}))

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query', () => ({
  signmessageMutation: vi.fn(() => ({})),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: () => ({
    mutateAsync: h.mutateAsync,
    reset: h.reset,
    isPending: h.isPending,
    isError: h.isError,
    error: h.error,
  }),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: DialogProps) =>
    open ? (
      <div data-testid="dialog">
        <button onClick={() => onOpenChange?.(false)}>Close Dialog</button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogHeader: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogTitle: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogDescription: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogFooter: ({ children }: ChildrenProps) => <div>{children}</div>,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: { children: ReactNode; onValueChange: (val: string) => void }) => (
    <div data-testid="select">
      <button onClick={() => onValueChange('bc1qtestaddress')}>Select Address</button>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: ChildrenProps) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <div>{placeholder}</div>,
  SelectContent: ({ children }: ChildrenProps) => <div>{children}</div>,
  SelectItem: ({ children }: ChildrenProps) => <div>{children}</div>,
}))

describe('SignMessageDialog', () => {
  const walletFileName = 'wallet.jmdat' as WalletFileName

  beforeEach(() => {
    h.walletInfo = undefined
    h.mutateAsync.mockReset()
    h.reset.mockReset()
    h.isPending = false
    h.isError = false
    h.error = null
    h.toastSuccess.mockReset()
  })

  it('renders dialog header and inputs when open', () => {
    render(<SignMessageDialog open={true} onOpenChange={vi.fn()} walletFileName={walletFileName} />)

    expect(screen.getByText('settings.sign_message_modal.title')).toBeInTheDocument()
    expect(screen.getByText('settings.sign_message_modal.label_address')).toBeInTheDocument()
    expect(screen.getByText('settings.sign_message_modal.label_message')).toBeInTheDocument()
  })

  it('keeps sign button disabled when inputs are empty', () => {
    render(<SignMessageDialog open={true} onOpenChange={vi.fn()} walletFileName={walletFileName} />)

    const signButton = screen.getByText('settings.sign_message_modal.button_sign')
    expect(signButton).toBeDisabled()
  })

  it('enables sign button and submits form when inputs are provided', async () => {
    h.mutateAsync.mockResolvedValueOnce({ signature: 'mock-signature-base64' })

    render(<SignMessageDialog open={true} onOpenChange={vi.fn()} walletFileName={walletFileName} />)

    const addressInput = screen.getByPlaceholderText('settings.sign_message_modal.placeholder_address')
    const messageInput = screen.getByPlaceholderText('settings.sign_message_modal.placeholder_message')

    fireEvent.change(addressInput, { target: { value: "m/84'/0'/0'/0/0" } })
    fireEvent.change(messageInput, { target: { value: 'Hello JoinMarket' } })

    const signButton = screen.getByText('settings.sign_message_modal.button_sign')
    expect(signButton).not.toBeDisabled()

    fireEvent.click(signButton)

    await waitFor(() => {
      expect(h.mutateAsync).toHaveBeenCalledWith({
        path: { walletname: walletFileName },
        body: {
          hd_path: "m/84'/0'/0'/0/0",
          message: 'Hello JoinMarket',
        },
      })
    })

    expect(screen.getByText('settings.sign_message_modal.label_signature')).toBeInTheDocument()
    expect(screen.getAllByDisplayValue('mock-signature-base64').length).toBeGreaterThan(0)
  })

  it('resolves address to hd_path if address is found in walletInfo', async () => {
    h.walletInfo = {
      accounts: [
        {
          branches: [
            {
              entries: [
                {
                  address: 'bc1qtestaddress',
                  hd_path: "m/84'/0'/0'/0/2",
                },
              ],
            },
          ],
        },
      ],
    } as unknown as WalletInfoApiObject

    h.mutateAsync.mockResolvedValueOnce({ signature: 'mock-sig' })

    render(<SignMessageDialog open={true} onOpenChange={vi.fn()} walletFileName={walletFileName} />)

    const addressInput = screen.getByPlaceholderText('settings.sign_message_modal.placeholder_address')
    const messageInput = screen.getByPlaceholderText('settings.sign_message_modal.placeholder_message')

    fireEvent.change(addressInput, { target: { value: 'bc1qtestaddress' } })
    fireEvent.change(messageInput, { target: { value: 'Test' } })

    fireEvent.click(screen.getByText('settings.sign_message_modal.button_sign'))

    await waitFor(() => {
      expect(h.mutateAsync).toHaveBeenCalledWith({
        path: { walletname: walletFileName },
        body: {
          hd_path: "m/84'/0'/0'/0/2",
          message: 'Test',
        },
      })
    })
  })

  it('resets inputs and signature when Reset button is clicked', () => {
    render(<SignMessageDialog open={true} onOpenChange={vi.fn()} walletFileName={walletFileName} />)

    const addressInput = screen.getByPlaceholderText('settings.sign_message_modal.placeholder_address')
    fireEvent.change(addressInput, { target: { value: 'test' } })

    const resetButton = screen.getByText('settings.sign_message_modal.button_reset')
    fireEvent.click(resetButton)

    expect(addressInput).toHaveValue('')
    expect(h.reset).toHaveBeenCalled()
  })

  it('calls onOpenChange(false) and resets state when closed', () => {
    const onOpenChange = vi.fn()
    render(<SignMessageDialog open={true} onOpenChange={onOpenChange} walletFileName={walletFileName} />)

    fireEvent.click(screen.getByText('global.close'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(h.reset).toHaveBeenCalled()
  })
})
