import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import * as fb from '@/lib/fidelityBondUtils'
import { useDeveloperMode } from '@/store/jamSettingsStore'
import { generateLockdateOptions, getMonthOptions, getYearOptions } from '../CreateFidelityBondDialog/types'

type LockdateSelectProps = {
  /** prefix for the month/year element ids */
  id: string
  value: fb.Lockdate | ''
  onChange: (value: fb.Lockdate | '') => void
}

export function LockdateSelect({ id, value, onChange }: LockdateSelectProps) {
  const { t } = useTranslation()
  const { enabled: isDeveloperMode } = useDeveloperMode()

  const lockdateOptions = useMemo(() => generateLockdateOptions(isDeveloperMode), [isDeveloperMode])
  const yearOptions = useMemo(() => getYearOptions(lockdateOptions), [lockdateOptions])
  const monthOptions = useMemo(() => getMonthOptions(), [])

  const minLockdate = lockdateOptions.at(0)?.value ?? ''
  const maxLockdate = lockdateOptions.at(-1)?.value ?? ''
  const clampLockdate = (lockdate: string): fb.Lockdate | '' => {
    if (!lockdate || lockdate < minLockdate) return minLockdate || ''
    if (lockdate > maxLockdate) return maxLockdate || ''
    return lockdate as fb.Lockdate
  }
  const selectedYear = value ? value.slice(0, 4) : ''
  const selectedMonth = value ? value.slice(5, 7) : ''
  const minYear = minLockdate ? Number.parseInt(minLockdate.slice(0, 4), 10) : 0
  const minMonth = minLockdate ? Number.parseInt(minLockdate.slice(5, 7), 10) : 1

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${id}-month`} className="text-sm font-medium">
            {t('earn.fidelity_bond.select_date.form_label_month')}
          </Label>
          <Select
            value={selectedMonth}
            onValueChange={(month) => {
              const year = selectedYear || String(Number.parseInt(month, 10) >= minMonth ? minYear : minYear + 1)
              onChange(clampLockdate(`${year}-${month}`))
            }}
          >
            <SelectTrigger id={`${id}-month`} className="h-11 w-full">
              <SelectValue placeholder={t('earn.fidelity_bond.select_date.form_label_month')} />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-year`} className="text-sm font-medium">
            {t('earn.fidelity_bond.select_date.form_label_year')}
          </Label>
          <Select
            value={selectedYear}
            onValueChange={(year) => {
              const month = selectedMonth || String(year === String(minYear) ? minMonth : 1).padStart(2, '0')
              onChange(clampLockdate(`${year}-${month}`))
            }}
          >
            <SelectTrigger id={`${id}-year`} className="h-11 w-full">
              <SelectValue placeholder={t('earn.fidelity_bond.select_date.form_label_year')} />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {value && (
        <div className="bg-primary/5 border-primary/20 rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">
            {t('earn.fidelity_bond.select_date.label_selected_lock_date')}
          </p>
          <p className="mt-1 text-lg font-semibold">{fb.lockdate.toDateLabel(value)}</p>
        </div>
      )}
    </>
  )
}
