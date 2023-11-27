import { BrowserRouter } from 'react-router-dom'
import { render, screen, act } from '@testing-library/react'
import user from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import i18n from '../i18n/testConfig'
import { walletDisplayName } from '../utils'
import * as apiMock from '../libs/JmWalletApi'

import Wallet, { WalletProps } from './Wallet'

jest.mock('../libs/JmWalletApi', () => ({
  ...jest.requireActual('../libs/JmWalletApi'),
  getGetinfo: jest.fn(),
  getSession: jest.fn(),
}))

describe('<Wallet />', () => {
  const dummyWalletFileName = 'dummy.jmdat'
  const dummyPassword = 'correct horse battery staple'

  const mockUnlockWallet = jest.fn()
  const mockLockWallet = jest.fn()

  const setup = ({
    walletFileName,
    lockWallet = undefined,
    unlockWallet = undefined,
    isActive = false,
    makerRunning = false,
    coinjoinInProgress = false,
  }: WalletProps) => {
    render(
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <Wallet
            walletFileName={walletFileName}
            lockWallet={lockWallet}
            unlockWallet={unlockWallet}
            isActive={isActive}
            coinjoinInProgress={coinjoinInProgress}
            makerRunning={makerRunning}
          />
        </BrowserRouter>
      </I18nextProvider>,
    )
  }

  beforeEach(() => {
    const neverResolvingPromise = new Promise<Response>(() => {})
    ;(apiMock.getGetinfo as jest.Mock).mockResolvedValue(neverResolvingPromise)
    ;(apiMock.getSession as jest.Mock).mockResolvedValue(neverResolvingPromise)
  })

  it('should render inactive wallet without errors', () => {
    act(() => setup({ walletFileName: dummyWalletFileName }))

    expect(screen.getByText(walletDisplayName(dummyWalletFileName))).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.wallet_locked')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('wallets.wallet_preview.placeholder_password')).not.toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_unlock')).not.toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_open')).not.toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_lock')).not.toBeInTheDocument()
  })

  it('should unlock inactive wallet successfully', async () => {
    await act(async () => setup({ walletFileName: dummyWalletFileName, unlockWallet: mockUnlockWallet }))

    expect(screen.getByText('wallets.wallet_preview.wallet_locked')).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.button_unlock')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('wallets.wallet_preview.placeholder_password')).toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_open')).not.toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_lock')).not.toBeInTheDocument()

    await user.click(screen.getByPlaceholderText('wallets.wallet_preview.placeholder_password'))
    await user.paste(dummyPassword)

    const unlockWalletButton = screen.getByText('wallets.wallet_preview.button_unlock')
    await user.click(unlockWalletButton)

    expect(mockUnlockWallet).toHaveBeenCalledWith(dummyWalletFileName, dummyPassword)
  })

  it('should provide ability to unlock active wallet (i.e. when auth token is missing)', () => {
    act(() =>
      setup({
        walletFileName: dummyWalletFileName,
        isActive: true,
        unlockWallet: mockUnlockWallet,
      }),
    )

    expect(screen.getByText(walletDisplayName(dummyWalletFileName))).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.wallet_unlocked')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('wallets.wallet_preview.placeholder_password')).toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_unlock')).toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_open')).not.toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_lock')).not.toBeInTheDocument()
  })

  it('should render active wallet without errors', () => {
    act(() =>
      setup({
        walletFileName: dummyWalletFileName,
        isActive: true,
        lockWallet: mockLockWallet,
      }),
    )

    expect(screen.getByText(walletDisplayName(dummyWalletFileName))).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.wallet_unlocked')).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.button_open')).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.button_lock')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('wallets.wallet_preview.placeholder_password')).not.toBeInTheDocument()
    expect(screen.queryByText('wallets.wallet_preview.button_unlock')).not.toBeInTheDocument()
  })

  it('should lock active wallet successfully', async () => {
    act(() =>
      setup({
        walletFileName: dummyWalletFileName,
        isActive: true,
        lockWallet: mockLockWallet,
      }),
    )

    expect(screen.getByText('wallets.wallet_preview.wallet_unlocked')).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.button_lock')).toBeInTheDocument()

    const lockWalletButton = screen.getByText('wallets.wallet_preview.button_lock')
    await user.click(lockWalletButton)

    expect(mockLockWallet).toHaveBeenCalledWith(dummyWalletFileName, { confirmed: false })
  })

  it('should display earn indicator when maker is running', () => {
    act(() => setup({ walletFileName: dummyWalletFileName, isActive: true, makerRunning: true }))

    expect(document.querySelector('.earn-indicator')).toBeInTheDocument()
    expect(document.querySelector('.joining-indicator')).toBeNull()
  })

  it('should display joining indicator when taker is running', () => {
    act(() => setup({ walletFileName: dummyWalletFileName, isActive: true, coinjoinInProgress: true }))

    expect(document.querySelector('.joining-indicator')).toBeInTheDocument()
    expect(document.querySelector('.earn-indicator')).toBeNull()
  })
})
