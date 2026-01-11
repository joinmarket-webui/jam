import type { PropsWithChildren } from 'react'
import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import type { TFunction } from 'i18next'
import { FingerprintIcon, HandCoinsIcon, Maximize2Icon, Minimize2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useJamDisplayContext } from '@/context/JamDisplayContext'
import { factorToPercentage, isAbsoluteOffer, isRelativeOffer } from '@/lib/utils'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

type Offer = NonNullable<SessionResponse['offer_list']>[number]

const OfferTypeBadge = ({ value }: { value: Offer }) => {
  const { t } = useTranslation()
  const text = renderOfferText(value, t)
  return <Badge variant={text ? 'default' : 'outline'}>{text}</Badge>
}

const renderOfferText = (value: Offer, t: TFunction<'translation', undefined>) => {
  if (isAbsoluteOffer(value?.ordertype || '')) {
    return t('earn.current.text_offer_type_absolute')
  }
  if (isRelativeOffer(value?.ordertype || '')) {
    return t('earn.current.text_offer_type_relative')
  }
  return value?.ordertype
}

interface OfferCardProps {
  value: Offer
  nickname: SessionResponse['nickname']
}

export function OfferCard({ value, nickname, children }: PropsWithChildren<OfferCardProps>) {
  const { t } = useTranslation()
  const { formatAmount, currencySymbol } = useJamDisplayContext()

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('earn.current.text_offer')}</CardTitle>
        <CardDescription></CardDescription>
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
        <div className="flex items-center gap-4">
          <FingerprintIcon />
          <div className="flex flex-col">
            <span className="text-muted-foreground text-sm font-semibold">
              {
                /*TODO: i18n*/
                t('Offer Id')
              }
            </span>
            <span className="text-md font-mono">
              {nickname}:{value?.oid}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <HandCoinsIcon />
          <div className="flex flex-col">
            <span className="text-muted-foreground text-sm font-semibold">{t('earn.current.text_cjfee')}</span>
            <span className="text-sm">
              {isRelativeOffer(value?.ordertype || '') ? (
                <>{factorToPercentage(parseFloat(value?.cjfee || '') || 0)}%</>
              ) : (
                <>
                  <span className="tabular-nums">{formatAmount(parseInt(String(value?.cjfee || '0'), 10))}</span>
                  {currencySymbol('sm')}
                </>
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Minimize2Icon />
          <div className="flex flex-col">
            <span className="text-muted-foreground text-sm font-semibold">{t('earn.current.text_minsize')}</span>
            <span className="text-sm">
              <span className="tabular-nums">{formatAmount(parseInt(String(value?.minsize || '0'), 10))}</span>
              {currencySymbol('sm')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Maximize2Icon />
          <div className="flex flex-col">
            <span className="text-muted-foreground text-sm font-semibold">{t('earn.current.text_maxsize')}</span>
            <span className="text-sm">
              <span className="tabular-nums">{formatAmount(parseInt(String(value?.maxsize || '0'), 10))}</span>
              {currencySymbol('sm')}
            </span>
          </div>
        </div>
        {!!value?.txfee && (
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-muted-foreground text-sm font-semibold">{t('earn.current.text_txfee')}</span>
              <span className="text-muted-foreground text-sm">
                <span className="tabular-nums">{formatAmount(parseInt(String(value?.txfee || '0'), 10))}</span>
                {currencySymbol('sm')}
              </span>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2">{children}</CardFooter>
    </Card>
  )
}
