import React from 'react'
import { render, screen, waitFor } from '../testUtils'
import { act } from 'react-dom/test-utils'
import user from '@testing-library/user-event'
import * as apiMock from '../libs/JmWalletApi'
import { walletDisplayName } from '../utils'

import Wallet from './Wallet'

jest.mock('../libs/JmWalletApi', () => ({
  ...jest.requireActual('../libs/JmWalletApi'),
  getSession: jest.fn(),
}))

describe('<Wallet />', () => {
  const dummyWalletName = 'dummy.jmdat'
  const dummyPassword = 'correct horse battery staple'

  const mockUnlockWallet = jest.fn()
  const mockLockWallet = jest.fn()

  const setup = ({
    name,
    lockWallet = undefined,
    unlockWallet = undefined,
    isActive = false,
    makerRunning = false,
    coinjoinInProgress = false,
  }) => {
    render(
      <Wallet
        name={name}
        lockWallet={lockWallet}
        unlockWallet={unlockWallet}
        isActive={isActive}
        coinjoinInProgress={coinjoinInProgress}
        makerRunning={makerRunning}
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
    expect(screen.queryByPlaceholderText('wallets.wallet_preview.placeholder_password')).not.toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_unlock')).not.toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_open')).not.toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_lock')).not.toBeInTheDocument()
  })

  it('should unlock inactive wallet successfully', async () => {
    await act(async () => setup({ name: dummyWalletName, unlockWallet: mockUnlockWallet }))

    expect(screen.getByText('wallets.wallet_preview.wallet_inactive')).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.button_unlock')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('wallets.wallet_preview.placeholder_password')).toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_open')).not.toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_lock')).not.toBeInTheDocument()

    act(() => {
      user.paste(screen.getByPlaceholderText('wallets.wallet_preview.placeholder_password'), dummyPassword)
    })

    await act(async () => {
      const unlockWalletButton = screen.getByText('wallets.wallet_preview.button_unlock')
      user.click(unlockWalletButton)

      await waitFor(() => screen.findByText(/wallets.wallet_preview.button_unlocking/))
      await waitFor(() => screen.findByText('wallets.wallet_preview.button_unlock'))
    })

    expect(mockUnlockWallet).toHaveBeenCalledWith(dummyWalletName, dummyPassword)
  })

  it('should provide ability to unlock active wallet (i.e. when auth token is missing)', () => {
    act(() =>
      setup({
        name: dummyWalletName,
        isActive: true,
        unlockWallet: mockUnlockWallet,
      })
    )

    expect(screen.getByText(walletDisplayName(dummyWalletName))).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.wallet_active')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('wallets.wallet_preview.placeholder_password')).toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_unlock')).toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_open')).not.toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_lock')).not.toBeInTheDocument()
  })

  it('should render active wallet without errors', () => {
    act(() =>
      setup({
        name: dummyWalletName,
        isActive: true,
        lockWallet: mockLockWallet,
      })
    )

    expect(screen.getByText(walletDisplayName(dummyWalletName))).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.wallet_active')).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.button_open')).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.button_lock')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('wallets.wallet_preview.placeholder_password')).not.toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_unlock')).not.toBeInTheDocument()
  })

  it('should lock active wallet successfully', async () => {
    act(() =>
      setup({
        name: dummyWalletName,
        isActive: true,
        lockWallet: mockLockWallet,
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

    expect(mockLockWallet).toHaveBeenCalledWith(dummyWalletName, { confirmed: false })
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
})
