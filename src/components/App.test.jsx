import React from 'react'
import { render, screen } from '../testUtils'
import { act } from 'react-dom/test-utils'
import user from '@testing-library/user-event'

import App from './App'

describe('<App />', () => {
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

    // footer
    expect(screen.getByText('footer.docs')).toBeInTheDocument()
    expect(screen.getByText('footer.features')).toBeInTheDocument()
    expect(screen.getByText('footer.github')).toBeInTheDocument()
    expect(screen.getByText('footer.twitter')).toBeInTheDocument()
  })

  it('should display a modal with alpha warning information', () => {
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
    expect(screen.getByText('footer.disconnected')).toBeInTheDocument()
    expect(screen.queryByText('footer.connected')).not.toBeInTheDocument()

    await global.__DEV__.JM_WEBSOCKET_SERVER_MOCK.connected

    expect(screen.queryByText('footer.disconnected')).not.toBeInTheDocument()
    expect(screen.getByText('footer.connected')).toBeInTheDocument()
    expect(screen.getByTestId('connection-indicator-icon').classList.contains('text-success')).toBe(true)
    expect(screen.getByTestId('connection-indicator-icon').classList.contains('text-danger')).toBe(false)
  })
})
