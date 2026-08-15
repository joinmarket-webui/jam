import { useTranslation } from 'react-i18next'
import PageTitle from '@/components/ui/jam/PageTitle'
import type { WalletFileName } from '@/lib/utils'
import { TxHistoryContent } from './TxHistoryContent'

interface TxHistoryPageProps {
  walletFileName: WalletFileName
}

export function TxHistoryPage({ walletFileName }: TxHistoryPageProps) {
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col space-y-4 p-4 sm:p-6">
      <PageTitle title={t('tx_history.title')} />
      <TxHistoryContent walletFileName={walletFileName} compact={false} />
    </div>
  )
}
