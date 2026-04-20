import { BrowserRouter } from 'react-router-dom'
import { act, fireEvent, render, screen, waitFor } from '../../testUtils'
import Send from './index'
import * as apiMock from '../../libs/JmWalletApi'
import type { WalletFileName, ApiToken } from '../../libs/JmWalletApi'
import { setSession } from '../../session'
import type { CurrentWallet } from '../../context/WalletContext'

jest.mock('../../libs/JmWalletApi', () => ({
  ...jest.requireActual('../../libs/JmWalletApi'),
  getWalletDisplay: jest.fn(),
  getWalletUtxos: jest.fn(),
  postCoinjoin: jest.fn(),
  postDirectSend: jest.fn(),
  postConfigGet: jest.fn(),
  getSession: jest.fn(),
  getGetinfo: jest.fn(),
}))

const neverResolves = new Promise(() => {})

const makeOkResponse = <T,>(data: T): Response => {
  const body = JSON.stringify(data)
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(JSON.parse(body)),
  } as unknown as Response
}

const mockGetinfoData = { version: '0.9.10' }
const mockSessionData = {
  session: true,
  maker_running: false,
  coinjoin_in_process: false,
  wallet_name: 'test.jmdat',
  schedule: null,
  offer_list: null,
  nickname: null,
  rescanning: false,
}
const mockWalletDisplayData = {
  walletinfo: {
    wallet_name: 'test.jmdat',
    total_balance: '1.00000000',
    available_balance: '1.00000000',
    accounts: [
      {
        account: '0',
        account_balance: '1.00000000',
        available_balance: '1.00000000',
        branches: [
          {
            branch: 'external addresses',
            balance: '1.00000000',
            available_balance: '1.00000000',
            entries: [
              {
                hd_path: 'm/0/0/0',
                address: 'bc1qtest000000000000000000000000000000aaaa',
                amount: '1.00000000',
                available_balance: '1.00000000',
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
const mockUtxosData = {
  utxos: [
    {
      address: 'bc1qtest000000000000000000000000000000aaaa',
      path: 'm/0/0/0',
      label: '',
      value: 100000000,
      tries: 0,
      tries_remaining: 3,
      external: true,
      mixdepth: 0,
      confirmations: 6,
      frozen: false,
      utxo: 'aaaa:0',
    },
  ],
}

const mockWallet: CurrentWallet = {
  walletFileName: 'test.jmdat' as WalletFileName,
  token: 'mock-token' as ApiToken,
  displayName: 'test',
}

const setup = () =>
  render(
    <BrowserRouter>
      <Send wallet={mockWallet} />
    </BrowserRouter>,
  )

const setupSession = () => {
  setSession({
    walletFileName: 'test.jmdat' as WalletFileName,
    auth: { token: 'mock-token' as ApiToken, refresh_token: undefined },
  })
}

describe('<Send />', () => {
  beforeEach(() => {
    sessionStorage.clear()
    ;(apiMock.getWalletDisplay as jest.Mock).mockReturnValue(neverResolves)
    ;(apiMock.getWalletUtxos as jest.Mock).mockReturnValue(neverResolves)
    ;(apiMock.postConfigGet as jest.Mock).mockReturnValue(neverResolves)
    ;(apiMock.getSession as jest.Mock).mockReturnValue(neverResolves)
    ;(apiMock.getGetinfo as jest.Mock).mockReturnValue(neverResolves)
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('renders without crashing', async () => {
    await act(async () => {
      setup()
    })
    // PageTitle renders a div with the i18n key as text (empty translations in test env)
    expect(screen.getByText('send.title')).toBeInTheDocument()
  })

  it('shows loading state while fetching wallet info', async () => {
    await act(async () => {
      setup()
    })
    // SendForm destination input not shown while wallet info is loading
    // (DestinationInputField uses aria-label={label} where label = t('send.label_recipient'))
    expect(screen.queryByRole('textbox', { name: /send\.label_recipient/i })).not.toBeInTheDocument()
  })

  it('renders the send form once all loading APIs resolve', async () => {
    setupSession()
    ;(apiMock.getGetinfo as jest.Mock).mockResolvedValue(makeOkResponse(mockGetinfoData))
    ;(apiMock.getSession as jest.Mock).mockResolvedValue(makeOkResponse(mockSessionData))
    ;(apiMock.getWalletDisplay as jest.Mock).mockResolvedValue(makeOkResponse(mockWalletDisplayData))
    ;(apiMock.getWalletUtxos as jest.Mock).mockResolvedValue(makeOkResponse(mockUtxosData))
    ;(apiMock.postConfigGet as jest.Mock).mockResolvedValue(makeOkResponse({ configvalue: '3' }))

    await act(async () => {
      setup()
    })
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /send.label_recipient/i })).toBeInTheDocument()
    })
  })

  it('calls postDirectSend when direct-send form is confirmed', async () => {
    setupSession()
    ;(apiMock.getGetinfo as jest.Mock).mockResolvedValue(makeOkResponse(mockGetinfoData))
    ;(apiMock.getSession as jest.Mock).mockResolvedValue(makeOkResponse(mockSessionData))
    ;(apiMock.getWalletDisplay as jest.Mock).mockResolvedValue(makeOkResponse(mockWalletDisplayData))
    ;(apiMock.getWalletUtxos as jest.Mock).mockResolvedValue(makeOkResponse(mockUtxosData))
    ;(apiMock.postConfigGet as jest.Mock).mockResolvedValue(makeOkResponse({ configvalue: '3' }))
    ;(apiMock.postDirectSend as jest.Mock).mockReturnValue(new Promise(() => {}))

    await act(async () => {
      setup()
    })

    // Wait for form to load
    const recipient = await screen.findByRole('textbox', { name: /send.label_recipient/i })

    // Select source jar 0 (click its radio button)
    const jarRadios = screen.getAllByRole('radio')
    await act(async () => {
      fireEvent.click(jarRadios[0])
    })

    // Fill recipient
    await act(async () => {
      fireEvent.change(recipient, { target: { value: 'bc1qrecipient000000000000000000000000test' } })
    })

    // Fill amount (find the amount textbox by aria-label)
    const amountInput = screen.getByRole('textbox', { name: /send.label_amount_input/i })
    await act(async () => {
      fireEvent.change(amountInput, { target: { value: '10000' } })
    })

    // Open sending options accordion to toggle off coinjoin
    const sendingOptionsBtn = screen.getAllByRole('button').find((b) => /sending/i.test(b.textContent || ''))
    if (sendingOptionsBtn) {
      await act(async () => {
        fireEvent.click(sendingOptionsBtn)
      })
    }

    // Disable coinjoin
    const coinjoinToggle = screen.queryByRole('checkbox', { name: /send.toggle_coinjoin/i })
    if (coinjoinToggle) {
      await act(async () => {
        fireEvent.click(coinjoinToggle)
      })
    }

    // Click send
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send.button_send/i }))
    })

    await waitFor(() => screen.getByRole('button', { name: /modal.confirm_button_accept/i }), { timeout: 3000 })
    fireEvent.click(screen.getByRole('button', { name: /modal.confirm_button_accept/i }))

    await waitFor(() => {
      expect(apiMock.postDirectSend).toHaveBeenCalled()
    })
  })

  it('shows error alert and re-enables send button when postDirectSend rejects', async () => {
    setupSession()
    ;(apiMock.getGetinfo as jest.Mock).mockResolvedValue(makeOkResponse(mockGetinfoData))
    ;(apiMock.getSession as jest.Mock).mockResolvedValue(makeOkResponse(mockSessionData))
    ;(apiMock.getWalletDisplay as jest.Mock).mockResolvedValue(makeOkResponse(mockWalletDisplayData))
    ;(apiMock.getWalletUtxos as jest.Mock).mockResolvedValue(makeOkResponse(mockUtxosData))
    ;(apiMock.postConfigGet as jest.Mock).mockResolvedValue(makeOkResponse({ configvalue: '3' }))
    ;(apiMock.postDirectSend as jest.Mock).mockRejectedValue(new Error('direct send failed'))

    await act(async () => {
      setup()
    })

    const recipient = await screen.findByRole('textbox', { name: /send.label_recipient/i })
    const jarRadios = screen.getAllByRole('radio')
    await act(async () => {
      fireEvent.click(jarRadios[0])
    })
    await act(async () => {
      fireEvent.change(recipient, { target: { value: 'bc1qrecipient000000000000000000000000test' } })
    })
    const amountInput = screen.getByRole('textbox', { name: /send.label_amount_input/i })
    await act(async () => {
      fireEvent.change(amountInput, { target: { value: '10000' } })
    })

    const sendingOptionsBtn = screen.getAllByRole('button').find((b) => /sending/i.test(b.textContent || ''))
    if (!sendingOptionsBtn) throw new Error('sending options button not found')
    await act(async () => {
      fireEvent.click(sendingOptionsBtn)
    })
    const coinjoinToggle = screen.getByRole('checkbox', { name: /send.toggle_coinjoin/i })
    await act(async () => {
      fireEvent.click(coinjoinToggle)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send.button_send/i }))
    })
    await waitFor(() => screen.getByRole('button', { name: /modal.confirm_button_accept/i }), { timeout: 3000 })
    fireEvent.click(screen.getByRole('button', { name: /modal.confirm_button_accept/i }))

    await waitFor(() => {
      expect(screen.getByText('direct send failed')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /send.button_send/i })).not.toBeDisabled()
  })

  it('calls postCoinjoin when coinjoin form is confirmed', async () => {
    setupSession()
    ;(apiMock.getGetinfo as jest.Mock).mockResolvedValue(makeOkResponse(mockGetinfoData))
    ;(apiMock.getSession as jest.Mock).mockResolvedValue(makeOkResponse(mockSessionData))
    ;(apiMock.getWalletDisplay as jest.Mock).mockResolvedValue(makeOkResponse(mockWalletDisplayData))
    ;(apiMock.getWalletUtxos as jest.Mock).mockResolvedValue(makeOkResponse(mockUtxosData))
    ;(apiMock.postConfigGet as jest.Mock).mockResolvedValue(makeOkResponse({ configvalue: '3' }))
    ;(apiMock.postCoinjoin as jest.Mock).mockReturnValue(new Promise(() => {}))

    await act(async () => {
      setup()
    })

    const recipient = await screen.findByRole('textbox', { name: /send.label_recipient/i })
    const jarRadios = screen.getAllByRole('radio')
    await act(async () => {
      fireEvent.click(jarRadios[0])
    })
    await act(async () => {
      fireEvent.change(recipient, { target: { value: 'bc1qrecipient000000000000000000000000test' } })
    })
    const amountInput = screen.getByRole('textbox', { name: /send.label_amount_input/i })
    await act(async () => {
      fireEvent.change(amountInput, { target: { value: '10000' } })
    })

    // Leave coinjoin ON (default) — do not open accordion or toggle

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send.button_send/i }))
    })
    await waitFor(() => screen.getByRole('button', { name: /modal.confirm_button_accept/i }), { timeout: 3000 })
    fireEvent.click(screen.getByRole('button', { name: /modal.confirm_button_accept/i }))

    await waitFor(() => {
      expect(apiMock.postCoinjoin).toHaveBeenCalledWith(
        expect.objectContaining({ walletFileName: 'test.jmdat' }),
        expect.objectContaining({ counterparties: expect.any(Number) }),
      )
    })
  })
})
