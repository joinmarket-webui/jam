import type { PropsWithChildren } from 'react'
import { CurrencySymbol } from '@/components/CurrencySymbol'
import { useDisplaySettings } from '@/hooks/useDisplaySettings'
import { useWalletDisplay } from '@/hooks/useWalletDisplay'
import type { WalletFileName } from '@/lib/utils'
import { JamDisplayContext } from './JamDisplayContext'

interface JamDisplayContextProviderProps {
  walletFileName: WalletFileName
}

export const JamDisplayContextProvider = ({
  walletFileName,
  children,
}: PropsWithChildren<JamDisplayContextProviderProps>) => {
  const { currency, isPrivate, toggleCurrencyUnit, togglePrivacyMode, toggleDisplayMode, formatAmount } =
    useDisplaySettings()
  const { jars, totalBalance, walletName, isLoading, error, refetchWalletData } = useWalletDisplay({ walletFileName })

  const displayContextValue = {
    currency,
    isPrivate,
    toggleCurrencyUnit,
    togglePrivacyMode,
    toggleDisplayMode,
    formatAmount,
    currencySymbol: (size: 'sm' | 'lg' = 'lg') => (
      <CurrencySymbol currency={currency} isPrivate={isPrivate} size={size} />
    ),
    jars,
    totalBalance,
    walletName,
    isLoading,
    error,
    refetchWalletData,
  }

  return <JamDisplayContext.Provider value={displayContextValue}>{children}</JamDisplayContext.Provider>
}
