import { useMemo, type PropsWithChildren } from 'react'
import { ClockIcon, CoinsIcon, CopyIcon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Card, CardContent, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { FidelityBondUtxo } from '@/hooks/useQueryUtxos'
import * as fb from '@/lib/fidelityBondUtils'
import { time } from '@/lib/utils'
import { Balance } from '../ui/jam/Balance'

interface FidelityBondCardProps {
  value: FidelityBondUtxo
}

export function FidelityBondCard({ value, children }: PropsWithChildren<FidelityBondCardProps>) {
  const { t, i18n } = useTranslation()

  const isExpired = !fb.utxo.isLocked(value)
  const humanReadableLockDuration = useMemo(() => {
    const locktime = fb.utxo.getLocktime(value)
    if (!locktime) return '-'
    return time.humanReadableDuration({
      to: locktime,
      locale: i18n.resolvedLanguage || i18n.language,
    })
  }, [i18n.resolvedLanguage, i18n.language, value])

  if (!fb.utxo.isFidelityBond(value)) {
    return <></>
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {isExpired ? (
            <Trans i18nKey="earn.fidelity_bond.existing.title_expired">
              Fidelity Bond <strong>expired</strong>
            </Trans>
          ) : (
            t('earn.fidelity_bond.existing.title_active')
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          <Tooltip>
            <TooltipTrigger asChild>
              <code>{value.path}</code>
            </TooltipTrigger>
            <TooltipContent>
              {' '}
              <code>{value.utxo}</code>
            </TooltipContent>
          </Tooltip>
        </CardDescription>
        <CardAction>
          <div className="flex items-center gap-2">
            <CoinsIcon />
            <div>
              <Balance valueString={String(value.value)} />
            </div>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <ClockIcon />
          <div className="flex flex-col">
            <span className="text-muted-foreground text-sm font-semibold">
              {t(`earn.fidelity_bond.existing.${isExpired ? 'label_expired_on' : 'label_locked_until'}`)}
            </span>
            <span className="text-md font-mono">
              {value.locktime} ({humanReadableLockDuration})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <CopyIcon />
          <div className="flex flex-col">
            <span className="text-muted-foreground text-sm font-semibold">
              {t('earn.fidelity_bond.existing.label_address')}
            </span>
            <span className="text-sm">
              <code>{value.address}</code>
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2">{children}</CardFooter>
    </Card>
  )
}
