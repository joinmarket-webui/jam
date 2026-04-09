import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '../../testUtils'
import * as apiMock from '../../libs/JmWalletApi'
import { clearSession, setSession } from '../../session'
import { toBalanceSummary } from '../../context/BalanceSummary'
import { CombinedRawWalletData, CurrentWallet, WalletInfo, groupByJar, Utxo } from '../../context/WalletContext'
import { SendForm, SendFormValues } from './SendForm'

jest.mock('../../libs/JmWalletApi', () => ({
  ...jest.requireActual('../../libs/JmWalletApi'),
  getGetinfo: jest.fn(),
  getSession: jest.fn(),
  getWalletDisplay: jest.fn(),
  getWalletUtxos: jest.fn(),
  postConfigGet: jest.fn(),
  getAddressNew: jest.fn(),
  postFreeze: jest.fn(),
}))

const wallet: CurrentWallet = {
  walletFileName: 'send-form-test.jmdat',
  token: 'send-form-token',
  displayName: 'send-form-test',
}

const AUTH_CONTEXT = {
  token: wallet.token,
  token_type: 'bearer',
  expires_in: 1800,
  scope: '',
  refresh_token: 'send-form-refresh-token',
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

const REUSED_DESTINATION_ADDRESS = 'reused-destination-address'

const ALL_UTXOS = [HEALTHY_SPENDABLE_UTXO, HEALTHY_FROZEN_UTXO, WARNING_UTXO]

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
                address: REUSED_DESTINATION_ADDRESS,
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

const createWalletInfo = (): WalletInfo => {
  const data: CombinedRawWalletData = {
    utxos: {
      utxos: ALL_UTXOS,
    },
    display: walletDisplayResponse,
  }

  return {
    balanceSummary: toBalanceSummary(data),
    addressSummary: {
      [HEALTHY_SPENDABLE_UTXO.address]: {
        address: HEALTHY_SPENDABLE_UTXO.address,
        status: 'deposit',
      },
      [HEALTHY_FROZEN_UTXO.address]: {
        address: HEALTHY_FROZEN_UTXO.address,
        status: 'deposit',
      },
      [WARNING_UTXO.address]: {
        address: WARNING_UTXO.address,
        status: 'deposit',
      },
      [REUSED_DESTINATION_ADDRESS]: {
        address: REUSED_DESTINATION_ADDRESS,
        status: 'reused',
      },
    },
    fidelityBondSummary: {
      fbOutputs: [],
    },
    utxosByJar: groupByJar(ALL_UTXOS),
    data,
  }
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

const createConfigErrorResponse = (message = 'Config value missing') =>
  Promise.resolve({
    ok: false,
    status: 409,
    statusText: 'Conflict',
    headers: {
      get: () => 'application/json',
    },
    json: () => Promise.resolve({ message }),
  })

const defaultConfigValues = {
  minimum_makers: '4',
  tx_fees: '2',
  tx_fees_factor: '0.25',
  max_cj_fee_abs: '5000',
  max_cj_fee_rel: '0.001',
  max_sweep_fee_change: '0.8',
}

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

const mockProviderApi = ({
  version = '0.9.11',
  configOverrides = {},
}: {
  version?: string
  configOverrides?: Partial<Record<keyof typeof defaultConfigValues, string | null>>
} = {}) => {
  const configValues = {
    ...defaultConfigValues,
    ...configOverrides,
  }

  ;(apiMock.getGetinfo as jest.Mock).mockImplementation(() => createJsonResponse({ version }))
  ;(apiMock.getSession as jest.Mock).mockImplementation(() =>
    createJsonResponse({
      session: true,
      maker_running: false,
      coinjoin_in_process: false,
      wallet_name: wallet.walletFileName,
      schedule: null,
      offer_list: null,
      nickname: null,
      rescanning: false,
    }),
  )
  ;(apiMock.getWalletDisplay as jest.Mock).mockImplementation(() => createJsonResponse(walletDisplayResponse))
  ;(apiMock.getWalletUtxos as jest.Mock).mockImplementation(() => createJsonResponse({ utxos: ALL_UTXOS }))
  ;(apiMock.getAddressNew as jest.Mock).mockImplementation(() => createJsonResponse({ address: 'new-address' }))
  ;(apiMock.postFreeze as jest.Mock).mockImplementation(() => createJsonResponse({}))
  ;(apiMock.postConfigGet as jest.Mock).mockImplementation((_: unknown, req: { field: string }) => {
    const value = configValues[req.field as keyof typeof configValues]
    if (value === null) {
      return createConfigErrorResponse()
    }
    return createJsonResponse({ configvalue: value })
  })
}

const defaultInitialValues = (): SendFormValues => ({
  sourceJarIndex: 0,
  destination: {
    value: null,
    fromJar: null,
  },
  amount: {
    value: null,
    isSweep: false,
  },
  txFee: {
    value: 2,
    unit: 'blocks',
  },
  isCoinJoin: true,
  numCollaborators: 8,
})

const renderSendForm = ({
  initialValues = defaultInitialValues(),
  version,
}: {
  initialValues?: SendFormValues
  version?: string
} = {}) => {
  setVisibleBalanceSettings()
  setSession({
    walletFileName: wallet.walletFileName,
    auth: AUTH_CONTEXT,
  })
  mockProviderApi({ version })

  const onSubmit = jest.fn().mockResolvedValue(undefined)

  render(
    <SendForm
      initialValues={initialValues}
      onSubmit={onSubmit}
      isLoading={false}
      walletInfo={createWalletInfo()}
      wallet={wallet}
      minNumCollaborators={4}
      loadNewWalletAddress={jest.fn().mockResolvedValue('new-address')}
      feeConfigValues={{
        tx_fees: {
          value: 2,
          unit: 'blocks',
        },
        tx_fees_factor: 0.25,
        max_cj_fee_abs: 5000,
        max_cj_fee_rel: 0.001,
        max_sweep_fee_change: 0.8,
      }}
      reloadFeeConfigValues={jest.fn()}
    />,
  )

  return { onSubmit }
}

const openSendingOptions = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /send\.sending_options/i }))
}

