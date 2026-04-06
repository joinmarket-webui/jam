import userEvent from '@testing-library/user-event'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import Receive from './Receive'
import * as Api from '../libs/JmWalletApi'
import { useSettings } from '../context/SettingsContext'
import { useServiceInfo } from '../context/ServiceInfoContext'
import { useCurrentWalletInfo } from '../context/WalletContext'
import i18n from '../i18n/testConfig'

const mockCopyAction = jest.fn()
const mockShareAction = jest.fn()

jest.mock('../libs/JmWalletApi', () => ({
  ...jest.requireActual('../libs/JmWalletApi'),
  getAddressNew: jest.fn(),
}))

jest.mock('../context/SettingsContext', () => ({
  ...jest.requireActual('../context/SettingsContext'),
  useSettings: jest.fn(),
}))

jest.mock('../context/ServiceInfoContext', () => ({
  ...jest.requireActual('../context/ServiceInfoContext'),
  useServiceInfo: jest.fn(),
}))

jest.mock('../context/WalletContext', () => ({
  ...jest.requireActual('../context/WalletContext'),
  useCurrentWalletInfo: jest.fn(),
}))

jest.mock('./Accordion', () => ({
  __esModule: true,
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <div>{title}</div>
      {children}
    </div>
  ),
}))

jest.mock('./BitcoinQR', () => ({
  BitcoinQR: ({ address }: { address: string }) => <div data-testid="bitcoin-qr">{address}</div>,
}))

jest.mock('./CopyButton', () => ({
  CopyButton: ({ value, disabled, text }: { value: string; disabled?: boolean; text: React.ReactNode }) => (
    <button type="button" disabled={disabled} onClick={() => !disabled && mockCopyAction(value)}>
      {text}
    </button>
  ),
}))

jest.mock('./ShareButton', () => ({
  ShareButton: ({ value, disabled }: { value: string; disabled?: boolean }) => (
    <button type="button" disabled={disabled} onClick={() => !disabled && mockShareAction({ text: value })}>
      Share
    </button>
  ),
  checkIsWebShareAPISupported: () => true,
}))

jest.mock('./jars/Jar', () => ({
  SelectableJar: ({
    index,
    isSelected,
    isSelectable,
    onClick,
  }: {
    index: number
    isSelected: boolean
    isSelectable: boolean
    onClick: (index: number) => void
  }) => (
    <button type="button" disabled={!isSelectable} aria-pressed={isSelected} onClick={() => onClick(index)}>
      jar-{index}
    </button>
  ),
  jarFillLevel: () => 0,
}))

describe('<Receive />', () => {
  const wallet = {
    walletFileName: 'test-wallet.jmdat',
    displayName: 'test-wallet',
    token: 'test-token',
  }

  const mockUseSettings = useSettings as jest.Mock
  const mockUseServiceInfo = useServiceInfo as jest.Mock
  const mockUseCurrentWalletInfo = useCurrentWalletInfo as jest.Mock
  const mockGetAddressNew = Api.getAddressNew as jest.Mock

  const navigatorShare = jest.fn()

  const walletInfo = {
    balanceSummary: {
      accountBalances: {
        0: {
          accountIndex: 0,
          calculatedAvailableBalanceInSats: 125000,
          calculatedFrozenOrLockedBalanceInSats: 0,
          calculatedTotalBalanceInSats: 125000,
        },
        1: {
          accountIndex: 1,
          calculatedAvailableBalanceInSats: 50000,
          calculatedFrozenOrLockedBalanceInSats: 0,
          calculatedTotalBalanceInSats: 50000,
        },
      },
      calculatedTotalBalanceInSats: 175000,
    },
  }

  const renderComponent = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <Receive wallet={wallet} />
        </MemoryRouter>
      </I18nextProvider>,
    )

  const mockAddressResponse = (address: string) => ({
    ok: true,
    json: async () => ({ address }),
  })

  beforeAll(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: navigatorShare,
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseSettings.mockReturnValue({
      theme: 'light',
      unit: 'BTC',
      showBalance: true,
    })
    mockUseServiceInfo.mockReturnValue({ rescanning: false })
    mockUseCurrentWalletInfo.mockReturnValue(walletInfo)

    mockCopyAction.mockReset()
    mockShareAction.mockReset()
    navigatorShare.mockResolvedValue(undefined)
  })

  it('refreshes the receive address when requesting a new address', async () => {
    const user = userEvent.setup()
    mockGetAddressNew
      .mockResolvedValueOnce(mockAddressResponse('bcrt1qfirstaddress'))
      .mockResolvedValueOnce(mockAddressResponse('bcrt1qsecondaddress'))

    renderComponent()

    expect(await screen.findByText('bcrt1qfirstaddress')).toBeInTheDocument()
    const refreshButton = await screen.findByRole('button', { name: 'receive.button_new_address' })

    await user.click(refreshButton)

    expect(await screen.findByText('bcrt1qsecondaddress')).toBeInTheDocument()
    expect(mockGetAddressNew).toHaveBeenNthCalledWith(1, {
      ...wallet,
      mixdepth: 0,
      signal: expect.any(AbortSignal),
    })
    expect(mockGetAddressNew).toHaveBeenNthCalledWith(2, {
      ...wallet,
      mixdepth: 0,
      signal: expect.any(AbortSignal),
    })
  })

  it('shows validation feedback for invalid receive amounts', async () => {
    mockGetAddressNew.mockResolvedValue(mockAddressResponse('bcrt1qvalidationaddress'))

    renderComponent()

    await screen.findByText('bcrt1qvalidationaddress')

    const amountInput = screen.getByLabelText('receive.label_amount')

    fireEvent.focus(amountInput)
    fireEvent.change(amountInput, { target: { value: '0' } })
    fireEvent.blur(amountInput)

    expect(await screen.findByText('receive.feedback_invalid_amount')).toBeVisible()
    expect(amountInput).toHaveAttribute('data-value', '0')
  })

  it('disables receive actions while rescanning', () => {
    mockUseServiceInfo.mockReturnValue({ rescanning: true })

    renderComponent()

    expect(screen.getByText('app.alert_rescan_in_progress')).toBeVisible()
    expect(screen.getByRole('button', { name: 'receive.button_new_address' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'receive.button_copy_address' })).toBeDisabled()
    expect(screen.getByLabelText('receive.label_amount')).toBeDisabled()
    expect(mockGetAddressNew).not.toHaveBeenCalled()
  })

  it('copies and shares the generated address', async () => {
    const user = userEvent.setup()
    mockGetAddressNew.mockResolvedValue(mockAddressResponse('bcrt1qcopyshareaddress'))

    renderComponent()

    await screen.findByText('bcrt1qcopyshareaddress')
    const copyButton = await screen.findByRole('button', { name: 'receive.button_copy_address' })
    const shareButton = screen.getByRole('button', { name: 'Share' })
    await waitFor(() => expect(copyButton).not.toBeDisabled())

    await user.click(copyButton)
    expect(mockCopyAction).toHaveBeenCalledWith('bcrt1qcopyshareaddress')

    await user.click(shareButton)
    expect(mockShareAction).toHaveBeenCalledWith({ text: 'bcrt1qcopyshareaddress' })
  })
})
