import type { ComponentProps } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { JAM_DOCS_URL } from '@/constants/jam'
import type { WalletFileName } from '@/lib/utils'
import { SettingsPage } from './SettingsPage'

type AuthStoreState = {
  state?: {
    hashed_password?: string
  }
}

type JamSettingsStoreState = {
  state: {
    developerMode: boolean
  }
  update: (value: { developerMode: boolean }) => void
}

type StoreSelector<TStore, TResult> = (state: TStore) => TResult

const mocks = vi.hoisted(() => ({
  addressChunkingEnabled: true,
  debugFeatures: new Set<string>(),
  developerMode: false,
  feeConfigValidation: { isLoading: false },
  hashedPassword: undefined as string | undefined,
  isPrivate: false,
  lockWalletPending: false,
  logsFeature: false,
  navigate: vi.fn(),
  open: vi.fn(),
  setTheme: vi.fn(),
  theme: 'dark',
  toggleAddressChunking: vi.fn(),
  toggleCurrencyUnit: vi.fn(),
  togglePrivacyMode: vi.fn(),
  updateJamSettings: vi.fn<(value: { developerMode: boolean }) => void>(),
  useMutationSpy: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: { mutationFn: (input: unknown) => Promise<unknown> }) => {
    mocks.useMutationSpy(options)

    return {
      isPending: mocks.lockWalletPending,
      mutateAsync: options.mutationFn,
    }
  },
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: mocks.theme,
    setTheme: mocks.setTheme,
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      resolvedLanguage: 'en',
    },
    t: (key: string) => key,
  }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('zustand', () => ({
  useStore: (store: string, selector?: StoreSelector<AuthStoreState, unknown>) => {
    if (store === 'auth-store') {
      const state: AuthStoreState = {
        state: mocks.hashedPassword !== undefined ? { hashed_password: mocks.hashedPassword } : undefined,
      }

      return selector ? selector(state) : state
    }

    const jamSettingsState: JamSettingsStoreState = {
      state: {
        developerMode: mocks.developerMode,
      },
      update: mocks.updateJamSettings,
    }

    return jamSettingsState
  },
}))

vi.mock('@/store/authStore', () => ({
  authStore: 'auth-store',
}))

vi.mock('@/store/jamSettingsStore', () => ({
  jamSettingsStore: 'jam-settings-store',
}))

vi.mock('@/components/settings/fees/FeeConfigDialog', () => ({
  FeeConfigDialog: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) =>
    open ? (
      <button type="button" onClick={() => onOpenChange(false)}>
        fee-config-dialog
      </button>
    ) : null,
}))

vi.mock('@/components/settings/SeedPhraseDialog', () => ({
  SeedPhraseDialog: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) =>
    open ? (
      <button type="button" onClick={() => onOpenChange(false)}>
        seed-dialog
      </button>
    ) : null,
}))

vi.mock('@/components/settings/AccountXpubsDialog', () => ({
  AccountXpubsDialog: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) =>
    open ? (
      <button type="button" onClick={() => onOpenChange(false)}>
        xpubs-dialog
      </button>
    ) : null,
}))

vi.mock('@/components/ui/jam/LanguageSelector', () => ({
  LanguageSelector: () => <div>language-selector</div>,
}))

vi.mock('@/components/ui/spinner', () => ({
  Spinner: ({ className }: { className?: string }) => <span className={className}>spinner</span>,
}))

vi.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    disabled,
    onCheckedChange,
  }: {
    checked?: boolean
    disabled?: boolean
    onCheckedChange?: (checked: boolean) => void
  }) => (
    <button type="button" disabled={disabled} onClick={() => onCheckedChange?.(!checked)}>
      switch:{String(checked)}
    </button>
  ),
}))

vi.mock('@/constants/debugFeatures', () => ({
  isDebugFeatureEnabled: (feature: string) => mocks.debugFeatures.has(feature),
  isDevMode: () => true,
}))

vi.mock('@/context/JamDisplayContext', () => ({
  useJamDisplayContext: () => ({
    addressChunkingEnabled: mocks.addressChunkingEnabled,
    currency: 'btc',
    isPrivate: mocks.isPrivate,
    toggleAddressChunking: mocks.toggleAddressChunking,
    toggleCurrencyUnit: mocks.toggleCurrencyUnit,
    togglePrivacyMode: mocks.togglePrivacyMode,
  }),
}))

vi.mock('@/hooks/useFeatures', () => ({
  useFeatures: () => ({
    isFeatureEnabled: (feature: string) => feature === 'logs' && mocks.logsFeature,
  }),
}))

vi.mock('@/hooks/useFeeConfigValidation', () => ({
  useFeeConfigValidation: () => mocks.feeConfigValidation,
}))

