import { BrowserRouter } from 'react-router-dom'
import { act, render, screen } from '../testUtils'
import Earn from './Earn'
import * as apiMock from '../libs/JmWalletApi'

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
