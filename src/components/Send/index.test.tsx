import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { act, render, screen, waitFor } from '../../testUtils'
import * as apiMock from '../../libs/JmWalletApi'
import { clearSession, setSession } from '../../session'
import { CombinedRawWalletData, CurrentWallet, Utxo } from '../../context/WalletContext'
import Send from './index'

jest.mock('../../libs/JmWalletApi', () => ({
  ...jest.requireActual('../../libs/JmWalletApi'),
  getGetinfo: jest.fn(),
  getSession: jest.fn(),
  getWalletDisplay: jest.fn(),
  getWalletUtxos: jest.fn(),
  postConfigGet: jest.fn(),
  postDirectSend: jest.fn(),
  postCoinjoin: jest.fn(),
  getTakerStop: jest.fn(),
  getAddressNew: jest.fn(),
}))

const wallet: CurrentWallet = {
  walletFileName: 'send-screen-test.jmdat',
  token: 'send-screen-token',
  displayName: 'send-screen-test',
}

const AUTH_CONTEXT = {
  token: wallet.token,
  token_type: 'bearer',
  expires_in: 1800,
  scope: '',
  refresh_token: 'send-screen-refresh-token',
}

const HEALTHY_SPENDABLE_UTXO: Utxo = {
  address: 'healthy-spendable',
  path: 'm/0/0/0',
  label: '',
  value: 150_000,
  tries: 0,
  tries_remaining: 1,
  external: false,
  mixdepth: 0,
  confirmations: 6,
  frozen: false,
  utxo: 'healthy-spendable-tx:0',
}

const HEALTHY_FROZEN_UTXO: Utxo = {
  address: 'healthy-frozen',
  path: 'm/0/0/1',
  label: '',
  value: 50_000,
  tries: 0,
  tries_remaining: 1,
  external: false,
  mixdepth: 0,
  confirmations: 12,
  frozen: true,
  utxo: 'healthy-frozen-tx:1',
}

const WARNING_UTXO: Utxo = {
  address: 'warning-unconfirmed',
  path: 'm/1/0/0',
  label: '',
  value: 90_000,
  tries: 0,
  tries_remaining: 1,
  external: false,
  mixdepth: 1,
  confirmations: 2,
  frozen: false,
  utxo: 'warning-unconfirmed-tx:0',
}

const ALL_UTXOS = [HEALTHY_SPENDABLE_UTXO, HEALTHY_FROZEN_UTXO, WARNING_UTXO]
const UTXOS_AFTER_DIRECT_SEND = [HEALTHY_FROZEN_UTXO, WARNING_UTXO]

const walletDisplayResponse: CombinedRawWalletData['display'] = {
  walletinfo: {
    wallet_name: wallet.walletFileName,
    total_balance: '0.00290000',
    available_balance: '0.00240000',
    accounts: [
      {
        account: '0',
        account_balance: '0.00200000',
        available_balance: '0.00150000',
        branches: [
          {
            branch: '0',
            balance: '0.00200000',
            available_balance: '0.00150000',
            entries: [
              {
                hd_path: HEALTHY_SPENDABLE_UTXO.path,
                address: HEALTHY_SPENDABLE_UTXO.address,
                amount: '0.00150000',
                available_balance: '0.00150000',
                status: 'deposit',
                label: '',
                extradata: '',
              },
              {
                hd_path: HEALTHY_FROZEN_UTXO.path,
                address: HEALTHY_FROZEN_UTXO.address,
                amount: '0.00050000',
                available_balance: '0.00000000',
                status: 'deposit',
                label: '',
                extradata: '',
              },
              {
                hd_path: 'm/0/1/2',
                address: 'reused-destination-address',
                amount: '0.00000000',
                available_balance: '0.00000000',
                status: 'reused',
                label: '',
                extradata: '',
              },
            ],
          },
        ],
      },
      {
        account: '1',
        account_balance: '0.00090000',
        available_balance: '0.00090000',
        branches: [
          {
            branch: '0',
            balance: '0.00090000',
            available_balance: '0.00090000',
            entries: [
              {
                hd_path: WARNING_UTXO.path,
                address: WARNING_UTXO.address,
                amount: '0.00090000',
                available_balance: '0.00090000',
                status: 'deposit',
                label: '',
                extradata: '',
              },
            ],
          },
        ],
      },
    ],
  },
}

const defaultConfigValues = {
  minimum_makers: '4',
  tx_fees: '2',
  tx_fees_factor: '0.25',
  max_cj_fee_abs: '5000',
  max_cj_fee_rel: '0.001',
  max_sweep_fee_change: '0.8',
}

