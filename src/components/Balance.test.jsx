import React from 'react'
import { render, screen } from '../testUtils'
import { BTC, SATS } from '../utils'

import Balance from './Balance'

describe('<Balance />', () => {
  it('should render BTC using satscomma formatting', () => {
    render(<Balance valueString={'123.456'} convertToUnit={BTC} showBalance={true} />)
    expect(screen.getByText(`123.45 600 000`)).toBeInTheDocument()
  })

  it('should hide balance for BTC by default', () => {
    render(<Balance valueString={'123.456'} convertToUnit={BTC} />)
    expect(screen.getByText(`*****`)).toBeInTheDocument()
    expect(screen.queryByText(`123.45 600 000`)).not.toBeInTheDocument()
  })

  it('should hide balance for SATS by default', () => {
    render(<Balance valueString={'123'} convertToUnit={SATS} />)
    expect(screen.getByText(`*****`)).toBeInTheDocument()
    expect(screen.queryByText(`123`)).not.toBeInTheDocument()
  })

  it('should render a string BTC value correctly as BTC', () => {
    render(<Balance valueString={'123.03224961'} convertToUnit={BTC} showBalance={true} />)
    expect(screen.getByText(`123.03 224 961`)).toBeInTheDocument()
  })

  it('should render a string BTC value correctly as SATS', () => {
    render(<Balance valueString={'123.03224961'} convertToUnit={SATS} showBalance={true} />)
    expect(screen.getByText(`12,303,224,961`)).toBeInTheDocument()
  })

  it('should render a zero string BTC value correctly as BTC', () => {
    render(<Balance valueString={'0.00000000'} convertToUnit={BTC} showBalance={true} />)
    expect(screen.getByText(`0.00 000 000`)).toBeInTheDocument()
  })

  it('should render a zero string BTC value correctly as SATS', () => {
    render(<Balance valueString={'0.00000000'} convertToUnit={SATS} showBalance={true} />)
    expect(screen.getByText(`0`)).toBeInTheDocument()
  })

  it('should render a large string BTC value correctly as BTC', () => {
    render(<Balance valueString={'20999999.97690000'} convertToUnit={BTC} showBalance={true} />)
    expect(screen.getByText(`20,999,999.97 690 000`)).toBeInTheDocument()
  })

  it('should render a large string BTC value correctly as SATS', () => {
    render(<Balance valueString={'20999999.97690000'} convertToUnit={SATS} showBalance={true} />)
    expect(screen.getByText(`2,099,999,997,690,000`)).toBeInTheDocument()
  })

  it('should render a max string BTC value correctly as BTC', () => {
    render(<Balance valueString={'21000000.00000000'} convertToUnit={BTC} showBalance={true} />)
    expect(screen.getByText(`21,000,000.00 000 000`)).toBeInTheDocument()
  })

  it('should render a max string BTC value correctly as SATS', () => {
    render(<Balance valueString={'21000000.00000000'} convertToUnit={SATS} showBalance={true} />)
    expect(screen.getByText(`2,100,000,000,000,000`)).toBeInTheDocument()
  })

  it('should render a number BTC value as fallback', () => {
    render(<Balance valueString={123.456} convertToUnit={BTC} showBalance={true} />)
    expect(screen.getByText(`123.456`)).toBeInTheDocument()
  })

  it('should render a string SATS value correctly as SATS', () => {
    render(<Balance valueString={'43000'} convertToUnit={SATS} showBalance={true} />)
    expect(screen.getByText(`43,000`)).toBeInTheDocument()
  })

  it('should render a string SATS value correctly as BTC', () => {
    render(<Balance valueString={'43000'} convertToUnit={BTC} showBalance={true} />)
    expect(screen.getByText(`0.00 043 000`)).toBeInTheDocument()
  })

  it('should render a zero string SATS value correctly as BTC', () => {
    render(<Balance valueString={'0'} convertToUnit={BTC} showBalance={true} />)
    expect(screen.getByText(`0.00 000 000`)).toBeInTheDocument()
  })

  it('should render a zero string SATS value correctly as SATS', () => {
    render(<Balance valueString={'0'} convertToUnit={SATS} showBalance={true} />)
    expect(screen.getByText(`0`)).toBeInTheDocument()
  })

  it('should render a large string SATS value correctly as BTC', () => {
    render(<Balance valueString={'2099999997690000'} convertToUnit={BTC} showBalance={true} />)
    expect(screen.getByText(`20,999,999.97 690 000`)).toBeInTheDocument()
  })

  it('should render a large string SATS value correctly as SATS', () => {
    render(<Balance valueString={'2099999997690000'} convertToUnit={SATS} showBalance={true} />)
    expect(screen.getByText(`2,099,999,997,690,000`)).toBeInTheDocument()
  })

  it('should render a max string SATS value correctly as BTC', () => {
    render(<Balance valueString={'2100000000000000'} convertToUnit={BTC} showBalance={true} />)
    expect(screen.getByText(`21,000,000.00 000 000`)).toBeInTheDocument()
  })

  it('should render a max string SATS value correctly as SATS', () => {
    render(<Balance valueString={'2100000000000000'} convertToUnit={SATS} showBalance={true} />)
    expect(screen.getByText(`2,100,000,000,000,000`)).toBeInTheDocument()
  })

  it('should render a number SATS value as fallback', () => {
    render(<Balance valueString={43000} convertToUnit={SATS} showBalance={true} />)
    expect(screen.getByText(`43000`)).toBeInTheDocument()
  })
})
