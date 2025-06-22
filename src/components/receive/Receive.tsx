import { useState, useEffect, useCallback, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Copy, CopyCheck, RefreshCw, Share } from 'lucide-react'
import { toast } from 'sonner'
import { useApiClient } from '@/hooks/useApiClient'
import { getaddress } from '@/lib/jm-api/generated/client/sdk.gen'
import { getSession } from '@/lib/session'
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
  const [bitcoinAddress, setBitcoinAddress] = useState<string>('')
  const [isQrLoading, setIsQrLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [amountDisplayMode, setAmountDisplayMode] = useState<'sats' | 'btc'>('sats')

  const { jars } = useJamDisplayContext()
  const client = useApiClient()
  const session = getSession()

  const totalBalance = useMemo(() => {
    return jars.reduce((total, jar) => total + (jar.balance || 0), 0)
  }, [jars])

  const walletFileName = session?.walletFileName

  // Get address mutation
  const getAddressMutation = useMutation({
    mutationFn: async (mixdepth: string) => {
      setIsQrLoading(true)
      if (!walletFileName) throw new Error('No wallet loaded')

      const { data } = await getaddress({
        client,
        path: {
          walletname: walletFileName,
          mixdepth,
        },
        throwOnError: true,
      })

      if (typeof data === 'object' && data !== null && 'address' in data) {
        return (data as { address: string }).address
      }
      return String(data)
    },
    onSuccess: (data: string) => {
      setBitcoinAddress(data)
      setIsQrLoading(false)
    },
    onError: () => {
      setIsQrLoading(false)
      setBitcoinAddress('')
      toast.error('Failed to get Bitcoin address')
    },
  })

  const copyToClipboard = () => {
    if (bitcoinAddress) {
      navigator.clipboard.writeText(bitcoinAddress)
      setCopied(true)
      toast.success('Bitcoin address copied to clipboard')
    } else {
      toast.error('No Bitcoin address to copy')
    }
  }

  // Create shareable link or data
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
      toast.error('No Bitcoin address to share')
    }
  }

  // Get new address for selected jar
  const getNewAddress = useCallback(() => {
    setIsQrLoading(true)
    const selectedJar = jars[selectedJarIndex]
    if (selectedJar && selectedJar.account !== undefined) {
      getAddressMutation.mutate(selectedJar.account)
    } else {
      setBitcoinAddress('')
      setIsQrLoading(false)
      toast.error('Jar not selected or no account available')
    }
  }, [jars, selectedJarIndex, getAddressMutation, setIsQrLoading])

  // Handle jar selection
  const selectJar = (index: number) => {
    if (selectedJarIndex === index) return // Prevent re-selection
    setSelectedJarIndex(index)
    const selectedJar = jars[index]
    if (selectedJar && selectedJar.account !== undefined) {
      getAddressMutation.mutate(selectedJar.account)
    }
  }

  // Handle amount input change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '') {
      setAmount(undefined)
      return
    }

    const numValue = parseFloat(value)
    if (amountDisplayMode === 'btc') {
      // Convert BTC to sats for internal storage
      setAmount(Math.floor(numValue * 100000000))
    } else {
      setAmount(Math.floor(numValue))
    }
  }

  // Toggle display mode between sats and btc
  const toggleDisplayMode = () => {
    setAmountDisplayMode((prev) => (prev === 'sats' ? 'btc' : 'sats'))
  }

  // Get display amount based on current mode
  const getDisplayAmount = () => {
    if (!amount) return ''
    if (amountDisplayMode === 'btc') {
      return (amount / 100000000).toFixed(8)
    }
    return amount.toString()
  }

  // Load initial address when component mounts
  useEffect(() => {
    const selectedJar = jars[selectedJarIndex]
    if (selectedJar && selectedJar.account !== undefined) {
      getAddressMutation.mutate(selectedJar.account)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopied(false)
    }, 5000)

    return () => clearTimeout(timer)
  }, [copied])

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
                  getDisplayAmount={getDisplayAmount}
                  handleAmountChange={handleAmountChange}
                  toggleDisplayMode={toggleDisplayMode}
                  isQrLoading={isQrLoading}
                  bitcoinAddress={bitcoinAddress}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
