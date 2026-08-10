import type { PropsWithChildren } from 'react'
import type { SessionResponse } from '@joinmarket-webui/joinmarket-ng-api-ts/jm'
import type { TFunction } from 'i18next'
import {
  CircleAlertIcon,
  CircleCheckIcon,
  FingerprintIcon,
  HandCoinsIcon,
  Maximize2Icon,
  Minimize2Icon,
  PickaxeIcon,
  SearchIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { OrderbookFidelityBond, OrderbookOffer } from '@/lib/api/orderbook'
import { cn, factorToPercentage, isAbsoluteOffer, isRelativeOffer } from '@/lib/utils'
import { Balance } from '../ui/jam/Balance'
import { Label } from '../ui/label'

type Offer = NonNullable<SessionResponse['offer_list']>[number]

const OfferTypeBadge = ({ value }: { value: Offer }) => {
  const { t } = useTranslation()
  const text = renderOfferText(value, t)
  return (
    <Badge className="max-w-full truncate" variant={text ? 'default' : 'outline'}>
      {text}
    </Badge>
  )
}

const renderOfferText = (value: Offer, t: TFunction<'translation', undefined>) => {
  if (isAbsoluteOffer(String(value?.ordertype || ''))) {
    return t('earn.current.text_offer_type_absolute')
  }
  if (isRelativeOffer(String(value?.ordertype || ''))) {
    return t('earn.current.text_offer_type_relative')
  }
  return String(value?.ordertype || '')
}

interface OfferCardProps {
  className?: string
  value: Offer
  nickname: SessionResponse['nickname']
  orderbookStatus?: 'checking' | 'visible' | 'missing' | 'error'
  orderbookOffer?: OrderbookOffer
  fidelityBond?: OrderbookFidelityBond
}

const orderbookStatusEntry = (value: OfferCardProps['orderbookStatus'], t: TFunction) => {
  return value === 'visible'
    ? { icon: CircleCheckIcon, text: t('earn.current.text_orderbook_visible'), variant: 'success' as const }
    : value === 'missing'
      ? { icon: SearchIcon, text: t('earn.current.text_orderbook_missing'), variant: 'warning' as const }
      : value === 'error'
        ? { icon: CircleAlertIcon, text: t('earn.current.text_orderbook_error'), variant: 'destructive' as const }
        : value === 'checking'
          ? { icon: SearchIcon, text: t('earn.current.text_orderbook_checking'), variant: 'muted' as const }
          : undefined
}

export function OfferCard({
  className,
  value,
  nickname,
  orderbookStatus,
  orderbookOffer,
  fidelityBond,
  children,
}: PropsWithChildren<OfferCardProps>) {
  const { t } = useTranslation()
  const bondValue = Number(orderbookOffer?.fidelity_bond_value) || 0

  const offerInOrderbookStatus = orderbookStatusEntry(orderbookStatus, t)
  const bondWarning = bondValue === 0 || orderbookOffer?.fidelity_bond_verification_stale === true

  return (
    <Card className={cn('transition-all duration-300 hover:-translate-y-[2px] hover:shadow-md', className)}>
      <CardHeader>
        <CardTitle>{t('earn.current.text_offer')}</CardTitle>
        <CardDescription>
          {offerInOrderbookStatus && (
            <Badge className="whitespace-normal" variant={offerInOrderbookStatus.variant}>
              <offerInOrderbookStatus.icon className="shrink-0" />
              {offerInOrderbookStatus.text}
            </Badge>
          )}
        </CardDescription>
        <CardAction>
          <Tooltip>
            <TooltipTrigger asChild>
              <OfferTypeBadge value={value} />
            </TooltipTrigger>
            <TooltipContent>{value?.ordertype}</TooltipContent>
          </Tooltip>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 items-start gap-4">
          <FingerprintIcon className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <Label className="font-semibold">{t('earn.current.text_offer_id')}</Label>
            <span className="text-md block font-mono break-all select-all">
              {nickname}:{value?.oid}
            </span>
          </div>
        </div>

        <div className="flex min-w-0 items-start gap-4">
          <HandCoinsIcon className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <Label className="font-semibold">{t('earn.current.text_cjfee')}</Label>
            <span className="text-sm">
              {isRelativeOffer(String(value?.ordertype || '')) ? (
                <span className="select-all">
                  {factorToPercentage(Number.parseFloat(String(value?.cjfee || '')) || 0)}%
                </span>
              ) : (
                <Balance valueString={String(value?.cjfee || '0')} />
              )}
            </span>
          </div>
        </div>
        <div className="flex min-w-0 items-start gap-4">
          <Minimize2Icon className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <Label className="font-semibold">{t('earn.current.text_minsize')}</Label>
            <span className="text-sm">
              <Balance valueString={String(value?.minsize || '0')} />
            </span>
          </div>
        </div>
        <div className="flex min-w-0 items-start gap-4">
          <Maximize2Icon className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <Label className="font-semibold">{t('earn.current.text_maxsize')}</Label>
            <span className="text-sm">
              <Balance valueString={String(value?.maxsize || '0')} />
            </span>
          </div>
        </div>
        {!!value?.txfee && (
          <div className="flex min-w-0 items-start gap-4">
            <PickaxeIcon className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <Label className="font-semibold">{t('earn.current.text_txfee')}</Label>
              <span className="text-muted-foreground text-sm">
                <Balance valueString={String(value?.txfee || '0')} />
              </span>
            </div>
          </div>
        )}
        {fidelityBond !== undefined && (
          <div className="flex min-w-0 items-start gap-4 sm:col-span-full">
            <ShieldCheckIcon
              className={cn('mt-0.5 shrink-0', {
                'text-brand-success': bondValue > 0,
                'text-brand-warning': bondWarning,
              })}
            />
            <div className="min-w-0 flex-1">
              <Label
                className={cn('font-semibold', {
                  'text-brand-success': bondValue > 0,
                  'text-brand-warning': bondWarning,
                })}
              >
                {t('earn.current.text_fidelity_bond')}
              </Label>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-1 flex-col items-start gap-2 sm:flex-row sm:items-center">
                  <span className={bondValue <= 0 ? 'text-muted-foreground' : undefined}>
                    {t('earn.current.text_bond_value')}: {Math.floor(bondValue).toLocaleString()}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  <Balance valueString={String(fidelityBond.amount)} />
                  <span className="text-muted-foreground">
                    {t('earn.current.text_bond_locktime', {
                      date: new Date(fidelityBond.locktime * 1_000).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }),
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2">{children}</CardFooter>
    </Card>
  )
}
