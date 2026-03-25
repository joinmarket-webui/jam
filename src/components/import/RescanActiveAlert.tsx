import { AlertCircleIcon } from 'lucide-react'
import { Trans } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { routes, type Route } from '@/constants/routes'

type RescanActiveAlertProps = {
  linkTarget: Route
}

export const RescanActiveAlert = ({ linkTarget }: RescanActiveAlertProps) => {
  return (
    <Alert variant="warning">
      <AlertCircleIcon />
      <AlertDescription>
        <Trans i18nKey="import_wallet.alert_rescan_in_progress">
          Rescanning the timechain is currently in progress.
          <Link to={routes[linkTarget]} className="font-semibold underline">
            Go back
          </Link>
        </Trans>
      </AlertDescription>
    </Alert>
  )
}
