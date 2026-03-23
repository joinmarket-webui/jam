import type { ComponentProps } from 'react'
import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
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
  const isSessionActive = sessionInfo?.session === true
  const isRescanActive = sessionInfo?.rescanning === true
  const showForm = !isSessionActive && !isRescanActive
  return (
    <div className="space-y-2">
      {isSessionActive && (
        <OtherWalletActiveAlert linkTarget={'login'} walletFileName={sessionInfo.wallet_name as WalletFileName} />
      )}
      {isRescanActive && <RescanActiveAlert linkTarget={'login'} />}
      {showForm && <CreateWalletForm {...createFormProps} />}
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
