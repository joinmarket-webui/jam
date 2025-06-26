import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, CopyCheck, RefreshCw, Share } from 'lucide-react'
import { toast } from 'sonner'
import { useApiClient } from '@/hooks/useApiClient'
import { getaddressOptions } from '@/lib/jm-api/generated/client/@tanstack/react-query.gen'
import { getSession } from '@/lib/session'
import { btcToSats, satsToBtc } from '@/lib/utils'
import { useJamDisplayContext } from '../layout/display-mode-context'
import { SelectableJar } from '../ui/SelectableJar'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'
import { BitcoinAmountInput } from './BitcoinAmountInput'
import { BitcoinQR } from './BitcoinQR'

export const Receive = () => {
  const [selectedJarIndex, setSelectedJarIndex] = useState(0)
  const [amount, setAmount] = useState<number | undefined>()
  const [bitcoinAddress, setBitcoinAddress] = useState<string | undefined>()
  const [copied, setCopied] = useState(false)
  const [amountDisplayMode, setAmountDisplayMode] = useState<'sats' | 'btc'>('sats')

  const { jars } = useJamDisplayContext()
  const client = useApiClient()
  const session = getSession()

  const totalBalance = useMemo(() => {
    return jars.reduce((total, jar) => total + (jar.balance || 0), 0)
  }, [jars])

  const walletFileName = session?.walletFileName

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

  const isQrLoading = useMemo(() => {
    return getAddressQuery.isFetching
  }, [getAddressQuery.isFetching])

  const copyToClipboard = () => {
    if (bitcoinAddress) {
      navigator.clipboard.writeText(bitcoinAddress)
      setCopied(true)
      toast.success('Address copied to clipboard')
    } else {
      toast.error('No Address to copy')
    }
  }

  const shareAddress = () => {
    if (navigator.share && bitcoinAddress) {
      navigator
        .share({
          title: 'Bitcoin Address',
          text: bitcoinAddress,
        })
        .catch(() => {
          // Fall back to clipboard if sharing fails
          copyToClipboard()
        })
    } else if (bitcoinAddress) {
      copyToClipboard()
    } else {
      toast.error('No address to share')
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
    if (amountDisplayMode === 'btc') {
      setAmount(btcToSats(numValue.toString()))
    } else {
      setAmount(Math.floor(numValue))
    }
  }

  const toggleDisplayMode = () => {
    setAmountDisplayMode((prev) => (prev === 'sats' ? 'btc' : 'sats'))
  }

  const getDisplayAmount = () => {
    if (!amount) return ''
    if (amountDisplayMode === 'btc') {
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

  const selectedJar = jars[selectedJarIndex]
  const hasValidJar = selectedJar && selectedJar.account !== undefined

  if (!hasValidJar || !walletFileName) {
    toast.error('No wallet or valid jar selected')

    return (
      <div className="flex h-full flex-col items-center justify-center px-4 pt-6">
        <h1 className="mb-2 text-left text-2xl font-bold">Receive</h1>
        <p className="text-muted-foreground mb-4">No wallet or valid jar selected</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 pt-6">
      <h1 className="mb-2 text-left text-2xl font-bold">Receive</h1>
      <p className="text-muted-foreground mb-4 text-sm">Send sats to the address below to fund your wallet.</p>

      <div className="flex w-full max-w-xl flex-col items-center justify-center rounded-lg border p-8">
        {isQrLoading ? (
          <Skeleton className="h-[260px] w-[260px]" />
        ) : bitcoinAddress ? (
          <BitcoinQR address={bitcoinAddress} amount={amount} width={260} />
        ) : (
          <div className="flex h-[260px] w-[260px] animate-pulse items-center justify-center border text-gray-500">
            No address available
          </div>
        )}

        {isQrLoading ? (
          <Skeleton className="mt-4 h-4 w-[50%]" />
        ) : (
          <p className="mt-4 text-center text-xs break-all select-all">{bitcoinAddress}</p>
        )}

        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={getNewAddress}>
            <RefreshCw className="mr-1" />
            Get new address
          </Button>

          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            {copied ? <CopyCheck /> : <Copy />}
            {copied ? 'Copied' : 'Copy'}
          </Button>

          <Button variant="outline" size="sm" onClick={shareAddress}>
            <Share />
            Share
          </Button>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full max-w-xl">
        <AccordionItem value="options" className="border-0">
          <AccordionTrigger className="text-muted-foreground text-md rounded-none border-b p-4">
            Receive options
          </AccordionTrigger>
          <AccordionContent>
            <div className="w-full py-4">
              <p className="mb-2 text-sm">Receive to</p>

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
                  amountDisplayMode={amountDisplayMode}
                  value={getDisplayAmount()}
                  onChange={handleAmountChange}
                  toggleDisplayMode={toggleDisplayMode}
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
