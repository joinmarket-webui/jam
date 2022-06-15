import React, { useEffect, useMemo, useState } from 'react'
import * as rb from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'

import * as Api from '../../libs/JmWalletApi'
import * as fb from './fb_utils'

const monthFormatter = (locales: string) => new Intl.DateTimeFormat(locales, { month: 'long' })

const DEFAULT_MONTH_FORMATTER = monthFormatter('en-US')

const getOrCreateMonthFormatter = (locale: string) =>
  DEFAULT_MONTH_FORMATTER.resolvedOptions().locale === locale ? DEFAULT_MONTH_FORMATTER : monthFormatter(locale)

const displayMonth = (date: Date, locale: string = 'en-US') => {
  return getOrCreateMonthFormatter(locale).format(date)
}

// exported for tests only
export const _minMonth = (year: number, yearsRange: fb.YearsRange, now = new Date()): number => {
  return year > now.getUTCFullYear() + yearsRange.min ? 1 : now.getUTCMonth() + 1 + 1
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

  const currentYear = useMemo(() => _now.getUTCFullYear(), [_now])
  const currentMonth = useMemo(() => _now.getUTCMonth() + 1, [_now]) // utc month ranges from [0, 11]

  const initialValue = useMemo<Api.Lockdate>(() => fb.lockdate.initial(_now, _yearsRange), [_now, _yearsRange])
  const initialDate = useMemo(() => new Date(fb.lockdate.toTimestamp(initialValue)), [initialValue])
  const initialYear = useMemo(() => initialDate.getUTCFullYear(), [initialDate])
  const initialMonth = useMemo(() => initialDate.getUTCMonth() + 1, [initialDate])

  const [lockdateYear, setLockdateYear] = useState(initialYear)
  const [lockdateMonth, setLockdateMonth] = useState(initialMonth)

  const selectableYears = useMemo(() => {
    const years = _yearsRange.max - _yearsRange.min
    const extra = _yearsRange.min + (currentMonth === 12 ? 1 : 0)
    return Array(years)
      .fill('')
      .map((_, index) => index + currentYear + extra)
  }, [_yearsRange, currentYear, currentMonth])

  const minMonth = useMemo(() => _minMonth(lockdateYear, _yearsRange, _now), [lockdateYear, _yearsRange, _now])

  const selectableMonth = useMemo(() => {
    return Array(12)
      .fill('')
      .map((_, index) => index + 1)
      .map((month) => ({
        value: month,
        displayValue: displayMonth(new Date(Date.UTC(2009, month - 1, 1)), i18n.resolvedLanguage || i18n.language),
        disabled: month < minMonth,
      }))
  }, [i18n, minMonth])

  const isLockdateYearValid = useMemo(
    () => lockdateYear >= currentYear + _yearsRange.min && lockdateYear <= currentYear + _yearsRange.max,
    [lockdateYear, currentYear, _yearsRange]
  )
  const isLockdateMonthValid = useMemo(
    () => lockdateMonth >= minMonth && lockdateMonth <= 12,
    [lockdateMonth, minMonth]
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
          <rb.Form.Group className="mb-4" controlId="lockdateYear">
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
          <rb.Form.Group className="mb-4" controlId="lockdateMonth">
            <rb.Form.Label form="fidelity-bond-form">
              <Trans i18nKey="fidelity_bond.form_create.label_lockdate_month">Month</Trans>
            </rb.Form.Label>
            <rb.Form.Select
              defaultValue={initialMonth}
              onChange={(e) => setLockdateMonth(parseInt(e.target.value, 10))}
              required
              isInvalid={!isLockdateMonthValid}
              data-testid="select-lockdate-month"
            >
              {selectableMonth.map((it) => (
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
