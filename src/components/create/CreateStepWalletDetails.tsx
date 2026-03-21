import type { ComponentProps } from 'react'
import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { AlertCircleIcon } from 'lucide-react'
import { Trans } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { routes } from '@/constants/routes'
import { walletDisplayName } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { CreateWalletForm } from './CreateWalletForm'

type CreateStepWalletDetailsProps = ComponentProps<typeof CreateWalletForm> & {
  sessionInfo: SessionResponse | undefined
}

export const CreateStepWalletDetails = ({ sessionInfo, ...createFormProps }: CreateStepWalletDetailsProps) => {
  return (
    <>
      {sessionInfo?.session === true ? (
        <Alert variant="warning">
          <AlertCircleIcon />
          <AlertDescription>
            <Trans
              i18nKey="create_wallet.alert_other_wallet_unlocked"
              values={{
                walletName: walletDisplayName((sessionInfo?.wallet_name || 'Unknown') as WalletFileName),
              }}
            >
              Currently <strong>walletName</strong> is active. You need to lock it first.
              <Link to={routes.login} className="font-semibold underline">
                Go back
              </Link>
            </Trans>
          </AlertDescription>
        </Alert>
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
    </>
  )
}
