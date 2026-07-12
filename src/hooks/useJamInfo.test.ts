import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authStore } from '@/store/authStore'
import { useJamInfo } from './useJamInfo'

const mocks = vi.hoisted(() => ({
  queryData: undefined as { backend: { name: string; version: string } } | undefined,
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

describe('useJamInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    mocks.queryData = undefined
    authStore.getState().clear()
  })

  it('returns standalone info when an auth token is available', () => {
    authStore.getState().update({ auth: { token: 'token', refresh_token: 'refresh' } })
    mocks.queryData = { backend: { name: 'joinmarket-ng', version: '0.33.0' } }

    const { result } = renderHook(() => useJamInfo())

    expect(result.current.info).toEqual({ backend: { name: 'joinmarket-ng', version: '0.33.0' } })
  })

  it('keeps info empty without an auth token', () => {
    mocks.queryData = { backend: { name: 'joinmarket-ng', version: '0.33.0' } }

    const { result } = renderHook(() => useJamInfo())

    expect(result.current.info).toBeUndefined()
  })
})
