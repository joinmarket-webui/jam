import { useMemo, useState } from 'react'
import { AlertTriangleIcon, ListIcon, PlusIcon, RefreshCwIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DevBadge } from '@/components/dev/DevBadge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import { useQueryWalletHistory, type HistoryEntry } from '@/hooks/useQueryWalletHistory'
import { cn, type WalletFileName } from '@/lib/utils'
import { useDeveloperMode } from '@/store/jamSettingsStore'
import { TxHistoryTable } from './TxHistoryTable'

interface TxHistoryContentProps {
  walletFileName: WalletFileName
  className?: string
  initialLimit?: number
  compact?: boolean
  enabled?: boolean
  onViewAll?: () => void
}

const useSafeUtxosHashHex = () => {
  try {
    const context = useJamWalletInfoContext()
    return context?.utxosHashHex
  } catch {
    return undefined
  }
}

export const TxHistoryContent = ({
  walletFileName,
  className,
  initialLimit = 10,
  compact = false,
  enabled = true,
  onViewAll,
}: TxHistoryContentProps) => {
  const { t } = useTranslation()
  const [limit, setLimit] = useState(initialLimit)
  const { enabled: isDeveloperMode } = useDeveloperMode()
  const [demoEntries, setDemoEntries] = useState<HistoryEntry[]>([])
  const utxosHashHex = useSafeUtxosHashHex()

  const {
    history,
    queryResult: {
      isFetching: historyIsFetching,
      isLoading: historyIsLoading,
      error: historyError,
      refetch: historyRefetch,
    },
  } = useQueryWalletHistory({
    walletFileName,
    limit,
    enabled,
    utxosHashHex,
  })

  const combinedHistory = useMemo(() => [...demoEntries, ...history], [demoEntries, history])

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-muted-foreground text-sm font-light tracking-wide">{t('tx_history.section_title')}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {isDeveloperMode && (
            <Button
              type="button"
              className="overflow-hidde min-w-0 shrink"
              variant="outline"
              onClick={() => {
                const demoEntry: HistoryEntry = {
                  timestamp: new Date().toISOString(),
                  txid: `demo_${Date.now()}`,
                  role: 'send',
                  cj_amount: 100_000,
                  net_fee: -500,
                  confirmations: 6,
                }
                setDemoEntries((previous) => [demoEntry, ...previous])
              }}
              disabled={historyIsFetching}
            >
              <PlusIcon />
              <span className="hidden sm:inline">Add Demo Entry</span>
              <DevBadge className="shrink-0" />
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => void historyRefetch()}
            disabled={historyIsFetching}
            title={t('global.refresh')}
          >
            <RefreshCwIcon className={historyIsFetching ? 'motion-safe:animate-spin' : undefined} />
            <span className="hidden sm:inline">{t('global.refresh')}</span>
          </Button>

          {compact && onViewAll ? (
            <Button type="button" variant="outline" onClick={onViewAll} title={t('tx_history.button_view_all')}>
              <ListIcon />
              <span className="hidden sm:inline">{t('tx_history.button_view_all')}</span>
            </Button>
          ) : null}
        </div>
      </div>

      {historyIsLoading ? (
        <div className="flex min-h-32 items-center justify-center gap-2">
          <Spinner className="motion-reduce:hidden" />
          {t('global.loading')}
        </div>
      ) : historyError ? (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertDescription>{t('tx_history.error_loading')}</AlertDescription>
        </Alert>
      ) : (
        <TxHistoryTable history={compact ? combinedHistory.slice(0, 5) : combinedHistory} compact={compact} />
      )}

      {!compact && combinedHistory.length >= limit ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLimit((current) => current + 10)}
            disabled={historyIsFetching}
          >
            {historyIsFetching ? <Spinner /> : undefined}
            {t('tx_history.button_load_more')}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
