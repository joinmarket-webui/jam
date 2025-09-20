import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, CopyCheck, RefreshCw, Share } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useApiClient } from '@/hooks/useApiClient'
import { getaddressOptions } from '@/lib/jm-api/generated/client/@tanstack/react-query.gen'
import { btcToSats, satsToBtc, type WalletFileName } from '@/lib/utils'
import { useJamDisplayContext } from '../layout/display-mode-context'
import { SelectableJar } from '../ui/SelectableJar'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'
import { BitcoinAmountInput } from './BitcoinAmountInput'
import { BitcoinQR } from './BitcoinQR'

interface ReceiveProps {
  walletFileName: WalletFileName
}

export const Receive = ({ walletFileName }: ReceiveProps) => {
  const { t } = useTranslation()
  const [selectedJarIndex, setSelectedJarIndex] = useState(0)
  const [amount, setAmount] = useState<number | undefined>()
  const [bitcoinAddress, setBitcoinAddress] = useState<string | undefined>()
  const [copied, setCopied] = useState(false)

  const { jars, currency, isPrivate, toggleCurrencyUnit } = useJamDisplayContext()
  const client = useApiClient()

  const totalBalance = useMemo(() => {
    return jars.reduce((total, jar) => total + (jar.balance || 0), 0)
  }, [jars])

  const getAddressQuery = useQuery({
    ...getaddressOptions({
      client,
      path: {
        walletname: walletFileName!,
        mixdepth: String(selectedJarIndex),
      },
    }),
    retry: false,
    enabled: walletFileName !== undefined && selectedJarIndex !== undefined,
    staleTime: 1,
  })

  useEffect(() => {
    if (getAddressQuery.data === undefined) return
    setBitcoinAddress(getAddressQuery.data.address)
  }, [getAddressQuery.data])

  useEffect(() => {
    if (getAddressQuery.error) {
      toast.error(t('receive.error_loading_address_failed'))
    }
  }, [getAddressQuery.error, t])

  const isQrLoading = useMemo(() => {
    return getAddressQuery.isFetching
  }, [getAddressQuery.isFetching])

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

  const getNewAddress = useCallback(() => {
    getAddressQuery.refetch()
  }, [getAddressQuery])

  const selectJar = (index: number) => {
    setSelectedJarIndex(index)
  }

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
    const timer = setTimeout(() => {
      setCopied(false)
    }, 1_500)

    return () => clearTimeout(timer)
  }, [copied])

  if (!walletFileName) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 pt-6">
        <h1 className="mb-2 text-left text-2xl font-bold">{t('receive.title')}</h1>
        <p className="text-muted-foreground mb-4">{t('current_wallet.error_loading_failed')}</p>
      </div>
    )
  }

  if (!jars || jars.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 pt-6">
        <h1 className="mb-2 text-left text-2xl font-bold">{t('receive.title')}</h1>
        <p className="text-muted-foreground mb-4">{t('current_wallet.text_loading')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      <h1 className="my-2 text-left text-2xl font-bold">{t('receive.title')}</h1>
      <p className="text-muted-foreground mb-4 text-sm">{t('receive.subtitle')}</p>

      <div className="flex w-full max-w-xl flex-col items-center justify-center space-y-2 rounded-lg border p-8">
        {isQrLoading ? (
          <Skeleton className="h-[260px] w-[260px]" />
        ) : bitcoinAddress ? (
          <BitcoinQR address={bitcoinAddress} amount={amount} width={260} />
        ) : (
          <div className="flex h-[260px] w-[260px] animate-pulse items-center justify-center border text-gray-500">
            {t('receive.error_loading_address_failed')}
          </div>
        )}

        {isQrLoading ? (
          <Skeleton className="h-4 w-[65%]" />
        ) : (
          <p className="text-center font-mono text-xs break-all select-all">{bitcoinAddress}</p>
        )}

        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={getNewAddress} disabled={getAddressQuery.isFetching}>
            <RefreshCw className="mr-1" />
            {getAddressQuery.isFetching ? t('receive.text_getting_address') : t('receive.button_new_address')}
          </Button>

          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            {copied ? <CopyCheck /> : <Copy />}
            {copied ? t('global.button_copy_text_confirmed') : t('global.button_copy_text')}
          </Button>

          {'share' in navigator && (
            <Button variant="outline" size="sm" onClick={shareAddress}>
              <Share />
              {t('receive.button_share_address')}
            </Button>
          )}
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full max-w-xl">
        <AccordionItem value="options" className="border-0">
          <AccordionTrigger className="text-muted-foreground text-md rounded-none border-b p-4">
            {t('receive.button_settings')}
          </AccordionTrigger>
          <AccordionContent>
            <div className="w-full py-4">
              <p className="mb-2 text-sm">{t('receive.label_source_jar')}</p>

              <div className="grid grid-cols-5 gap-4">
                {jars.map((jar, index) => (
                  <SelectableJar
                    key={jar.name}
                    name={jar.name}
                    color={jar.color}
                    balance={jar.balance || 0}
                    isSelected={selectedJarIndex === index}
                    totalBalance={totalBalance}
                    onClick={() => selectJar(index)}
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
                  disabled={isQrLoading || !bitcoinAddress}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
