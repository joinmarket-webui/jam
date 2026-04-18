import { BrowserRouter } from 'react-router-dom'
import { act, render, screen, waitFor } from '../../testUtils'
import Send from './index'
import * as apiMock from '../../libs/JmWalletApi'

jest.mock('../../libs/JmWalletApi', () => ({
  ...jest.requireActual('../../libs/JmWalletApi'),
  getWalletDisplay: jest.fn(),
  getWalletUtxos: jest.fn(),
  postCoinjoin: jest.fn(),
  postDirectSend: jest.fn(),
  postConfigGet: jest.fn(),
  getSession: jest.fn(),
  getGetinfo: jest.fn(),
}))

const neverResolves = new Promise(() => {})

const mockWallet = { walletFileName: 'test.jmdat' as any, token: 'mock-token' }

const setup = () =>
  render(
    <BrowserRouter>
      <Send wallet={mockWallet as any} />
    </BrowserRouter>,
  )

describe('<Send />', () => {
  beforeEach(() => {
    ;(apiMock.getWalletDisplay as jest.Mock).mockReturnValue(neverResolves)
    ;(apiMock.getWalletUtxos as jest.Mock).mockReturnValue(neverResolves)
    ;(apiMock.postConfigGet as jest.Mock).mockReturnValue(neverResolves)
    ;(apiMock.getSession as jest.Mock).mockReturnValue(neverResolves)
    ;(apiMock.getGetinfo as jest.Mock).mockReturnValue(neverResolves)
  })

  it('renders without crashing', async () => {
    await act(async () => {
      setup()
    })
    // PageTitle renders a div with the i18n key as text (empty translations in test env)
    expect(screen.getByText('send.title')).toBeInTheDocument()
  })

  it('shows loading state while fetching wallet info', async () => {
    await act(async () => {
      setup()
    })
    // SendForm destination input not shown while wallet info is loading
    // (DestinationInputField uses aria-label={label} where label = t('send.label_recipient'))
    expect(screen.queryByRole('textbox', { name: /send\.label_recipient/i })).not.toBeInTheDocument()
  })
})
