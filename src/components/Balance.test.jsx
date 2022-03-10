import React from 'react'
import { render, screen } from '../testUtils'
import { BTC, SATS } from '../utils'

import Balance from './Balance'

describe('<Balance />', () => {
  it('should hide balance for BTC by default', () => {
    render(<Balance value={'123.456'} unit={BTC} />)
    expect(screen.getByText(`*****`)).toBeInTheDocument()
    expect(screen.queryByText(`123.45 600 000`)).not.toBeInTheDocument()
  })

  it('should hide balance for SATS by default', () => {
    render(<Balance value={'123'} unit={SATS} />)
    expect(screen.getByText(`*****`)).toBeInTheDocument()
    expect(screen.queryByText(`123`)).not.toBeInTheDocument()
  })

  it('should render a string BTC value correctly as BTC', () => {
    render(<Balance value={'123.03224961'} unit={BTC} showBalance={true} />)
    expect(screen.getByText(`123.03 224 961`)).toBeInTheDocument()
  })

  it('should render a string BTC value correctly as SATS', () => {
    render(<Balance value={'123.03224961'} unit={SATS} showBalance={true} />)
    expect(screen.getByText(`12,303,224,961`)).toBeInTheDocument()
  })

  it('should render a number BTC value correctly as BTC', () => {
    render(<Balance value={123.03224961} unit={BTC} showBalance={true} />)
    expect(screen.getByText(`123.03 224 961`)).toBeInTheDocument()
  })

  it('should render a number BTC value correctly as SATS', () => {
    render(<Balance value={123.03224961} unit={SATS} showBalance={true} />)
    expect(screen.getByText(`12,303,224,961`)).toBeInTheDocument()
  })

  it('should render a string SATS value correctly as SATS', () => {
    render(<Balance value={'43000'} unit={SATS} showBalance={true} />)
    expect(screen.getByText(`43,000`)).toBeInTheDocument()
  })

  it('should render a string SATS value correctly as BTC', () => {
    render(<Balance value={'43000'} unit={BTC} showBalance={true} />)
    expect(screen.getByText(`0.00 043 000`)).toBeInTheDocument()
  })

  it('should render a number SATS value correctly as SATS', () => {
    render(<Balance value={43000} unit={SATS} showBalance={true} />)
    expect(screen.getByText(`43,000`)).toBeInTheDocument()
  })

  it('should render a number SATS value correctly as BTC', () => {
    render(<Balance value={43000} unit={BTC} showBalance={true} />)
    expect(screen.getByText(`0.00 043 000`)).toBeInTheDocument()
  })

  it('should render BTC with 8 fractional digits', () => {
    render(<Balance value={'123.456'} unit={BTC} showBalance={true} />)
    expect(screen.getByText(`123.45 600 000`)).toBeInTheDocument()
  })

  it('should have a fallback for BTC', () => {
    render(<Balance value={'123,456'} unit={BTC} showBalance={true} />)
    expect(screen.getByText('123,456')).toBeInTheDocument()
    expect(screen.getByText('BTC')).toBeInTheDocument()
  })

  it('should have a fallback for SATS', () => {
    render(<Balance value={'123,456'} unit={SATS} showBalance={true} />)
    expect(screen.getByText('123,456')).toBeInTheDocument()
    expect(screen.getByText('sats')).toBeInTheDocument()
  })
})
