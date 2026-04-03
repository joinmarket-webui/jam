import type { PropsWithChildren } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import type { CurrentWallet } from '../context/WalletContext'

import MainWalletView from './MainWalletView'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const mockedNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
}))

const mockUseServiceInfo = jest.fn()
jest.mock('../context/ServiceInfoContext', () => ({
  useServiceInfo: () => mockUseServiceInfo(),
}))

const mockUseSettings = jest.fn()
const mockUseSettingsDispatch = jest.fn()
jest.mock('../context/SettingsContext', () => ({
  useSettings: () => mockUseSettings(),
  useSettingsDispatch: () => mockUseSettingsDispatch(),
}))

const mockUseCurrentWalletInfo = jest.fn()
const mockReloadUtxos = jest.fn()
jest.mock('../context/WalletContext', () => ({
  useCurrentWalletInfo: () => mockUseCurrentWalletInfo(),
  useReloadCurrentWalletInfo: () => ({
    reloadUtxos: mockReloadUtxos,
  }),
}))

jest.mock('./Balance', () => () => <div>Balance</div>)
jest.mock('./Sprite', () => () => <div>Sprite</div>)
jest.mock('./ExtendedLink', () => ({
  ExtendedLink: ({ children, ...props }: PropsWithChildren<Record<string, unknown>>) => <a {...props}>{children}</a>,
}))
jest.mock('./jar_details/JarDetailsOverlay', () => ({
  JarDetailsOverlay: () => null,
}))
jest.mock('./Jars', () => ({
  Jars: () => <div>Jars</div>,
}))
jest.mock('./Divider', () => () => <div>Divider</div>)

describe('<MainWalletView />', () => {
  const wallet: CurrentWallet = {
    walletFileName: 'wallet.jmdat',
    displayName: 'wallet',
    token: 'token',
  }

  beforeEach(() => {
    mockUseServiceInfo.mockReturnValue({
      sessionActive: true,
      rescanning: false,
    })
    mockUseSettings.mockReturnValue({
      unit: 'BTC',
      showBalance: true,
    })
    mockUseSettingsDispatch.mockReturnValue(jest.fn())
    mockUseCurrentWalletInfo.mockReturnValue({
      balanceSummary: {
        calculatedTotalBalanceInSats: 1,
        accountBalances: {
          0: {
            calculatedTotalBalanceInSats: 1,
          },
        },
      },
      data: {
        display: {
          walletinfo: {
            accounts: [],
          },
        },
      },
    })
    mockReloadUtxos.mockResolvedValue({})
  })

  it('should add the journey state attribute to the root container', async () => {
    render(
      <BrowserRouter>
        <MainWalletView wallet={wallet} />
      </BrowserRouter>,
    )

    const root = await screen.findByTestId('main-wallet-view')

    await waitFor(() => {
      expect(root).toHaveAttribute('data-journey-state', 'ready')
    })
  })

  it('should expose the no-wallet journey state when wallet is missing', async () => {
    render(
      <BrowserRouter>
        <MainWalletView wallet={null} />
      </BrowserRouter>,
    )

    const root = await screen.findByTestId('main-wallet-view')

    expect(root).toHaveAttribute('data-journey-state', 'no-wallet')
  })
})
