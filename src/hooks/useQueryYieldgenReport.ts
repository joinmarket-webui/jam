import { yieldgenreportQueryKey } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { yieldgenreport } from '@joinmarket-webui/joinmarket-api-ts/jm'
import type { ErrorMessage } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useQuery } from '@tanstack/react-query'
import { useApiClient } from '@/hooks/useApiClient'
import { yieldgenReportToEarnReportEntries } from '@/lib/earnReportParser'

// Re-export for consumers
export type { EarnReportEntry } from '@/lib/earnReportParser'

export function useQueryYieldgenReport({ enabled = true }: { enabled?: boolean } = {}) {
  const client = useApiClient()

  return useQuery<ReturnType<typeof yieldgenReportToEarnReportEntries>, ErrorMessage>({
    queryKey: yieldgenreportQueryKey(),
    queryFn: async ({ signal }) => {
      try {
        const response = await yieldgenreport({ client, signal })
        // API returns string[] (CSV lines with header)

        return yieldgenReportToEarnReportEntries((response.data ?? []) as string[])
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
