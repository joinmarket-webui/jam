import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useQueryYieldgenReport } from './useQueryYieldgenReport'

type QueryOptions = {
  queryFn: (context: { signal: AbortSignal }) => Promise<unknown>
  enabled?: boolean
}

const yieldgenreportMock = vi.fn<() => Promise<{ data: unknown }>>()
const parserMock = vi.fn((lines: string[]) => lines)
let capturedOptions: QueryOptions

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: QueryOptions) => {
    capturedOptions = options
    return { data: undefined }
  },
}))

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query', () => ({
  yieldgenreportQueryKey: () => ['yieldgenreport'],
}))

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts/jm', () => ({
  yieldgenreport: () => yieldgenreportMock(),
}))

vi.mock('@/components/earn/report/hooks/earnReportParser', () => ({
  yieldgenReportToEarnReportEntries: (lines: string[]) => parserMock(lines),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

const runQueryFn = () => capturedOptions.queryFn({ signal: new AbortController().signal })

describe('useQueryYieldgenReport', () => {
  it('parses the yigen_data wrapped format', async () => {
    yieldgenreportMock.mockResolvedValue({ data: { yigen_data: ['a', 'b'] } })
    renderHook(() => useQueryYieldgenReport())

    await expect(runQueryFn()).resolves.toEqual(['a', 'b'])
    expect(parserMock).toHaveBeenCalledWith(['a', 'b'])
  })

  it('returns an empty array on a 404 error', async () => {
    yieldgenreportMock.mockRejectedValue({ status: 404 })
    renderHook(() => useQueryYieldgenReport())

    await expect(runQueryFn()).resolves.toEqual([])
  })

  it('rethrows non-404 errors', async () => {
    yieldgenreportMock.mockRejectedValue({ status: 500 })
    renderHook(() => useQueryYieldgenReport())

    await expect(runQueryFn()).rejects.toEqual({ status: 500 })
  })

  it('passes enabled through to useQuery', () => {
    yieldgenreportMock.mockResolvedValue({ data: [] })
    renderHook(() => useQueryYieldgenReport({ enabled: false }))

    expect(capturedOptions.enabled).toBe(false)
  })
})