describe('<SendForm />', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  afterEach(() => {
    clearSession()
  })

  it('shows source jar, destination, amount, and collaborator validation errors on invalid submit', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderSendForm({
      initialValues: {
        ...defaultInitialValues(),
        sourceJarIndex: undefined,
        numCollaborators: undefined,
      },
    })

    await openSendingOptions(user)
    await user.click(screen.getByRole('button', { name: 'send.button_send' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByText('send.feedback_invalid_source_jar')).toBeInTheDocument()
    expect(screen.getByText('send.feedback_invalid_destination_address')).toBeInTheDocument()
    expect(screen.getByText('send.feedback_invalid_amount')).toBeInTheDocument()
    expect(screen.getByText('send.error_invalid_num_collaborators')).toBeInTheDocument()
  })

  it('rejects reused destination addresses', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderSendForm()

    await user.type(screen.getByLabelText('send.label_recipient'), REUSED_DESTINATION_ADDRESS)
    await user.click(screen.getByLabelText('send.label_amount_input'))
    await user.type(screen.getByLabelText('send.label_amount_input'), '1000')
    await user.tab()
    await user.click(screen.getByRole('button', { name: 'send.button_send' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByText('send.feedback_reused_address')).toBeInTheDocument()
  })

  it('enters and clears sweep mode from the amount field', async () => {
    const user = userEvent.setup()
    renderSendForm()

    const amountInput = screen.getByLabelText('send.label_amount_input')

    expect(amountInput).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'send.button_sweep' }))

    expect(screen.getByLabelText('send.label_amount_input')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'send.button_clear_sweep' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'send.button_sweep_amount_breakdown' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'send.button_clear_sweep' }))

    expect(screen.getByLabelText('send.label_amount_input')).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'send.button_sweep_amount_breakdown' })).not.toBeInTheDocument()
  })

  it('changes the submit CTA when coinjoin is turned off', async () => {
    const user = userEvent.setup()
    renderSendForm()

    await openSendingOptions(user)
    await user.click(screen.getByRole('checkbox'))

    expect(screen.getByRole('button', { name: 'send.button_send_without_improved_privacy' })).toBeInTheDocument()
  })

  it('shows a coinjoin precondition warning for jars with insufficient confirmations', async () => {
    const user = userEvent.setup()
    renderSendForm()

    await user.click(screen.getByText('Blueberry'))

    expect(await screen.findByText('send.coinjoin_precondition.hint_missing_confirmations')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'send.button_send_despite_warning' })).toBeInTheDocument()
  })

  it('hides the tx-fee input on backend versions below 0.9.11', async () => {
    const user = userEvent.setup()
    renderSendForm({ version: '0.9.10' })

    await openSendingOptions(user)
    await waitFor(() => expect(apiMock.getGetinfo).toHaveBeenCalled())

    expect(screen.queryByLabelText('send.label_tx_fees')).not.toBeInTheDocument()
  })

  it('shows the tx-fee input on backend versions 0.9.11 and above', async () => {
    const user = userEvent.setup()
    renderSendForm({ version: '0.9.11' })

    await openSendingOptions(user)

    expect(await screen.findByLabelText('send.label_tx_fees')).toBeInTheDocument()
  })
})
