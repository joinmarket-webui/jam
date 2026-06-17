import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import { flushActUpdates } from '@/test/flushActUpdates'
import { FeeConfigDialog } from './FeeConfigDialog'

type ChildrenProps = { children: ReactNode }
type DialogProps = ChildrenProps & { open?: boolean; onOpenChange?: (open: boolean) => void }
type FeeConfigValidation = ReturnType<typeof useFeeConfigValidation>

const h = vi.hoisted(() => ({
  developerModeEnabled: false,
  mutateAsync: vi.fn<(...arguments_: unknown[]) => Promise<unknown>>(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  Trans: ({ children }: ChildrenProps) => <div data-testid="trans">{children}</div>,
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: () => ({
    mutateAsync: (...arguments_: unknown[]) => h.mutateAsync(...arguments_),
    isPending: false,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (message: string) => {
      h.toastSuccess(message)
    },
    error: (message: string) => {
      h.toastError(message)
    },
  },
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
  configsettingMutation: vi.fn(() => ({})),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

vi.mock('@/store/jamSettingsStore', () => ({
  useDeveloperMode: () => ({ enabled: h.developerModeEnabled }),
}))

vi.mock('@/components/dev/DevBadge', () => ({
  DevBadge: () => <div data-testid="dev-badge" />,
}))

vi.mock('./CollaboratorFeesForm', () => ({
  CollaboratorFeesForm: () => <div data-testid="collaborator-form" />,
}))

vi.mock('./MiningFeesForm', () => ({
  MiningFeesForm: () => <div data-testid="mining-form" />,
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: DialogProps) =>
    open ? (
      <div data-testid="dialog">
        <button onClick={() => onOpenChange?.(false)}>Close</button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogHeader: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogTitle: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogDescription: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogFooter: ({ children }: ChildrenProps) => <div>{children}</div>,
}))

const makeValidValidation = (overrides: Record<string, unknown> = {}): FeeConfigValidation =>
  ({
    feeConfigValues: {
      txFeeFactor: 0.1,
      maxSweepFeeChangeFactor: 0.8,
      maxCjAbsoluteFee: 100,
      maxCjRelativeFee: 0.001,
      txFeesBlocks: 3,
      txFee: {
        txFeeUnit: 'blocks',
        txFeeInBlocks: 3,
        txFeeInSatsPerVbyte: undefined,
      },
    },
    isLoading: false,
    refetchAll: vi.fn(),
    ...overrides,
  }) as unknown as FeeConfigValidation

const renderDialog = (validation: FeeConfigValidation, onOpenChange: (open: boolean) => void = vi.fn(), open = true) =>
  render(
    <FeeConfigDialog
      open={open}
      onOpenChange={onOpenChange}
      walletFileName="test.jmdat"
      feeConfigValidation={validation}
    />,
  )

describe('FeeConfigDialog', () => {
  beforeEach(() => {
    h.developerModeEnabled = false
    h.mutateAsync = vi.fn()
    h.toastSuccess = vi.fn()
    h.toastError = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly', async () => {
    renderDialog(makeValidValidation())

    expect(screen.getByText('settings.fees.title')).toBeInTheDocument()
    expect(screen.getByText('settings.fees.title_max_cj_fee_settings')).toBeInTheDocument()
    expect(screen.getByText('settings.fees.title_general_fee_settings')).toBeInTheDocument()
    expect(screen.getByText('settings.fees.text_button_cancel')).toBeInTheDocument()
    expect(screen.getByText('settings.fees.text_button_submit')).toBeInTheDocument()
    await flushActUpdates()
  })

  it('renders nothing when closed', async () => {
    renderDialog(makeValidValidation(), vi.fn(), false)
    expect(screen.queryByText('settings.fees.title')).not.toBeInTheDocument()
    await flushActUpdates()
  })

  it('can open accordions', async () => {
    renderDialog(makeValidValidation())

    fireEvent.click(screen.getByText('settings.fees.title_max_cj_fee_settings'))
    expect(screen.getByTestId('collaborator-form')).toBeInTheDocument()

    fireEvent.click(screen.getByText('settings.fees.title_general_fee_settings'))
    expect(screen.getByTestId('mining-form')).toBeInTheDocument()
    await flushActUpdates()
  })

  it('shows loading spinners and disables buttons when loading', () => {
    renderDialog(makeValidValidation({ isLoading: true }))

    fireEvent.click(screen.getByText('settings.fees.title_max_cj_fee_settings'))
    expect(screen.getAllByText('global.loading').length).toBeGreaterThan(0)

    const cancelButton = screen.getByText('settings.fees.text_button_cancel')
    expect(cancelButton).toBeDisabled()
  })

  it('shows validation warning icon when forms are invalid', async () => {
    renderDialog(
      makeValidValidation({
        feeConfigValues: {
          txFee: { txFeeUnit: 'blocks', txFeeInBlocks: undefined, txFeeInSatsPerVbyte: undefined },
        },
      }),
    )

    await waitFor(() => {
      expect(screen.getByText('settings.fees.title_max_cj_fee_settings')).toBeInTheDocument()
    })
  })

  it('renders developer mode controls when enabled and can toggle validation', async () => {
    h.developerModeEnabled = true
    renderDialog(makeValidValidation())

    const switchElement = document.querySelector('#fee-limit-form-validation-switch')
    expect(switchElement).not.toBeNull()
    expect(screen.getByTestId('dev-badge')).toBeInTheDocument()

    fireEvent.click(switchElement as Element)
    await flushActUpdates()
  })

  it('calls onOpenChange when cancel is clicked', async () => {
    const onOpenChange = vi.fn()
    renderDialog(makeValidValidation(), onOpenChange)

    fireEvent.click(screen.getByText('settings.fees.text_button_cancel'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    await flushActUpdates()
  })

  it('resets form values when reset is clicked', async () => {
    renderDialog(makeValidValidation())

    fireEvent.click(screen.getByText('Reset'))
    await waitFor(() => {
      expect(screen.getByText('Reset')).toBeInTheDocument()
    })
  })

  it('submits successfully and closes the dialog', async () => {
    h.mutateAsync = vi.fn().mockResolvedValue({})
    const refetchAll = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()
    renderDialog(makeValidValidation({ refetchAll }), onOpenChange)

    fireEvent.click(screen.getByText('settings.fees.text_button_submit'))

    await waitFor(() => {
      expect(h.toastSuccess).toHaveBeenCalledWith('settings.fees.success_message')
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(refetchAll).toHaveBeenCalled()
  })

  it('submits using sats per vbyte unit', async () => {
    h.mutateAsync = vi.fn().mockResolvedValue({})
    const refetchAll = vi.fn().mockResolvedValue(undefined)
    renderDialog(
      makeValidValidation({
        refetchAll,
        feeConfigValues: {
          txFeeFactor: 0.1,
          maxSweepFeeChangeFactor: 0.8,
          maxCjAbsoluteFee: 100,
          maxCjRelativeFee: 0.001,
          txFee: {
            txFeeUnit: 'sats/vbyte',
            txFeeInBlocks: undefined,
            txFeeInSatsPerVbyte: 5,
          },
        },
      }),
    )

    fireEvent.click(screen.getByText('settings.fees.text_button_submit'))

    await waitFor(() => {
      expect(h.toastSuccess).toHaveBeenCalled()
    })
  })

  it('skips validation when form validation is disabled in developer mode', async () => {
    h.developerModeEnabled = true
    h.mutateAsync = vi.fn().mockResolvedValue({})
    const refetchAll = vi.fn().mockResolvedValue(undefined)
    renderDialog(
      makeValidValidation({
        refetchAll,
        feeConfigValues: {
          txFee: { txFeeUnit: 'blocks', txFeeInBlocks: undefined, txFeeInSatsPerVbyte: undefined },
        },
      }),
    )

    const switchElement = document.querySelector('#fee-limit-form-validation-switch')
    fireEvent.click(switchElement as Element)

    fireEvent.click(screen.getByText('settings.fees.text_button_submit'))

    await waitFor(() => {
      expect(h.toastSuccess).toHaveBeenCalled()
    })
  })

  it('does not submit when validation fails', async () => {
    h.mutateAsync = vi.fn().mockResolvedValue({})
    renderDialog(
      makeValidValidation({
        feeConfigValues: {
          txFee: { txFeeUnit: 'blocks', txFeeInBlocks: undefined, txFeeInSatsPerVbyte: undefined },
        },
      }),
    )

    fireEvent.click(screen.getByText('settings.fees.text_button_submit'))

    await waitFor(() => {
      expect(h.mutateAsync).not.toHaveBeenCalled()
    })
    expect(h.toastSuccess).not.toHaveBeenCalled()
  })

  it('shows an error toast when the mutation fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    h.mutateAsync = vi.fn().mockRejectedValue(new Error('boom'))
    const refetchAll = vi.fn().mockResolvedValue(undefined)
    renderDialog(makeValidValidation({ refetchAll }))

    fireEvent.click(screen.getByText('settings.fees.text_button_submit'))

    await waitFor(() => {
      expect(h.toastError).toHaveBeenCalledWith('settings.fees.error_saving_fee_config_failed')
    })
    errorSpy.mockRestore()
  })

  it('shows an error toast when refetch fails after a successful save', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    h.mutateAsync = vi.fn().mockResolvedValue({})
    const refetchAll = vi.fn().mockRejectedValue(new Error('refetch boom'))
    renderDialog(makeValidValidation({ refetchAll }))

    fireEvent.click(screen.getByText('settings.fees.text_button_submit'))

    await waitFor(() => {
      expect(h.toastSuccess).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(h.toastError).toHaveBeenCalled()
    })
    errorSpy.mockRestore()
  })

  it('applies footer border styling when an accordion is open', async () => {
    renderDialog(makeValidValidation())

    fireEvent.click(screen.getByText('settings.fees.title_max_cj_fee_settings'))
    expect(screen.getByTestId('collaborator-form')).toBeInTheDocument()
    await flushActUpdates()
  })
})
