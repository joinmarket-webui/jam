import { CurrencySymbol } from '@/components/CurrencySymbol'
import { useDisplaySettings } from '@/hooks/useDisplaySettings'
import { useWalletDisplay } from '@/hooks/useWalletDisplay'
import { JamDisplayContext } from './JamDisplayContext'

export const JamDisplayContextProvider = ({ children }: React.PropsWithChildren<unknown>) => {
  const { currency, isPrivate, toggleCurrencyUnit, togglePrivacyMode, toggleDisplayMode, formatAmount } =
    useDisplaySettings()
  const { jars, totalBalance, walletName, isLoading, error, refetchWalletData } = useWalletDisplay()

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
