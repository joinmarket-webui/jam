import { useState, useMemo } from 'react'
import { getaddressQueryKey } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { getaddress } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useMutation } from '@tanstack/react-query'
import { CopyCheckIcon, CopyIcon, HatGlassesIcon, RefreshCwIcon, ShareIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import PageTitle from '@/components/ui/jam/PageTitle'
import { Skeleton } from '@/components/ui/skeleton'
import { useRescanStatus } from '@/context/JamSessionInfoContext'
import { useJars } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import { toBip21Uri } from '@/lib/bip21'
import { withMutationDelay } from '@/lib/queryClient'
import { cn, type WalletFileName } from '@/lib/utils'
import { useDeveloperMode } from '@/store/jamSettingsStore'
import type { AmountSats } from '@/types/global'
import { Badge } from '../ui/badge'
import { jarBadgeVariant } from '../ui/badge-variants'
import { buttonVariants, jarButtonVariant } from '../ui/button-variants'
import { Address } from '../ui/jam/Address'
import { BitcoinAddressQrCode } from '../ui/jam/BitcoinQrCode'
import { CopyButton } from '../ui/jam/CopyButton'
import { MaskedText } from '../ui/jam/MaskedText'
import { ReceiveForm } from './ReceiveForm'

const QRCODE_WIDTH = 320

interface ReceivePageProps {
  walletFileName: WalletFileName
}

export const ReceivePage = ({ walletFileName }: ReceivePageProps) => {
  const { t } = useTranslation()
  const { jars } = useJars()
  const { rescanInfo } = useRescanStatus()

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
    amount: undefined,
  })

  const { enabled: isDeveloperMode } = useDeveloperMode()

  const client = useApiClient()

  const getAddressOptions = {
    client,
    path: {
      walletname: walletFileName,
      mixdepth: String(selectedSourceJar?.jarIndex),
    },
  }

  // wrap as mutation manually, as `getAddressQuery` is a `GET` request
  const getAddressMutation = useMutation({
    mutationKey: ['receive', ...getaddressQueryKey(getAddressOptions)],
    mutationFn: withMutationDelay(
      async () => {
        const sourceJarIndex = Number.parseInt(getAddressOptions.path.mixdepth, 10)
        const { data } = await getaddress({
          ...getAddressOptions,
          throwOnError: true,
        })
        return {
          address: data.address,
          sourceJarIndex,
        }
      },
      {
        throttle: 210,
      },
    ),
    retry: false,
    gcTime: Number.POSITIVE_INFINITY,
    onError: (_error: unknown) => {
      toast.error(t('global.errors.error_loading_address_failed'))
    },
  })

  const sourceJar = useMemo(() => {
    if (getAddressMutation.data?.sourceJarIndex === undefined) return
    return jars[getAddressMutation.data.sourceJarIndex]
  }, [jars, getAddressMutation.data])

  // What "Copy" and "Share" hand out. With a requested amount this must be the
  // full BIP21 payment request, otherwise the amount silently gets lost on its
  // way to the sender - the QR code has always encoded it.
  // Without an amount we deliberately fall back to the plain address instead of
  // a bare `bitcoin:` URI: a copied address commonly ends up in an exchange
  // withdrawal field, and those often reject the URI form.
  const address = getAddressMutation.data?.address
  const paymentRequest = useMemo(() => {
    if (address === undefined) return ''
    return amount !== undefined && amount > 0 ? toBip21Uri({ address, amount }) : address
  }, [address, amount])
  const shareAddress = async (value: string) => {
    if ('share' in navigator) {
      await navigator
        .share({
          title: 'Bitcoin Address',
          text: value,
        })
        .catch(() => {
          toast.error(t('receive.error_share_address_failed'))
        })
    } else {
      toast.error(t('receive.error_share_address_failed'))
    }
  }

  const fetchNewAddress = async () => {
    if (rescanInfo.rescanning) return
    await getAddressMutation.mutateAsync()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3 p-4">
      <PageTitle title={t('receive.title')} subtitle={t('receive.subtitle')} />

      <Card>
        <CardContent className="space-y-6 sm:space-y-4">
          <div className="flex flex-col flex-wrap items-center justify-center gap-2">
            {getAddressMutation.isPending ? (
              <Skeleton className="aspect-square w-full max-w-80" />
            ) : getAddressMutation.data?.address ? (
              <BitcoinAddressQrCode
                className="animate-in blur-in-10 duration-800"
                address={getAddressMutation.data.address}
                amount={amount}
                width={QRCODE_WIDTH}
              />
            ) : getAddressMutation.isIdle ? (
              <div className={cn('flex aspect-square w-full max-w-80 items-center justify-center border')}>
                <Button
                  variant={jarButtonVariant(selectedSourceJarIndex)}
                  size="lg"
                  onClick={() => void fetchNewAddress()}
                  disabled={getAddressMutation.isPending || rescanInfo.rescanning}
                >
                  <HatGlassesIcon />
                  {t('receive.button_reveal_address')}
                </Button>
              </div>
            ) : (
              <div
                className={cn(
                  'text-destructive flex aspect-square w-full max-w-80 items-center justify-center border text-sm',
                )}
              >
                {t('global.errors.error_loading_address_failed')}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {getAddressMutation.isPending ? (
              <div className="flex flex-col items-center space-y-2 text-center">
                <MaskedText
                  className="flex min-h-[64px] items-center text-xl"
                  masked
                  maskedText={<Address value={`=${'loading'.repeat(6)}=`} copyable={false} />}
                />
                <Skeleton className="h-6 w-[84px]" />
              </div>
            ) : (
              <div className="space-y-2 text-center">
                {!getAddressMutation.data?.address ? (
                  <div className="min-h-[64px]" />
                ) : (
                  <Address
                    value={getAddressMutation.data.address}
                    className="animate-in blur-in-10 min-h-[64px] text-xl duration-800"
                    copyable={true}
                  />
                )}
                <Badge
                  className="fade-in min-h-6 text-sm duration-1000"
                  variant={sourceJar ? jarBadgeVariant(sourceJar.jarIndex) : 'secondary'}
                >
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
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => void fetchNewAddress()}
              disabled={getAddressMutation.isPending || rescanInfo.rescanning}
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
                variant: 'outline',
              })}
              disabled={getAddressMutation.isPending || !address}
              value={paymentRequest}
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
                onClick={() => void shareAddress(paymentRequest)}
                disabled={getAddressMutation.isPending || !address}
              >
                <ShareIcon />
                {t('receive.button_share_address')}
              </Button>
            )}
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="options">
              <AccordionTrigger>{t('receive.button_settings')}</AccordionTrigger>
              <AccordionContent
                className={cn('flex flex-col gap-6 py-2', 'mx-1' /* add x-spacing for input component focus state*/)}
              >
                <ReceiveForm
                  defaultValues={receiveFormDefaultValues}
                  jars={jars}
                  disabled={getAddressMutation.isPending}
                  debug={isDeveloperMode}
                  onSubmit={(values) => {
                    setSelectedSourceJarIndex(values.source?.fromJar)
                    setAmount(values.amount)
                  }}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
