import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import PageTitle from '@/components/ui/jam/PageTitle'
import type { WalletFileName } from '@/lib/utils'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { WalletJarsDetailsContent } from './WalletJarsDetailsContent'

interface WalletJarsDetailsProps {
  walletFileName: WalletFileName
}

export const WalletJarsDetailsPage = ({ walletFileName }: WalletJarsDetailsProps) => {
  const { t } = useTranslation()
  const isDeveloperMode = useStore(jamSettingsStore, (state) => state.state.developerMode)

  return (
    <div className="mx-auto space-y-3 p-4">
      <PageTitle title={/* todo: i18n */ t('Wallet Jars Details')} />
      <WalletJarsDetailsContent enabled={true} walletFileName={walletFileName} debug={isDeveloperMode} />
    </div>
  )
}
