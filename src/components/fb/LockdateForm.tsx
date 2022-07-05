import React, { useEffect, useMemo, useState } from 'react'
import * as rb from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'

import * as Api from '../../libs/JmWalletApi'
import * as fb from './utils'

const monthFormatter = (locales: string) => new Intl.DateTimeFormat(locales, { month: 'long' })

const DEFAULT_MONTH_FORMATTER = monthFormatter('en-US')

const getOrCreateMonthFormatter = (locale: string) =>
  DEFAULT_MONTH_FORMATTER.resolvedOptions().locale === locale ? DEFAULT_MONTH_FORMATTER : monthFormatter(locale)

const displayMonth = (date: Date, locale: string = 'en-US') => {
  return getOrCreateMonthFormatter(locale).format(date)
}

type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

// exported for tests only
export const _minMonth = (year: number, yearsRange: fb.YearsRange, now = new Date()): Month | 13 => {
  if (year > now.getUTCFullYear() + yearsRange.min) return 1 as Month
  if (year < now.getUTCFullYear() + yearsRange.min) return 13
  return (now.getUTCMonth() + 1 + 1) as Month | 13
}

type SelectableMonth = {
  value: Month
  displayValue: string
  disabled: boolean
}

// exported for tests only
export const _selectableMonths = (
  year: number,
  yearsRange: fb.YearsRange,
  now = new Date(),
  locale?: string
): SelectableMonth[] => {
  const minMonth = _minMonth(year, yearsRange, now)
  return Array(12)
    .fill('')
    .map((_, index) => (index + 1) as Month)
    .map((month) => ({
      value: month,
      displayValue: displayMonth(new Date(Date.UTC(year, month - 1, 1)), locale),
      disabled: month < minMonth,
    }))
}

// exported for tests only
export const _selectableYears = (yearsRange: fb.YearsRange, now = new Date()): number[] => {
  const years = yearsRange.max - yearsRange.min
  const extra = yearsRange.min + (now.getUTCMonth() === 11 ? 1 : 0)
  return Array(years)
    .fill('')
    .map((_, index) => index + now.getUTCFullYear() + extra)
}

interface LockdateFormProps {
  onChange: (lockdate: Api.Lockdate | null) => void
  yearsRange?: fb.YearsRange
  now?: Date
}

const LockdateForm = ({ onChange, now, yearsRange }: LockdateFormProps) => {
  const { i18n } = useTranslation()
  const _now = useMemo<Date>(() => now || new Date(), [now])
  const _yearsRange = useMemo<fb.YearsRange>(() => yearsRange || fb.DEFAULT_TIMELOCK_YEARS_RANGE, [yearsRange])

  const initialValue = useMemo<Api.Lockdate>(() => fb.lockdate.initial(_now, _yearsRange), [_now, _yearsRange])
  const initialDate = useMemo(() => new Date(fb.lockdate.toTimestamp(initialValue)), [initialValue])
  const initialYear = useMemo(() => initialDate.getUTCFullYear(), [initialDate])
  const initialMonth = useMemo(() => (initialDate.getUTCMonth() + 1) as Month, [initialDate])

  const [lockdateYear, setLockdateYear] = useState(initialYear)
  const [lockdateMonth, setLockdateMonth] = useState(initialMonth)

  const selectableYears = useMemo(() => _selectableYears(_yearsRange, _now), [_yearsRange, _now])
  const selectableMonths = useMemo(
    () => _selectableMonths(lockdateYear, _yearsRange, _now, i18n.resolvedLanguage || i18n.language),
    [lockdateYear, _yearsRange, _now, i18n]
  )

  const isLockdateYearValid = useMemo(() => selectableYears.includes(lockdateYear), [lockdateYear, selectableYears])
  const isLockdateMonthValid = useMemo(
    () =>
      selectableMonths
        .filter((it) => !it.disabled)
        .map((it) => it.value)
        .includes(lockdateMonth),
    [lockdateMonth, selectableMonths]
  )

  useEffect(() => {
    if (isLockdateYearValid && isLockdateMonthValid) {
      const timestamp = Date.UTC(lockdateYear, lockdateMonth - 1, 1)
      onChange(fb.lockdate.fromTimestamp(timestamp))
    } else {
      onChange(null)
    }
  }, [lockdateYear, lockdateMonth, isLockdateYearValid, isLockdateMonthValid, onChange])

  return (
    <rb.Container>
      <rb.Row>
        <rb.Col sm={6}>
          <rb.Form.Group controlId="lockdateYear">
            <rb.Form.Label form="fidelity-bond-form">
              <Trans i18nKey="fidelity_bond.form_create.label_lockdate_year">Year</Trans>
            </rb.Form.Label>
            <rb.Form.Select
              defaultValue={initialYear}
              onChange={(e) => setLockdateYear(parseInt(e.target.value, 10))}
              required
              isInvalid={!isLockdateYearValid}
              data-testid="select-lockdate-year"
            >
              {selectableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </rb.Form.Select>

            <rb.Form.Control.Feedback type="invalid">
              <Trans i18nKey="fidelity_bond.form_create.feedback_invalid_locktime_year">
                Please provide a valid value.
              </Trans>
            </rb.Form.Control.Feedback>
          </rb.Form.Group>
        </rb.Col>
        <rb.Col sm={6}>
          <rb.Form.Group controlId="lockdateMonth">
            <rb.Form.Label form="fidelity-bond-form">
              <Trans i18nKey="fidelity_bond.form_create.label_lockdate_month">Month</Trans>
            </rb.Form.Label>
            <rb.Form.Select
              defaultValue={initialMonth}
              onChange={(e) => setLockdateMonth(parseInt(e.target.value, 10) as Month)}
              required
              isInvalid={!isLockdateMonthValid}
              data-testid="select-lockdate-month"
            >
              {selectableMonths.map((it) => (
                <option key={it.value} value={it.value} disabled={it.disabled}>
                  {it.displayValue}
                </option>
              ))}
            </rb.Form.Select>
            <rb.Form.Control.Feedback type="invalid">
              <Trans i18nKey="fidelity_bond.form_create.feedback_invalid_locktime_month">
                Please provide a valid value.
              </Trans>
            </rb.Form.Control.Feedback>
          </rb.Form.Group>
        </rb.Col>
      </rb.Row>
    </rb.Container>
  )
}

export default LockdateForm
