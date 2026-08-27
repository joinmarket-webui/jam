import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useQueryJmInfo } from './useQueryJmInfo'

const mocks = vi.hoisted(() => ({
  data: undefined as { version: string; backend: string } | undefined,
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
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
    mocks.data = { version: '0.34.2', backend: 'joinmarket-ng' }

    const { result } = renderHook(() => useQueryJmInfo())

    expect(result.current.info?.version).toEqual({ major: 0, minor: 34, patch: 2, raw: '0.34.2' })
    expect(result.current.info?.backend).toBe('joinmarket-ng')
  })

  it('returns undefined version and backend before data is available', () => {
    mocks.data = undefined

    const { result } = renderHook(() => useQueryJmInfo())

    expect(result.current.info).toBeUndefined()
  })
})
