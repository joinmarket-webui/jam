import { useMemo, type PropsWithChildren } from 'react'
import { ClockIcon, CoinsIcon, CopyIcon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Card, CardContent, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Balance } from '@/components/ui/jam/Balance'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { FidelityBondUtxo } from '@/hooks/useQueryUtxos'
import * as fb from '@/lib/fidelityBondUtils'
import { cn, time } from '@/lib/utils'
import { Address } from '../ui/jam/Address'

interface FidelityBondCardProps {
  value: FidelityBondUtxo
  className?: string
}

export function FidelityBondCard({ value, className, children }: PropsWithChildren<FidelityBondCardProps>) {
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
    <Card className={cn('transition-all duration-300 hover:-translate-y-[2px] hover:shadow-md', className)}>
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
        <CardDescription className="min-w-0 text-xs break-all">
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
          <div className="flex min-w-0 items-center gap-2">
            <CoinsIcon className="shrink-0" />
            <div className="min-w-0">
              <Balance valueString={String(value.value)} />
            </div>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <ClockIcon className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-muted-foreground text-sm font-semibold">
              {t(`earn.fidelity_bond.existing.${isExpired ? 'label_expired_on' : 'label_locked_until'}`)}
            </span>
            <span className="text-md block font-mono break-words">
              {value.locktime} ({humanReadableLockDuration})
            </span>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <CopyIcon className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-muted-foreground text-sm font-semibold">
              {t('earn.fidelity_bond.existing.label_address')}
            </span>
            <Address className="text-sm" value={value.address} />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2">{children}</CardFooter>
    </Card>
  )
}
