import { AlertTriangleIcon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { routes } from '@/constants/routes'

export const UnconfirmedBalanceAlert = ({ numberOfMissingConfirmations }: { numberOfMissingConfirmations: number }) => {
  const { t } = useTranslation()

  return (
    <Alert variant="warning">
      <AlertTriangleIcon />
      <AlertTitle>{t('earn.precondition.title')}</AlertTitle>
      <AlertDescription>
        <ul className="list-outside list-disc space-y-2">
          <li>
            {t('earn.precondition.hint_missing_confirmations', {
              count: numberOfMissingConfirmations,
            })}
          </li>
        </ul>
      </AlertDescription>
    </Alert>
  )
}

export const NoSpendableBalanceAlert = () => {
  const { t } = useTranslation()

  return (
    <Alert variant="warning">
      <AlertTriangleIcon />
      <AlertTitle>{t('earn.precondition.title')}</AlertTitle>
      <AlertDescription>
        <ul className="list-outside list-disc space-y-2">
          <li>
            <Trans i18nKey="earn.precondition.hint_missing_utxos">
              <Link to={routes.receive} className="font-semibold">
                Fund your wallet
              </Link>
              to start earning.
            </Trans>
          </li>
        </ul>
      </AlertDescription>
    </Alert>
  )
}

export const NonFrozenFidelityBondsAlert = ({
  numberOfNonFrozenFidelityBondOutputs,
}: {
  numberOfNonFrozenFidelityBondOutputs: number
}) => {
  const { t } = useTranslation()

  return (
    <Alert variant="warning">
      <AlertTriangleIcon />
      <AlertTitle>{t('earn.precondition.title')}</AlertTitle>

      <AlertDescription>
        <ul className="list-outside list-disc space-y-2">
          <li>
            <Trans
              i18nKey="earn.precondition.hint_non_frozen_fidelity_bonds"
              values={{ count: numberOfNonFrozenFidelityBondOutputs }}
              components={{
                '1': <Link to={routes.walletJarsDetails} className="font-semibold" />,
              }}
            />
          </li>
        </ul>
      </AlertDescription>
    </Alert>
  )
}
