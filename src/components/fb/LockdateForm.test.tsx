import { render, screen } from '@testing-library/react'
import user from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import * as Api from '../../libs/JmWalletApi'
import * as fb from './utils'
import i18n from '../../i18n/testConfig'

import LockdateForm, { _minMonth, _selectableMonths, _selectableYears } from './LockdateForm'

describe('<LockdateForm />', () => {
  const now = new Date(Date.UTC(2009, 0, 3))
  const setup = (onChange: (lockdate: Api.Lockdate | null) => void) => {
    render(
      <I18nextProvider i18n={i18n}>
        <LockdateForm onChange={onChange} now={now} />
      </I18nextProvider>,
    )
  }

  it('should render without errors', () => {
    setup(() => {})

    expect(screen.getByTestId('select-lockdate-year')).toBeVisible()
    expect(screen.getByTestId('select-lockdate-month')).toBeVisible()
  })

  it('should initialize 3 month ahead by default', () => {
    const onChange = jest.fn()

    setup(onChange)

    expect(onChange).toHaveBeenCalledWith(fb.lockdate.initial(now))
  })

  it('should be able to select 10 years by default', async () => {
    const expectedSelectableYears = 10
    const currentYear = now.getUTCFullYear()

    let selectedLockdate: Api.Lockdate | null = null
    const onChange = (lockdate: Api.Lockdate | null) => (selectedLockdate = lockdate)

    setup(onChange)

    const yearDropdown = screen.getByTestId('select-lockdate-year')

    for (let i = 0; i < expectedSelectableYears; i++) {
      const yearValue = currentYear + i

      await user.selectOptions(yearDropdown, [`${yearValue}`])

      expect(new Date(fb.lockdate.toTimestamp(selectedLockdate!)).getUTCFullYear()).toBe(yearValue)
    }

    try {
      const unavailableYearPast = `${currentYear - 1}`
      await user.selectOptions(yearDropdown, [unavailableYearPast])
      expect(false).toBe(true)
    } catch (err: any) {
      expect(err.name).toBe('TestingLibraryElementError')
    }

    try {
      const unavailableYearFuture = `${currentYear + expectedSelectableYears + 1}`
      await user.selectOptions(yearDropdown, [unavailableYearFuture])
      expect(false).toBe(true)
    } catch (err: any) {
      expect(err.name).toBe('TestingLibraryElementError')
    }
  })

  it('should not be able to select current month', async () => {
    const currentYear = now.getUTCFullYear()
    const currentMonth = now.getUTCMonth() + 1 // utc month ranges from [0, 11]

    let selectedLockdate: Api.Lockdate | null = null
    const onChange = (lockdate: Api.Lockdate | null) => (selectedLockdate = lockdate)

    setup(onChange)

    const initialLockdate = selectedLockdate
    expect(initialLockdate).not.toBeNull()

    const monthDropdown = screen.getByTestId('select-lockdate-month')

    await user.selectOptions(monthDropdown, [`${currentMonth}`])
    expect(selectedLockdate).toBe(initialLockdate) // select lockdate has not changed

    const expectedLockdate = fb.lockdate.fromTimestamp(Date.UTC(currentYear, currentMonth + 3 - 1))
    await user.selectOptions(monthDropdown, [`${currentMonth + 3}`])
    expect(selectedLockdate).toBe(expectedLockdate)

    await user.selectOptions(monthDropdown, [`${currentMonth}`])
    expect(selectedLockdate).toBe(expectedLockdate) // select lockdate has not changed
  })

  describe('_minMonth', () => {
    const yearsRange = fb.toYearsRange(0, 10)
    const yearsRangeMinusOne = fb.toYearsRange(-1, 10)
    const yearsRangePlusOne = fb.toYearsRange(1, 10)

    const january2009 = new Date(Date.UTC(2009, 0))
    const july2009 = new Date(Date.UTC(2009, 6))
    const december2009 = new Date(Date.UTC(2009, 11))

    it('should calculate min month correctly', () => {
      expect(_minMonth(2009, yearsRange, january2009)).toBe(2)
      expect(_minMonth(2009, yearsRange, july2009)).toBe(8)
      expect(_minMonth(2009, yearsRange, december2009)).toBe(13)

      expect(_minMonth(2009, yearsRangeMinusOne, january2009)).toBe(1)
      expect(_minMonth(2009, yearsRangeMinusOne, july2009)).toBe(1)
      expect(_minMonth(2009, yearsRangeMinusOne, december2009)).toBe(1)

      expect(_minMonth(2009, yearsRangePlusOne, january2009)).toBe(13)
      expect(_minMonth(2009, yearsRangePlusOne, july2009)).toBe(13)
      expect(_minMonth(2009, yearsRangePlusOne, december2009)).toBe(13)
    })
  })

  describe('_selectableMonths', () => {
    const yearsRange = fb.toYearsRange(0, 2)

    const january2009 = new Date(Date.UTC(2009, 0))
    const july2009 = new Date(Date.UTC(2009, 6))
    const december2009 = new Date(Date.UTC(2009, 11))

    it('should display month name', () => {
      const selectableMonths = _selectableMonths(2009, yearsRange, january2009)
      expect(selectableMonths).toHaveLength(12)

      expect(selectableMonths[0].displayValue).toBe('January')
      expect(selectableMonths[11].displayValue).toBe('December')
    })

    it('should set disabled flag correctly for january', () => {
      const selectableMonths2008 = _selectableMonths(2008, yearsRange, january2009)
      expect(selectableMonths2008).toHaveLength(12)
      expect(selectableMonths2008[0].disabled).toBe(true)
      expect(selectableMonths2008[11].disabled).toBe(true)

      const selectableMonths2009 = _selectableMonths(2009, yearsRange, january2009)
      expect(selectableMonths2009).toHaveLength(12)
      expect(selectableMonths2009[0].disabled).toBe(true)
      expect(selectableMonths2009[1].disabled).toBe(false)
      expect(selectableMonths2009[11].disabled).toBe(false)

      const selectableMonths2010 = _selectableMonths(2010, yearsRange, january2009)
      expect(selectableMonths2010).toHaveLength(12)
      expect(selectableMonths2010[0].disabled).toBe(false)
      expect(selectableMonths2010[11].disabled).toBe(false)
    })

    it('should set disabled flag correctly for july', () => {
      const selectableMonths2008 = _selectableMonths(2008, yearsRange, july2009)
      expect(selectableMonths2008).toHaveLength(12)
      expect(selectableMonths2008[0].disabled).toBe(true)
      expect(selectableMonths2008[11].disabled).toBe(true)

      const selectableMonths2009 = _selectableMonths(2009, yearsRange, july2009)
      expect(selectableMonths2009).toHaveLength(12)
      expect(selectableMonths2009[0].disabled).toBe(true)
      expect(selectableMonths2009[1].disabled).toBe(true)
      expect(selectableMonths2009[6].disabled).toBe(true)
      expect(selectableMonths2009[7].disabled).toBe(false)
      expect(selectableMonths2009[11].disabled).toBe(false)

      const selectableMonths2010 = _selectableMonths(2010, yearsRange, july2009)
      expect(selectableMonths2010).toHaveLength(12)
      expect(selectableMonths2010[0].disabled).toBe(false)
      expect(selectableMonths2010[11].disabled).toBe(false)
    })

    it('should set disabled flag correctly for december', () => {
      const selectableMonths2008 = _selectableMonths(2008, yearsRange, december2009)
      expect(selectableMonths2008).toHaveLength(12)
      expect(selectableMonths2008[0].disabled).toBe(true)
      expect(selectableMonths2008[11].disabled).toBe(true)

      const selectableMonths2009 = _selectableMonths(2009, yearsRange, december2009)
      expect(selectableMonths2009).toHaveLength(12)
      expect(selectableMonths2009[0].disabled).toBe(true)
      expect(selectableMonths2009[11].disabled).toBe(true)

      const selectableMonths2010 = _selectableMonths(2010, yearsRange, december2009)
      expect(selectableMonths2010).toHaveLength(12)
      expect(selectableMonths2010[0].disabled).toBe(false)
      expect(selectableMonths2010[11].disabled).toBe(false)
    })
  })

  describe('_selectableYears', () => {
    const yearsRange = fb.toYearsRange(0, 2)
    const yearsRangeMinusOne = fb.toYearsRange(-1, 2)
    const yearsRangePlusOne = fb.toYearsRange(1, 2)

    const january2009 = new Date(Date.UTC(2009, 0))
    const july2009 = new Date(Date.UTC(2009, 6))
    const december2009 = new Date(Date.UTC(2009, 11))

    it('should calculate selectable years correctly', () => {
      expect(_selectableYears(yearsRange, january2009)).toEqual([2009, 2010])
      expect(_selectableYears(yearsRange, july2009)).toEqual([2009, 2010])
      expect(_selectableYears(yearsRange, december2009)).toEqual([2010, 2011])

      expect(_selectableYears(yearsRangeMinusOne, january2009)).toEqual([2008, 2009, 2010])
      expect(_selectableYears(yearsRangeMinusOne, july2009)).toEqual([2008, 2009, 2010])
      expect(_selectableYears(yearsRangeMinusOne, december2009)).toEqual([2009, 2010, 2011])

      expect(_selectableYears(yearsRangePlusOne, january2009)).toEqual([2010])
      expect(_selectableYears(yearsRangePlusOne, july2009)).toEqual([2010])
      expect(_selectableYears(yearsRangePlusOne, december2009)).toEqual([2011])
    })
  })
})
