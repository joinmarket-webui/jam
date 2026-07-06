import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authStore } from '@/store/authStore'
import { useFeatures } from './useFeatures'

const mocks = vi.hoisted(() => ({
  developerMode: false,
  queryData: undefined as
    { features?: Record<string, boolean> | Array<{ name: string; enabled: boolean }> } | undefined,
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(
    (options: {
      enabled: boolean
      select: (data: { features?: Record<string, boolean> | Array<{ name: string; enabled: boolean }> }) => unknown
    }) => ({
      data: options.enabled && mocks.queryData ? options.select(mocks.queryData) : undefined,
      error: null,
      isFetching: false,
      isLoading: false,
    }),
  ),
}))

vi.mock('@/lib/api/jam', () => ({
  fetchFeatures: vi.fn(),
}))

vi.mock('@/store/jamSettingsStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/store/jamSettingsStore')>()),
  useDeveloperMode: () => ({ enabled: mocks.developerMode }),
}))

describe('useFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    mocks.developerMode = false
    mocks.queryData = undefined
    authStore.getState().clear()
  })

  it('normalizes object feature responses', () => {
    authStore.getState().update({ auth: { token: 'token', refresh_token: 'refresh' } })
    mocks.queryData = { features: { logs: true } }

    const { result } = renderHook(() => useFeatures())

    expect(result.current.features).toEqual([{ name: 'logs', enabled: true }])
    expect(result.current.isFeatureSupported('logs')).toBe(true)
    expect(result.current.isFeatureEnabled('logs')).toBe(true)
  })

  it('supports array responses and developer-mode fallback', () => {
    authStore.getState().update({ auth: { token: 'token', refresh_token: 'refresh' } })
    mocks.developerMode = true
    mocks.queryData = { features: [{ name: 'logs', enabled: false }] }

    const { result } = renderHook(() => useFeatures())

    expect(result.current.isFeatureSupported('logs')).toBe(false)
    expect(result.current.isFeatureEnabled('logs')).toBe(true)
  })

  it('keeps features empty without an auth token', () => {
    mocks.queryData = { features: { logs: true } }

    const { result } = renderHook(() => useFeatures())

    expect(result.current.features).toBeUndefined()
    expect(result.current.isFeatureEnabled('logs')).toBe(false)
  })
})
