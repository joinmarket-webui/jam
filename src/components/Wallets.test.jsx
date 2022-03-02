import React from 'react'
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import { act } from 'react-dom/test-utils'

import { BrowserRouter } from 'react-router-dom'

import { SettingsProvider } from '../context/SettingsContext'
import { WalletProvider } from '../context/WalletContext'
import { WebsocketProvider } from '../context/WebsocketContext'

import Wallets from './Wallets'
import * as apiMock from '../libs/JmWalletApi'

jest.mock('../libs/JmWalletApi')

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

it('should render without errors', () => {
  apiMock.getWalletAll.mockResolvedValueOnce(new Promise((r) => setTimeout(r, 1_000)))

  act(() => {
    render(<Wallets />, {
      wrapper: AllTheProviders,
    })
  })

  expect(screen.getByText('Your wallets')).toBeInTheDocument()
  expect(screen.getByText('Loading wallets')).toBeInTheDocument()
  expect(screen.getByText('Create new wallet')).toBeInTheDocument()
})

it('should display error message when loading wallets fails', async () => {
  apiMock.getWalletAll.mockResolvedValueOnce({
    ok: false,
  })

  act(() => {
    render(<Wallets />, {
      wrapper: AllTheProviders,
    })
  })

  expect(screen.getByText('Loading wallets')).toBeInTheDocument()
  expect(screen.getByText('Create new wallet')).toBeInTheDocument()

  await waitForElementToBeRemoved(screen.getByText('Loading wallets'))

  expect(screen.getByText('Loading wallets failed.')).toBeInTheDocument()
  expect(screen.getByText('Create new wallet')).toBeInTheDocument()
})

it('should display big call-to-action button if no wallet has been created yet', async () => {
  apiMock.getWalletAll.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ wallets: [] }),
  })

  act(() => {
    render(<Wallets />, {
      wrapper: AllTheProviders,
    })
  })

  expect(screen.getByText('Loading wallets')).toBeInTheDocument()

  const callToActionButtonBefore = screen.getByText('Create new wallet')
  expect(callToActionButtonBefore.classList.contains('btn')).toBe(true)
  expect(callToActionButtonBefore.classList.contains('btn-lg')).toBe(false)

  await waitForElementToBeRemoved(screen.getByText('Loading wallets'))

  expect(screen.getByText('It looks like you do not have a wallet, yet.')).toBeInTheDocument()

  const callToActionButtonAfter = screen.getByText('Create new wallet')
  expect(callToActionButtonAfter.classList.contains('btn-lg')).toBe(true)
})

it('should display login for available wallets', async () => {
  apiMock.getWalletAll.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ wallets: ['wallet0.jmdat', 'wallet1.jmdat'] }),
  })

  act(() => {
    render(<Wallets />, {
      wrapper: AllTheProviders,
    })
  })

  expect(screen.getByText('Loading wallets')).toBeInTheDocument()
  await waitForElementToBeRemoved(screen.getByText('Loading wallets'))

  expect(screen.queryByText('It looks like you do not have a wallet, yet.')).not.toBeInTheDocument()

  expect(screen.getByText('wallet0')).toBeInTheDocument()
  expect(screen.getByText('wallet1')).toBeInTheDocument()

  const callToActionButton = screen.getByText('Create new wallet')
  expect(callToActionButton.classList.contains('btn')).toBe(true)
  expect(callToActionButton.classList.contains('btn-lg')).toBe(false)
})
