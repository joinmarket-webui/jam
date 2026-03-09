import { useTranslation } from 'react-i18next'
import PageTitle from '@/components/ui/jam/PageTitle'
import type { WalletFileName } from '@/lib/utils'
import { EarnReportContent } from './EarnReportContent'

interface EarnReportPageProps {
  walletFileName: WalletFileName
}

export const EarnReportPage = ({ walletFileName: _walletFileName }: EarnReportPageProps) => {
  const { t } = useTranslation()

  return (
    <div className="mx-auto space-y-3 p-4">
      <PageTitle title={t('earn.report.title')} />
      <EarnReportContent enabled={true} />
    </div>
  )
}
