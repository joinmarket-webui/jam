import { render } from '@testing-library/react'
import user from '@testing-library/user-event'
import { act } from 'react-dom/test-utils'
import { screen } from '../testUtils'
import { BTC, SATS } from '../utils'
import Balance from './Balance'

describe('<Balance />', () => {
  it('should render invalid param as given', () => {
    render(<Balance valueString={'NaN'} convertToUnit={BTC} showBalance={true} />)
    expect(screen.getByText(`NaN`)).toBeInTheDocument()
  })

  it('should render balance in BTC', () => {
    render(<Balance valueString={'123.456'} convertToUnit={BTC} showBalance={true} />)
    expect(screen.getByTestId('bitcoin-amount').dataset.formattedValue).toBe(`123.45600000`)
    expect(screen.getByTestId('bitcoin-symbol')).toBeVisible()
    expect(screen.queryByTestId('sats-symbol')).not.toBeInTheDocument()
    expect(screen.queryByTestId('frozen-symbol')).not.toBeInTheDocument()
  })

  it('should render balance in SATS', () => {
    render(<Balance valueString={'123.456'} convertToUnit={SATS} showBalance={true} />)
    expect(screen.getByTestId('sats-amount')).toHaveTextContent(`12,345,600,000`)
    expect(screen.getByTestId('sats-symbol')).toBeVisible()
    expect(screen.queryByTestId('bitcoin-symbol')).not.toBeInTheDocument()
    expect(screen.queryByTestId('frozen-symbol')).not.toBeInTheDocument()
  })

  it('should hide balance for BTC by default', () => {
    render(<Balance valueString={'123.456'} convertToUnit={BTC} />)
    expect(screen.getByText(`*****`)).toBeInTheDocument()
    expect(screen.queryByTestId('bitcoin-amount')).not.toBeInTheDocument()
    expect(screen.queryByTestId('bitcoin-symbol')).not.toBeInTheDocument()
  })

  it('should hide balance for SATS by default', () => {
    render(<Balance valueString={'123'} convertToUnit={SATS} />)
    expect(screen.getByText(`*****`)).toBeInTheDocument()
    expect(screen.queryByTestId(`sats-amount`)).not.toBeInTheDocument()
    expect(screen.queryByTestId('sats-symbol')).not.toBeInTheDocument()
  })

  it('should render a string BTC value correctly as BTC', () => {
    render(<Balance valueString={'123.03224961'} convertToUnit={BTC} showBalance={true} />)
    expect(screen.getByTestId('bitcoin-amount').dataset.formattedValue).toBe(`123.03224961`)
    expect(screen.getByTestId('bitcoin-symbol')).toBeVisible()
  })

  it('should render a string BTC value correctly as SATS', () => {
    render(<Balance valueString={'123.03224961'} convertToUnit={SATS} showBalance={true} />)
    expect(screen.getByTestId(`sats-amount`)).toHaveTextContent(`12,303,224,961`)
    expect(screen.getByTestId('sats-symbol')).toBeVisible()
  })

  it('should render a zero string BTC value correctly as BTC', () => {
    render(<Balance valueString={'0.00000000'} convertToUnit={BTC} showBalance={true} />)
    expect(screen.getByTestId('bitcoin-amount').dataset.formattedValue).toBe(`0.00000000`)
  })

  it('should render a zero string BTC value correctly as SATS', () => {
    render(<Balance valueString={'0.00000000'} convertToUnit={SATS} showBalance={true} />)
    expect(screen.getByTestId(`sats-amount`)).toHaveTextContent(`0`)
  })

  it('should render a large string BTC value correctly as BTC', () => {
    render(<Balance valueString={'20999999.97690000'} convertToUnit={BTC} showBalance={true} />)
    expect(screen.getByTestId('bitcoin-amount').dataset.formattedValue).toBe(`20,999,999.97690000`)
  })

  it('should render a large string BTC value correctly as SATS', () => {
    render(<Balance valueString={'20999999.97690000'} convertToUnit={SATS} showBalance={true} />)
    expect(screen.getByTestId(`sats-amount`)).toHaveTextContent(`2,099,999,997,690,000`)
  })

  it('should render a max string BTC value correctly as BTC', () => {
    render(<Balance valueString={'21000000.00000000'} convertToUnit={BTC} showBalance={true} />)
    expect(screen.getByTestId('bitcoin-amount').dataset.formattedValue).toBe(`21,000,000.00000000`)
  })

  it('should render a max string BTC value correctly as SATS', () => {
    render(<Balance valueString={'21000000.00000000'} convertToUnit={SATS} showBalance={true} />)
    expect(screen.getByTestId(`sats-amount`)).toHaveTextContent(`2,100,000,000,000,000`)
  })

  it('should render a string SATS value correctly as SATS', () => {
    render(<Balance valueString={'43000'} convertToUnit={SATS} showBalance={true} />)
    expect(screen.getByTestId(`sats-amount`)).toHaveTextContent(`43,000`)
  })

  it('should render a string SATS value correctly as BTC', () => {
    render(<Balance valueString={'43000'} convertToUnit={BTC} showBalance={true} />)
    expect(screen.getByTestId('bitcoin-amount').dataset.formattedValue).toBe(`0.00043000`)
  })

  it('should render a zero string SATS value correctly as BTC', () => {
    render(<Balance valueString={'0'} convertToUnit={BTC} showBalance={true} />)
    expect(screen.getByTestId('bitcoin-amount').dataset.formattedValue).toBe(`0.00000000`)
  })

  it('should render a zero string SATS value correctly as SATS', () => {
    render(<Balance valueString={'0'} convertToUnit={SATS} showBalance={true} />)
    expect(screen.getByTestId(`sats-amount`)).toHaveTextContent(`0`)
  })

  it('should render a large string SATS value correctly as BTC', () => {
    render(<Balance valueString={'2099999997690000'} convertToUnit={BTC} showBalance={true} />)
    expect(screen.getByTestId('bitcoin-amount').dataset.formattedValue).toBe(`20,999,999.97690000`)
  })

  it('should render a large string SATS value correctly as SATS', () => {
    render(<Balance valueString={'2099999997690000'} convertToUnit={SATS} showBalance={true} />)
    expect(screen.getByTestId(`sats-amount`)).toHaveTextContent(`2,099,999,997,690,000`)
  })

  it('should render a max string SATS value correctly as BTC', () => {
    render(<Balance valueString={'2100000000000000'} convertToUnit={BTC} showBalance={true} />)
    expect(screen.getByTestId('bitcoin-amount').dataset.formattedValue).toBe(`21,000,000.00000000`)
  })

  it('should render a max string SATS value correctly as SATS', () => {
    render(<Balance valueString={'2100000000000000'} convertToUnit={SATS} showBalance={true} />)
    expect(screen.getByTestId(`sats-amount`)).toHaveTextContent(`2,100,000,000,000,000`)
  })

  it('should render frozen balance in BTC', () => {
    render(<Balance valueString={'123.456'} convertToUnit={BTC} showBalance={true} frozen={true} />)
    expect(screen.getByTestId('bitcoin-amount').dataset.formattedValue).toBe(`123.45600000`)
    expect(screen.getByTestId('bitcoin-symbol')).toBeVisible()
    expect(screen.getByTestId('frozen-symbol')).toBeVisible()
  })

  it('should render frozen balance in SATS', () => {
    render(<Balance valueString={'123.456'} convertToUnit={SATS} showBalance={true} frozen={true} />)
    expect(screen.getByTestId('sats-amount')).toHaveTextContent(`12,345,600,000`)
    expect(screen.getByTestId('sats-symbol')).toBeVisible()
    expect(screen.getByTestId('frozen-symbol')).toBeVisible()
  })

  it('should render balance without symbol', () => {
    render(<Balance valueString={'123.456'} convertToUnit={SATS} showBalance={true} frozen={true} showSymbol={false} />)
    expect(screen.getByTestId('sats-amount')).toBeVisible()
    expect(screen.getByTestId('frozen-symbol')).toBeVisible()
    expect(screen.queryByTestId('sats-symbol')).not.toBeInTheDocument()
  })

  it('should toggle visibility of initially hidden balance on click by default', async () => {
    render(<Balance valueString={`21`} convertToUnit={SATS} showBalance={false} />)
    expect(screen.queryByTestId(`sats-amount`)).not.toBeInTheDocument()
    expect(screen.getByText(`*****`)).toBeInTheDocument()

    await act(async () => {
      await user.click(screen.getByText(`*****`))
    })

    expect(screen.getByTestId(`sats-amount`)).toBeInTheDocument()
    expect(screen.queryByText(`*****`)).not.toBeInTheDocument()

    await act(async () => {
      await user.click(screen.getByTestId(`sats-amount`))
    })

    expect(screen.queryByTestId(`sats-amount`)).not.toBeInTheDocument()
    expect(screen.getByText(`*****`)).toBeInTheDocument()
  })

  it('should NOT toggle visibility of initially hidden balance on click when disabled via flag', async () => {
    render(<Balance valueString={`21`} convertToUnit={SATS} showBalance={false} enableVisibilityToggle={false} />)
    expect(screen.queryByTestId(`sats-amount`)).not.toBeInTheDocument()
    expect(screen.getByText(`*****`)).toBeInTheDocument()

    await act(async () => {
      await user.click(screen.getByText(`*****`))
    })

    expect(screen.queryByTestId(`sats-amount`)).not.toBeInTheDocument()
    expect(screen.getByText(`*****`)).toBeInTheDocument()
  })

  it('should NOT toggle visibility of initially visible balance on click by default', async () => {
    render(<Balance valueString={`21`} convertToUnit={SATS} showBalance={true} />)
    expect(screen.getByTestId(`sats-amount`)).toBeInTheDocument()
    expect(screen.queryByText(`*****`)).not.toBeInTheDocument()

    await act(async () => {
      await user.click(screen.getByTestId(`sats-amount`))
    })

    expect(screen.getByTestId(`sats-amount`)).toBeInTheDocument()
    expect(screen.queryByText(`*****`)).not.toBeInTheDocument()
  })

  it('should toggle visibility of initially visible balance on click when enabled via flag', async () => {
    render(<Balance valueString={`21`} convertToUnit={SATS} showBalance={true} enableVisibilityToggle={true} />)
    expect(screen.getByTestId(`sats-amount`)).toBeInTheDocument()
    expect(screen.queryByText(`*****`)).not.toBeInTheDocument()

    await act(async () => {
      await user.click(screen.getByTestId(`sats-amount`))
    })

    expect(screen.queryByTestId(`sats-amount`)).not.toBeInTheDocument()
    expect(screen.getByText(`*****`)).toBeInTheDocument()

    await act(async () => {
      await user.click(screen.getByText(`*****`))
    })

    expect(screen.getByTestId(`sats-amount`)).toBeInTheDocument()
    expect(screen.queryByText(`*****`)).not.toBeInTheDocument()
  })
})
