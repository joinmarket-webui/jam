import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useQueryJmInfo } from './useQueryJmInfo'

const mocks = vi.hoisted(() => ({
  data: undefined as { version: string; backend: string } | undefined,
}))

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query', () => ({
  versionOptions: vi.fn(() => ({ queryKey: ['version'] })),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: mocks.data,
  })),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

describe('useQueryJmInfo', () => {
  it('parses semantic version responses and exposes backend', () => {
    mocks.data = { version: '0.9.12', backend: 'joinmarket-clientserver' }

    const { result } = renderHook(() => useQueryJmInfo())

    expect(result.current.version).toEqual({ major: 0, minor: 9, patch: 12, raw: '0.9.12' })
    expect(result.current.backend).toBe('joinmarket-clientserver')
  })

  it('returns undefined version and backend before data is available', () => {
    mocks.data = undefined

    const { result } = renderHook(() => useQueryJmInfo())

    expect(result.current.version).toBeUndefined()
    expect(result.current.backend).toBeUndefined()
  })
})
