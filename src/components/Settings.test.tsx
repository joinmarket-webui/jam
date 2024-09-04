import { BrowserRouter } from 'react-router-dom'
import { render, screen, act } from '../testUtils'

import Settings from './Settings'
import { CurrentWallet } from '../context/WalletContext'

const dummyWalletFileName = 'dummy.jmdat'
const dummyToken = 'dummyToken'

describe('<Settings />', () => {
  const setup = ({ wallet }: { wallet: CurrentWallet }) => {
    render(
      <BrowserRouter>
        <Settings wallet={wallet} stopWallet={() => ({})} />
      </BrowserRouter>,
    )
  }

  it('should render settings without errors', async () => {
    await act(async () =>
      setup({
        wallet: {
          walletFileName: dummyWalletFileName,
          displayName: dummyWalletFileName,
          token: dummyToken,
        },
      }),
    )

    expect(screen.getByText('settings.section_title_display')).toBeVisible()
    expect(screen.queryByText(/settings.(show|hide)_balance/)).toBeVisible()
    expect(screen.queryByText(/settings.use_(sats|bitcoin)/)).toBeVisible()
    expect(screen.queryByText(/settings.use_(dark|light)_theme/)).toBeVisible()
    expect(screen.queryByText(/English/)).toBeVisible()

    expect(screen.getByText('settings.section_title_wallet')).toBeVisible()
    expect(screen.queryByText(/settings.(show|hide)_seed/)).toBeVisible()
    expect(screen.queryByText(/settings.button_switch_wallet/)).toBeVisible()

    expect(screen.getByText('settings.section_title_community')).toBeVisible()
    expect(screen.queryByText(/settings.matrix/)).toBeVisible()
    expect(screen.queryByText(/settings.telegram/)).toBeVisible()

    expect(screen.getByText('settings.section_title_community')).toBeVisible()
    expect(screen.queryByText(/settings.documentation/)).toBeVisible()
    expect(screen.queryByText(/settings.github/)).toBeVisible()
  })
})
