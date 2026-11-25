import { yieldgenreportQueryKey } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { yieldgenreport } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useQuery } from '@tanstack/react-query'
import { yieldgenReportToEarnReportEntries } from '@/components/earn/report/hooks/earnReportParser'
import { useApiClient } from '@/hooks/useApiClient'
import { getErrorReason } from '@/lib/errorReason'

// Re-export for consumers
export type { EarnReportEntry } from '@/components/earn/report/hooks/earnReportParser'

export function useQueryYieldgenReport({ enabled = true }: { enabled?: boolean } = {}) {
  const client = useApiClient()

  return useQuery<ReturnType<typeof yieldgenReportToEarnReportEntries>>({
    queryKey: yieldgenreportQueryKey(),
    queryFn: async ({ signal }) => {
      const response = await yieldgenreport({ client, signal })

      // Preserve the legacy backend's missing-report behavior. NG returns a
      // header-only 200 for an empty report; its 404 can mean a missing wallet.
      if (response.response?.status === 404) return []
      if (response.error !== undefined) {
        throw new Error(getErrorReason(response.error, 'Could not load the earnings report'), {
          cause: response.error,
        })
      }

      const lines = response.data?.yigen_data ?? []
      return yieldgenReportToEarnReportEntries(lines)
    },
    enabled,
  })
}
