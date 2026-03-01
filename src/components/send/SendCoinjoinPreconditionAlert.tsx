import { AlertTriangleIcon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import type { SweepPreconditionSummary } from '@/components/sweep/preconditions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatSats, shortenStringMiddle } from '@/lib/utils'

interface SendCoinjoinPreconditionAlertProps {
  summary: SweepPreconditionSummary
}

const RETRIES_DOCS_URL =
  'https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/SOURCING-COMMITMENTS.md'

const RetryLockedUtxoList = ({ summary }: SendCoinjoinPreconditionAlertProps) => {
  if (summary.retryLockedUtxos.length === 0) {
    return null
  }

  return (
    <>
      <Trans
        i18nKey="send.coinjoin_precondition.hint_missing_retries"
        components={[
          <></>,
          <a key="retries-doc-link" href={RETRIES_DOCS_URL} target="_blank" rel="noopener noreferrer" />,
        ]}
      />
      <div className="mt-3 rounded-md border p-2">
        <div className="mb-2 text-xs font-semibold">UTXOs</div>
        <ul className="space-y-1">
          {summary.retryLockedUtxos.map((utxo) => (
            <li key={utxo.utxo} className="bg-muted/50 rounded-sm px-2 py-1 font-mono text-xs">
              <span className="mr-2 font-semibold">jar {utxo.mixdepth}</span>
              <span className="mr-2">{formatSats(utxo.value)} sats</span>
              <span>{shortenStringMiddle(utxo.utxo, 26)}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

export const SendCoinjoinPreconditionAlert = ({ summary }: SendCoinjoinPreconditionAlertProps) => {
  const { t } = useTranslation()

  if (summary.isFulfilled) {
    return null
  }

  if (summary.numberOfMissingUtxos > 0) {
    return (
      <Alert variant="warning">
        <AlertTriangleIcon />
        <AlertDescription>
          {t('send.coinjoin_precondition.hint_missing_utxos', { minConfirmations: summary.options.minConfirmations })}
        </AlertDescription>
      </Alert>
    )
  }

  if (summary.numberOfMissingConfirmations > 0) {
    return (
      <Alert variant="warning">
        <AlertTriangleIcon />
        <AlertDescription>
          {t('send.coinjoin_precondition.hint_missing_confirmations', {
            minConfirmations: summary.options.minConfirmations,
            amountOfMissingConfirmations: summary.numberOfMissingConfirmations,
          })}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert variant="warning">
      <AlertTriangleIcon />
      <AlertDescription>
        <RetryLockedUtxoList summary={summary} />
      </AlertDescription>
    </Alert>
  )
}
