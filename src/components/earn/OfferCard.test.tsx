import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OfferCard } from './OfferCard'

type Offer = NonNullable<SessionResponse['offer_list']>[number]

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  factorToPercentage: (val: number) => val * 100,
  isAbsoluteOffer: (type: string) => type === 'sw0abso',
  isRelativeOffer: (type: string) => type === 'sw0relo',
}))

vi.mock('../ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString?: string }) => <span data-testid="balance">{valueString}</span>,
}))

describe('OfferCard', () => {
  const baseOffer = {
    oid: 123,
    cjfee: '1000',
    txfee: '500',
    minsize: '10000',
    maxsize: '50000',
  } as unknown as Offer

  it('renders absolute offer', () => {
    const offer = { ...baseOffer, ordertype: 'sw0abso' }
    render(<OfferCard value={offer} nickname="JMBot" />)

    expect(screen.getByText('earn.current.text_offer')).toBeInTheDocument()
    expect(screen.getByText('earn.current.text_offer_type_absolute')).toBeInTheDocument()
    expect(screen.getByText('JMBot:123')).toBeInTheDocument()

    // Check balances
    const balances = screen.getAllByTestId('balance')
    expect(balances[0]).toHaveTextContent('1000') // cjfee
    expect(balances[1]).toHaveTextContent('10000') // minsize
    expect(balances[2]).toHaveTextContent('50000') // maxsize
    expect(balances[3]).toHaveTextContent('500') // txfee
  })

  it('renders relative offer', () => {
    const offer = { ...baseOffer, ordertype: 'sw0relo', cjfee: '0.005' }
    render(<OfferCard value={offer} nickname="JMBot" />)

    expect(screen.getByText('earn.current.text_offer_type_relative')).toBeInTheDocument()
    // Relative fee should be percentage
    expect(screen.getByText('0.5%')).toBeInTheDocument()
  })

  it('renders other offer type', () => {
    const offer = { ...baseOffer, ordertype: 'sw0x' }
    render(<OfferCard value={offer} nickname="JMBot" />)

    expect(screen.getByText('sw0x')).toBeInTheDocument()
  })

  it('renders without txfee', () => {
    const offer = { ...baseOffer, ordertype: 'sw0abso', txfee: undefined }
    render(<OfferCard value={offer} nickname="JMBot" />)

    expect(screen.queryByText('earn.current.text_txfee')).not.toBeInTheDocument()
  })

  it('renders children', () => {
    render(
      <OfferCard value={baseOffer} nickname="JMBot">
        <div data-testid="child">Child Content</div>
      </OfferCard>,
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})
