import { renderHook } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useQuery } from '@tanstack/react-query'
import { useFeatures } from './useFeatures'

const mockUseDeveloperMode = vi.fn<() => { enabled: boolean }>()
const mockUseStore = vi.fn<(...args: unknown[]) => string>()

vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(),
}))

vi.mock('zustand', () => ({
    useStore: (...args: unknown[]): string => mockUseStore(...args),
}))

vi.mock('@/store/jamSettingsStore', () => ({
    useDeveloperMode: (): { enabled: boolean } => mockUseDeveloperMode(),
}))

vi.mock('@/store/authStore', () => ({
    authStore: {},
}))

vi.mock('@/lib/api/logs', () => ({
    fetchFeatures: vi.fn(),
}))

type FeatureItem = {
    name: string
    enabled: boolean
}

const setQueryData = (data: FeatureItem[] | undefined) => {
    vi.mocked(useQuery).mockReturnValue({
        data,
        error: null,
        isLoading: false,
        isFetching: false,
    } as ReturnType<typeof useQuery>)
}

describe('useFeatures.isFeatureEnabled', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockUseStore.mockReturnValue('test-token')
        mockUseDeveloperMode.mockReturnValue({ enabled: false })
        setQueryData(undefined)
    })

    it('returns true when feature is enabled by server response', () => {
        setQueryData([{ name: 'logs', enabled: true }])

        const { result } = renderHook(() => useFeatures())

        expect(result.current.isFeatureEnabled('logs')).toBe(true)
    })

    it('returns false when feature is present but disabled by server', () => {
        setQueryData([{ name: 'logs', enabled: false }])

        const { result } = renderHook(() => useFeatures())

        expect(result.current.isFeatureEnabled('logs')).toBe(false)
    })

    it('returns false when feature flags are missing', () => {
        setQueryData([])

        const { result } = renderHook(() => useFeatures())

        expect(result.current.isFeatureEnabled('logs')).toBe(false)
    })

    it('applies developer mode override even when server reports disabled', () => {
        setQueryData([{ name: 'logs', enabled: false }])
        mockUseDeveloperMode.mockReturnValue({ enabled: true })

        const { result } = renderHook(() => useFeatures())

        expect(result.current.isFeatureEnabled('logs')).toBe(true)
    })

    it('handles invalid and undefined inputs safely', () => {
        setQueryData([{ name: 'logs', enabled: false }])

        const { result } = renderHook(() => useFeatures())

        const runtimeIsFeatureEnabled = result.current.isFeatureEnabled as (featureName: unknown) => boolean

        expect(runtimeIsFeatureEnabled('invalid-feature')).toBe(false)
        expect(runtimeIsFeatureEnabled(undefined)).toBe(false)
    })
})
