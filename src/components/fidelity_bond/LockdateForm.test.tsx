import React from 'react'
import { act } from 'react-dom/test-utils'
import user from '@testing-library/user-event'
import { render, screen } from '../../testUtils'
import * as Api from '../../libs/JmWalletApi'
import * as fb from './fb_utils'

import LockdateForm from './LockdateForm'

describe('<LockdateForm />', () => {
  const now = new Date(Date.UTC(2009, 0, 3))
  const setup = (onChange: (lockdate: Api.Lockdate | null) => void) => {
    render(<LockdateForm onChange={onChange} now={now} />)
  }

  it('should render without errors', () => {
    act(() => setup(() => {}))

    expect(screen.getByTestId('select-lockdate-year')).toBeVisible()
    expect(screen.getByTestId('select-lockdate-month')).toBeVisible()
  })

  it('should initialize 3 month ahead by default', () => {
    const onChange = jest.fn()

    act(() => setup(onChange))

    expect(onChange).toHaveBeenCalledWith(fb.lockdate.initial(now))
  })

  it('should be able to select 10 years by default', () => {
    const expectedSelectableYears = 10
    const currentYear = now.getUTCFullYear()

    let selectedLockdate: Api.Lockdate | null = null
    const onChange = (lockdate: Api.Lockdate | null) => (selectedLockdate = lockdate)

    act(() => setup(onChange))

    const yearDropdown = screen.getByTestId('select-lockdate-year')

    for (let i = 0; i < expectedSelectableYears; i++) {
      const yearValue = currentYear + i
      expect(() => user.selectOptions(yearDropdown, [`${yearValue}`])).not.toThrow()
      expect(new Date(fb.lockdate.toTimestamp(selectedLockdate!)).getUTCFullYear()).toBe(yearValue)
    }

    const unavailableYearPast = `${currentYear - 1}`
    expect(() => user.selectOptions(yearDropdown, [unavailableYearPast])).toThrow()

    const unavailableYearFuture = `${currentYear + expectedSelectableYears + 1}`
    expect(() => user.selectOptions(yearDropdown, [unavailableYearFuture])).toThrow()
  })

  it('should not be able to select current month', () => {
    const currentYear = now.getUTCFullYear()
    const currentMonth = now.getUTCMonth() + 1 // utc month ranges from [0, 11]

    let selectedLockdate: Api.Lockdate | null = null
    const onChange = (lockdate: Api.Lockdate | null) => (selectedLockdate = lockdate)

    act(() => setup(onChange))

    const initialLockdate = selectedLockdate
    expect(initialLockdate).not.toBeNull()

    const monthDropdown = screen.getByTestId('select-lockdate-month')

    act(() => user.selectOptions(monthDropdown, [`${currentMonth}`]))
    expect(selectedLockdate).toBe(initialLockdate) // select lockdate has not changed

    const expectedLockdate = fb.lockdate.fromTimestamp(Date.UTC(currentYear, currentMonth + 3 - 1))
    act(() => user.selectOptions(monthDropdown, [`${currentMonth + 3}`]))
    expect(selectedLockdate).toBe(expectedLockdate)

    act(() => user.selectOptions(monthDropdown, [`${currentMonth}`]))
    expect(selectedLockdate).toBe(expectedLockdate) // select lockdate has not changed
  })
})
