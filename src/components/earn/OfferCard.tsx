import type { PropsWithChildren } from 'react'
import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import type { TFunction } from 'i18next'
import { FingerprintIcon, HandCoinsIcon, Maximize2Icon, Minimize2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useJamDisplayContext } from '@/context/JamDisplayContext'
import { cn, factorToPercentage, isAbsoluteOffer, isRelativeOffer } from '@/lib/utils'
import { Label } from '../ui/label'

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
  className?: string
  value: Offer
  nickname: SessionResponse['nickname']
}

export function OfferCard({ className, value, nickname, children }: PropsWithChildren<OfferCardProps>) {
  const { t } = useTranslation()
  const { formatAmount, currencySymbol } = useJamDisplayContext()

  return (
    <Card className={cn('w-full', className)}>
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
            <Label className="font-semibold">
              {
                /*TODO: i18n*/
                t('Offer Id')
              }
            </Label>
            <span className="text-md font-mono select-all">
              {nickname}:{value?.oid}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <HandCoinsIcon />
          <div className="flex flex-col">
            <Label className="font-semibold">{t('earn.current.text_cjfee')}</Label>
            <span className="text-sm">
              {isRelativeOffer(value?.ordertype || '') ? (
                <span className="select-all">{factorToPercentage(parseFloat(value?.cjfee || '') || 0)}%</span>
              ) : (
                <>
                  <span className="tabular-nums select-all">
                    {formatAmount(parseInt(String(value?.cjfee || '0'), 10))}
                  </span>
                  {currencySymbol('sm')}
                </>
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Minimize2Icon />
          <div className="flex flex-col">
            <Label className="font-semibold">{t('earn.current.text_minsize')}</Label>
            <span className="text-sm">
              <span className="tabular-nums select-all">
                {formatAmount(parseInt(String(value?.minsize || '0'), 10))}
              </span>
              {currencySymbol('sm')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Maximize2Icon />
          <div className="flex flex-col">
            <Label className="font-semibold">{t('earn.current.text_maxsize')}</Label>
            <span className="text-sm">
              <span className="tabular-nums select-all">
                {formatAmount(parseInt(String(value?.maxsize || '0'), 10))}
              </span>
              {currencySymbol('sm')}
            </span>
          </div>
        </div>
        {!!value?.txfee && (
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <Label className="font-semibold">{t('earn.current.text_txfee')}</Label>
              <span className="text-muted-foreground text-sm">
                <span className="tabular-nums select-all">
                  {formatAmount(parseInt(String(value?.txfee || '0'), 10))}
                </span>
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
