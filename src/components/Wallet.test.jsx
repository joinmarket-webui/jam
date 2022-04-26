import React from 'react'
import { render, screen, waitFor, waitForElementToBeRemoved } from '../testUtils'
import { act } from 'react-dom/test-utils'
import user from '@testing-library/user-event'
import * as apiMock from '../libs/JmWalletApi'
import { walletDisplayName } from '../utils'

import Wallet from './Wallet'

jest.mock('../libs/JmWalletApi', () => ({
  ...jest.requireActual('../libs/JmWalletApi'),
  getSession: jest.fn(),
  postWalletUnlock: jest.fn(),
  getWalletLock: jest.fn(),
}))

const mockedNavigate = jest.fn()
jest.mock('react-router-dom', () => {
  return {
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockedNavigate,
  }
})

describe('<Wallet />', () => {
  const dummyWalletName = 'dummy.jmdat'
  const dummyToken = 'dummyToken'

  const mockStartWallet = jest.fn()
  const mockStopWallet = jest.fn()
  const mockSetAlert = jest.fn()

  const setup = ({
    name,
    isActive = false,
    hasToken = false,
    makerRunning = false,
    coinjoinInProgress = false,
    currentWallet = null,
  }) => {
    render(
      <Wallet
        name={name}
        isActive={isActive}
        hasToken={hasToken}
        makerRunning={makerRunning}
        coinjoinInProgress={coinjoinInProgress}
        currentWallet={currentWallet}
        startWallet={mockStartWallet}
        stopWallet={mockStopWallet}
        setAlert={mockSetAlert}
      />
    )
  }

  beforeEach(() => {
    const neverResolvingPromise = new Promise(() => {})
    apiMock.getSession.mockReturnValue(neverResolvingPromise)
  })

  it('should render inactive wallet without errors', () => {
    act(() => setup({ name: dummyWalletName }))

    expect(screen.getByText(walletDisplayName(dummyWalletName))).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.wallet_inactive')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('wallets.wallet_preview.placeholder_password')).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.button_unlock')).toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_open')).not.toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_lock')).not.toBeInTheDocument()
  })

  it('should unlock inactive wallet successfully', async () => {
    apiMock.postWalletUnlock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ walletname: dummyWalletName, token: dummyToken }),
    })

    await act(async () => setup({ name: dummyWalletName }))

    expect(screen.getByText('wallets.wallet_preview.wallet_inactive')).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.button_unlock')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('wallets.wallet_preview.placeholder_password')).toBeInTheDocument()

    await act(async () => {
      user.type(
        screen.getByPlaceholderText('wallets.wallet_preview.placeholder_password'),
        'correct horse battery staple'
      )
      const unlockWalletButton = screen.getByText('wallets.wallet_preview.button_unlock')
      user.click(unlockWalletButton)

      await waitFor(() => screen.findByText(/wallets.wallet_preview.button_unlocking/))
      await waitFor(() => screen.findByText('wallets.wallet_preview.button_unlock'))
    })

    expect(mockStartWallet).toHaveBeenCalledWith(dummyWalletName, dummyToken)
    expect(mockedNavigate).toHaveBeenCalledWith('/wallet')
  })

  it('should add alert if unlocking of inactive wallet fails', async () => {
    const apiErrorMessage = 'ANY_ERROR_MESSAGE with template <Wallet>'
    apiMock.postWalletUnlock.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: apiErrorMessage }),
    })

    act(() => setup({ name: dummyWalletName }))

    expect(screen.getByText('wallets.wallet_preview.wallet_inactive')).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.button_unlock')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('wallets.wallet_preview.placeholder_password')).toBeInTheDocument()

    await act(async () => {
      user.type(
        screen.getByPlaceholderText('wallets.wallet_preview.placeholder_password'),
        'correct horse battery staple'
      )
      const unlockWalletButton = screen.getByText('wallets.wallet_preview.button_unlock')
      user.click(unlockWalletButton)

      await waitFor(() => screen.findByText(/wallets.wallet_preview.button_unlocking/))
      await waitFor(() => screen.findByText('wallets.wallet_preview.button_unlock'))
    })

    expect(mockStartWallet).not.toHaveBeenCalled()
    expect(mockedNavigate).not.toHaveBeenCalled()
    expect(mockSetAlert).toHaveBeenCalledWith({
      variant: 'danger',
      message: apiErrorMessage.replace('Wallet', dummyWalletName),
    })
  })

  it('should render active wallet without errors', () => {
    act(() => setup({ name: dummyWalletName, isActive: true, hasToken: true }))

    expect(screen.getByText(walletDisplayName(dummyWalletName))).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.wallet_active')).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.button_open')).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.button_lock')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('wallets.wallet_preview.placeholder_password')).not.toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_unlock')).not.toBeInTheDocument()
  })

  it('should lock active wallet successfully', async () => {
    apiMock.getWalletLock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ walletname: dummyWalletName, already_locked: false }),
    })

    act(() =>
      setup({
        name: dummyWalletName,
        isActive: true,
        hasToken: true,
        currentWallet: { name: dummyWalletName, token: dummyToken },
      })
    )

    expect(screen.getByText('wallets.wallet_preview.wallet_active')).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.button_lock')).toBeInTheDocument()

    await act(async () => {
      const lockWalletButton = screen.getByText('wallets.wallet_preview.button_lock')
      user.click(lockWalletButton)

      await waitFor(() => screen.findByText(/wallet_preview.button_locking/))
      await waitFor(() => screen.findByText('wallets.wallet_preview.button_lock'))
    })

    expect(mockStopWallet).toHaveBeenCalled()
    expect(mockSetAlert).toHaveBeenCalledWith({
      variant: 'success',
      message: `wallets.wallet_preview.alert_wallet_locked_successfully`,
      dismissible: false,
    })
  })

  it('should add alert if locking active wallet fails', async () => {
    const apiErrorMessage = 'ANY_ERROR_MESSAGE'
    apiMock.getWalletLock.mockResolvedValueOnce({
      ok: false,
      status: 500, // any other error status than 401
      json: () => Promise.resolve({ message: apiErrorMessage }),
    })

    act(() =>
      setup({
        name: dummyWalletName,
        isActive: true,
        hasToken: true,
        currentWallet: { name: dummyWalletName, token: dummyToken },
      })
    )

    expect(screen.getByText('wallets.wallet_preview.wallet_active')).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.button_lock')).toBeInTheDocument()

    await act(async () => {
      const lockWalletButton = screen.getByText('wallets.wallet_preview.button_lock')
      user.click(lockWalletButton)

      await waitFor(() => screen.findByText(/wallets.wallet_preview.button_locking/))
      await waitFor(() => screen.findByText('wallets.wallet_preview.button_lock'))
    })

    // on errors other than 401, stopWallet should not have been called
    expect(mockStopWallet).not.toHaveBeenCalled()
    expect(mockSetAlert).toHaveBeenCalledWith({
      variant: 'danger',
      message: apiErrorMessage,
    })
  })

  it('should add alert but clear wallet if locking active wallet fails with UNAUTHORIZED', async () => {
    const apiErrorMessage = 'Invalid credentials.'
    apiMock.getWalletLock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: apiErrorMessage }),
    })

    act(() =>
      setup({
        name: dummyWalletName,
        isActive: true,
        hasToken: true,
        currentWallet: { name: dummyWalletName, token: dummyToken },
      })
    )

    expect(screen.getByText('wallets.wallet_preview.wallet_active')).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.button_lock')).toBeInTheDocument()

    await act(async () => {
      const lockWalletButton = screen.getByText('wallets.wallet_preview.button_lock')
      user.click(lockWalletButton)

      await waitFor(() => screen.findByText(/wallets.wallet_preview.button_locking/))
      await waitFor(() => screen.findByText('wallets.wallet_preview.button_lock'))
    })

    // on 401 errors, stopWallet *should* have been called
    expect(mockStopWallet).toHaveBeenCalled()
    expect(mockSetAlert).toHaveBeenCalledWith({
      variant: 'danger',
      message: apiErrorMessage,
    })
  })

  it('should provide ability to unlock active wallet when token is missing', () => {
    act(() => setup({ name: dummyWalletName, isActive: true, hasToken: false }))

    expect(screen.getByText(walletDisplayName(dummyWalletName))).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.wallet_active')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('wallets.wallet_preview.placeholder_password')).toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_unlock')).toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_open')).not.toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_lock')).not.toBeInTheDocument()
  })

  it('should display earn indicator when maker is running', () => {
    act(() => setup({ name: dummyWalletName, isActive: true, makerRunning: true }))

    expect(document.querySelector('.earn-indicator')).toBeInTheDocument()
    expect(document.querySelector('.joining-indicator')).toBeNull()
  })

  it('should display joining indicator when taker is running', () => {
    act(() => setup({ name: dummyWalletName, isActive: true, coinjoinInProgress: true }))

    expect(document.querySelector('.joining-indicator')).toBeInTheDocument()
    expect(document.querySelector('.earn-indicator')).toBeNull()
  })

  it.each`
    makerRunning | coinjoinInProgress | expectedModalBody
    ${true}      | ${false}           | ${'wallets.wallet_preview.modal_lock_wallet_maker_running_text wallets.wallet_preview.modal_lock_wallet_alternative_action_text'}
    ${false}     | ${true}            | ${'wallets.wallet_preview.modal_lock_wallet_coinjoin_in_progress_text wallets.wallet_preview.modal_lock_wallet_alternative_action_text'}
  `(
    'should confirm locking wallet if maker ($makerRunning) or taker ($coinjoinInProgress) is running',
    async ({ makerRunning, coinjoinInProgress, expectedModalBody }) => {
      apiMock.getWalletLock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ walletname: dummyWalletName, already_locked: false }),
      })

      act(() =>
        setup({
          name: dummyWalletName,
          isActive: true,
          hasToken: true,
          makerRunning,
          coinjoinInProgress,
          currentWallet: { name: dummyWalletName, token: dummyToken },
        })
      )

      // modal is initially not shown
      expect(screen.queryByText('wallets.wallet_preview.modal_lock_wallet_title')).not.toBeInTheDocument()
      expect(screen.getByText('wallets.wallet_preview.button_lock')).toBeInTheDocument()

      act(() => {
        // click on the "lock" button
        const lockWalletButton = screen.getByText('wallets.wallet_preview.button_lock')
        user.click(lockWalletButton)
      })

      // modal appeared
      expect(screen.getByText('wallets.wallet_preview.modal_lock_wallet_title')).toBeInTheDocument()
      expect(screen.getByText(expectedModalBody)).toBeInTheDocument()
      expect(screen.getByText('wallets.wallet_preview.modal_lock_wallet_button_cancel')).toBeInTheDocument()
      expect(screen.getByText('wallets.wallet_preview.modal_lock_wallet_button_confirm')).toBeInTheDocument()

      act(() => {
        // click on the modal's "cancel" button
        const lockWalletButton = screen.getByText('wallets.wallet_preview.modal_lock_wallet_button_cancel')
        user.click(lockWalletButton)
      })
      await waitForElementToBeRemoved(screen.getByText('wallets.wallet_preview.modal_lock_wallet_title'))

      expect(mockStopWallet).not.toHaveBeenCalled()

      act(() => {
        const lockWalletButton = screen.getByText('wallets.wallet_preview.button_lock')
        user.click(lockWalletButton)
      })

      // modal appeared
      expect(screen.getByText('wallets.wallet_preview.modal_lock_wallet_title')).toBeInTheDocument()

      act(() => {
        // click on the modal's "confirm" button
        const lockWalletButton = screen.getByText('wallets.wallet_preview.modal_lock_wallet_button_confirm')
        user.click(lockWalletButton)
      })
      await waitForElementToBeRemoved(screen.getByText('wallets.wallet_preview.modal_lock_wallet_title'))

      expect(mockStopWallet).toHaveBeenCalled()
    }
  )
})
