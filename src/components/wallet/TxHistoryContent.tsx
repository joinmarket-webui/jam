import { useState } from 'react'
import { AlertTriangleIcon, ListIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useQueryWalletHistory } from '@/hooks/useQueryWalletHistory'
import { cn, type WalletFileName } from '@/lib/utils'
import { TxHistoryTable } from './TxHistoryTable'

interface TxHistoryContentProps {
  walletFileName: WalletFileName
  className?: string
  initialLimit?: number
  compact?: boolean
  enabled?: boolean
  onViewAll?: () => void
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
  const { history, queryResult } = useQueryWalletHistory({ walletFileName, limit, enabled })

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground text-sm font-light tracking-wide">{t('tx_history.section_title')}</h2>
        {compact && onViewAll ? (
          <Button size="sm" variant="outline" onClick={onViewAll}>
            <ListIcon />
            {t('tx_history.button_view_all')}
          </Button>
        ) : null}
      </div>

      {queryResult.isLoading ? (
        <div className="flex min-h-32 items-center justify-center gap-2">
          <Spinner className="motion-reduce:hidden" />
          {t('global.loading')}
        </div>
      ) : queryResult.error ? (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertDescription>{t('tx_history.error_loading')}</AlertDescription>
        </Alert>
      ) : (
        <TxHistoryTable history={compact ? history.slice(0, 5) : history} compact={compact} />
      )}

      {!compact && history.length >= limit ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setLimit((current) => current + 10)}
            disabled={queryResult.isFetching}
          >
            {queryResult.isFetching ? <Spinner /> : undefined}
            {t('tx_history.button_load_more')}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
