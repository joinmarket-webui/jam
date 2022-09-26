import { render, screen } from '../testUtils'
import { act } from 'react-dom/test-utils'
import user from '@testing-library/user-event'
import * as apiMock from '../libs/JmWalletApi'

import App from './App'

jest.mock('../libs/JmWalletApi', () => ({
  ...jest.requireActual('../libs/JmWalletApi'),
  getSession: jest.fn(),
}))

describe('<App />', () => {
  beforeEach(() => {
    const neverResolvingPromise = new Promise(() => {})
    ;(apiMock.getSession as jest.Mock).mockResolvedValue(neverResolvingPromise)
  })

  it('should display Onboarding screen initially', () => {
    render(<App />)

    // Onboarding screen
    expect(screen.getByText('onboarding.splashscreen_button_get_started')).toBeInTheDocument()
    expect(screen.getByText('onboarding.splashscreen_button_skip_intro')).toBeInTheDocument()

    // Wallets screen shown after Intro is skipped
    expect(screen.queryByText('wallets.title')).not.toBeInTheDocument()

    act(() => {
      const skipIntro = screen.getByText('onboarding.splashscreen_button_skip_intro')
      user.click(skipIntro)
    })

    expect(screen.getByText('wallets.title')).toBeInTheDocument()
  })

  it('should display Wallets screen directly when Onboarding screen has been shown', () => {
    global.__DEV__.addToAppSettings({ showOnboarding: false })

    act(() => {
      render(<App />)
    })

    // Wallets screen
    expect(screen.getByText('wallets.title')).toBeInTheDocument()
    expect(screen.getByText('wallets.button_new_wallet')).toBeInTheDocument()
  })

  it('should display a modal with beta warning information', () => {
    global.__DEV__.addToAppSettings({ showOnboarding: false })

    act(() => {
      render(<App />)
    })

    expect(screen.getByText('Read this before using.')).toBeInTheDocument()
    expect(screen.queryByText(/While JoinMarket is tried and tested, Jam is not./)).not.toBeInTheDocument()

    act(() => {
      const readThis = screen.getByText('Read this before using.')
      user.click(readThis)
    })

    expect(screen.getByText('footer.warning_alert_text')).toBeInTheDocument()
    expect(screen.getByText('footer.warning_alert_button_ok')).toBeInTheDocument()
  })

  it('should display a websocket connection indicator', async () => {
    global.__DEV__.addToAppSettings({ showOnboarding: false })

    act(() => {
      render(<App />)
    })

    expect(screen.getByTestId('connection-indicator-icon').classList.contains('text-danger')).toBe(true)
    expect(screen.getByTestId('connection-indicator-icon').classList.contains('text-success')).toBe(false)

    await global.__DEV__.JM_WEBSOCKET_SERVER_MOCK.connected

    expect(screen.getByTestId('connection-indicator-icon').classList.contains('text-success')).toBe(true)
    expect(screen.getByTestId('connection-indicator-icon').classList.contains('text-danger')).toBe(false)
  })
})
