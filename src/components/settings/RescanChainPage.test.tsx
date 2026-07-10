import type { ReactNode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { RescanInfo } from '@/context/JamSessionInfoContext'
import type { WalletFileName } from '@/lib/utils'
import { RescanChainPage } from './RescanChainPage'

type MutationConfig = {
  mutationFn: (blockHeight: number) => Promise<unknown>
  onSuccess: () => void
  onError: (error: unknown) => void
}

const mutateAsync = vi.fn<(blockHeight: number) => Promise<unknown>>().mockResolvedValue(undefined)
const rescanblockchainMock = vi.fn<() => Promise<{ data: unknown }>>().mockResolvedValue({ data: 'ok' })
const navigateMock = vi.fn()
const setRescanInfo = vi.fn()
const toastSuccess = vi.fn()
const toastError = vi.fn()
let mutationConfig: MutationConfig
let rescanInfo: RescanInfo

vi.mock('@tanstack/react-query', () => ({
  useMutation: (config: MutationConfig) => {
    mutationConfig = config
    return { mutateAsync, isPending: false }
  },
}))

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts/jm', () => ({
  rescanblockchain: () => rescanblockchainMock(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => key + (options ? ' ' + JSON.stringify(options) : ''),
  }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}))

vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => {
      toastSuccess(m)
    },
    error: (m: string) => {
      toastError(m)
    },
  },
}))

vi.mock('@/context/JamSessionInfoContext', () => ({
  useRescanStatus: () => ({ rescanInfo, setRescanInfo }),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

vi.mock('@/lib/errorReason', () => ({
  getErrorReason: () => 'reason',
}))

vi.mock('@/components/ui/jam/PageTitle', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

const walletFileName = 'wallet.jmdat' as WalletFileName

// react-hook-form runs validation after mount; flushing inside async act keeps
// that deferred state update from triggering a "not wrapped in act" warning.
const renderPage = async () => {
  await act(async () => {
    render(<RescanChainPage walletFileName={walletFileName} />)
    await Promise.resolve()
  })
}

describe('RescanChainPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rescanInfo = { updatedAt: 0, rescanning: false, progress: undefined, progressInPercentage: undefined }
  })

  it('renders the form and navigates back', async () => {
    await renderPage()

    expect(screen.getByText('rescan_chain.title')).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('global.back'))
    expect(navigateMock).toHaveBeenCalled()
  })

  it('shows the in-progress alert without progress', async () => {
    rescanInfo = { updatedAt: 0, rescanning: true, progress: undefined }
    await renderPage()
    expect(screen.getByText('app.alert_rescan_in_progress')).toBeInTheDocument()
  })

  it('shows the in-progress alert with progress', async () => {
    rescanInfo = { updatedAt: 0, rescanning: true, progress: 0.4221, progressInPercentage: '42.2' }
    await renderPage()
    expect(screen.getByText(/app.alert_rescan_in_progress_with_progress/)).toBeInTheDocument()
  })

  it('submits a valid block height through the mutation', async () => {
    await renderPage()
    const input = screen.getByPlaceholderText('rescan_chain.placeholder_blockheight')
    fireEvent.change(input, { target: { value: String(700_000) } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(700_000))
  })

  it('mutationFn calls the rescan API and returns data', async () => {
    await renderPage()
    await expect(mutationConfig.mutationFn(700_000)).resolves.toBe('ok')
    expect(rescanblockchainMock).toHaveBeenCalled()
  })

  it('onSuccess shows a toast and updates rescan info', async () => {
    await renderPage()
    mutationConfig.onSuccess()
    expect(toastSuccess).toHaveBeenCalled()
    expect(setRescanInfo).toHaveBeenCalledWith(expect.objectContaining({ rescanning: true }))
  })

  it('onError shows an error toast and resets rescan info', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await renderPage()
    mutationConfig.onError(new Error('boom'))
    expect(toastError).toHaveBeenCalled()
    expect(setRescanInfo).toHaveBeenCalledWith(expect.objectContaining({ rescanning: false }))
    consoleSpy.mockRestore()
  })
})
