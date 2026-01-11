import { useState } from 'react'
import { pseudoRandomFloat } from '@/lib/utils'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import type { Days, Milliseconds } from '@/types/global'

const INIT_RENDER_TIME: Milliseconds = Date.now()
const MILLISECONDS_IN_A_DAY: Milliseconds = 1_000 * 60 * 60 * 24

const CHEATSHEET_NEXT_OPEN_TIME_MIN_DAYS: Days = 45
const CHEATSHEET_NEXT_OPEN_TIME_MAX_DAYS: Days = 180

const randomNextCheatsheetOpenTime = (): Milliseconds => {
  const randomAmountOfDays: Days = pseudoRandomFloat(
    CHEATSHEET_NEXT_OPEN_TIME_MIN_DAYS,
    CHEATSHEET_NEXT_OPEN_TIME_MAX_DAYS,
  )
  return Math.round(Date.now() + MILLISECONDS_IN_A_DAY * randomAmountOfDays)
}

export const useCheatsheet = () => {
  const [isCheatsheetOpen, setIsCheatsheetOpen] = useState(
    (() => {
      const targetTime = jamSettingsStore.getState().state.cheatsheetForceOpenAt ?? 0
      return INIT_RENDER_TIME >= targetTime
    })(),
  )

  const updateCheatsheetLastDisplayTime = () => {
    setTimeout(() => {
      jamSettingsStore.getState().update({ cheatsheetForceOpenAt: randomNextCheatsheetOpenTime() })
    }, 4)
  }

  const handleOpenCheatsheet = () => {
    setIsCheatsheetOpen(true)
    updateCheatsheetLastDisplayTime()
  }

  const handleCloseCheatsheet = () => {
    setIsCheatsheetOpen(false)
    updateCheatsheetLastDisplayTime()
  }

  return {
    isOpen: isCheatsheetOpen,
    onOpenChange: (value: boolean) => (value ? handleOpenCheatsheet() : handleCloseCheatsheet()),
  }
}
