import { useState, useEffect, useCallback, useMemo } from 'react'
import { getaddressOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { CopyCheckIcon, CopyIcon, RefreshCwIcon, ShareIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import PageTitle from '@/components/ui/jam/PageTitle'
import { Skeleton } from '@/components/ui/skeleton'
import { useJars } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import { withQueryDelay } from '@/lib/queryClient'
import { cn, type WalletFileName } from '@/lib/utils'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import type { AmountSats, BitcoinAddress, Milliseconds } from '@/types/global'
import { Badge } from '../ui/badge'
import { buttonVariants } from '../ui/button-variants'
import { CopyButton } from '../ui/jam/CopyButton'
import { BitcoinQR } from './BitcoinQR'
import { ReceiveForm } from './ReceiveForm'

const QRCODE_WIDTH = 320 // "h-[320px] w-[320px]" <- Comment for tailwind importer (ADAPT THE COMMENT IF YOU CHANGE THE VALUE)

// new-address query stale time considerations:
// - high enough to prevent increasing address gap on accidental page switch
// - low enough to provide new address on purpose
// - "too low" is better than "too high"
const GET_ADDRESS_QUERY_TALE_TIME: Milliseconds = 10_000

interface ReceivePageProps {
  walletFileName: WalletFileName
}

export const ReceivePage = ({ walletFileName }: ReceivePageProps) => {
  const { t } = useTranslation()
  const { jars } = useJars()

  const [sourceJarIndex, setSourceJarIndex] = useState(jars.length > 0 ? jars[0].jarIndex : undefined)
  const [amount, setAmount] = useState<AmountSats>()

  const sourceJar = useMemo(() => {
    if (sourceJarIndex === undefined) return
    return jars[sourceJarIndex]
  }, [jars, sourceJarIndex])

  const [receiveFormDefaultValues] = useState({
    source: {
      fromJar: sourceJar?.jarIndex,
    },
    amount: {
      amount: undefined,
    },
  })

  const isDeveloperMode = useStore(jamSettingsStore, (state) => state.state.developerMode)

  const client = useApiClient()

  const getAddressQueryOptions = getaddressOptions({
    client,
    path: {
      walletname: encodeURIComponent(walletFileName!),
      mixdepth: String(sourceJar?.jarIndex),
    },
  })

  const getAddressQuery = useQuery({
    ...getAddressQueryOptions,
    queryFn: withQueryDelay(getAddressQueryOptions.queryFn, {
      delayAfter: 21,
    }),
    enabled: walletFileName !== undefined && sourceJarIndex !== undefined,
    staleTime: GET_ADDRESS_QUERY_TALE_TIME,
    retry: false,
    retryOnMount: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  useEffect(() => {
    if (getAddressQuery.error) {
      toast.error(t('receive.error_loading_address_failed'))
    }
  }, [getAddressQuery.error, t])

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

  const getNewAddress = useCallback(async () => {
    await getAddressQuery.refetch()
  }, [getAddressQuery])

  return (
    <div className="mx-auto max-w-4xl space-y-3 p-4">
      <PageTitle title={t('receive.title')} subtitle={t('receive.subtitle')} />

      <Card>
        <CardContent className="flex w-full flex-col items-center justify-center gap-2">
          {getAddressQuery.isFetching ? (
            <Skeleton className={`h-[${QRCODE_WIDTH}px] w-[${QRCODE_WIDTH}px]`} />
          ) : getAddressQuery.data?.address ? (
            <BitcoinQR
              className="animate-in fade-in duration-1000"
              address={getAddressQuery.data.address}
              amount={amount}
              width={QRCODE_WIDTH}
            />
          ) : (
            <div
              className={cn(
                'flex animate-pulse items-center justify-center border text-gray-500',
                `h-[${QRCODE_WIDTH}px] w-[${QRCODE_WIDTH}px]`,
              )}
            >
              {t('receive.error_loading_address_failed')}
            </div>
          )}

          {getAddressQuery.isFetching ? (
            <>
              <Skeleton className="mt-0.5 h-5 w-[24rem]" />
              <Skeleton className="h-6 w-[84px]" />
            </>
          ) : (
            <div className="animate-in fade-in space-y-2 text-center duration-1000">
              <p className="font-mono text-sm break-all select-all">{getAddressQuery.data?.address}</p>
              <Badge className="text-sm" variant="default">
                {sourceJar?.name} <span className="text-xs">#{sourceJar?.jarIndex}</span>
              </Badge>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={getNewAddress} disabled={getAddressQuery.isFetching}>
              {getAddressQuery.isFetching ? (
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
              disabled={getAddressQuery.isFetching || !getAddressQuery.data?.address}
              value={getAddressQuery.data?.address ?? ''}
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
                onClick={async () => await shareAddress(getAddressQuery.data!.address)}
                disabled={getAddressQuery.isFetching || !getAddressQuery.data?.address}
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
              disabled={getAddressQuery.isFetching}
              debug={isDeveloperMode}
              onSubmit={(values) => {
                setSourceJarIndex(values.source?.fromJar)
                setAmount(values.amount.amount)
              }}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
