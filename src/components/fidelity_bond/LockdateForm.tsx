import React, { useEffect, useMemo, useState } from 'react'
import * as rb from 'react-bootstrap'
import { Trans } from 'react-i18next'

import * as Api from '../../libs/JmWalletApi'
import * as fb from './fb_utils'

// a maximum of years for a timelock to be accepted
// this is useful in simple mode - when it should be prevented that users
// lock up their coins for an awful amount of time by accident.
// in "advanced" mode, this can be dropped or increased substantially
export const DEFAULT_MAX_TIMELOCK_YEARS = 10

type YearsRange = {
  min: number
  max: number
}

export const toYearsRange = (min: number, max: number): YearsRange => {
  if (max <= min) {
    throw new Error('Invalid values for range of years.')
  }
  return { min, max }
}

const initialLockdate = (now: Date, range: YearsRange): Api.Lockdate => {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  return fb.lockdate.fromTimestamp(Date.UTC(year + Math.max(range.min + 1, 1), month, 1))
}

interface LockdateFormProps {
  onChange: (lockdate: Api.Lockdate | null) => void
  initialValue?: Api.Lockdate
  yearsRange?: YearsRange
  now?: Date
}

const LockdateForm = ({ onChange, now, yearsRange, initialValue }: LockdateFormProps) => {
  const _now = useMemo<Date>(() => now || new Date(), [now])
  const _yearsRange = useMemo<YearsRange>(() => yearsRange || toYearsRange(0, DEFAULT_MAX_TIMELOCK_YEARS), [yearsRange])
  const _initalValue = useMemo<Api.Lockdate>(
    () => initialValue || initialLockdate(_now, _yearsRange),
    [initialValue, _now, _yearsRange]
  )

  const currentYear = useMemo(() => _now.getUTCFullYear(), [_now])
  const currentMonth = useMemo(() => _now.getUTCMonth() + 1, [_now]) // utc month ranges from [0, 11]

  const initialDate = useMemo(() => new Date(fb.lockdate.toTimestamp(_initalValue)), [_initalValue])
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

  const minMonth = useMemo(() => {
    // 'minMonth' can be `13` - which means it never is valid and user must adapt 'year'.
    return lockdateYear > currentYear + _yearsRange.min ? 1 : currentMonth + 1
  }, [lockdateYear, currentYear, currentMonth, _yearsRange])

  const isLockdateYearValid = useMemo(
    () => lockdateYear >= currentYear + _yearsRange.min && lockdateYear <= currentYear + _yearsRange.max,
    [lockdateYear, currentYear, _yearsRange]
  )
  const isLockdateMonthValid = useMemo(
    () => lockdateMonth >= minMonth && lockdateMonth <= 12,
    [lockdateMonth, minMonth]
  )

  useEffect(() => {
    if (!isLockdateYearValid || !isLockdateMonthValid) {
      onChange(null)
      return
    }

    const timestamp = Date.UTC(lockdateYear, lockdateMonth - 1, 1)
    onChange(fb.lockdate.fromTimestamp(timestamp))
  }, [lockdateYear, lockdateMonth, isLockdateYearValid, isLockdateMonthValid, onChange])

  return (
    <rb.Row>
      <rb.Col xs={6}>
        <rb.Form.Group className="mb-4" controlId="lockdateYear">
          <rb.Form.Label form="fidelity-bond-form">
            <Trans i18nKey="fidelity_bond.form_create.label_lockdate_year">Year</Trans>
          </rb.Form.Label>
          <rb.Form.Select
            defaultValue={initialYear}
            onChange={(e) => setLockdateYear(parseInt(e.target.value, 10))}
            required
            isInvalid={!isLockdateYearValid}
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
      <rb.Col xs={6}>
        <rb.Form.Group className="mb-4" controlId="lockdateMonth">
          <rb.Form.Label form="fidelity-bond-form">
            <Trans i18nKey="fidelity_bond.form_create.label_lockdate_month">Month</Trans>
          </rb.Form.Label>
          <rb.Form.Select
            defaultValue={initialMonth}
            onChange={(e) => setLockdateMonth(parseInt(e.target.value, 10))}
            required
            isInvalid={!isLockdateMonthValid}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
              <option key={month} value={month} disabled={month < minMonth}>
                {month}
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
  )
}

export default LockdateForm
