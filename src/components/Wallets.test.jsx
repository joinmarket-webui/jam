import React from 'react'
import { render, screen, waitForElementToBeRemoved } from '../testUtils'
import { act } from 'react-dom/test-utils'

import * as apiMock from '../libs/JmWalletApi'

import Wallets from './Wallets'

jest.mock('../libs/JmWalletApi', () => ({
  ...jest.requireActual('../libs/JmWalletApi'),
  getSession: jest.fn(),
  getWalletAll: jest.fn(),
}))

describe('<Wallets />', () => {
  const setup = () => {
    render(<Wallets />)
  }

  beforeEach(() => {
    const neverResolvingPromise = new Promise(() => {})
    apiMock.getSession.mockResolvedValue(neverResolvingPromise)
  })

  it('should render without errors', () => {
    const neverResolvingPromise = new Promise(() => {})
    apiMock.getSession.mockResolvedValueOnce(neverResolvingPromise)
    apiMock.getWalletAll.mockResolvedValueOnce(neverResolvingPromise)

    act(setup)

    expect(screen.getByText('wallets.title')).toBeInTheDocument()
    expect(screen.getByText('wallets.text_loading')).toBeInTheDocument()
    expect(screen.getByText('wallets.button_new_wallet')).toBeInTheDocument()
  })

  it('should display error message when loading wallets fails', async () => {
    apiMock.getSession.mockResolvedValueOnce({
      ok: false,
    })
    apiMock.getWalletAll.mockResolvedValueOnce({
      ok: false,
    })

    act(setup)

    expect(screen.getByText('wallets.title')).toBeInTheDocument()
    expect(screen.getByText('wallets.button_new_wallet')).toBeInTheDocument()

    await waitForElementToBeRemoved(screen.getByText('wallets.text_loading'))

    expect(screen.getByText('wallets.error_loading_failed')).toBeInTheDocument()
    expect(screen.getByText('wallets.button_new_wallet')).toBeInTheDocument()
  })

  it('should display big call-to-action button if no wallet has been created yet', async () => {
    apiMock.getSession.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          session: false,
          maker_running: false,
          coinjoin_in_process: false,
          wallet_name: 'None',
        }),
    })
    apiMock.getWalletAll.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ wallets: [] }),
    })

    act(setup)

    expect(screen.getByText('wallets.text_loading')).toBeInTheDocument()

    const callToActionButtonBefore = screen.getByTestId('new-wallet-btn')
    expect(callToActionButtonBefore.classList.contains('btn')).toBe(true)
    expect(callToActionButtonBefore.classList.contains('btn-lg')).toBe(false)

    await waitForElementToBeRemoved(screen.getByText('wallets.text_loading'))

    expect(screen.getByText('wallets.subtitle_no_wallets')).toBeInTheDocument()

    const callToActionButtonAfter = screen.getByTestId('new-wallet-btn')
    expect(callToActionButtonAfter.classList.contains('btn-lg')).toBe(true)
  })

  it('should display login for available wallets', async () => {
    apiMock.getSession.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          session: false,
          maker_running: false,
          coinjoin_in_process: false,
          wallet_name: 'None',
        }),
    })
    apiMock.getWalletAll.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ wallets: ['wallet0.jmdat', 'wallet1.jmdat'] }),
    })

    act(setup)

    expect(screen.getByText('wallets.text_loading')).toBeInTheDocument()
    await waitForElementToBeRemoved(screen.getByText('wallets.text_loading'))

    expect(screen.queryByText('wallets.alert_wallet_open')).not.toBeInTheDocument()

    expect(screen.getByText('wallet0')).toBeInTheDocument()
    expect(screen.getByText('wallet1')).toBeInTheDocument()

    const callToActionButton = screen.getByTestId('new-wallet-btn')
    expect(callToActionButton.classList.contains('btn')).toBe(true)
    expect(callToActionButton.classList.contains('btn-lg')).toBe(false)
  })
})
