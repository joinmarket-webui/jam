import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseSemanticVersion } from '@/lib/utils'
import { useFeatures } from './useFeatures'

const mocks = vi.hoisted(() => ({
  developerMode: false,
  backend: undefined as string | undefined,
}))

vi.mock('@/hooks/useQueryJmInfo', () => ({
  useQueryJmInfo: () =>
    mocks.backend === undefined ? {} : { info: { backend: mocks.backend, version: parseSemanticVersion('0.43.0') } },
}))

vi.mock('@/store/jamSettingsStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/store/jamSettingsStore')>()),
  useDeveloperMode: () => ({ enabled: mocks.developerMode }),
}))

describe('useFeatures', () => {
  beforeEach(() => {
    mocks.developerMode = false
    mocks.backend = undefined
  })

  it('supports logs on joinmarket-ng', () => {
    mocks.backend = 'joinmarket-ng'

    const { result } = renderHook(() => useFeatures())

    expect(result.current.features).toEqual([{ name: 'logs', enabled: true }])
    expect(result.current.isFeatureSupported('logs')).toBe(true)
    expect(result.current.isFeatureEnabled('logs')).toBe(true)
  })

  it('does not support logs on other backends', () => {
    mocks.backend = 'joinmarket-clientserver'

    const { result } = renderHook(() => useFeatures())

    expect(result.current.features).toEqual([{ name: 'logs', enabled: false }])
    expect(result.current.isFeatureSupported('logs')).toBe(false)
    expect(result.current.isFeatureEnabled('logs')).toBe(false)
  })

  it('enables logs in developer mode even if unsupported', () => {
    mocks.backend = 'joinmarket-clientserver'
    mocks.developerMode = true

    const { result } = renderHook(() => useFeatures())

    expect(result.current.isFeatureSupported('logs')).toBe(false)
    expect(result.current.isFeatureEnabled('logs')).toBe(true)
  })

  it('keeps features empty while the backend info is unknown', () => {
    const { result } = renderHook(() => useFeatures())

    expect(result.current.features).toBeUndefined()
    expect(result.current.isFeatureEnabled('logs')).toBe(false)
  })
})
