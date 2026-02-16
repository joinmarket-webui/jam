import { useCallback, type PropsWithChildren } from 'react'
import { CurrencySymbol } from '@/components/ui/jam/CurrencySymbol'
import { useDisplaySettings } from '@/hooks/useDisplaySettings'
import { formatBtc, formatSats, satsToBtc } from '@/lib/utils'
import type { AmountSats, Currency } from '@/types/global'
import { JamDisplayContext } from './JamDisplayContext'

const HIDDEN_AMOUNT_PLACEHOLDER = '*****'

export const JamDisplayContextProvider = ({ children }: PropsWithChildren<unknown>) => {
  const displaySettings = useDisplaySettings()

  const formatAmount = useCallback(
    ({ amount, convertToUnit, hidden }: { amount: AmountSats; convertToUnit?: Currency; hidden?: boolean }): string => {
      if ((hidden ?? displaySettings.isPrivate) === true) {
        return HIDDEN_AMOUNT_PLACEHOLDER
      }

      if ((convertToUnit ?? displaySettings.currency) === 'btc') {
        return formatBtc(satsToBtc(String(amount)))
      }

      return formatSats(amount)
    },
    [displaySettings],
  )

  const displayContextValue = {
    ...displaySettings,
    formatAmount,
    hiddenAmountPlaceholder: HIDDEN_AMOUNT_PLACEHOLDER,
    currencySymbol: () => <CurrencySymbol currency={displaySettings.currency} isPrivate={displaySettings.isPrivate} />,
  }

  return <JamDisplayContext.Provider value={displayContextValue}>{children}</JamDisplayContext.Provider>
}
