import React, { useCallback, useEffect, useMemo, useState } from 'react'
import * as rb from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'

import * as Api from '../../libs/JmWalletApi'

const dateToLockdate = (date: Date): Api.Lockdate =>
  `${date.getUTCFullYear()}-${date.getUTCMonth() >= 9 ? '' : '0'}${1 + date.getUTCMonth()}` as Api.Lockdate

export const lockdateToTimestamp = (lockdate: Api.Lockdate): number => {
  const split = lockdate.split('-')
  return Date.UTC(parseInt(split[0], 10), parseInt(split[1], 10) - 1, 1)
}

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
  return dateToLockdate(new Date(Date.UTC(year + Math.max(range.min + 1, 1), month, 1)))
}

interface LockdateFormProps {
  initialValue?: Api.Lockdate
  onChange: (lockdate: Api.Lockdate) => void
  yearsRange?: YearsRange
  now?: Date
}

const LockdateForm = ({
  onChange,
  now = new Date(),
  yearsRange = toYearsRange(0, DEFAULT_MAX_TIMELOCK_YEARS),
  initialValue = initialLockdate(now, yearsRange),
}: LockdateFormProps) => {
  const { t } = useTranslation()

  const currentYear = useMemo(() => now.getUTCFullYear(), [now])
  const currentMonth = useMemo(() => now.getUTCMonth() + 1, [now]) // utc month ranges from [0, 11]

  const initialDate = new Date(lockdateToTimestamp(initialValue))
  const [lockdateYear, setLockdateYear] = useState(initialDate.getUTCFullYear())
  const [lockdateMonth, setLockdateMonth] = useState(initialDate.getUTCMonth() + 1)

  const minMonth = useCallback(() => {
    if (lockdateYear > currentYear + yearsRange.min) {
      return 1
    }

    // "minMonth" can be '13' - which means it never is valid and user must adapt 'year'.
    return currentMonth + 1
  }, [lockdateYear, currentYear, currentMonth, yearsRange])

  const isLockdateYearValid = useMemo(
    () => lockdateYear >= currentYear + yearsRange.min && lockdateYear <= currentYear + yearsRange.max,
    [lockdateYear, currentYear, yearsRange]
  )
  const isLockdateMonthValid = useMemo(() => lockdateMonth >= minMonth(), [lockdateMonth, minMonth])

  useEffect(() => {
    if (!isLockdateYearValid || !isLockdateMonthValid) return

    const date = new Date(Date.UTC(lockdateYear, lockdateMonth - 1, 1))
    onChange(dateToLockdate(date))
  }, [lockdateYear, lockdateMonth, isLockdateYearValid, isLockdateMonthValid, onChange])

  return (
    <rb.Row>
      <rb.Col xs={6}>
        <rb.Form.Group className="mb-4" controlId="locktimeYear">
          <rb.Form.Label form="fidelity-bond-form">
            <Trans i18nKey="fidelity_bond.form_create.label_locktime_year">Year</Trans>
          </rb.Form.Label>
          <rb.Form.Control
            name="year"
            type="number"
            value={lockdateYear}
            min={currentYear + yearsRange.min}
            max={currentYear + yearsRange.max}
            placeholder={t('fidelity_bond.form_create.placeholder_locktime_year')}
            required
            onChange={(e) => setLockdateYear(parseInt(e.target.value, 10))}
            isInvalid={!isLockdateYearValid}
          />
          <rb.Form.Control.Feedback type="invalid">
            <Trans i18nKey="fidelity_bond.form_create.feedback_invalid_locktime_year">
              Please provide a valid value.
            </Trans>
          </rb.Form.Control.Feedback>
        </rb.Form.Group>
      </rb.Col>
      <rb.Col xs={6}>
        <rb.Form.Group className="mb-4" controlId="locktimeMonth">
          <rb.Form.Label form="fidelity-bond-form">
            <Trans i18nKey="fidelity_bond.form_create.label_locktime_month">Month</Trans>
          </rb.Form.Label>
          <rb.Form.Control
            name="month"
            type="number"
            value={lockdateMonth}
            min={minMonth()}
            step={1}
            max={12}
            placeholder={t('fidelity_bond.form_create.placeholder_locktime_month')}
            required
            onChange={(e) => setLockdateMonth(parseInt(e.target.value, 10))}
            isInvalid={!isLockdateMonthValid}
          />
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
