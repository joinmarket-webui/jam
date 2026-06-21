import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useQueryJmInfo } from './useQueryJmInfo'

const mocks = vi.hoisted(() => ({
  data: undefined as { version: string } | undefined,
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
  it('parses semantic version responses', () => {
    mocks.data = { version: '0.9.12' }

    const { result } = renderHook(() => useQueryJmInfo())

    expect(result.current.version).toEqual({ major: 0, minor: 9, patch: 12, raw: '0.9.12' })
  })

  it('returns undefined version before data is available', () => {
    mocks.data = undefined

    const { result } = renderHook(() => useQueryJmInfo())

    expect(result.current.version).toBeUndefined()
  })
})
