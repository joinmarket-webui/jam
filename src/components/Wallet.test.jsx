import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import user from '@testing-library/user-event'
import * as apiMock from '../libs/JmWalletApi'
import { walletDisplayName } from '../utils'

import { AllTheProviders } from '../__util__/AllTheProviders'

import Wallet from './Wallet'

jest.mock('../libs/JmWalletApi')

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
    currentWallet = null,
    startWallet = mockStartWallet,
    stopWallet = mockStopWallet,
    setAlert = mockSetAlert,
  }) => {
    render(
      <Wallet
        name={name}
        currentWallet={currentWallet}
        startWallet={startWallet}
        stopWallet={stopWallet}
        setAlert={setAlert}
      />,
      {
        wrapper: AllTheProviders,
      }
    )
  }

  it('should render inactive wallet without errors', () => {
    act(() => setup({ name: dummyWalletName }))

    expect(screen.getByText('dummy')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByText('Unlock')).toBeInTheDocument()
    expect(screen.queryByText('Open')).not.toBeInTheDocument()
    expect(screen.queryByText('Lock')).not.toBeInTheDocument()
  })

  it('should unlock inactive wallet successfully', async () => {
    apiMock.postWalletUnlock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ walletname: dummyWalletName, token: dummyToken }),
    })

    act(() => setup({ name: dummyWalletName }))

    expect(screen.getByText('Inactive')).toBeInTheDocument()
    expect(screen.getByText('Unlock')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()

    await act(async () => {
      user.type(screen.getByPlaceholderText('Password'), 'correct horse battery staple')
      const unlockWalletButton = screen.getByText('Unlock')
      user.click(unlockWalletButton)

      await waitFor(() => screen.findByText(/Unlocking/))
      await waitFor(() => screen.findByText('Unlock'))
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

    expect(screen.getByText('Inactive')).toBeInTheDocument()
    expect(screen.getByText('Unlock')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()

    await act(async () => {
      user.type(screen.getByPlaceholderText('Password'), 'correct horse battery staple')
      const unlockWalletButton = screen.getByText('Unlock')
      user.click(unlockWalletButton)

      await waitFor(() => screen.findByText(/Unlocking/))
      await waitFor(() => screen.findByText('Unlock'))
    })

    expect(mockStartWallet).not.toHaveBeenCalled()
    expect(mockedNavigate).not.toHaveBeenCalled()
    expect(mockSetAlert).toHaveBeenCalledWith({
      variant: 'danger',
      message: apiErrorMessage.replace('Wallet', dummyWalletName),
    })
  })

  it('should render active wallet without errors', () => {
    act(() => setup({ name: dummyWalletName, currentWallet: { name: dummyWalletName, token: dummyToken } }))

    expect(screen.getByText('dummy')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Lock')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Password')).not.toBeInTheDocument()
    expect(screen.queryByText('Unlock')).not.toBeInTheDocument()
  })

  it('should lock active wallet successfully', async () => {
    apiMock.getWalletLock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ walletname: dummyWalletName, already_locked: false }),
    })

    act(() => setup({ name: dummyWalletName, currentWallet: { name: dummyWalletName, token: dummyToken } }))

    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Lock')).toBeInTheDocument()

    await act(async () => {
      const lockWalletButton = screen.getByText('Lock')
      user.click(lockWalletButton)

      await waitFor(() => screen.findByText(/Locking/))
      await waitFor(() => screen.findByText('Lock'))
    })

    expect(mockStopWallet).toHaveBeenCalled()
    expect(mockSetAlert).toHaveBeenCalledWith({
      variant: 'success',
      message: `${walletDisplayName(dummyWalletName)} locked successfully.`,
      dismissible: true,
    })
  })

  it('should add alert if locking active wallet fails', async () => {
    const apiErrorMessage = 'ANY_ERROR_MESSAGE'
    apiMock.getWalletLock.mockResolvedValueOnce({
      ok: false,
      status: 500, // any other error status than 401
      json: () => Promise.resolve({ message: apiErrorMessage }),
    })

    act(() => setup({ name: dummyWalletName, currentWallet: { name: dummyWalletName, token: dummyToken } }))

    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Lock')).toBeInTheDocument()

    await act(async () => {
      const lockWalletButton = screen.getByText('Lock')
      user.click(lockWalletButton)

      await waitFor(() => screen.findByText(/Locking/))
      await waitFor(() => screen.findByText('Lock'))
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

    act(() => setup({ name: dummyWalletName, currentWallet: { name: dummyWalletName, token: dummyToken } }))

    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Lock')).toBeInTheDocument()

    await act(async () => {
      const lockWalletButton = screen.getByText('Lock')
      user.click(lockWalletButton)

      await waitFor(() => screen.findByText(/Locking/))
      await waitFor(() => screen.findByText('Lock'))
    })

    // on 401 errors, stopWallet *should* have been called
    expect(mockStopWallet).toHaveBeenCalled()
    expect(mockSetAlert).toHaveBeenCalledWith({
      variant: 'danger',
      message: apiErrorMessage,
    })
  })

  it('should render active wallet when token is missing', () => {
    act(() => setup({ name: dummyWalletName, currentWallet: { name: dummyWalletName, token: null } }))

    expect(
      screen.getByText(
        'This wallet is active, but there is no token to interact with it. Please remove the lock file on the server.'
      )
    ).toBeInTheDocument()

    expect(screen.getByText('dummy')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Password')).not.toBeInTheDocument()
    expect(screen.queryByText('Open')).not.toBeInTheDocument()
    expect(screen.queryByText('Lock')).not.toBeInTheDocument()
    expect(screen.queryByText('Unlock')).not.toBeInTheDocument()
  })
})
