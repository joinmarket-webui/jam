import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useApiClient } from '../../hooks/useApiClient'
import { getaddressOptions } from '../../lib/jm-api/generated/client/@tanstack/react-query.gen'
import { getSession } from '../../lib/session'
import { SelectableJar } from '../ui/SelectableJar'
import { Button } from '../ui/button'

interface JarSelectorModalProps {
  jars: Array<{ name: string; color: string; balance: number; account?: string }>
  totalBalance: number
  selectedSendingJar: string
  onJarSelect: (address: string) => void
  onClose: () => void
}

const JarSelectorModal = ({ jars, totalBalance, selectedSendingJar, onJarSelect, onClose }: JarSelectorModalProps) => {
  const { t } = useTranslation()
  const client = useApiClient()
  const session = getSession()
  const walletFileName = session?.walletFileName
  const [selectedJarForAddress, setSelectedJarForAddress] = useState<string | null>(null)
  const [localSelectedJar, setLocalSelectedJar] = useState<{ name: string; account?: string } | null>(null)

  // Query to get address for selected jar (only when confirming)
  const addressQuery = useQuery({
    ...getaddressOptions({
      client,
      path: {
        walletname: walletFileName || '',
        mixdepth: selectedJarForAddress || '0',
      },
    }),
    enabled: !!walletFileName && !!selectedJarForAddress,
    retry: false,
  })

  // When address is received, call onJarSelect
  useEffect(() => {
    if (addressQuery.data?.address) {
      onJarSelect(addressQuery.data.address)
      setSelectedJarForAddress(null) // Reset selection
      setLocalSelectedJar(null) // Reset local selection
    }
  }, [addressQuery.data, onJarSelect])

  // Handle query errors
  useEffect(() => {
    if (addressQuery.error) {
      console.error('Failed to get address for jar:', addressQuery.error)
      setSelectedJarForAddress(null) // Reset on error
    }
  }, [addressQuery.error])

  const handleClose = () => {
    setSelectedJarForAddress(null)
    setLocalSelectedJar(null) // Reset local selection
    onClose()
  }

  const handleJarClick = (jar: { name: string; account?: string }) => {
    if (!walletFileName || !jar.account) return
    if (jar.name === selectedSendingJar) return // Cannot select the sending jar

    setLocalSelectedJar(jar) // Only set local selection, don't fetch address yet
  }

  const handleConfirm = () => {
    if (localSelectedJar && localSelectedJar.account) {
      setSelectedJarForAddress(localSelectedJar.account) // This triggers the address fetch
    } else {
      handleClose() // Close if no jar is selected
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="mx-4 w-full max-w-4xl rounded-lg bg-white p-6 dark:bg-[#2a2d35]">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black dark:text-white">
            {t('send.select_jar_title', { defaultValue: 'Select a jar from your wallet to send the funds to.' })}
          </h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Jars */}
        <div className="mb-8 flex justify-center gap-8">
          {jars.map((jar) => {
            const isDisabled = jar.name === selectedSendingJar
            const isLocallySelected = localSelectedJar?.name === jar.name
            const isLoadingAddress = selectedJarForAddress === jar.account && addressQuery.isLoading

            return (
              <div key={jar.name} className="text-center">
                <div>
                  <SelectableJar
                    name={jar.name}
                    color={jar.color}
                    balance={jar.balance}
                    totalBalance={totalBalance}
                    isSelected={false}
                    onClick={() => !isDisabled && handleJarClick(jar)}
                    disabled={isDisabled}
                  />
                </div>
                <div className="mt-4">
                  <button
                    className={`h-6 w-6 rounded-full border-2 ${
                      isLoadingAddress
                        ? 'border-blue-400 bg-blue-100'
                        : isLocallySelected
                          ? 'border-blue-500 bg-blue-500'
                          : isDisabled
                            ? 'cursor-not-allowed border-gray-300 bg-gray-200'
                            : 'cursor-pointer border-gray-400 bg-white hover:bg-gray-50'
                    } ${isLoadingAddress ? 'animate-pulse' : ''}`}
                    onClick={() => !isDisabled && handleJarClick(jar)}
                    disabled={isDisabled || isLoadingAddress}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <Button variant="outline" className="flex-1" onClick={handleClose}>
            <X className="mr-2 h-4 w-4" />
            {t('send.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button className="flex-1" onClick={handleConfirm} disabled={!localSelectedJar || addressQuery.isLoading}>
            {addressQuery.isLoading
              ? t('send.getting_address', { defaultValue: 'Getting address...' })
              : t('send.confirm', { defaultValue: 'Confirm' })}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default JarSelectorModal
