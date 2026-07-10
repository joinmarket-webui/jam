import React, { type ComponentType, type ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { JamDisplayContextProvider } from '@/context/JamDisplayContextProvider'

// Stories are rendered without a real i18next instance; mock the hooks so they
// resolve to keys instead of logging "You will need to pass in an i18next instance".
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  Trans: ({ i18nKey, children }: { i18nKey?: string; children?: React.ReactNode }) => children ?? i18nKey ?? null,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts', () => ({
  createClient: vi.fn(() => ({
    interceptors: {
      error: { use: vi.fn() },
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  })),
}))

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query', () => {
  const queryOption = vi.fn(() => ({ queryKey: ['mock'], queryFn: vi.fn() }))
  const mutationOption = vi.fn(() => ({ mutationFn: vi.fn() }))

  return {
    configgetMutation: mutationOption,
    configsettingMutation: mutationOption,
    createwalletMutation: mutationOption,
    directsendMutation: mutationOption,
    displaywalletOptions: queryOption,
    docoinjoinMutation: mutationOption,
    freezeMutation: mutationOption,
    getrescaninfoOptions: queryOption,
    getscheduleOptions: queryOption,
    getseedOptions: queryOption,
    listutxosOptions: queryOption,
    listwalletsOptions: queryOption,
    lockwalletOptions: queryOption,
    recoverwalletMutation: mutationOption,
    rescanblockchainMutation: mutationOption,
    runscheduleMutation: mutationOption,
    sessionOptions: queryOption,
    startmakerMutation: mutationOption,
    stopcoinjoinOptions: queryOption,
    stopmakerOptions: queryOption,
    tokenMutation: mutationOption,
    unlockwalletMutation: mutationOption,
    versionOptions: queryOption,
    yieldgenreportQueryKey: vi.fn(() => ['yieldgenreport']),
  }
})

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts/jm', () => {
  const apiCall = vi.fn()

  return new Proxy(
    {},
    {
      get: () => apiCall,
    },
  )
})

const walletMocks = vi.hoisted(() => {
  const emptyBalanceSummary = {
    calculatedAvailableBalanceInSats: 0,
    calculatedConfirmedAvailableBalanceInSats: 0,
    calculatedFrozenOrLockedBalanceInSats: 0,
    calculatedTotalBalanceInSats: 0,
  }

  const storyJar = {
    balanceSummary: emptyBalanceSummary,
    color: '#e2b86a',
    jarIndex: 0,
    name: 'Apricot',
    utxos: [],
  }

  return {
    emptyBalanceSummary,
    storyJar,
  }
})

vi.mock('@/context/JamWalletInfoContext', () => ({
  JamWalletInfoContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
  useAccountSummary: () => ({ accountSummary: {} }),
  useAddressSummary: () => ({ addressSummary: {} }),
  useDetectNetwork: () => ({ detectedNetwork: null, fallbackNetwork: 'mainnet', network: 'mainnet' }),
  useJamWalletInfoContext: () => ({
    accountSummary: {},
    addressSummary: {},
    detectedNetwork: null,
    error: null,
    fidelityBondSummary: { fbOutputs: [] },
    isFetching: false,
    isLoading: false,
    jars: [walletMocks.storyJar],
    maxJarAvailableBalance: 0,
    refetch: vi.fn(),
    setWaitForUtxosToBeSpent: vi.fn(),
    utxosHashHex: '',
    waitForUtxosToBeSpent: [],
    walletBalanceSummary: walletMocks.emptyBalanceSummary,
    walletName: 'wallet.jmdat',
  }),
  useJars: () => ({ isLoading: false, jars: [walletMocks.storyJar] }),
  useWalletBalanceSummary: () => ({ isLoading: false, walletBalanceSummary: walletMocks.emptyBalanceSummary }),
}))

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn((_value: string, _options?: unknown, callback?: (error: Error | null, url?: string) => void) => {
      if (typeof callback === 'function') {
        callback(null, 'data:image/png;base64,story')
        return undefined
      }

      return Promise.resolve('data:image/png;base64,story')
    }),
  },
}))

const mergeStoryArguments = (metaArguments?: Record<string, unknown>, storyArguments?: Record<string, unknown>) => ({
  ...metaArguments,
  ...storyArguments,
})

describe('storybook stories', () => {
  beforeEach(() => {
    // eslint-disable-next-line compat/compat -- jsdom lacks ResizeObserver, but Radix-powered stories expect it.
    globalThis.ResizeObserver = class ResizeObserver {
      disconnect = vi.fn()
      observe = vi.fn()
      unobserve = vi.fn()
    }
  })

  it('loads every story module', () => {
    const modules = import.meta.glob('./**/*.stories.tsx', { eager: true })

    expect(Object.keys(modules).length).toBeGreaterThan(0)

    for (const module of Object.values(modules)) {
      expect(module).toHaveProperty('default')
    }
  })

  it('renders core component stories', () => {
    const modules = import.meta.glob('./**/*.stories.tsx', { eager: true })

    for (const module of Object.values(modules)) {
      const meta = (
        module as { default?: { args?: Record<string, unknown>; component?: ComponentType<Record<string, unknown>> } }
      ).default

      for (const [name, story] of Object.entries(module as Record<string, unknown>)) {
        if (name === 'default') {
          continue
        }

        const storyConfig = story as {
          args?: Record<string, unknown>
          decorators?: Array<(Story: ComponentType<Record<string, unknown>>) => ReactElement>
          render?: (args?: Record<string, unknown>) => ReactElement
        }
        let StoryComponent: ComponentType<Record<string, unknown>>

        const args = mergeStoryArguments(meta?.args, storyConfig.args)

        if (storyConfig.render) {
          StoryComponent = () => storyConfig.render?.(args) ?? null
        } else if (meta?.component) {
          StoryComponent = () => React.createElement(meta.component as ComponentType<Record<string, unknown>>, args)
        } else {
          continue
        }

        const decorators: Array<(Story: ComponentType<Record<string, unknown>>) => ReactElement> =
          storyConfig.decorators ?? []

        for (const decorator of decorators) {
          const DecoratedStory: ComponentType<Record<string, unknown>> = StoryComponent
          StoryComponent = () => decorator(DecoratedStory)
        }

        const queryClient = new QueryClient({
          defaultOptions: {
            mutations: { retry: false },
            queries: { retry: false },
          },
        })
        const { unmount } = render(
          React.createElement(
            QueryClientProvider,
            { client: queryClient },
            React.createElement(
              MemoryRouter,
              null,
              React.createElement(JamDisplayContextProvider, null, React.createElement(StoryComponent)),
            ),
          ),
        )
        queryClient.clear()
        unmount()
      }
    }

    cleanup()
  }, 20_000)
})
