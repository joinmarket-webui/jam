import React from 'react'
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import user from '@testing-library/user-event'

import { BrowserRouter } from 'react-router-dom'

import { SettingsProvider } from '../context/SettingsContext'
import { WalletProvider } from '../context/WalletContext'
import { WebsocketProvider } from '../context/WebsocketContext'

import App from './App'

const AllTheProviders = ({ children }) => {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <WalletProvider>
          <WebsocketProvider>{children}</WebsocketProvider>
        </WalletProvider>
      </SettingsProvider>
    </BrowserRouter>
  )
}

const addToAppSettings = () => {
  global.localStorage.setItem(
    global.JM.SETTINGS_STORE_KEY,
    JSON.stringify(
      Object.assign({}, global.localStorage.getItem(global.JM.SETTINGS_STORE_KEY) || {}, {
        showOnboarding: false,
      })
    )
  )
}

it('should display Onboarding screen initially', () => {
  act(() => {
    render(<App />, {
      wrapper: AllTheProviders,
    })
  })

  // Onboarding screen
  expect(screen.getByText('Get started')).toBeInTheDocument()
  expect(screen.getByText('Skip intro')).toBeInTheDocument()

  // Wallets screen shown after Intro is skipped
  expect(screen.queryByText('Your wallets')).not.toBeInTheDocument()

  act(() => {
    const skipIntro = screen.getByText('Skip intro')
    user.click(skipIntro)
  })

  expect(screen.getByText('Your wallets')).toBeInTheDocument()
})

it('should display Wallets screen directly when Onboarding screen has been shown', () => {
  addToAppSettings({ showOnboarding: false })

  act(() => {
    render(<App />, {
      wrapper: AllTheProviders,
    })
  })

  // Wallets screen
  expect(screen.getByText('Your wallets')).toBeInTheDocument()
  expect(screen.getByText('Create new wallet')).toBeInTheDocument()

  // footer
  expect(screen.getByText('Docs')).toBeInTheDocument()
  expect(screen.getByText('Features')).toBeInTheDocument()
  expect(screen.getByText('GitHub')).toBeInTheDocument()
  expect(screen.getByText('Twitter')).toBeInTheDocument()
})

it('should display a modal with alpha warning information', () => {
  addToAppSettings({ showOnboarding: false })

  act(() => {
    render(<App />, {
      wrapper: AllTheProviders,
    })
  })

  expect(screen.getByText('Read this before using.')).toBeInTheDocument()
  expect(
    screen.queryByText(/While JoinMarket is tried and tested, this user interface is not./)
  ).not.toBeInTheDocument()

  act(() => {
    const readThis = screen.getByText('Read this before using.')
    user.click(readThis)
  })

  expect(screen.getByText(/While JoinMarket is tried and tested, this user interface is not./)).toBeInTheDocument()
  expect(screen.getByText('Fine with me.')).toBeInTheDocument()
})

it('should display a websocket connection indicator', async () => {
  addToAppSettings({ showOnboarding: false })

  act(() => {
    render(<App />, {
      wrapper: AllTheProviders,
    })
  })

  expect(screen.getByText('•').classList.contains('text-danger')).toBe(true)
  expect(screen.getByText('•').classList.contains('text-success')).toBe(false)
  expect(screen.getByText('Disconnected')).toBeInTheDocument()
  expect(screen.queryByText('Connected')).not.toBeInTheDocument()

  await global.JM_WEBSOCKET_SERVER_MOCK.connected

  expect(screen.queryByText('Disconnected')).not.toBeInTheDocument()
  expect(screen.getByText('Connected')).toBeInTheDocument()
  expect(screen.getByText('•').classList.contains('text-success')).toBe(true)
  expect(screen.getByText('•').classList.contains('text-danger')).toBe(false)
})
