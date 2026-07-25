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
  unavailableValues?: readonly fb.Lockdate[]
}

export function LockdateSelect({ id, value, onChange, unavailableValues = [] }: LockdateSelectProps) {
  const { t } = useTranslation()
  const { enabled: isDeveloperMode } = useDeveloperMode()

  const lockdateOptions = useMemo(() => generateLockdateOptions(isDeveloperMode), [isDeveloperMode])
  const unavailableSet = useMemo(() => new Set(unavailableValues), [unavailableValues])
  const availableLockdateOptions = useMemo(
    () => lockdateOptions.filter((option) => !unavailableSet.has(option.value)),
    [lockdateOptions, unavailableSet],
  )
  const yearOptions = useMemo(() => getYearOptions(lockdateOptions), [lockdateOptions])
  const monthOptions = useMemo(() => getMonthOptions(), [])

  const selectedYear = value ? value.slice(0, 4) : ''
  const selectedMonth = value ? value.slice(5, 7) : ''

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
              const selectedCandidate = selectedYear ? (`${selectedYear}-${month}` as fb.Lockdate) : undefined
              const nextValue =
                selectedCandidate && !unavailableSet.has(selectedCandidate)
                  ? selectedCandidate
                  : availableLockdateOptions.find((option) => option.value.endsWith(`-${month}`))?.value
              onChange(nextValue ?? '')
            }}
          >
            <SelectTrigger id={`${id}-month`} className="h-11 w-full">
              <SelectValue placeholder={t('earn.fidelity_bond.select_date.form_label_month')} />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => {
                const candidate = selectedYear ? (`${selectedYear}-${option.value}` as fb.Lockdate) : undefined
                const disabled = candidate
                  ? !availableLockdateOptions.some((lockdate) => lockdate.value === candidate)
                  : !availableLockdateOptions.some((lockdate) => lockdate.value.endsWith(`-${option.value}`))
                return (
                  <SelectItem key={option.value} value={option.value} disabled={disabled}>
                    {option.label}
                  </SelectItem>
                )
              })}
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
              const selectedCandidate = selectedMonth ? (`${year}-${selectedMonth}` as fb.Lockdate) : undefined
              const nextValue =
                selectedCandidate && !unavailableSet.has(selectedCandidate)
                  ? selectedCandidate
                  : availableLockdateOptions.find((option) => option.value.startsWith(`${year}-`))?.value
              onChange(nextValue ?? '')
            }}
          >
            <SelectTrigger id={`${id}-year`} className="h-11 w-full">
              <SelectValue placeholder={t('earn.fidelity_bond.select_date.form_label_year')} />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((option) => {
                const candidate = selectedMonth ? (`${option.value}-${selectedMonth}` as fb.Lockdate) : undefined
                const disabled = candidate
                  ? !availableLockdateOptions.some((lockdate) => lockdate.value === candidate)
                  : !availableLockdateOptions.some((lockdate) => lockdate.value.startsWith(`${option.value}-`))
                return (
                  <SelectItem key={option.value} value={option.value} disabled={disabled}>
                    {option.label}
                  </SelectItem>
                )
              })}
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
