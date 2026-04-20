import { useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { act, fireEvent, render, screen, waitFor } from '../testUtils'
import Earn, { toStartMakerRequest, EarnFormValues } from './Earn'
import * as apiMock from '../libs/JmWalletApi'
import { setSession } from '../session'
import { useReloadCurrentWalletInfo } from '../context/WalletContext'
import type { AmountValue } from './BitcoinAmountInput'
import type { CurrentWallet } from '../context/WalletContext'
import type { WalletFileName, ApiToken } from '../libs/JmWalletApi'

jest.mock('../libs/JmWalletApi', () => ({
  ...jest.requireActual('../libs/JmWalletApi'),
  getGetinfo: jest.fn(),
  getSession: jest.fn(),
  getWalletDisplay: jest.fn(),
  getWalletUtxos: jest.fn(),
  postMakerStart: jest.fn(),
  getMakerStop: jest.fn(),
  postConfigGet: jest.fn(),
}))

const neverResolves = new Promise(() => {})

const makeOkResponse = <T,>(data: T) => ({ ok: true, json: () => Promise.resolve(data) })

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
    total_balance: '0.00100000',
    available_balance: '0.00100000',
    accounts: [{ account: '0', account_balance: '0.00100000', available_balance: '0.00100000', branches: [] }],
  },
}
const mockUtxosData = {
  utxos: [
    {
      utxo: 'abc0000000000000000000000000000000000000000000000000000000000000001:0',
      address: 'bc1qtest',
      path: "m/49'/1'/0'/0/0",
      label: '',
      value: 10_000_000,
      tries: 0,
      tries_remaining: 0,
      external: false,
      mixdepth: 0,
      confirmations: 6,
      frozen: false,
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
      <Earn wallet={mockWallet} />
    </BrowserRouter>,
  )

// Pre-loads both utxos and display data so that currentWalletInfo is populated
// in WalletContext before Earn mounts, enabling the start button.
const WalletPreloader = ({ children }: { children: React.ReactNode }) => {
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    reloadCurrentWalletInfo
      .reloadAllForce({ signal: ctrl.signal })
      .then(() => setReady(true))
      .catch(() => setReady(true))
    return () => ctrl.abort()
  }, [reloadCurrentWalletInfo])

  return ready ? <>{children}</> : null
}

const setupFull = () =>
  render(
    <BrowserRouter>
      <WalletPreloader>
        <Earn wallet={mockWallet} />
      </WalletPreloader>
    </BrowserRouter>,
  )

const setupSession = () => {
  setSession({
    walletFileName: 'test.jmdat' as any,
    auth: { token: 'mock-token' as any, refresh_token: undefined },
  } as any)
}

