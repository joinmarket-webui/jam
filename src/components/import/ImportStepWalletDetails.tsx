import type { ComponentProps } from 'react'
import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CreateWalletForm } from '@/components/create/CreateWalletForm'
import { Button } from '@/components/ui/button'
import { routes } from '@/constants/routes'
import type { WalletFileName } from '@/lib/utils'
import { OtherWalletActiveAlert } from '../create/OtherWalletActiveAlert'
import { RescanActiveAlert } from './RescanActiveAlert'

type ImportStepWalletDetailsProps = ComponentProps<typeof CreateWalletForm> & {
  sessionInfo: SessionResponse | undefined
}

export const ImportStepWalletDetails = ({ sessionInfo, ...createFormProps }: ImportStepWalletDetailsProps) => {
  const { t } = useTranslation()
  const isSessionActive = sessionInfo?.session === true
  const isRescanActive = sessionInfo?.rescanning === true
  const showForm = !isSessionActive && !isRescanActive
  return (
    <div className="space-y-2">
      {isSessionActive && (
        <OtherWalletActiveAlert
          linkTarget={'login'}
          walletFileName={sessionInfo.wallet_name as WalletFileName | undefined}
        />
      )}
      {isRescanActive && <RescanActiveAlert linkTarget={'login'} />}
      {showForm && <CreateWalletForm {...createFormProps} />}
      <div className="text-center">
        <p className="text-muted-foreground text-sm">
          {t('create_wallet.text_login_hint')}{' '}
          <Button variant="link" asChild>
            <Link to={routes.login} className="font-semibold">
              {t('create_wallet.button_login_link')}
            </Link>
          </Button>
        </p>
      </div>
    </div>
  )
}
