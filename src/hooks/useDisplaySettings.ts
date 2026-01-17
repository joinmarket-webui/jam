import { useCallback } from 'react'
import { useStore } from 'zustand'
import { satsToBtc } from '@/lib/utils'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import type { AmountSats } from '@/types/global'

export function useDisplaySettings() {
  const {
    state: { currencyUnit, privateMode },
    update,
  } = useStore(jamSettingsStore, (state) => state)

  const toggleCurrencyUnit = useCallback(
    () => update({ currencyUnit: currencyUnit === 'sats' ? 'btc' : 'sats' }),
    [currencyUnit, update],
  )
  const togglePrivacyMode = useCallback(() => update({ privateMode: !privateMode }), [privateMode, update])

  const toggleDisplayMode = useCallback(() => {
    if (privateMode) {
      update({
        privateMode: false,
        currencyUnit: 'sats',
      })
    } else if (currencyUnit === 'sats') {
      update({
        privateMode: false,
        currencyUnit: 'btc',
      })
    } else {
      update({
        privateMode: true,
      })
    }
  }, [privateMode, currencyUnit, update])

  const formatAmount = useCallback(
    (amount: AmountSats): string => {
      if (privateMode) {
        return '■■■■'
      }

      if (currencyUnit === 'btc') {
        return satsToBtc(String(amount)).toLocaleString(undefined, {
          minimumFractionDigits: 8,
          maximumFractionDigits: 8,
        })
      }

      return amount.toLocaleString()
    },
    [currencyUnit, privateMode],
  )

  return {
    currency: currencyUnit,
    isPrivate: privateMode,
    toggleCurrencyUnit,
    togglePrivacyMode,
    toggleDisplayMode,
    formatAmount,
  }
}
