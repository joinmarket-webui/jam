import { useState, type ComponentProps } from 'react'
import type { Dialog } from '@/components/ui/dialog'
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

type UseCheatsheetResult = Required<Pick<ComponentProps<typeof Dialog>, 'open' | 'onOpenChange'>>

export function useCheatsheet(): UseCheatsheetResult {
  const [open, setOpen] = useState(
    (() => {
      const targetTime = jamSettingsStore.getState().state.cheatsheetForceOpenAt ?? 0
      return INIT_RENDER_TIME >= targetTime
    })(),
  )

  const updateLastDisplayTime = () => {
    setTimeout(() => {
      jamSettingsStore.getState().update({ cheatsheetForceOpenAt: randomNextCheatsheetOpenTime() })
    }, 4)
  }

  const onOpenChange = (value: boolean) => {
    setOpen(value)
    updateLastDisplayTime()
  }

  return {
    open: open,
    onOpenChange,
  }
}
