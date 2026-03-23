import type { ComponentProps } from 'react'
import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
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
  return (
    <div className="space-y-2">
      {sessionInfo?.session === true ? (
        <OtherWalletActiveAlert linkTarget={'login'} walletFileName={sessionInfo.wallet_name as WalletFileName} />
      ) : (
        <CreateWalletForm {...createFormProps} />
      )}
      <div className="text-center">
        <p className="text-muted-foreground text-sm">
          {/* TODO: i18n */}
          Already have a wallet?{' '}
          <Button variant="link" asChild>
            <Link to={routes.login} className="font-semibold">
              Sign in here
            </Link>
          </Button>
        </p>
      </div>
    </div>
  )
}
