import type { ComponentProps } from 'react'
import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { routes } from '@/constants/routes'
import type { WalletFileName } from '@/lib/utils'
import { CreateWalletForm } from './CreateWalletForm'
import { OtherWalletActiveAlert } from './OtherWalletActiveAlert'

type CreateStepWalletDetailsProps = ComponentProps<typeof CreateWalletForm> & {
  sessionInfo: SessionResponse | undefined
}

export const CreateStepWalletDetails = ({ sessionInfo, ...createFormProps }: CreateStepWalletDetailsProps) => {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      {sessionInfo?.session === true ? (
        <OtherWalletActiveAlert linkTarget={'login'} walletFileName={sessionInfo.wallet_name as WalletFileName} />
      ) : (
        <CreateWalletForm {...createFormProps} />
      )}
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
