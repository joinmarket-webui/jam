import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authStore } from '@/store/authStore'
import { useQueryJamInfo } from './useQueryJamInfo'

const mocks = vi.hoisted(() => ({
  queryData: undefined as { backend: { name: string; version: string } } | undefined,
  nativeBackend: 'joinmarket-clientserver',
  nativeVersion: { raw: '0.9.12', major: 0, minor: 9, patch: 12 },
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(
    (options: { enabled: boolean; queryFn: () => Promise<{ backend: { name: string; version: string } }> }) => ({
      data: options.enabled ? mocks.queryData : undefined,
      error: null,
      isFetching: false,
      isLoading: false,
    }),
  ),
}))

vi.mock('@/lib/api/jam', () => ({
  fetchInfo: vi.fn(),
}))

vi.mock('@/hooks/useQueryJmInfo', () => ({
  useQueryJmInfo: () => ({
    version: mocks.nativeVersion,
    backend: mocks.nativeBackend,
  }),
}))

describe('useQueryJamInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    mocks.queryData = undefined
    mocks.nativeBackend = 'joinmarket-clientserver'
    mocks.nativeVersion = { raw: '0.9.12', major: 0, minor: 9, patch: 12 }
    authStore.getState().clear()
  })

  it('returns standalone info when an auth token is available and resolves statuses correctly', () => {
    authStore.getState().update({ auth: { token: 'token', refresh_token: 'refresh' } })
    mocks.queryData = { backend: { name: 'joinmarket-ng', version: '0.33.0' } }

    const { result } = renderHook(() => useQueryJamInfo())

    expect(result.current.info).toEqual({ backend: { name: 'joinmarket-ng', version: '0.33.0' } })
    expect(result.current.isJamStandalone).toBe(true)
    expect(result.current.backendName).toBe('jam-standalone (joinmarket-ng)')
    expect(result.current.joinmarketVersion).toEqual({ raw: '0.33.0', major: 0, minor: 33, patch: 0 })
  })

  it('keeps info empty without an auth token and resolves native statuses', () => {
    mocks.queryData = { backend: { name: 'joinmarket-ng', version: '0.33.0' } }

    const { result } = renderHook(() => useQueryJamInfo())

    expect(result.current.info).toBeUndefined()
    expect(result.current.isJamStandalone).toBe(false)
    expect(result.current.backendName).toBe('joinmarket-clientserver')
    expect(result.current.joinmarketVersion).toEqual({ raw: '0.9.12', major: 0, minor: 9, patch: 12 })
  })

  it('falls back to native version if standalone version is not semantic', () => {
    authStore.getState().update({ auth: { token: 'token', refresh_token: 'refresh' } })
    mocks.queryData = { backend: { name: 'joinmarket-ng', version: 'main' } }

    const { result } = renderHook(() => useQueryJamInfo())

    expect(result.current.isJamStandalone).toBe(true)
    expect(result.current.backendName).toBe('jam-standalone (joinmarket-ng)')
    expect(result.current.joinmarketVersion).toEqual({ raw: '0.9.12', major: 0, minor: 9, patch: 12 })
  })
})
