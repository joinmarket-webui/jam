import { AlertTriangleIcon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { JarBadge } from '@/components/earn/fidelity-bond/FidelityBondDialogParts'
import type { SweepPreconditionSummary } from '@/components/sweep/preconditions'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Balance } from '@/components/ui/jam/Balance'
import { JAM_JM_RETRIES_DOCS_URL } from '@/constants/jam'
import { routes } from '@/constants/routes'
import { shortenStringMiddle } from '@/lib/utils'

export interface PreconditionAlertProps {
  summary: SweepPreconditionSummary
  i18nPrefix: 'send.coinjoin_precondition' | 'scheduler.precondition'
}

const RetryLockedUtxoList = ({ summary, i18nPrefix }: PreconditionAlertProps) => {
  const { t } = useTranslation()

  return (
    <>
      <Trans
        i18nKey={`${i18nPrefix}.hint_missing_retries`}
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

export const PreconditionAlert = ({ summary, i18nPrefix }: PreconditionAlertProps) => {
  const { t } = useTranslation()

  if (summary.isFulfilled) {
    return null
  }

  return (
    <Alert variant="warning">
      <AlertTriangleIcon />
      <AlertTitle>{t(`${i18nPrefix}.title`)}</AlertTitle>
      <AlertDescription>
        <ul className="list-outside list-disc space-y-2">
          {summary.numberOfNonFrozenFidelityBondOutputs === 0 ? null : (
            <li>
              <Trans
                i18nKey={`${i18nPrefix}.hint_non_frozen_fidelity_bond`}
                values={{ count: summary.numberOfNonFrozenFidelityBondOutputs }}
                components={{
                  '1': <Link to={routes.walletJarsDetails} className="font-semibold" />,
                }}
              />
            </li>
          )}
          {summary.numberOfMissingUtxos === 0 ? null : (
            <li>
              {t(`${i18nPrefix}.hint_missing_utxos`, {
                minConfirmations: summary.options.minConfirmations,
              })}
            </li>
          )}
          {summary.numberOfMissingConfirmations === 0 ? null : (
            <li>
              {t(`${i18nPrefix}.hint_missing_confirmations`, {
                minConfirmations: summary.options.minConfirmations,
                amountOfMissingConfirmations: summary.numberOfMissingConfirmations,
              })}
            </li>
          )}
          {summary.retryLockedUtxos.length === 0 ? null : (
            <li>
              <RetryLockedUtxoList summary={summary} i18nPrefix={i18nPrefix} />
            </li>
          )}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
