import { AlertTriangleIcon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import type { SweepPreconditionSummary } from '@/components/sweep/preconditions'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Balance } from '@/components/ui/jam/Balance'
import { JAM_JM_RETRIES_DOCS_URL } from '@/constants/jam'
import { shortenStringMiddle } from '@/lib/utils'
import { JarBadge } from '../earn/fidelity-bond/FidelityBondDialogParts'

interface SendCoinjoinPreconditionAlertProps {
  summary: SweepPreconditionSummary
}

const RetryLockedUtxoList = ({ summary }: SendCoinjoinPreconditionAlertProps) => {
  const { t } = useTranslation()

  return (
    <>
      <Trans
        i18nKey="send.coinjoin_precondition.hint_missing_retries"
        components={{
          '1': (
            <a
              key="retries-doc-link"
              className="font-semibold"
              href={JAM_JM_RETRIES_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
        }}
      />
      <div className="mt-3 p-2">
        <div className="mb-2 text-xs font-semibold">{t('global.utxos')}</div>
        <ul className="list-inside list-[circle] space-y-2">
          {summary.retryLockedUtxos.map((utxo) => (
            <li key={utxo.utxo} className="space-x-2">
              <span className="slashed-zero tabular-nums">
                <JarBadge jarIndex={utxo.mixdepth} />
              </span>
              <span className="font-mono select-all">{shortenStringMiddle(utxo.utxo, 26)}</span>
              <Balance valueString={String(utxo.value)} />
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

  return (
    <Alert variant="warning">
      <AlertTriangleIcon />
      <AlertTitle>{t('send.coinjoin_precondition.title')}</AlertTitle>
      <AlertDescription>
        <ul className="list-outside list-disc space-y-2">
          {summary.numberOfNonFrozenFidelityBondOutputs === 0 ? null : (
            <li>
              {t('send.coinjoin_precondition.hint_non_frozen_fidelity_bonds', {
                count: summary.numberOfNonFrozenFidelityBondOutputs,
              })}
            </li>
          )}
          {summary.numberOfMissingUtxos === 0 ? null : (
            <li>
              {t('send.coinjoin_precondition.hint_missing_utxos', {
                minConfirmations: summary.options.minConfirmations,
              })}
            </li>
          )}
          {summary.numberOfMissingConfirmations === 0 ? null : (
            <li>
              {t('send.coinjoin_precondition.hint_missing_confirmations', {
                minConfirmations: summary.options.minConfirmations,
                amountOfMissingConfirmations: summary.numberOfMissingConfirmations,
              })}
            </li>
          )}
          {summary.retryLockedUtxos.length === 0 ? null : <li>{<RetryLockedUtxoList summary={summary} />}</li>}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