const walletFileName = 'wallet.jmdat' as WalletFileName

const renderSettingsPage = (
  tab: ComponentProps<typeof SettingsPage>['initialTab'],
  onLockWallet = vi.fn<() => Promise<void>>(),
) => {
  render(<SettingsPage walletFileName={walletFileName} onLockWallet={onLockWallet} initialTab={tab} />)

  return { onLockWallet }
}

const clickItem = (label: string) => {
  const item = screen.getByText(label).closest('div')

  expect(item).not.toBeNull()
  fireEvent.click(item as HTMLElement)
}

describe('SettingsPage', () => {
  beforeEach(() => {
    mocks.addressChunkingEnabled = true
    mocks.debugFeatures = new Set()
    mocks.developerMode = false
    mocks.hashedPassword = undefined
    mocks.isPrivate = false
    mocks.lockWalletPending = false
    mocks.logsFeature = false
    mocks.theme = 'dark'
    mocks.navigate.mockReset()
    mocks.open.mockReset()
    mocks.setTheme.mockReset()
    mocks.toggleAddressChunking.mockReset()
    mocks.toggleCurrencyUnit.mockReset()
    mocks.togglePrivacyMode.mockReset()
    mocks.updateJamSettings.mockReset()
    mocks.useMutationSpy.mockReset()
    vi.stubGlobal('open', mocks.open)
  })

  it('renders basic display and market settings and handles their actions', () => {
    renderSettingsPage('basic')

    expect(screen.getByRole('heading', { name: 'navbar.menu_mobile_settings' })).toBeInTheDocument()
    expect(screen.getByText('settings.section_title_display')).toBeInTheDocument()
    expect(screen.getByText('settings.section_title_market')).toBeInTheDocument()
    expect(screen.getByText('language-selector')).toBeInTheDocument()

    clickItem('settings.hide_balance')
    expect(mocks.togglePrivacyMode).toHaveBeenCalledTimes(1)

    clickItem('settings.use_btc')
    expect(mocks.toggleCurrencyUnit).toHaveBeenCalledTimes(1)

    clickItem('settings.use_light_theme')
    expect(mocks.setTheme).toHaveBeenCalledWith('light')

    clickItem('settings.show_fee_config')
    expect(screen.getByText('fee-config-dialog')).toBeInTheDocument()
  })

  it('opens basic, protected wallet dialogs and locks the wallet when a password is available', async () => {
    mocks.hashedPassword = 'hashed-password'
    const onLockWallet = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

    renderSettingsPage('basic', onLockWallet)

    clickItem('settings.show_seed')
    expect(screen.getByText('seed-dialog')).toBeInTheDocument()

    clickItem('settings.show_xpubs')
    expect(screen.getByText('xpubs-dialog')).toBeInTheDocument()

    clickItem('settings.button_lock_wallet')

    await waitFor(() => {
      expect(onLockWallet).toHaveBeenCalledTimes(1)
    })
  })

  it('handles internal, external, feature-gated links', async () => {
    mocks.developerMode = true
    mocks.logsFeature = true

    renderSettingsPage('basic')

    clickItem('settings.rescan_chain')
    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/settings/rescan')
    })

    clickItem('settings.show_logs')
    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/logs')
    })

    clickItem('settings.documentation')
    expect(mocks.open).toHaveBeenCalledWith(JAM_DOCS_URL, '_blank', 'noreferrer,noopener')
  })

  it('shows a spinner while wallet locking is pending', () => {
    mocks.lockWalletPending = true

    renderSettingsPage('basic')

    expect(screen.getByText('spinner')).toBeInTheDocument()
  })

  it('renders advanced section', () => {
    renderSettingsPage('advanced')

    expect(screen.getByRole('heading', { name: 'navbar.menu_mobile_settings' })).toBeInTheDocument()
    expect(screen.getByText('settings.section_title_display')).toBeInTheDocument()
    expect(screen.getByText('settings.section_title_expert_features')).toBeInTheDocument()
    expect(screen.getByText('settings.section_title_preview_features')).toBeInTheDocument()
    expect(screen.getByText('Developer Mode')).toBeInTheDocument()

    fireEvent.click(screen.getByText('switch:true'))
    expect(mocks.toggleAddressChunking).toHaveBeenCalledWith(false)
  })

  it('handles advanced developer links', async () => {
    mocks.debugFeatures = new Set(['devPage'])
    mocks.developerMode = true

    renderSettingsPage('advanced')

    clickItem('Enable Developer Mode')
    expect(mocks.updateJamSettings).toHaveBeenCalledWith({ developerMode: false })

    clickItem('Dev page')
    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/dev')
    })
  })
})
