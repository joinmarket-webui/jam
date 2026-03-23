import type { ComponentProps } from 'react'
import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { ChevronLeftIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { WalletFileName } from '@/lib/utils'
import { OtherWalletActiveAlert } from '../create/OtherWalletActiveAlert'
import { ImportDetailsForm } from './ImportDetailsForm'
import { RescanActiveAlert } from './RescanActiveAlert'

type ImportStepImportDetailsProps = ComponentProps<typeof ImportDetailsForm> & {
  sessionInfo: SessionResponse | undefined
  onBack: () => void
}

export const ImportStepImportDetails = ({ sessionInfo, onBack, ...importFormProps }: ImportStepImportDetailsProps) => {
  const { t } = useTranslation()
  const isSessionActive = sessionInfo?.session === true
  const isRescanActive = sessionInfo?.rescanning === true
  const showForm = !isSessionActive && !isRescanActive
  return (
    <div className="space-y-2">
      {isSessionActive && (
        <OtherWalletActiveAlert linkTarget={'login'} walletFileName={sessionInfo.wallet_name as WalletFileName} />
      )}
      {isRescanActive && <RescanActiveAlert linkTarget={'login'} />}
      {showForm && <ImportDetailsForm {...importFormProps} />}
      <Button variant="ghost" onClick={onBack}>
        <ChevronLeftIcon className="h-4 w-4" />
        {t('global.back')}
      </Button>
    </div>
  )
}