const createJsonResponse = (data: any) =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: {
      get: () => 'application/json',
    },
    json: () => Promise.resolve(data),
  })

const createErrorResponse = (status: number, message: string, statusText = 'Error') =>
  Promise.resolve({
    ok: false,
    status,
    statusText,
    headers: {
      get: () => 'application/json',
    },
    json: () => Promise.resolve({ message }),
  })

const setVisibleBalanceSettings = () => {
  window.localStorage.setItem(
    window.JM.SETTINGS_STORE_KEY,
    JSON.stringify({
      showBalance: true,
      unit: 'sats',
      showOnboarding: false,
      showCheatsheet: false,
      theme: 'light',
    }),
  )
}

const defaultSessionResponse = {
  session: true,
  maker_running: false,
  coinjoin_in_process: false,
  wallet_name: wallet.walletFileName,
  schedule: null,
  offer_list: null,
  nickname: null,
  rescanning: false,
}

const originalConsoleError = console.error

const mockSendApi = ({
  version = '0.9.11',
  sessionOverrides = {},
  configOverrides = {},
  initialUtxos = ALL_UTXOS,
  postDirectSendImplementation,
  postCoinjoinImplementation,
  getTakerStopImplementation,
}: {
  version?: string
  sessionOverrides?: Partial<typeof defaultSessionResponse>
  configOverrides?: Partial<Record<keyof typeof defaultConfigValues, string | null>>
  initialUtxos?: Utxo[]
  postDirectSendImplementation?: (setCurrentUtxos: (utxos: Utxo[]) => void) => Promise<any>
  postCoinjoinImplementation?: () => Promise<any>
  getTakerStopImplementation?: () => Promise<any>
} = {}) => {
  let currentUtxos = initialUtxos
  const setCurrentUtxos = (utxos: Utxo[]) => {
    currentUtxos = utxos
  }

  const configValues = {
    ...defaultConfigValues,
    ...configOverrides,
  }

  ;(apiMock.getGetinfo as jest.Mock).mockImplementation(() => createJsonResponse({ version }))
  ;(apiMock.getSession as jest.Mock).mockImplementation(() =>
    createJsonResponse({
      ...defaultSessionResponse,
      ...sessionOverrides,
    }),
  )
  ;(apiMock.getWalletDisplay as jest.Mock).mockImplementation(() => createJsonResponse(walletDisplayResponse))
  ;(apiMock.getWalletUtxos as jest.Mock).mockImplementation(() => createJsonResponse({ utxos: currentUtxos }))
  ;(apiMock.postConfigGet as jest.Mock).mockImplementation((_: unknown, req: { field: string }) => {
    const value = configValues[req.field as keyof typeof configValues]
    if (value === null) {
      return createErrorResponse(409, 'Config value missing', 'Conflict')
    }
    return createJsonResponse({ configvalue: value })
  })
  ;(apiMock.getAddressNew as jest.Mock).mockImplementation(() => createJsonResponse({ address: 'new-address' }))
  ;(apiMock.postDirectSend as jest.Mock).mockImplementation(() =>
    postDirectSendImplementation
      ? postDirectSendImplementation(setCurrentUtxos)
      : createJsonResponse({
          txinfo: {
            outputs: [],
            inputs: [],
            txid: 'default-direct-send-txid',
          },
        }),
  )
  ;(apiMock.postCoinjoin as jest.Mock).mockImplementation(() =>
    postCoinjoinImplementation ? postCoinjoinImplementation() : createJsonResponse({ status: 'started' }),
  )
  ;(apiMock.getTakerStop as jest.Mock).mockImplementation(() =>
    getTakerStopImplementation ? getTakerStopImplementation() : createJsonResponse({}),
  )

  return { setCurrentUtxos }
}

const renderSendScreen = (options?: Parameters<typeof mockSendApi>[0]) => {
  setVisibleBalanceSettings()
  setSession({
    walletFileName: wallet.walletFileName,
    auth: AUTH_CONTEXT,
  })
  const apiState = mockSendApi(options)

  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Send wallet={wallet} />
    </MemoryRouter>,
  )

  return apiState
}

const waitForSendScreenReady = async () => {
  expect(screen.getByText('send.title')).toBeInTheDocument()
  await screen.findByText('Apricot')
}

const openSendingOptions = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /send\.sending_options/i }))
}

const fillAmountInput = async (user: ReturnType<typeof userEvent.setup>, amount: string) => {
  const amountInput = screen.getByLabelText('send.label_amount_input')
  await user.click(amountInput)
  await user.type(amountInput, amount)
  await user.tab()
}

