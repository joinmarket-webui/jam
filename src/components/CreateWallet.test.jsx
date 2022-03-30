import React from 'react'
import user from '@testing-library/user-event'
import { render, screen, waitFor, waitForElementToBeRemoved } from '../testUtils'
import { act } from 'react-dom/test-utils'

import * as apiMock from '../libs/JmWalletApi'

import CreateWallet from './CreateWallet'

jest.mock('../libs/JmWalletApi', () => ({
  ...jest.requireActual('../libs/JmWalletApi'),
  getSession: jest.fn(),
  postWalletCreate: jest.fn(),
}))

const NOOP = () => {}

describe('<CreateWallet />', () => {
  const setup = (props) => {
    const startWallet = props?.startWallet || NOOP
    const devMode = props?.devMode || false
    render(<CreateWallet startWallet={startWallet} devMode={devMode} />)
  }

  beforeEach(() => {
    const neverResolvingPromise = new Promise(() => {})
    apiMock.getSession.mockReturnValue(neverResolvingPromise)
  })

  it('should render without errors', () => {
    act(setup)

    expect(screen.getByText('create_wallet.title')).toBeInTheDocument()
    expect(screen.getByLabelText('create_wallet.label_wallet_name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('create_wallet.placeholder_wallet_name')).toBeInTheDocument()
    expect(screen.getByLabelText('create_wallet.label_password')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('create_wallet.placeholder_password')).toBeInTheDocument()
    expect(screen.getByText('create_wallet.button_create')).toBeInTheDocument()
  })

  it('should show validation messages to user if form is invalid', () => {
    act(setup)

    expect(screen.getByText('create_wallet.button_create')).toBeInTheDocument()

    act(() => {
      // click on the "create" button without filling the form
      const createWalletButton = screen.getByText('create_wallet.button_create')
      user.click(createWalletButton)
    })

    expect(screen.getByText('create_wallet.feedback_invalid_wallet_name')).toBeVisible()
    expect(screen.getByText('create_wallet.feedback_invalid_password')).toBeVisible()
  })

  it('should advance to WalletCreationConfirmation after wallet is created', async () => {
    const walletName = 'wallet'

    apiMock.postWalletCreate.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          walletname: `${walletName}.jmdat`,
          token: 'ANY_TOKEN',
          seedphrase: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        }),
    })

    act(setup)

    expect(screen.getByText('create_wallet.button_create')).toBeInTheDocument()
    expect(screen.queryByText('create_wallet.title_wallet_created')).not.toBeInTheDocument()

    await act(async () => {
      user.type(screen.getByPlaceholderText('create_wallet.placeholder_wallet_name'), walletName)
      user.type(screen.getByPlaceholderText('create_wallet.placeholder_password'), 'password')
      const createWalletButton = screen.getByText('create_wallet.button_create')
      user.click(createWalletButton)

      await waitFor(() => screen.findByText(/create_wallet.button_creating/))
    })

    expect(screen.queryByText('create_wallet.button_create')).not.toBeInTheDocument()
    expect(screen.getByText('create_wallet.title_wallet_created')).toBeInTheDocument()
  })

  it('should verify that "skip" button is NOT visible when not in development mode', async () => {
    const walletName = 'wallet'

    apiMock.postWalletCreate.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          walletname: `${walletName}.jmdat`,
          token: 'ANY_TOKEN',
          seedphrase: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        }),
    })

    act(() => setup({ devMode: false }))

    await act(async () => {
      user.type(screen.getByPlaceholderText('create_wallet.placeholder_wallet_name'), walletName)
      user.type(screen.getByPlaceholderText('create_wallet.placeholder_password'), 'password')
      const createWalletButton = screen.getByText('create_wallet.button_create')
      user.click(createWalletButton)

      await waitFor(() => screen.findByText(/create_wallet.button_creating/))

      const revealToggle = screen.getByText('create_wallet.confirmation_toggle_reveal_info')
      user.click(revealToggle)

      const confirmToggle = screen.getByText('create_wallet.confirmation_toggle_info_written_down')
      user.click(confirmToggle)

      const nextButton = screen.getByText('create_wallet.next_button')
      user.click(nextButton)
    })

    expect(screen.queryByText('create_wallet.skip_button')).not.toBeInTheDocument()
    expect(screen.getByText('create_wallet.back_button')).toBeInTheDocument()
    expect(screen.getByText('create_wallet.confirmation_button_fund_wallet')).toBeDisabled()
  })

  it('should verify that "skip" button IS visible in development mode', async () => {
    const walletName = 'wallet'

    apiMock.postWalletCreate.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          walletname: `${walletName}.jmdat`,
          token: 'ANY_TOKEN',
          seedphrase: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        }),
    })

    act(() => setup({ devMode: true }))

    await act(async () => {
      user.type(screen.getByPlaceholderText('create_wallet.placeholder_wallet_name'), walletName)
      user.type(screen.getByPlaceholderText('create_wallet.placeholder_password'), 'password')
      const createWalletButton = screen.getByText('create_wallet.button_create')
      user.click(createWalletButton)

      await waitFor(() => screen.findByText(/create_wallet.button_creating/))

      const revealToggle = screen.getByText('create_wallet.confirmation_toggle_reveal_info')
      user.click(revealToggle)

      const confirmToggle = screen.getByText('create_wallet.confirmation_toggle_info_written_down')
      user.click(confirmToggle)

      const nextButton = screen.getByText('create_wallet.next_button')
      user.click(nextButton)
    })

    expect(screen.getByText('create_wallet.skip_button')).toBeInTheDocument()
    expect(screen.getByText('create_wallet.back_button')).toBeInTheDocument()
    expect(screen.getByText('create_wallet.confirmation_button_fund_wallet')).toBeDisabled()
  })
})
