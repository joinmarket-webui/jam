import { render, cleanup } from '@testing-library/react'
import { formatSats, formatBtc, FormatBtcProps } from './format'

describe('formatSats', () => {
  it('should format given value as amount in sats', () => {
    expect(formatSats(-1_000)).toBe('-1,000')
    expect(formatSats(-999)).toBe('-999')
    expect(formatSats(-1)).toBe('-1')
    expect(formatSats(0)).toBe('0')
    expect(formatSats(1)).toBe('1')
    expect(formatSats(999)).toBe('999')
    expect(formatSats(1_000)).toBe('1,000')
    expect(formatSats(2099999997690000)).toBe('2,099,999,997,690,000')
    expect(formatSats(2100000000000000)).toBe('2,100,000,000,000,000')
  })
})

describe('formatBtc', () => {
  const _renderText = (ui: React.ReactElement) => {
    const textContent = render(ui).baseElement.textContent
    cleanup()
    return textContent
  }

  it('should format given value as amount in BTC', () => {
    const PLAIN_FORMAT: FormatBtcProps = {
      spaceChar: ' ',
      deemphasize: (val) => val, // render as plain string
    }

    expect(_renderText(formatBtc(-1_000, PLAIN_FORMAT))).toBe('-1,000.00 000 000')
    expect(_renderText(formatBtc(-999, PLAIN_FORMAT))).toBe('-999.00 000 000')
    expect(_renderText(formatBtc(-1, PLAIN_FORMAT))).toBe('-1.00 000 000')
    expect(_renderText(formatBtc(0, PLAIN_FORMAT))).toBe('0.00 000 000')
    expect(_renderText(formatBtc(1, PLAIN_FORMAT))).toBe('1.00 000 000')
    expect(_renderText(formatBtc(123.03224961, PLAIN_FORMAT))).toBe('123.03 224 961')
    expect(_renderText(formatBtc(123.456, PLAIN_FORMAT))).toBe('123.45 600 000')
    expect(_renderText(formatBtc(1_000, PLAIN_FORMAT))).toBe('1,000.00 000 000')
    expect(_renderText(formatBtc(20999999.9769, PLAIN_FORMAT))).toBe('20,999,999.97 690 000')
    expect(_renderText(formatBtc(20999999.9769, PLAIN_FORMAT))).toBe('20,999,999.97 690 000')
    expect(_renderText(formatBtc(21000000, PLAIN_FORMAT))).toBe('21,000,000.00 000 000')
    expect(_renderText(formatBtc(21000000.0, PLAIN_FORMAT))).toBe('21,000,000.00 000 000')
    expect(_renderText(formatBtc(21000000.0, PLAIN_FORMAT))).toBe('21,000,000.00 000 000')
  })

  it('should format given value as amount in BTC and deemphasize insignificant chars', () => {
    const DEEMPHASIZE_FORMAT: FormatBtcProps = {
      spaceChar: ' ',
      deemphasize: (val) => `(${val})`, // render deemphasized chars as `(<char>)`
    }

    expect(_renderText(formatBtc(0, DEEMPHASIZE_FORMAT))).toBe('(0)(.)(0)(0) (0)(0)(0) (0)(0)(0)')
    expect(_renderText(formatBtc(0.00000001, DEEMPHASIZE_FORMAT))).toBe('(0)(.)(0)(0) (0)(0)(0) (0)(0)1')
    expect(_renderText(formatBtc(0.00000421, DEEMPHASIZE_FORMAT))).toBe('(0)(.)(0)(0) (0)(0)(0) 421')
    expect(_renderText(formatBtc(0.00043421, DEEMPHASIZE_FORMAT))).toBe('(0)(.)(0)(0) (0)43 421')
    expect(_renderText(formatBtc(0.02343421, DEEMPHASIZE_FORMAT))).toBe('(0)(.)(0)2 343 421')
    expect(_renderText(formatBtc(1, DEEMPHASIZE_FORMAT))).toBe('1(.)(0)(0) (0)(0)(0) (0)(0)(0)')
    expect(_renderText(formatBtc(1.22343421, DEEMPHASIZE_FORMAT))).toBe('1.(2)(2) (3)(4)(3) (4)(2)(1)')
    expect(_renderText(formatBtc(21000000, DEEMPHASIZE_FORMAT))).toBe('21,000,000(.)(0)(0) (0)(0)(0) (0)(0)(0)')
  })
})
