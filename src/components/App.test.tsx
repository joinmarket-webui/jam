import { render, screen, act } from '../testUtils'
import user from '@testing-library/user-event'
import * as apiMock from '../libs/JmWalletApi'
import * as loadersMock from './loaders/DataLoaders'

import App from './App'

jest.mock('./loaders/DataLoaders', () => ({
  ...jest.requireActual('./loaders/DataLoaders'),
  allWalletsLoader: jest.fn(),
}))

jest.mock('../libs/JmWalletApi', () => ({
  ...jest.requireActual('../libs/JmWalletApi'),
  getGetinfo: jest.fn(),
  getSession: jest.fn(),
}))

describe('<App />', () => {
  beforeEach(() => {
    const neverResolvingPromise = new Promise(() => {})
    ;(apiMock.getGetinfo as jest.Mock).mockResolvedValue(neverResolvingPromise)
    ;(apiMock.getSession as jest.Mock).mockResolvedValue(neverResolvingPromise)
    ;(loadersMock.allWalletsLoader as jest.Mock).mockReturnValue(
      Promise.resolve({
        ok: true,
        wallets: [],
      }),
    )
  })

  it('should display Onboarding screen initially', async () => {
    await act(async () => render(<App />))

    // Onboarding screen
    expect(screen.getByText('onboarding.splashscreen_button_get_started')).toBeInTheDocument()
    expect(screen.getByText('onboarding.splashscreen_button_skip_intro')).toBeInTheDocument()

    // Wallets screen shown after Intro is skipped
    expect(screen.queryByText('wallets.title')).not.toBeInTheDocument()

    const skipIntro = screen.getByText('onboarding.splashscreen_button_skip_intro')
    await user.click(skipIntro)

    expect(screen.getByText('wallets.title')).toBeInTheDocument()
  })

  it('should display Wallets screen directly when Onboarding screen has been shown', async () => {
    global.__DEV__.addToAppSettings({ showOnboarding: false })

    await act(async () => render(<App />))

    // Wallets screen
    expect(screen.getByText('wallets.title')).toBeInTheDocument()
    expect(screen.getByText('wallets.button_new_wallet')).toBeInTheDocument()
  })

  it('should display a modal with beta warning information', async () => {
    global.__DEV__.addToAppSettings({ showOnboarding: false })

    await act(async () => render(<App />))

    expect(screen.getByText('Read this before using.')).toBeInTheDocument()
    expect(screen.queryByText(/While JoinMarket is tried and tested, Jam is not./)).not.toBeInTheDocument()

    const readThis = screen.getByText('Read this before using.')
    await user.click(readThis)

    expect(screen.getByText('footer.warning_alert_text')).toBeInTheDocument()
    expect(screen.getByText('footer.warning_alert_button_ok')).toBeInTheDocument()
  })

  it('should display websocket connection indicator as CONNECTED', async () => {
    global.__DEV__.addToAppSettings({ showOnboarding: false })

    await act(async () => {
      render(<App />)
    })

    await global.__DEV__.JM_WEBSOCKET_SERVER_MOCK.connected

    expect(screen.getByTestId('connection-indicator-icon').classList.contains('text-success')).toBe(true)
    expect(screen.getByTestId('connection-indicator-icon').classList.contains('text-secondary')).toBe(false)
  })

  it('should display websocket connection indicator AS DISCONNECTED', async () => {
    global.__DEV__.addToAppSettings({ showOnboarding: false })

    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      global.__DEV__.JM_WEBSOCKET_SERVER_MOCK.close()
    })

    expect(screen.getByTestId('connection-indicator-icon').classList.contains('text-success')).toBe(false)
    expect(screen.getByTestId('connection-indicator-icon').classList.contains('text-secondary')).toBe(true)
  })
})
