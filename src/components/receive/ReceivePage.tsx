import { useState, useMemo } from 'react'
import { getaddressQueryKey } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { getaddress, type ErrorMessage } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useMutation } from '@tanstack/react-query'
import { CopyCheckIcon, CopyIcon, HatGlassesIcon, RefreshCwIcon, ShareIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import PageTitle from '@/components/ui/jam/PageTitle'
import { Skeleton } from '@/components/ui/skeleton'
import { useJars } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import { getErrorReason } from '@/lib/errorReason'
import { withMutationDelay } from '@/lib/queryClient'
import { cn, type WalletFileName } from '@/lib/utils'
import { useDeveloperMode } from '@/store/jamSettingsStore'
import type { AmountSats, BitcoinAddress } from '@/types/global'
import { Badge } from '../ui/badge'
import { buttonVariants } from '../ui/button-variants'
import { Address } from '../ui/jam/Address'
import { CopyButton } from '../ui/jam/CopyButton'
import { BitcoinQR } from './BitcoinQR'
import { ReceiveForm } from './ReceiveForm'

const QRCODE_WIDTH = 320

interface ReceivePageProps {
  walletFileName: WalletFileName
}

export const ReceivePage = ({ walletFileName }: ReceivePageProps) => {
  const { t } = useTranslation()
  const { jars } = useJars()

  const [selectedSourceJarIndex, setSelectedSourceJarIndex] = useState(jars.length > 0 ? jars[0].jarIndex : undefined)
  const [amount, setAmount] = useState<AmountSats>()

  const selectedSourceJar = useMemo(() => {
    if (selectedSourceJarIndex === undefined) return
    return jars[selectedSourceJarIndex]
  }, [jars, selectedSourceJarIndex])

  const [receiveFormDefaultValues] = useState({
    source: {
      fromJar: selectedSourceJar?.jarIndex,
    },
    amount: {
      amount: undefined,
    },
  })

  const { enabled: isDeveloperMode } = useDeveloperMode()

  const client = useApiClient()

  const getAddressOptions = {
    client,
    path: {
      walletname: encodeURIComponent(walletFileName),
      mixdepth: String(selectedSourceJar?.jarIndex),
    },
  }

  // wrap as mutation manually, as `getAddressQuery` is a `GET` request
  const getAddressMutation = useMutation({
    mutationKey: ['receive', ...getaddressQueryKey(getAddressOptions)],
    mutationFn: withMutationDelay(
      async () => {
        const { data } = await getaddress({
          ...getAddressOptions,
          throwOnError: true,
        })
        return {
          address: data.address,
          sourceJarIndex: Number.parseInt(getAddressOptions.path.mixdepth, 10),
        }
      },
      {
        delayAfter: 21,
      },
    ),
    retry: false,
    gcTime: Number.POSITIVE_INFINITY,
    onError: (error: ErrorMessage) => {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      // TODO: add reason to i18n
      toast.error(t('receive.error_loading_address_failed', { reason }))
    },
  })

  const sourceJar = useMemo(() => {
    if (getAddressMutation.data?.sourceJarIndex === undefined) return
    return jars[getAddressMutation.data.sourceJarIndex]
  }, [jars, getAddressMutation.data])

  const shareAddress = async (bitcoinAddress: BitcoinAddress) => {
    if ('share' in navigator) {
      await navigator
        .share({
          title: 'Bitcoin Address',
          text: bitcoinAddress,
        })
        .catch(() => {
          toast.error(t('receive.error_share_address_failed'))
        })
    } else {
      toast.error(t('receive.error_share_address_failed'))
    }
  }

  const fetchNewAddress = async () => {
    await getAddressMutation.mutateAsync()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3 p-4">
      <PageTitle title={t('receive.title')} subtitle={t('receive.subtitle')} />

      <Card>
        <CardContent className="flex w-full flex-col items-center justify-center gap-2">
          {getAddressMutation.isPending ? (
            <Skeleton style={{ height: QRCODE_WIDTH, width: QRCODE_WIDTH }} />
          ) : getAddressMutation.data?.address ? (
            <BitcoinQR
              className="animate-in fade-in duration-1000"
              address={getAddressMutation.data.address}
              amount={amount}
              width={QRCODE_WIDTH}
            />
          ) : getAddressMutation.isIdle ? (
            <div
              className={cn('flex items-center justify-center border')}
              style={{ height: QRCODE_WIDTH, width: QRCODE_WIDTH }}
            >
              <Button
                variant="outline"
                size="lg"
                onClick={() => void fetchNewAddress()}
                disabled={getAddressMutation.isPending}
              >
                <HatGlassesIcon />
                {t('receive.button_reveal_address', {
                  defaultValue: 'Reveal address',
                })}
              </Button>
            </div>
          ) : (
            <div
              className={cn('text-destructive flex items-center justify-center border text-sm')}
              style={{ height: QRCODE_WIDTH, width: QRCODE_WIDTH }}
            >
              {t('receive.error_loading_address_failed')}
            </div>
          )}

          {getAddressMutation.isPending ? (
            <div className="flex flex-col items-center space-y-2">
              <Skeleton className="mt-0.5 h-5 w-[24rem]" />
              <Skeleton className="h-6 w-[84px]" />
            </div>
          ) : (
            <div className="animate-in fade-in space-y-2 text-center duration-1000">
              <div className="min-h-5">
                {!getAddressMutation.data?.address ? undefined : (
                  <Address value={getAddressMutation.data.address} className="text-sm" copyable={true} />
                )}
              </div>
              <Badge className="min-h-6 text-sm" variant={sourceJar ? 'default' : 'secondary'}>
                {sourceJar ? (
                  <>
                    {sourceJar.name} <span className="text-xs">#{sourceJar.jarIndex}</span>
                  </>
                ) : (
                  <>
                    {selectedSourceJar?.name} <span className="text-xs">#{selectedSourceJar?.jarIndex}</span>
                  </>
                )}
              </Badge>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchNewAddress()}
              disabled={getAddressMutation.isPending}
            >
              {getAddressMutation.isPending ? (
                <>
                  <RefreshCwIcon className="animate-spin motion-reduce:hidden" />
                  {t('receive.text_getting_address')}
                </>
              ) : (
                <>
                  <RefreshCwIcon className="motion-reduce:hidden" />
                  {t('receive.button_new_address')}
                </>
              )}
            </Button>

            <CopyButton
              className={buttonVariants({
                size: 'sm',
                variant: 'outline',
              })}
              disabled={getAddressMutation.isPending || !getAddressMutation.data?.address}
              value={getAddressMutation.data?.address ?? ''}
              text={
                <>
                  <CopyIcon />
                  {t('global.button_copy_text')}
                </>
              }
              successText={
                <>
                  <CopyCheckIcon />
                  {t('global.button_copy_text_confirmed')}
                </>
              }
              onSuccess={() => toast.success(t('global.button_copy_text_confirmed'))}
              onError={() => toast.error(t('receive.error_copy_address_failed'))}
            />

            {'share' in navigator && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void shareAddress(getAddressMutation.data!.address)}
                disabled={getAddressMutation.isPending || !getAddressMutation.data?.address}
              >
                <ShareIcon />
                {t('receive.button_share_address')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible>
        <AccordionItem value="options">
          <AccordionTrigger>{t('receive.button_settings')}</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4">
            <ReceiveForm
              className={'mx-1' /* add x-spacing for input component focus state*/}
              defaultValues={receiveFormDefaultValues}
              jars={jars}
              disabled={getAddressMutation.isPending}
              debug={isDeveloperMode}
              onSubmit={(values) => {
                setSelectedSourceJarIndex(values.source?.fromJar)
                setAmount(values.amount.amount)
              }}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
