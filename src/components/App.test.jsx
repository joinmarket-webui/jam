import React from 'react'
import { render, screen } from '@testing-library/react'
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

it('Display Onboarding screen initially', () => {
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

it('Display Wallets screen after Onboarding screen', () => {
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

it('Alpha warning modal can be displayed', () => {
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
