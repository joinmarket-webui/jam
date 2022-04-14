import React from 'react'
import user from '@testing-library/user-event'
import { render, screen, waitFor, waitForElementToBeRemoved } from '../testUtils'
import { act } from 'react-dom/test-utils'
import { __testSetFeatureEnabled } from '../constants/featureFlags'

import * as apiMock from '../libs/JmWalletApi'

import CreateWallet from './CreateWallet'

jest.mock('../libs/JmWalletApi', () => ({
  ...jest.requireActual('../libs/JmWalletApi'),
  getSession: jest.fn(),
  postWalletCreate: jest.fn(),
}))

const NOOP = () => {}

describe('<CreateWallet />', () => {
  const testWalletName = 'wallet'
  const testWalletPassword = 'correct horse battery staple'

  const setup = (props) => {
    const startWallet = props?.startWallet || NOOP
    render(<CreateWallet startWallet={startWallet} />)
  }

  beforeEach(() => {
    const neverResolvingPromise = new Promise(() => {})
    apiMock.getSession.mockReturnValue(neverResolvingPromise)
  })

  it('should render without errors', () => {
    act(setup)

    expect(screen.getByText('create_wallet.title')).toBeVisible()
    expect(screen.getByLabelText('create_wallet.label_wallet_name')).toBeVisible()
    expect(screen.getByPlaceholderText('create_wallet.placeholder_wallet_name')).toBeVisible()
    expect(screen.getByLabelText('create_wallet.label_password')).toBeVisible()
    expect(screen.getByPlaceholderText('create_wallet.placeholder_password')).toBeVisible()
    expect(screen.getByLabelText('create_wallet.label_password_confirm')).toBeVisible()
    expect(screen.getByPlaceholderText('create_wallet.placeholder_password_confirm')).toBeVisible()
    expect(screen.getByText('create_wallet.button_create')).toBeVisible()
  })

  it('should show validation messages to user if form is invalid', async () => {
    act(setup)

    expect(await screen.findByText('create_wallet.button_create')).toBeVisible()

    act(() => {
      // click on the "create" button without filling the form
      const createWalletButton = screen.getByText('create_wallet.button_create')
      user.click(createWalletButton)
    })

    expect(await screen.findByText('create_wallet.feedback_invalid_wallet_name')).toBeVisible()
    expect(await screen.findByText('create_wallet.feedback_invalid_password')).toBeVisible()
    expect(await screen.findByText('create_wallet.feedback_invalid_password_confirm')).toBeVisible()
  })

  it('should not submit form if passwords do not match', async () => {
    act(setup)

    expect(await screen.findByPlaceholderText('create_wallet.placeholder_password')).toBeVisible()
    expect(await screen.findByPlaceholderText('create_wallet.placeholder_password_confirm')).toBeVisible()
    expect(await screen.findByText('create_wallet.button_create')).toBeVisible()

    act(() => {
      user.type(screen.getByPlaceholderText('create_wallet.placeholder_wallet_name'), testWalletName)
      user.type(screen.getByPlaceholderText('create_wallet.placeholder_password'), '.*')
      user.type(screen.getByPlaceholderText('create_wallet.placeholder_password_confirm'), 'a_mismatching_input')
    })

    act(() => {
      const createWalletButton = screen.getByText('create_wallet.button_create')
      user.click(createWalletButton)
    })

    expect(await screen.findByText('create_wallet.button_create')).toBeVisible()
    expect(await screen.findByText('create_wallet.feedback_invalid_password_confirm')).toBeVisible()
  })

  it('should advance to WalletCreationConfirmation after wallet is created', async () => {
    apiMock.postWalletCreate.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          walletname: `${testWalletName}.jmdat`,
          token: 'ANY_TOKEN',
          seedphrase: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        }),
    })

    act(setup)

    expect(await screen.findByText('create_wallet.button_create')).toBeVisible()
    expect(await screen.queryByText('create_wallet.title_wallet_created')).not.toBeInTheDocument()

    act(() => {
      user.type(screen.getByPlaceholderText('create_wallet.placeholder_wallet_name'), testWalletName)
      user.type(screen.getByPlaceholderText('create_wallet.placeholder_password'), testWalletPassword)
      user.type(screen.getByPlaceholderText('create_wallet.placeholder_password_confirm'), testWalletPassword)
    })

    await act(async () => {
      const createWalletButton = screen.getByText('create_wallet.button_create')
      user.click(createWalletButton)

      await waitFor(() => screen.findByText(/create_wallet.button_creating/))
    })

    expect(screen.getByText('create_wallet.title_wallet_created')).toBeVisible()
    expect(screen.queryByText('create_wallet.button_create')).not.toBeInTheDocument()
  })

  it('should verify that "skip" button is NOT visible by default (feature is disabled)', async () => {
    apiMock.postWalletCreate.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          walletname: `${testWalletName}.jmdat`,
          token: 'ANY_TOKEN',
          seedphrase: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        }),
    })

    act(setup)

    act(() => {
      user.type(screen.getByPlaceholderText('create_wallet.placeholder_wallet_name'), testWalletName)
      user.type(screen.getByPlaceholderText('create_wallet.placeholder_password'), testWalletPassword)
      user.type(screen.getByPlaceholderText('create_wallet.placeholder_password_confirm'), testWalletPassword)
    })

    await act(async () => {
      const createWalletButton = screen.getByText('create_wallet.button_create')
      user.click(createWalletButton)

      await waitFor(() => screen.findByText(/create_wallet.button_creating/))

      const revealToggle = await screen.findByText('create_wallet.confirmation_toggle_reveal_info')
      user.click(revealToggle)

      const confirmToggle = screen.getByText('create_wallet.confirmation_toggle_info_written_down')
      user.click(confirmToggle)

      const nextButton = screen.getByText('create_wallet.next_button')
      user.click(nextButton)
    })

    expect(screen.queryByText('create_wallet.skip_button')).not.toBeInTheDocument()
    expect(screen.getByText('create_wallet.back_button')).toBeVisible()
    expect(screen.getByText('create_wallet.confirmation_button_fund_wallet')).toBeDisabled()
  })

  it('should verify that "skip" button IS visible when feature is enabled', async () => {
    __testSetFeatureEnabled('skipWalletBackupConfirmation', true)

    apiMock.postWalletCreate.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          walletname: `${testWalletName}.jmdat`,
          token: 'ANY_TOKEN',
          seedphrase: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        }),
    })

    act(setup)

    act(() => {
      user.type(screen.getByPlaceholderText('create_wallet.placeholder_wallet_name'), testWalletName)
      user.type(screen.getByPlaceholderText('create_wallet.placeholder_password'), testWalletPassword)
      user.type(screen.getByPlaceholderText('create_wallet.placeholder_password_confirm'), testWalletPassword)
    })

    await act(async () => {
      const createWalletButton = screen.getByText('create_wallet.button_create')
      user.click(createWalletButton)

      await waitFor(() => screen.findByText(/create_wallet.button_creating/))

      const revealToggle = await screen.findByText('create_wallet.confirmation_toggle_reveal_info')
      user.click(revealToggle)

      const confirmToggle = screen.getByText('create_wallet.confirmation_toggle_info_written_down')
      user.click(confirmToggle)

      const nextButton = screen.getByText('create_wallet.next_button')
      user.click(nextButton)
    })

    expect(screen.getByText('create_wallet.skip_button')).toBeVisible()
    expect(screen.getByText('create_wallet.back_button')).toBeVisible()
    expect(screen.getByText('create_wallet.confirmation_button_fund_wallet')).toBeDisabled()
  })
})
