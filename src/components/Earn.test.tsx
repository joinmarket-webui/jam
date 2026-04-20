import { BrowserRouter } from 'react-router-dom'
import { act, render, screen } from '../testUtils'
import Earn, { toStartMakerRequest, EarnFormValues } from './Earn'
import * as apiMock from '../libs/JmWalletApi'
import type { AmountValue } from './BitcoinAmountInput'

jest.mock('../libs/JmWalletApi', () => ({
  ...jest.requireActual('../libs/JmWalletApi'),
  getGetinfo: jest.fn(),
  getSession: jest.fn(),
  getWalletDisplay: jest.fn(),
  getWalletUtxos: jest.fn(),
  postMakerStart: jest.fn(),
  getMakerStop: jest.fn(),
  postConfigGet: jest.fn(),
}))

const neverResolves = new Promise(() => {})

const mockWallet = { walletFileName: 'test.jmdat' as any, token: 'mock-token' }

const setup = () =>
  render(
    <BrowserRouter>
      <Earn wallet={mockWallet as any} />
    </BrowserRouter>,
  )

describe('<Earn />', () => {
  beforeEach(() => {
    ;(apiMock.getGetinfo as jest.Mock).mockReturnValue(neverResolves)
    ;(apiMock.getSession as jest.Mock).mockReturnValue(neverResolves)
    ;(apiMock.getWalletDisplay as jest.Mock).mockReturnValue(neverResolves)
    ;(apiMock.getWalletUtxos as jest.Mock).mockReturnValue(neverResolves)
    ;(apiMock.postConfigGet as jest.Mock).mockReturnValue(neverResolves)
  })

  it('renders without crashing', async () => {
    await act(async () => {
      setup()
    })
    expect(screen.getByText('earn.title')).toBeInTheDocument()
  })

  it('shows start button when maker is not running', async () => {
    await act(async () => {
      setup()
    })
    // When context reports makerRunning=false (default), start button visible
    expect(screen.getByRole('button', { name: 'earn.button_start' })).toBeInTheDocument()
  })
})

const makeAmountValue = (value: number): AmountValue => ({ value, isSweep: false })

const relValues: EarnFormValues = {
  offertype: 'sw0reloffer',
  feeRel: 0.0003,
  feeAbs: makeAmountValue(250),
  minsize: makeAmountValue(100_000),
}

const absValues: EarnFormValues = {
  offertype: 'sw0absoffer',
  feeRel: 0.0003,
  feeAbs: makeAmountValue(250),
  minsize: makeAmountValue(100_000),
}

describe('toStartMakerRequest', () => {
  it('relative offer: sets cjfee_r from feeRel, zeroes cjfee_a', () => {
    const req = toStartMakerRequest(relValues)
    expect(req.cjfee_r).toBe(0.0003)
    expect(req.cjfee_a).toBe(0)
    expect(req.ordertype).toBe('sw0reloffer')
    expect(req.minsize).toBe(100_000)
  })

  it('absolute offer: sets cjfee_a from feeAbs.value, zeroes cjfee_r', () => {
    const req = toStartMakerRequest(absValues)
    expect(req.cjfee_a).toBe(250)
    expect(req.cjfee_r).toBe(0)
    expect(req.ordertype).toBe('sw0absoffer')
    expect(req.minsize).toBe(100_000)
  })

  it('both fee properties always present in the returned request', () => {
    const relReq = toStartMakerRequest(relValues)
    expect(relReq.cjfee_a).toBeDefined()
    expect(relReq.cjfee_r).toBeDefined()

    const absReq = toStartMakerRequest(absValues)
    expect(absReq.cjfee_a).toBeDefined()
    expect(absReq.cjfee_r).toBeDefined()
  })

  it('ordertype and minsize pass through unchanged for both offer types', () => {
    const relReq = toStartMakerRequest(relValues)
    expect(relReq.ordertype).toBe(relValues.offertype)
    expect(relReq.minsize).toBe(relValues.minsize!.value)

    const absReq = toStartMakerRequest(absValues)
    expect(absReq.ordertype).toBe(absValues.offertype)
    expect(absReq.minsize).toBe(absValues.minsize!.value)
  })
})
