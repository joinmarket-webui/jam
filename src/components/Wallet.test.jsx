import React from 'react'
import { render, screen } from '@testing-library/react'
import { act } from 'react-dom/test-utils'

import { AllTheProviders } from '../__util__/AllTheProviders'

import Wallet from './Wallet'

jest.mock('../libs/JmWalletApi')

describe('<Wallet />', () => {
  const setup = ({
    name,
    currentWallet = null,
    startWallet = () => {},
    stopWallet = () => {},
    setAlert = () => {},
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

  it('should render single inactive wallet without errors', () => {
    act(() => setup({ name: 'wallet0.jmdat' }))

    expect(screen.getByText('wallet0')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByText('Unlock')).toBeInTheDocument()
    expect(screen.queryByText('Open')).not.toBeInTheDocument()
    expect(screen.queryByText('Lock')).not.toBeInTheDocument()
  })

  it('should render single active wallet without errors', () => {
    act(() => setup({ name: 'wallet0.jmdat', currentWallet: { name: 'wallet0.jmdat', token: 'ANY_TOKEN' } }))

    expect(screen.getByText('wallet0')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Password')).not.toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Lock')).toBeInTheDocument()
  })

  it('should render single active wallet when token is missing', () => {
    act(() => setup({ name: 'wallet0.jmdat', currentWallet: { name: 'wallet0.jmdat', token: null } }))

    expect(
      screen.getByText(
        'This wallet is active, but there is no token to interact with it. Please remove the lock file on the server.'
      )
    ).toBeInTheDocument()

    expect(screen.getByText('wallet0')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Password')).not.toBeInTheDocument()
    expect(screen.queryByText('Open')).not.toBeInTheDocument()
    expect(screen.queryByText('Lock')).not.toBeInTheDocument()
    expect(screen.queryByText('Unlock')).not.toBeInTheDocument()
  })
})
