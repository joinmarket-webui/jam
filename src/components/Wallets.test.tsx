import { BrowserRouter } from 'react-router-dom'
import { render, screen, waitFor, waitForElementToBeRemoved } from '../testUtils'
import { act } from 'react-dom/test-utils'
import user from '@testing-library/user-event'

import * as apiMock from '../libs/JmWalletApi'

import Wallets from './Wallets'
import { CurrentWallet } from '../context/WalletContext'

jest.mock('../libs/JmWalletApi', () => ({
  ...jest.requireActual('../libs/JmWalletApi'),
  getGetinfo: jest.fn(),
  getSession: jest.fn(),
  getWalletAll: jest.fn(),
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

describe('<Wallets />', () => {
  const mockStartWallet = jest.fn()
  const mockStopWallet = jest.fn()

  const setup = ({ currentWallet = null }: { currentWallet?: CurrentWallet | null }) => {
    render(
      <BrowserRouter>
        <Wallets currentWallet={currentWallet} startWallet={mockStartWallet} stopWallet={mockStopWallet} />
      </BrowserRouter>,
    )
  }

  beforeEach(() => {
    const neverResolvingPromise = new Promise(() => {})
    ;(apiMock.getSession as jest.Mock).mockResolvedValue(neverResolvingPromise)
    ;(apiMock.getGetinfo as jest.Mock).mockResolvedValue(neverResolvingPromise)
  })

  it('should display loading indicator while fetching data', () => {
    const neverResolvingPromise = new Promise(() => {})
    ;(apiMock.getSession as jest.Mock).mockResolvedValueOnce(neverResolvingPromise)
    ;(apiMock.getWalletAll as jest.Mock).mockResolvedValueOnce(neverResolvingPromise)

    act(() => setup({}))

    expect(screen.getByText('wallets.title')).toBeInTheDocument()
    expect(screen.getByText('wallets.text_loading')).toBeInTheDocument()
    expect(screen.getByText('wallets.button_new_wallet')).toBeInTheDocument()
  })

  it('should display error message when loading wallets fails', async () => {
    ;(apiMock.getSession as jest.Mock).mockResolvedValueOnce({
      ok: false,
    })
    ;(apiMock.getWalletAll as jest.Mock).mockResolvedValueOnce({
      ok: false,
    })

    act(() => setup({}))

    expect(screen.getByText('wallets.title')).toBeInTheDocument()
    expect(screen.getByText('wallets.button_new_wallet')).toBeInTheDocument()

    await waitForElementToBeRemoved(screen.getByText('wallets.text_loading'))

    expect(screen.getByText('wallets.error_loading_failed')).toBeInTheDocument()
    expect(screen.getByText('wallets.button_new_wallet')).toBeInTheDocument()
  })

  it('should display alert when rescanning is active', async () => {
    ;(apiMock.getWalletAll as jest.Mock).mockResolvedValueOnce({
      ok: false,
    })
    ;(apiMock.getSession as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          rescanning: true,
        }),
    })

    await act(async () => setup({}))

    expect(screen.getByText('wallets.title')).toBeVisible()
    expect(screen.getByTestId('alert-rescanning')).toBeVisible()
  })

  it('should display big call-to-action buttons if no wallet has been created yet', async () => {
    ;(apiMock.getSession as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          session: false,
          maker_running: false,
          coinjoin_in_process: false,
          wallet_name: 'None',
        }),
    })
    ;(apiMock.getWalletAll as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ wallets: [] }),
    })
    ;(apiMock.getGetinfo as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ version: '0.9.10dev' }),
    })

    act(() => setup({}))

    expect(screen.getByText('wallets.text_loading')).toBeInTheDocument()

    const newWalletButtonBefore = screen.getByTestId('new-wallet-btn')
    expect(newWalletButtonBefore.classList.contains('btn')).toBe(true)
    expect(newWalletButtonBefore.classList.contains('btn-lg')).toBe(false)

    await waitForElementToBeRemoved(screen.getByText('wallets.text_loading'))

    expect(screen.getByText('wallets.subtitle_no_wallets')).toBeInTheDocument()

    const newWalletButtonBeforeAfter = screen.getByTestId('new-wallet-btn')
    expect(newWalletButtonBeforeAfter.classList.contains('btn-lg')).toBe(true)

    const importWalletButton = await screen.findByTestId('import-wallet-btn')
    expect(importWalletButton.classList.contains('btn-lg')).toBe(true)
  })

  it('should display login for available wallets', async () => {
    ;(apiMock.getSession as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          session: false,
          maker_running: false,
          coinjoin_in_process: false,
          wallet_name: 'None',
        }),
    })
    ;(apiMock.getWalletAll as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ wallets: ['wallet0.jmdat', 'wallet1.jmdat'] }),
    })
    ;(apiMock.getGetinfo as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ version: '0.9.10dev' }),
    })

    act(() => setup({}))

    expect(screen.getByText('wallets.text_loading')).toBeInTheDocument()
    await waitForElementToBeRemoved(screen.getByText('wallets.text_loading'))

    expect(screen.queryByText('wallets.alert_wallet_open')).not.toBeInTheDocument()

    expect(screen.getByText('wallet0')).toBeInTheDocument()
    expect(screen.getByText('wallet1')).toBeInTheDocument()

    const newWalletButton = screen.getByTestId('new-wallet-btn')
    expect(newWalletButton.classList.contains('btn')).toBe(true)
    expect(newWalletButton.classList.contains('btn-lg')).toBe(false)

    const importWalletButton = await screen.findByTestId('import-wallet-btn')
    expect(importWalletButton.classList.contains('btn')).toBe(true)
    expect(importWalletButton.classList.contains('btn-lg')).toBe(false)
  })

  it('should hide "Import Wallet"-button on unsupported backend version', async () => {
    ;(apiMock.getSession as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          session: false,
          maker_running: false,
          coinjoin_in_process: false,
          wallet_name: 'None',
        }),
    })
    ;(apiMock.getWalletAll as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ wallets: [] }),
    })
    ;(apiMock.getGetinfo as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ version: '0.9.9' }),
    })

    act(() => setup({}))

    expect(screen.getByText('wallets.text_loading')).toBeInTheDocument()
    await waitForElementToBeRemoved(screen.getByText('wallets.text_loading'))

    expect(screen.queryByTestId('import-wallet-btn')).not.toBeInTheDocument()
    expect(screen.getByTestId('new-wallet-btn')).toBeInTheDocument()
  })

  describe('<Wallets /> lock/unlock flow', () => {
    const dummyWalletFileName = 'dummy.jmdat'
    const dummyToken = 'dummyToken'
    const dummyPassword = 'correct horse battery staple'

    it('should unlock inactive wallet successfully', async () => {
      ;(apiMock.getSession as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            session: false,
            maker_running: false,
            coinjoin_in_process: false,
            wallet_name: 'None',
          }),
      })
      ;(apiMock.getWalletAll as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ wallets: [dummyWalletFileName] }),
      })
      ;(apiMock.postWalletUnlock as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            walletname: dummyWalletFileName,
            token: dummyToken,
            refresh_token: dummyToken,
          }),
      })

      await act(async () => setup({}))

      expect(screen.getByText('wallets.wallet_preview.wallet_locked')).toBeInTheDocument()
      expect(screen.getByText('wallets.wallet_preview.button_unlock')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('wallets.wallet_preview.placeholder_password')).toBeInTheDocument()

      act(() => {
        user.paste(screen.getByPlaceholderText('wallets.wallet_preview.placeholder_password'), dummyPassword)
      })

      await act(async () => {
        const unlockWalletButton = screen.getByText('wallets.wallet_preview.button_unlock')
        user.click(unlockWalletButton)

        await waitFor(() => screen.findByText(/wallets.wallet_preview.button_unlocking/))
        await waitFor(() => screen.findByText('wallets.wallet_preview.button_unlock'))
      })

      expect(mockStartWallet).toHaveBeenCalledWith(dummyWalletFileName, {
        token: dummyToken,
        refresh_token: dummyToken,
      })
      expect(mockedNavigate).toHaveBeenCalledWith('/wallet')
    })

    it('should add alert if unlocking of inactive wallet fails', async () => {
      const apiErrorMessage = 'ANY_ERROR_MESSAGE with template <Wallet>'

      ;(apiMock.getSession as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            session: false,
            maker_running: false,
            coinjoin_in_process: false,
            wallet_name: 'None',
          }),
      })
      ;(apiMock.getWalletAll as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ wallets: [dummyWalletFileName] }),
      })
      ;(apiMock.postWalletUnlock as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: apiErrorMessage }),
      })

      await act(async () => setup({}))

      expect(screen.getByText('wallets.wallet_preview.wallet_locked')).toBeInTheDocument()
      expect(screen.getByText('wallets.wallet_preview.button_unlock')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('wallets.wallet_preview.placeholder_password')).toBeInTheDocument()

      act(() => {
        user.paste(screen.getByPlaceholderText('wallets.wallet_preview.placeholder_password'), dummyPassword)
      })

      await act(async () => {
        const unlockWalletButton = screen.getByText('wallets.wallet_preview.button_unlock')
        user.click(unlockWalletButton)

        await waitFor(() => screen.findByText(/wallets.wallet_preview.button_unlocking/))
        await waitFor(() => screen.findByText('wallets.wallet_preview.button_unlock'))
      })

      expect(mockStartWallet).not.toHaveBeenCalled()
      expect(mockedNavigate).not.toHaveBeenCalled()

      expect(screen.getByText(apiErrorMessage.replace('Wallet', dummyWalletFileName))).toBeInTheDocument()
    })

    it('should lock active wallet successfully', async () => {
      ;(apiMock.getSession as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            session: true,
            maker_running: false,
            coinjoin_in_process: false,
            wallet_name: dummyWalletFileName,
          }),
      })
      ;(apiMock.getWalletAll as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ wallets: [dummyWalletFileName] }),
      })
      ;(apiMock.getWalletLock as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ walletname: dummyWalletFileName, already_locked: false }),
      })

      await act(async () =>
        setup({
          currentWallet: {
            walletFileName: dummyWalletFileName,
            displayName: dummyWalletFileName,
            token: dummyToken,
          },
        }),
      )

      expect(screen.getByText('wallets.wallet_preview.wallet_unlocked')).toBeInTheDocument()
      expect(screen.getByText('wallets.wallet_preview.button_lock')).toBeInTheDocument()

      await act(async () => {
        const lockWalletButton = screen.getByText('wallets.wallet_preview.button_lock')
        user.click(lockWalletButton)

        await waitFor(() => screen.findByText(/wallet_preview.button_locking/))
        await waitFor(() => screen.findByText('wallets.wallet_preview.button_lock'))
      })

      expect(mockStopWallet).toHaveBeenCalled()
      expect(screen.getByText('wallets.wallet_preview.alert_wallet_locked_successfully')).toBeInTheDocument()
    })

    it('should add alert but clear wallet if locking active wallet fails with UNAUTHORIZED', async () => {
      const apiErrorMessage = 'Invalid credentials.'

      ;(apiMock.getSession as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            session: true,
            maker_running: false,
            coinjoin_in_process: false,
            wallet_name: dummyWalletFileName,
          }),
      })
      ;(apiMock.getWalletAll as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ wallets: [dummyWalletFileName] }),
      })
      ;(apiMock.getWalletLock as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: apiErrorMessage }),
      })

      await act(async () =>
        setup({
          currentWallet: {
            walletFileName: dummyWalletFileName,
            displayName: dummyWalletFileName,
            token: dummyToken,
          },
        }),
      )

      expect(screen.getByText('wallets.wallet_preview.wallet_unlocked')).toBeInTheDocument()
      expect(screen.getByText('wallets.wallet_preview.button_lock')).toBeInTheDocument()

      await act(async () => {
        const lockWalletButton = screen.getByText('wallets.wallet_preview.button_lock')
        user.click(lockWalletButton)

        await waitFor(() => screen.findByText(/wallets.wallet_preview.button_locking/))
        await waitFor(() => screen.findByText('wallets.wallet_preview.button_lock'))
      })

      // on 401 errors, stopWallet *should* have been called
      expect(mockStopWallet).toHaveBeenCalled()
      expect(screen.getByText(apiErrorMessage)).toBeInTheDocument()
    })

    it.each`
      makerRunning | coinjoinInProgress | expectedModalBody
      ${true}      | ${false}           | ${'wallets.wallet_preview.modal_lock_wallet_maker_running_text wallets.wallet_preview.modal_lock_wallet_alternative_action_text'}
      ${false}     | ${true}            | ${'wallets.wallet_preview.modal_lock_wallet_coinjoin_in_progress_text wallets.wallet_preview.modal_lock_wallet_alternative_action_text'}
    `(
      'should confirm locking wallet if maker ($makerRunning) or taker ($coinjoinInProgress) is running',
      async ({ makerRunning, coinjoinInProgress, expectedModalBody }) => {
        ;(apiMock.getSession as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              session: true,
              maker_running: makerRunning,
              coinjoin_in_process: coinjoinInProgress,
              wallet_name: dummyWalletFileName,
            }),
        })
        ;(apiMock.getWalletAll as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ wallets: [dummyWalletFileName] }),
        })
        ;(apiMock.getWalletLock as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ walletname: dummyWalletFileName, already_locked: false }),
        })

        await act(async () =>
          setup({
            currentWallet: {
              walletFileName: dummyWalletFileName,
              displayName: dummyWalletFileName,
              token: dummyToken,
            },
          }),
        )

        // modal is initially not shown
        expect(screen.queryByText('wallets.wallet_preview.modal_lock_wallet_title')).not.toBeInTheDocument()
        expect(screen.getByText('wallets.wallet_preview.button_lock')).toBeInTheDocument()

        await act(async () => {
          // click on the "lock" button
          const lockWalletButton = screen.getByText('wallets.wallet_preview.button_lock')
          user.click(lockWalletButton)
        })

        // modal appeared
        expect(screen.getByText('wallets.wallet_preview.modal_lock_wallet_title')).toBeInTheDocument()
        expect(screen.getByText(expectedModalBody)).toBeInTheDocument()
        expect(screen.getByText('modal.confirm_button_accept')).toBeInTheDocument()
        expect(screen.getByText('modal.confirm_button_reject')).toBeInTheDocument()

        act(() => {
          // click on the modal's "cancel" button
          const lockWalletButton = screen.getByText('modal.confirm_button_reject')
          user.click(lockWalletButton)
        })
        await waitForElementToBeRemoved(screen.getByText('wallets.wallet_preview.modal_lock_wallet_title'))

        expect(mockStopWallet).not.toHaveBeenCalled()

        await act(async () => {
          const lockWalletButton = screen.getByText('wallets.wallet_preview.button_lock')
          user.click(lockWalletButton)
        })

        // modal appeared
        expect(screen.getByText('wallets.wallet_preview.modal_lock_wallet_title')).toBeInTheDocument()

        act(() => {
          // click on the modal's "confirm" button
          const lockWalletButton = screen.getByText('modal.confirm_button_accept')
          user.click(lockWalletButton)
        })
        await waitForElementToBeRemoved(screen.getByText('wallets.wallet_preview.modal_lock_wallet_title'))

        expect(mockStopWallet).toHaveBeenCalled()
      },
    )
  })
})