describe('<Earn />', () => {
  beforeEach(() => {
    sessionStorage.clear()
    ;(apiMock.getGetinfo as jest.Mock).mockReturnValue(neverResolves)
    ;(apiMock.getSession as jest.Mock).mockReturnValue(neverResolves)
    ;(apiMock.getWalletDisplay as jest.Mock).mockReturnValue(neverResolves)
    ;(apiMock.getWalletUtxos as jest.Mock).mockReturnValue(neverResolves)
    ;(apiMock.postConfigGet as jest.Mock).mockReturnValue(neverResolves)
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('renders without crashing', async () => {
    await act(async () => {
      setup()
    })
    expect(screen.getByText('earn.title')).toBeInTheDocument()
  })

  it('shows start button when maker is not running', async () => {
    await act(async () => {
      setup()
    })
    // When context reports makerRunning=false (default), start button visible
    expect(screen.getByRole('button', { name: 'earn.button_start' })).toBeInTheDocument()
  })

  it('start button is disabled while maker is waiting to start', async () => {
    setupSession()
    ;(apiMock.getGetinfo as jest.Mock).mockResolvedValue(makeOkResponse(mockGetinfoData))
    ;(apiMock.getSession as jest.Mock).mockResolvedValue(makeOkResponse(mockSessionData))
    ;(apiMock.getWalletDisplay as jest.Mock).mockResolvedValue(makeOkResponse(mockWalletDisplayData))
    ;(apiMock.getWalletUtxos as jest.Mock).mockResolvedValue(makeOkResponse(mockUtxosData))
    ;(apiMock.postMakerStart as jest.Mock).mockReturnValue(new Promise(() => {}))

    await act(async () => {
      setupFull()
    })

    const startBtn = await screen.findByRole('button', { name: /earn.button_start/i })

    await waitFor(() => {
      expect(startBtn).not.toBeDisabled()
    })

    fireEvent.click(startBtn)

    await waitFor(() => {
      expect(startBtn).toBeDisabled()
    })
  })

  it('calls postMakerStart when start is clicked', async () => {
    setupSession()
    ;(apiMock.getGetinfo as jest.Mock).mockResolvedValue(makeOkResponse(mockGetinfoData))
    ;(apiMock.getSession as jest.Mock).mockResolvedValue(makeOkResponse(mockSessionData))
    ;(apiMock.getWalletDisplay as jest.Mock).mockResolvedValue(makeOkResponse(mockWalletDisplayData))
    ;(apiMock.getWalletUtxos as jest.Mock).mockResolvedValue(makeOkResponse(mockUtxosData))
    ;(apiMock.postMakerStart as jest.Mock).mockReturnValue(new Promise(() => {}))

    await act(async () => {
      setupFull()
    })

    const startBtn = await screen.findByRole('button', { name: /earn.button_start/i })

    await waitFor(() => {
      expect(startBtn).not.toBeDisabled()
    })

    fireEvent.click(startBtn)

    await waitFor(() => {
      expect(apiMock.postMakerStart).toHaveBeenCalledWith(
        expect.objectContaining({ walletFileName: 'test.jmdat' }),
        expect.objectContaining({ ordertype: expect.any(String) }),
      )
    })
  })

  it('shows error alert and re-enables start button when postMakerStart rejects', async () => {
    setupSession()
    ;(apiMock.getGetinfo as jest.Mock).mockResolvedValue(makeOkResponse(mockGetinfoData))
    ;(apiMock.getSession as jest.Mock).mockResolvedValue(makeOkResponse(mockSessionData))
    ;(apiMock.getWalletDisplay as jest.Mock).mockResolvedValue(makeOkResponse(mockWalletDisplayData))
    ;(apiMock.getWalletUtxos as jest.Mock).mockResolvedValue(makeOkResponse(mockUtxosData))
    ;(apiMock.postMakerStart as jest.Mock).mockRejectedValue(new Error('maker start failed'))

    await act(async () => {
      setupFull()
    })

    const startBtn = await screen.findByRole('button', { name: /earn.button_start/i })
    await waitFor(() => {
      expect(startBtn).not.toBeDisabled()
    })

    await act(async () => {
      fireEvent.click(startBtn)
    })

    await waitFor(() => {
      expect(screen.getByText('maker start failed')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(startBtn).not.toBeDisabled()
    })
  })

  it('calls getMakerStop when stop is clicked', async () => {
    setupSession()
    ;(apiMock.getGetinfo as jest.Mock).mockResolvedValue(makeOkResponse(mockGetinfoData))
    ;(apiMock.getSession as jest.Mock).mockResolvedValue(makeOkResponse({ ...mockSessionData, maker_running: true }))
    ;(apiMock.getWalletDisplay as jest.Mock).mockResolvedValue(makeOkResponse(mockWalletDisplayData))
    ;(apiMock.getWalletUtxos as jest.Mock).mockResolvedValue(makeOkResponse(mockUtxosData))
    ;(apiMock.getMakerStop as jest.Mock).mockReturnValue(new Promise(() => {}))

    await act(async () => {
      setupFull()
    })

    // serviceInfo.makerRunning=true causes stop form to render instead of start form
    const stopBtn = await screen.findByRole('button', { name: /earn.button_stop/i })
    await waitFor(() => {
      expect(stopBtn).not.toBeDisabled()
    })

    fireEvent.click(stopBtn)

    await waitFor(() => {
      expect(apiMock.getMakerStop).toHaveBeenCalledWith(expect.objectContaining({ walletFileName: 'test.jmdat' }))
    })
  })
})

const makeAmountValue = (value: number): AmountValue => ({ value, isSweep: false })

const relValues: EarnFormValues = {
  offertype: 'sw0reloffer',
  feeRel: 0.0003,
  feeAbs: makeAmountValue(250),
  minsize: makeAmountValue(100_000),
}

const absValues: EarnFormValues = {
  offertype: 'sw0absoffer',
  feeRel: 0.0003,
  feeAbs: makeAmountValue(250),
  minsize: makeAmountValue(100_000),
}

describe('toStartMakerRequest', () => {
  it('relative offer: sets cjfee_r from feeRel, zeroes cjfee_a', () => {
    const req = toStartMakerRequest(relValues)
    expect(req.cjfee_r).toBe(0.0003)
    expect(req.cjfee_a).toBe(0)
    expect(req.ordertype).toBe('sw0reloffer')
    expect(req.minsize).toBe(100_000)
  })

  it('absolute offer: sets cjfee_a from feeAbs.value, zeroes cjfee_r', () => {
    const req = toStartMakerRequest(absValues)
    expect(req.cjfee_a).toBe(250)
    expect(req.cjfee_r).toBe(0)
    expect(req.ordertype).toBe('sw0absoffer')
    expect(req.minsize).toBe(100_000)
  })

  it('both fee properties always present in the returned request', () => {
    const relReq = toStartMakerRequest(relValues)
    expect(relReq.cjfee_a).toBeDefined()
    expect(relReq.cjfee_r).toBeDefined()

    const absReq = toStartMakerRequest(absValues)
    expect(absReq.cjfee_a).toBeDefined()
    expect(absReq.cjfee_r).toBeDefined()
  })

  it('ordertype and minsize pass through unchanged for both offer types', () => {
    const relReq = toStartMakerRequest(relValues)
    expect(relReq.ordertype).toBe(relValues.offertype)
    expect(relReq.minsize).toBe(relValues.minsize!.value)

    const absReq = toStartMakerRequest(absValues)
    expect(absReq.ordertype).toBe(absValues.offertype)
    expect(absReq.minsize).toBe(absValues.minsize!.value)
  })
})
