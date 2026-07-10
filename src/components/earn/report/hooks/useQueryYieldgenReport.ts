import { yieldgenreportQueryKey } from '@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query'
import { yieldgenreport } from '@joinmarket-webui/joinmarket-ng-api-ts/jm'
import { useQuery } from '@tanstack/react-query'
import { yieldgenReportToEarnReportEntries } from '@/components/earn/report/hooks/earnReportParser'
import { useApiClient } from '@/hooks/useApiClient'

// Re-export for consumers
export type { EarnReportEntry } from '@/components/earn/report/hooks/earnReportParser'

export function useQueryYieldgenReport({ enabled = true }: { enabled?: boolean } = {}) {
  const client = useApiClient()

  return useQuery<ReturnType<typeof yieldgenReportToEarnReportEntries>>({
    queryKey: yieldgenreportQueryKey(),
    queryFn: async ({ signal }) => {
      try {
        const response = await yieldgenreport({ client, signal })

        const lines = response.data?.yigen_data ?? []

        return yieldgenReportToEarnReportEntries(lines)
      } catch (error: unknown) {
        // 404 is returned until the maker is started at least once
        if (error && typeof error === 'object' && 'status' in error && (error as { status: number }).status === 404) {
          return []
        }
        throw error
      }
    },
    enabled,
  })
}
