import { useTranslation } from 'react-i18next'
import PageTitle from '@/components/ui/jam/PageTitle'
import type { WalletFileName } from '@/lib/utils'
import { useDeveloperMode } from '@/store/jamSettingsStore'
import { WalletJarsDetailsContent } from './WalletJarsDetailsContent'

interface WalletJarsDetailsProps {
  walletFileName: WalletFileName
}

export const WalletJarsDetailsPage = ({ walletFileName }: WalletJarsDetailsProps) => {
  const { t } = useTranslation()
  const { enabled: isDeveloperMode } = useDeveloperMode()

  return (
    <div className="mx-auto space-y-3 p-4">
      <PageTitle title={/* todo: i18n */ t('Wallet Jars Details')} />
      <WalletJarsDetailsContent enabled={true} walletFileName={walletFileName} debug={isDeveloperMode} />
    </div>
  )
}
