import { getaddress } from '@joinmarket-webui/joinmarket-ng-api-ts/jm'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Jar } from '@/context/JamWalletInfoContext'
import { flushActUpdates } from '@/test/flushActUpdates'
import { ReceivePage } from './ReceivePage'

const mocks = vi.hoisted(() => {
  const defaultJars = [
    {
      jarIndex: 0,
      name: 'Zero',
      color: '#e2b86a',
      balanceSummary: {
        calculatedTotalBalanceInSats: 10_000,
        calculatedAvailableBalanceInSats: 9_000,
        calculatedConfirmedAvailableBalanceInSats: 9_000,
        calculatedFrozenOrLockedBalanceInSats: 1_000,
      },
    },
    {
      jarIndex: 1,
      name: 'One',
      color: '#3b5ba9',
      balanceSummary: {
        calculatedTotalBalanceInSats: 8_000,
        calculatedAvailableBalanceInSats: 8_000,
        calculatedConfirmedAvailableBalanceInSats: 8_000,
        calculatedFrozenOrLockedBalanceInSats: 0,
      },
    },
  ] as unknown as Jar[]

  return {
    developerMode: false,
    getAddress: vi.fn(),
    defaultJars,
    jars: defaultJars,
    share: vi.fn(),
    toastError: vi.fn(),
    toastSuccess: vi.fn(),
  }
})

type MutationOptions = {
  mutationFn: () => Promise<unknown>
  onError?: (error: unknown) => void
}

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query', () => ({
  getaddressQueryKey: vi.fn(() => ['getaddress']),
}))

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts/jm', () => ({
  getaddress: mocks.getAddress,
}))

vi.mock('@tanstack/react-query', async () => {
  const React = await import('react')

  return {
    useMutation: vi.fn((options: MutationOptions) => {
      const [data, setData] = React.useState<unknown>()
      const [isPending, setPending] = React.useState(false)
      const [hasRun, setHasRun] = React.useState(false)

      return {
        data,
        isIdle: !hasRun,
        isPending,
        mutateAsync: async () => {
          setPending(true)
          setHasRun(true)
          try {
            const result: unknown = await options.mutationFn()
            setData(result)
            return result
          } catch (error) {
            options.onError?.(error)
            throw error
          } finally {
            setPending(false)
          }
        },
      }
    }),
  }
})

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}))

vi.mock('@/context/JamWalletInfoContext', () => ({
  useJars: () => ({
    jars: mocks.jars,
  }),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

vi.mock('@/lib/queryClient', () => ({
  withMutationDelay: (mutationFn: unknown) => mutationFn,
}))

vi.mock('@/store/jamSettingsStore', () => ({
  useDeveloperMode: () => ({
    enabled: mocks.developerMode,
  }),
}))

vi.mock('../ui/jam/BitcoinQrCode', () => ({
  BitcoinAddressQrCode: ({ address, amount }: { address: string; amount?: number }) => (
    <div>
      qr:{address}:{amount ?? 'none'}
    </div>
  ),
}))

vi.mock('../ui/jam/Address', () => ({
  Address: ({ value }: { value: string }) => <span>{value}</span>,
}))

vi.mock('../ui/jam/CopyButton', () => ({
  CopyButton: ({ value, disabled }: { value: string; disabled?: boolean }) => (
    <button disabled={disabled}>copy:{value}</button>
  ),
}))

vi.mock('./ReceiveForm', () => ({
  ReceiveForm: ({ onSubmit }: { onSubmit: (values: { source?: { fromJar?: number }; amount?: number }) => void }) => (
    <button onClick={() => onSubmit({ source: { fromJar: 1 }, amount: 2100 })}>update receive form</button>
  ),
}))

describe('ReceivePage', () => {
  beforeEach(() => {
    mocks.developerMode = false
    mocks.jars = mocks.defaultJars
    mocks.getAddress.mockReset()
    mocks.getAddress.mockResolvedValue({ data: { address: 'bc1qexample' } })
    mocks.toastError.mockReset()
    mocks.toastSuccess.mockReset()
    mocks.share.mockReset()
    Object.assign(navigator, { share: mocks.share })
  })

  it('reveals a fresh address and refreshes it on demand', async () => {
    render(<ReceivePage walletFileName="wallet.jmdat" />)

    fireEvent.click(screen.getByRole('button', { name: 'receive.button_reveal_address' }))

    await waitFor(() => expect(screen.getByText('qr:bc1qexample:none')).toBeInTheDocument())
    expect(getaddress).toHaveBeenCalledWith(
      expect.objectContaining({
        path: { walletname: 'wallet.jmdat', mixdepth: '0' },
        throwOnError: true,
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'receive.button_new_address' }))
    expect(mocks.getAddress).toHaveBeenCalledTimes(2)
    await flushActUpdates()
  })

  it('uses a secondary jar badge when no jar is available', () => {
    mocks.jars = []

    const { container } = render(<ReceivePage walletFileName="wallet.jmdat" />)

    const badge = container.querySelector('[data-slot="badge"]')
    expect(badge).toHaveClass('bg-secondary')
    expect(badge).not.toHaveClass('bg-primary')
  })

  it('uses receive form changes for the next address request and sharing', async () => {
    const user = userEvent.setup()
    mocks.share.mockRejectedValue(new Error('cancelled'))

    render(<ReceivePage walletFileName="wallet.jmdat" />)

    await user.click(screen.getByRole('button', { name: 'receive.button_settings' }))
    await user.click(screen.getByRole('button', { name: 'update receive form' }))
    await user.click(screen.getByRole('button', { name: 'receive.button_reveal_address' }))

    await waitFor(() => expect(screen.getByText('qr:bc1qexample:2100')).toBeInTheDocument())
    const lastAddressRequest = mocks.getAddress.mock.calls.at(-1)?.[0] as { path?: { mixdepth?: string } }
    expect(lastAddressRequest?.path?.mixdepth).toBe('1')

    await user.click(screen.getByRole('button', { name: 'receive.button_share_address' }))

    expect(mocks.share).toHaveBeenCalledWith({
      title: 'Bitcoin Address',
      text: 'bc1qexample',
    })
    expect(mocks.toastError).toHaveBeenCalledWith('receive.error_share_address_failed')
  })
})
