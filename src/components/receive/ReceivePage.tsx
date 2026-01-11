import { useState, useEffect, useCallback } from 'react'
import { getaddressOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { CopyCheckIcon, CopyIcon, RefreshCwIcon, ShareIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import { btcToSats, cn, satsToBtc, type WalletFileName } from '@/lib/utils'
import type { AmountSats, BitcoinAddress, Milliseconds } from '@/types/global'
import { useJamDisplayContext } from '../../context/JamDisplayContext'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import PageTitle from '../ui/jam/PageTitle'
import { SelectableJar } from '../ui/jam/SelectableJar'
import { Skeleton } from '../ui/skeleton'
import { BitcoinAmountInput } from './BitcoinAmountInput'
import { BitcoinQR } from './BitcoinQR'

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
  const [selectedJarIndex, setSelectedJarIndex] = useState(0)
  const [amount, setAmount] = useState<AmountSats>()
  const [bitcoinAddress, setBitcoinAddress] = useState<BitcoinAddress>()
  const [copied, setCopied] = useState(false)

  const { currency, isPrivate, toggleCurrencyUnit } = useJamDisplayContext()
  const { jars, totalBalance } = useJamWalletInfoContext()

  const client = useApiClient()

  const getAddressQuery = useQuery({
    ...getaddressOptions({
      client,
      path: {
        walletname: encodeURIComponent(walletFileName!),
        mixdepth: String(selectedJarIndex),
      },
    }),
    enabled: walletFileName !== undefined && selectedJarIndex !== undefined,
    staleTime: GET_ADDRESS_QUERY_TALE_TIME,
    retry: false,
    retryOnMount: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  if (getAddressQuery.data?.address && bitcoinAddress !== getAddressQuery.data?.address) {
    setBitcoinAddress(getAddressQuery.data.address)
  }

  useEffect(() => {
    if (getAddressQuery.error) {
      toast.error(t('receive.error_loading_address_failed'))
    }
  }, [getAddressQuery.error, t])

  const copyToClipboard = () => {
    if (bitcoinAddress) {
      navigator.clipboard.writeText(bitcoinAddress)
      setCopied(true)
      toast.success(t('global.button_copy_text_confirmed'))
    } else {
      toast.error(t('receive.error_copy_address_failed'))
    }
  }

  const shareAddress = () => {
    if ('share' in navigator && bitcoinAddress) {
      navigator
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

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '') {
      setAmount(undefined)
      return
    }

    const numValue = parseFloat(value)
    if (currency === 'btc') {
      setAmount(btcToSats(numValue.toString()))
    } else {
      setAmount(Math.floor(numValue))
    }
  }

  const getDisplayAmount = () => {
    if (!amount) return ''
    if (currency === 'btc') {
      return satsToBtc(amount.toString()).toFixed(8)
    }
    return amount.toString()
  }

  useEffect(() => {
    const timer = setTimeout(() => setCopied(false), 1_500)
    return () => clearTimeout(timer)
  }, [copied])

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      <PageTitle title={t('receive.title')} subtitle={t('receive.subtitle')} />

      <Card>
        <CardContent className="flex w-full flex-col items-center justify-center gap-2">
          {getAddressQuery.isFetching ? (
            <Skeleton className={`h-[${QRCODE_WIDTH}px] w-[${QRCODE_WIDTH}px]`} />
          ) : bitcoinAddress ? (
            <BitcoinQR
              className="animate-in fade-in duration-1000"
              address={bitcoinAddress}
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
            <Skeleton className="h-5 w-[65%]" />
          ) : (
            <p className="animate-in fade-in text-center font-mono text-sm break-all duration-1000 select-all">
              {bitcoinAddress}
            </p>
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

            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              disabled={getAddressQuery.isFetching || !bitcoinAddress}
            >
              {copied ? <CopyCheckIcon /> : <CopyIcon />}
              {copied ? t('global.button_copy_text_confirmed') : t('global.button_copy_text')}
            </Button>

            {'share' in navigator && (
              <Button
                variant="outline"
                size="sm"
                onClick={shareAddress}
                disabled={getAddressQuery.isFetching || !bitcoinAddress}
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
          <AccordionContent>
            <p className="mb-2 text-sm">{t('receive.label_source_jar')}</p>

            <div className="grid grid-cols-5 gap-4">
              {jars.map((jar, index) => (
                <SelectableJar
                  key={index}
                  name={jar.name}
                  color={jar.color}
                  balance={jar.balance}
                  totalBalance={totalBalance}
                  isSelected={selectedJarIndex === index}
                  onClick={() => setSelectedJarIndex(index)}
                />
              ))}
            </div>

            <div className="mx-1 mt-4">
              <BitcoinAmountInput
                label={t('receive.label_amount_input')}
                placeholder={t('receive.placeholder_amount_input')}
                currency={currency}
                value={getDisplayAmount()}
                onChange={handleAmountChange}
                toggleCurrencyUnit={toggleCurrencyUnit}
                isPrivate={isPrivate}
                disabled={getAddressQuery.isFetching || !bitcoinAddress}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