const fillBasicSendForm = async ({
  user,
  destination = 'external-destination',
  amount = '120000',
}: {
  user: ReturnType<typeof userEvent.setup>
  destination?: string
  amount?: string
}) => {
  await waitForSendScreenReady()
  await user.click(screen.getByText('Apricot'))
  await user.type(screen.getByLabelText('send.label_recipient'), destination)
  await fillAmountInput(user, amount)
}

const switchToDirectSend = async (user: ReturnType<typeof userEvent.setup>) => {
  await openSendingOptions(user)
  await user.click(screen.getByRole('checkbox'))
}

describe('<Send />', () => {
  let randomSpy: jest.SpyInstance<number, []>
  let consoleErrorSpy: jest.SpyInstance
  let consoleLogSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    window.localStorage.clear()
    window.sessionStorage.clear()
    window.scrollTo = jest.fn()
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0)
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((message?: unknown, ...args: unknown[]) => {
      if (
        typeof message === 'string' &&
        message.includes('The current testing environment is not configured to support act')
      ) {
        return
      }
      originalConsoleError(message, ...args)
    })
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    clearSession()
    randomSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleLogSpy.mockRestore()
    jest.useRealTimers()
  })

  it('loads the send form with provider-backed wallet data', async () => {
    renderSendScreen()

    await waitForSendScreenReady()

    expect(screen.getByText('Blueberry')).toBeInTheDocument()
    expect(apiMock.getWalletDisplay).toHaveBeenCalled()
    expect(apiMock.getWalletUtxos).toHaveBeenCalled()
    expect(apiMock.postConfigGet).toHaveBeenCalled()
  })

  it('shows the maker-running alert and disables the form', async () => {
    renderSendScreen({
      sessionOverrides: {
        maker_running: true,
      },
    })

    const makerAlert = await screen.findByText('send.text_maker_running')

    expect(makerAlert.closest('a')).toHaveAttribute('href', '/earn')
    expect(screen.getByRole('button', { name: 'send.button_send' })).toBeDisabled()
  })

  it('shows the running coinjoin state and surfaces abort errors', async () => {
    const user = userEvent.setup()
    renderSendScreen({
      sessionOverrides: {
        coinjoin_in_process: true,
      },
      getTakerStopImplementation: () => createErrorResponse(500, 'Unable to stop coinjoin', 'Internal Server Error'),
    })

    expect(await screen.findByText('send.text_coinjoin_already_running')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'global.abort' }))
    expect(await screen.findByText('send.confirm_abort_modal.title')).toBeInTheDocument()

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'modal.confirm_button_accept' }))
    })

    expect(await screen.findByText('Unable to stop coinjoin')).toBeInTheDocument()
  })

  it('blocks sending when max collaborator fee config is missing and opens the fee config modal', async () => {
    const user = userEvent.setup()
    renderSendScreen({
      configOverrides: {
        max_cj_fee_abs: null,
        max_cj_fee_rel: null,
      },
    })

    expect(await screen.findByText('send.taker_error_message_max_fees_config_missing')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'send.button_send' })).toBeDisabled()

    await user.click(screen.getByText('settings.show_fee_config'))

    expect(await screen.findByText('settings.fees.title')).toBeInTheDocument()
  })

  it('requires confirmation before direct-send execution and waits for spent UTXOs on success', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    renderSendScreen({
      postDirectSendImplementation: (setCurrentUtxos) => {
        setCurrentUtxos(UTXOS_AFTER_DIRECT_SEND)
        return createJsonResponse({
          txinfo: {
            outputs: [
              {
                address: 'direct-send-destination',
                value_sats: 120_000,
              },
            ],
            inputs: [
              {
                outpoint: HEALTHY_SPENDABLE_UTXO.utxo,
              },
            ],
            txid: 'successful-direct-send-txid',
          },
        })
      },
    })

    await fillBasicSendForm({
      user,
      destination: 'direct-send-destination',
      amount: '120000',
    })
    await switchToDirectSend(user)

    const initialReloadCount = (apiMock.getWalletUtxos as jest.Mock).mock.calls.length

    await user.click(screen.getByRole('button', { name: 'send.button_send_without_improved_privacy' }))

    expect(await screen.findByText('send.confirm_send_modal.title')).toBeInTheDocument()
    expect(apiMock.postDirectSend).not.toHaveBeenCalled()

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'modal.confirm_button_accept' }))
    })

    await waitFor(() =>
      expect(apiMock.postDirectSend).toHaveBeenCalledWith(
        expect.objectContaining({
          walletFileName: wallet.walletFileName,
          token: wallet.token,
        }),
        {
          mixdepth: 0,
          destination: 'direct-send-destination',
          amount_sats: 120_000,
          txfee: 2,
        },
      ),
    )

    expect(await screen.findByText('send.alert_payment_successful')).toBeInTheDocument()

    await act(async () => {
      jest.advanceTimersByTime(1_000)
    })

    await waitFor(() => {
      expect((apiMock.getWalletUtxos as jest.Mock).mock.calls.length).toBeGreaterThan(initialReloadCount)
      expect(screen.getByPlaceholderText('send.placeholder_recipient')).toHaveValue('')
      expect(screen.getByRole('button', { name: 'send.button_send' })).toBeEnabled()
    })
  })

  it('shows extracted bad-request errors for failed direct sends', async () => {
    const user = userEvent.setup()

    renderSendScreen({
      postDirectSendImplementation: () => createErrorResponse(400, 'Bad request reason', 'Bad Request'),
    })

    await fillBasicSendForm({
      user,
      destination: 'bad-request-destination',
      amount: '70000',
    })
    await switchToDirectSend(user)

    await user.click(screen.getByRole('button', { name: 'send.button_send_without_improved_privacy' }))
    await act(async () => {
      await user.click(await screen.findByRole('button', { name: 'modal.confirm_button_accept' }))
    })

    await waitFor(() => {
      expect(apiMock.postDirectSend).toHaveBeenCalled()
      expect(screen.getByText(/Bad request reason/)).toBeInTheDocument()
      expect(screen.getByText(/send\.direct_payment_error_message_bad_request/)).toBeInTheDocument()
    })
  })

  it('shows the sweep estimate in the confirmation modal, excludes frozen UTXOs, and sends amount 0', async () => {
    const user = userEvent.setup()

    renderSendScreen({
      postDirectSendImplementation: () =>
        createJsonResponse({
          txinfo: {
            outputs: [
              {
                address: 'sweep-destination',
                value_sats: 140_000,
              },
            ],
            inputs: [
              {
                outpoint: HEALTHY_SPENDABLE_UTXO.utxo,
              },
            ],
            txid: 'sweep-direct-send-txid',
          },
        }),
    })

    await waitForSendScreenReady()
    await user.click(screen.getByText('Apricot'))
    await user.type(screen.getByLabelText('send.label_recipient'), 'sweep-destination')
    await user.click(screen.getByRole('button', { name: 'send.button_sweep' }))
    await switchToDirectSend(user)

    await user.click(screen.getByRole('button', { name: 'send.button_send_without_improved_privacy' }))

    expect(await screen.findByText('send.confirm_send_modal.title')).toBeInTheDocument()
    expect(document.querySelector('[data-testid="sats-amount"][data-raw-value="150000"]')).toBeInTheDocument()
    expect(screen.getByText(HEALTHY_SPENDABLE_UTXO.address)).toBeInTheDocument()
    expect(screen.queryByText(HEALTHY_FROZEN_UTXO.address)).not.toBeInTheDocument()

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'modal.confirm_button_accept' }))
    })

    await waitFor(() =>
      expect(apiMock.postDirectSend).toHaveBeenCalledWith(
        expect.objectContaining({
          walletFileName: wallet.walletFileName,
          token: wallet.token,
        }),
        {
          mixdepth: 0,
          destination: 'sweep-destination',
          amount_sats: 0,
          txfee: 2,
        },
      ),
    )
  })

  it('starts coinjoin after confirmation and resets the form on success', async () => {
    const user = userEvent.setup()

    renderSendScreen({
      postCoinjoinImplementation: () => createJsonResponse({ status: 'started' }),
    })

    await fillBasicSendForm({
      user,
      destination: 'coinjoin-destination',
      amount: '50000',
    })

    await user.click(screen.getByRole('button', { name: 'send.button_send' }))
    expect(await screen.findByText('send.confirm_send_modal.title')).toBeInTheDocument()

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'modal.confirm_button_accept' }))
    })

    await waitFor(() =>
      expect(apiMock.postCoinjoin).toHaveBeenCalledWith(
        expect.objectContaining({
          walletFileName: wallet.walletFileName,
          token: wallet.token,
        }),
        {
          mixdepth: 0,
          destination: 'coinjoin-destination',
          amount_sats: 50_000,
          counterparties: 8,
          txfee: 2,
        },
      ),
    )

    expect(screen.getByPlaceholderText('send.placeholder_recipient')).toHaveValue('')
    expect(apiMock.postDirectSend).not.toHaveBeenCalled()
  })
})
