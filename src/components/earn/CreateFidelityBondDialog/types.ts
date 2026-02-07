import type { ComponentProps } from 'react'
import type { Dialog } from '@/components/ui/dialog'
import * as fb from '@/lib/fidelityBondUtils'
import type { WalletFileName } from '@/lib/utils'
import type { WithRequiredProperty } from '@/types/global'

export type Step = 'select_date' | 'select_jar' | 'select_utxos' | 'freeze_utxos' | 'review' | 'creating' | 'success'

export type CreateFidelityBondDialogProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> & {
  walletFileName: WalletFileName
}

// Lockdate options for the next ~10 years (and past months in dev mode for testing expired bonds)
export function generateLockdateOptions(isDeveloperMode: boolean): { value: fb.Lockdate; label: string }[] {
  const options: { value: fb.Lockdate; label: string }[] = []
  const now = new Date()
  const startYear = now.getUTCFullYear()
  const startMonth = now.getUTCMonth()

  const startOffset = isDeveloperMode ? -12 : 3
  for (let i = startOffset; i <= 120; i++) {
    const monthOffset = startMonth + i
    const year = startYear + Math.floor(monthOffset / 12)
    const month = (monthOffset % 12) + 1
    const lockdate = `${year}-${month.toString().padStart(2, '0')}` as fb.Lockdate
    const date = new Date(Date.UTC(year, month - 1, 1))
    const label = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
    options.push({ value: lockdate, label })
  }

  return options
}

export function getYearOptions(lockdateOptions: { value: fb.Lockdate }[]) {
  if (lockdateOptions.length === 0) return []
  const minYear = parseInt(lockdateOptions[0].value.slice(0, 4), 10)
  const maxYear = parseInt(lockdateOptions[lockdateOptions.length - 1].value.slice(0, 4), 10)
  return Array.from({ length: maxYear - minYear + 1 }, (_, i) => ({
    value: String(minYear + i),
    label: String(minYear + i),
  }))
}

export function getMonthOptions(): { value: string; label: string }[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const label = new Date(2000, i, 1).toLocaleDateString(undefined, { month: 'long' })
    return { value: month.toString().padStart(2, '0'), label }
  })
}
