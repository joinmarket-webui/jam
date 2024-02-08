import { BrowserRouter } from 'react-router-dom'
import user from '@testing-library/user-event'
import { render, screen, act } from '../testUtils'
import { __testSetDebugFeatureEnabled } from '../constants/debugFeatures'

import * as apiMock from '../libs/JmWalletApi'
import { DUMMY_MNEMONIC_PHRASE } from '../utils'

import CreateWallet from './CreateWallet'

jest.mock('../libs/JmWalletApi', () => ({
  ...jest.requireActual('../libs/JmWalletApi'),
  getGetinfo: jest.fn(),
  getSession: jest.fn(),
  postWalletCreate: jest.fn(),
  getWalletAll: jest.fn(),
}))

const NOOP = () => {}

describe('<CreateWallet />', () => {
  const testWalletName = 'test_wallet21'
  const invalidTestWalletName = 'invalid_wallet_name!'
  const testWalletPassword = 'correct horse battery staple'

  const setup = ({
    startWallet = NOOP,
  }: {
    startWallet?: (name: apiMock.WalletFileName, auth: apiMock.ApiAuthContext) => void
  }) => {
    render(
      <BrowserRouter>
        <CreateWallet startWallet={startWallet} parentRoute="home" />
      </BrowserRouter>,
    )
  }

  beforeEach(() => {
    const neverResolvingPromise = new Promise(() => {})
    ;(apiMock.getGetinfo as jest.Mock).mockReturnValue(neverResolvingPromise)
    ;(apiMock.getSession as jest.Mock).mockReturnValue(neverResolvingPromise)
    ;(apiMock.getWalletAll as jest.Mock).mockReturnValue(neverResolvingPromise)
  })

  it('should display alert when rescanning is active', async () => {
    ;(apiMock.getSession as jest.Mock).mockReturnValue(
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            rescanning: true,
          }),
      }),
    )

    await act(async () => setup({}))

    expect(screen.getByText('create_wallet.title')).toBeVisible()
    expect(screen.getByTestId('alert-rescanning')).toBeVisible()
    expect(screen.queryByText('create_wallet.button_create')).not.toBeInTheDocument()
  })

  it('should render without errors', () => {
    setup({})

    expect(screen.getByText('create_wallet.title')).toBeVisible()
    expect(screen.getByLabelText('create_wallet.label_wallet_name')).toBeVisible()
    expect(screen.getByPlaceholderText('create_wallet.placeholder_wallet_name')).toBeVisible()
    expect(screen.getByLabelText('create_wallet.label_password')).toBeVisible()
    expect(screen.getByPlaceholderText('create_wallet.placeholder_password')).toBeVisible()
    expect(screen.getByLabelText('create_wallet.label_password_confirm')).toBeVisible()
    expect(screen.getByPlaceholderText('create_wallet.placeholder_password_confirm')).toBeVisible()
    expect(screen.getByText('create_wallet.button_create')).toBeVisible()
  })

  it('should show validation messages to user if form is invalid', async () => {
    setup({})

    expect(await screen.queryByText('create_wallet.feedback_invalid_wallet_name')).not.toBeInTheDocument()
    expect(await screen.queryByText('create_wallet.feedback_invalid_password')).not.toBeInTheDocument()
    expect(await screen.queryByText('create_wallet.feedback_invalid_password_confirm')).not.toBeInTheDocument()
    expect(await screen.findByText('create_wallet.button_create')).toBeVisible()

    // click on the "create" button without filling the form
    await user.click(screen.getByText('create_wallet.button_create'))

    expect(await screen.findByText('create_wallet.feedback_invalid_wallet_name')).toBeVisible()
    expect(await screen.findByText('create_wallet.feedback_invalid_password')).toBeVisible()
    expect(await screen.findByText('create_wallet.feedback_invalid_password_confirm')).toBeVisible()
  })

  it('should not submit form if wallet name contains invalid characters', async () => {
    setup({})

    expect(await screen.queryByText('create_wallet.feedback_invalid_wallet_name')).not.toBeInTheDocument()
    expect(await screen.queryByText('create_wallet.feedback_invalid_password_confirm')).not.toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('create_wallet.placeholder_wallet_name'), invalidTestWalletName)
    await user.type(screen.getByPlaceholderText('create_wallet.placeholder_password'), testWalletPassword)
    await user.type(screen.getByPlaceholderText('create_wallet.placeholder_password_confirm'), testWalletPassword)

    await user.click(screen.getByText('create_wallet.button_create'))

    expect(await screen.findByText('create_wallet.button_create')).toBeVisible()
    expect(await screen.findByText('create_wallet.feedback_invalid_wallet_name')).toBeVisible()
    expect(await screen.queryByText('create_wallet.feedback_invalid_password_confirm')).not.toBeInTheDocument()
  })

  it('should not submit form if passwords do not match', async () => {
    setup({})

    expect(await screen.findByPlaceholderText('create_wallet.placeholder_password')).toBeVisible()
    expect(await screen.findByPlaceholderText('create_wallet.placeholder_password_confirm')).toBeVisible()
    expect(await screen.queryByText('create_wallet.feedback_invalid_wallet_name')).not.toBeInTheDocument()
    expect(await screen.queryByText('create_wallet.feedback_invalid_password_confirm')).not.toBeInTheDocument()
    expect(await screen.findByText('create_wallet.button_create')).toBeVisible()

    await user.type(screen.getByPlaceholderText('create_wallet.placeholder_wallet_name'), testWalletName)
    await user.type(screen.getByPlaceholderText('create_wallet.placeholder_password'), '.*')
    await user.type(screen.getByPlaceholderText('create_wallet.placeholder_password_confirm'), 'a_mismatching_input')

    await user.click(screen.getByText('create_wallet.button_create'))

    expect(await screen.findByText('create_wallet.button_create')).toBeVisible()
    expect(await screen.queryByText('create_wallet.feedback_invalid_wallet_name')).not.toBeInTheDocument()
    expect(await screen.findByText('create_wallet.feedback_invalid_password_confirm')).toBeVisible()
  })

  it('should advance to WalletCreationConfirmation after wallet is created', async () => {
    ;(apiMock.postWalletCreate as jest.Mock).mockReturnValue(
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            walletname: `${testWalletName}.jmdat`,
            token: 'ANY_TOKEN',
            seedphrase: DUMMY_MNEMONIC_PHRASE.join(' '),
          }),
      }),
    )

    setup({})

    expect(await screen.findByText('create_wallet.button_create')).toBeVisible()
    expect(await screen.queryByText('create_wallet.title_wallet_created')).not.toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('create_wallet.placeholder_wallet_name'), testWalletName)
    await user.type(screen.getByPlaceholderText('create_wallet.placeholder_password'), testWalletPassword)
    await user.type(screen.getByPlaceholderText('create_wallet.placeholder_password_confirm'), testWalletPassword)

    await user.click(screen.getByText('create_wallet.button_create'))

    expect(screen.getByText('create_wallet.title_wallet_created')).toBeVisible()
    expect(screen.queryByText('create_wallet.button_create')).not.toBeInTheDocument()
  })

  it('should verify that "skip" button is NOT visible by default (feature is disabled)', async () => {
    ;(apiMock.postWalletCreate as jest.Mock).mockReturnValue(
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            walletname: `${testWalletName}.jmdat`,
            token: 'ANY_TOKEN',
            seedphrase: DUMMY_MNEMONIC_PHRASE.join(' '),
          }),
      }),
    )

    setup({})

    await user.type(screen.getByPlaceholderText('create_wallet.placeholder_wallet_name'), testWalletName)
    await user.type(screen.getByPlaceholderText('create_wallet.placeholder_password'), testWalletPassword)
    await user.type(screen.getByPlaceholderText('create_wallet.placeholder_password_confirm'), testWalletPassword)

    const createWalletButton = screen.getByText('create_wallet.button_create')
    await user.click(createWalletButton)

    const revealToggle = await screen.findByText('create_wallet.confirmation_toggle_reveal_info')
    await user.click(revealToggle)

    const confirmToggle = screen.getByText('create_wallet.confirmation_toggle_info_written_down')
    await user.click(confirmToggle)

    const nextButton = screen.getByText('create_wallet.next_button')
    await user.click(nextButton)

    expect(screen.queryByText('create_wallet.skip_button')).not.toBeInTheDocument()
    expect(screen.getByText('create_wallet.back_button')).toBeVisible()
    expect(screen.getByText('create_wallet.confirmation_button_fund_wallet')).toBeDisabled()
  })

  it('should verify that "skip" button IS visible when feature is enabled', async () => {
    __testSetDebugFeatureEnabled('skipWalletBackupConfirmation', true)
    ;(apiMock.postWalletCreate as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          walletname: `${testWalletName}.jmdat`,
          token: 'ANY_TOKEN',
          seedphrase: DUMMY_MNEMONIC_PHRASE.join(' '),
        }),
    })

    setup({})

    await user.type(screen.getByPlaceholderText('create_wallet.placeholder_wallet_name'), testWalletName)
    await user.type(screen.getByPlaceholderText('create_wallet.placeholder_password'), testWalletPassword)
    await user.type(screen.getByPlaceholderText('create_wallet.placeholder_password_confirm'), testWalletPassword)

    const createWalletButton = screen.getByText('create_wallet.button_create')
    await user.click(createWalletButton)

    const revealToggle = await screen.findByText('create_wallet.confirmation_toggle_reveal_info')
    await user.click(revealToggle)

    const confirmToggle = screen.getByText('create_wallet.confirmation_toggle_info_written_down')
    await user.click(confirmToggle)

    const nextButton = screen.getByText('create_wallet.next_button')
    await user.click(nextButton)

    expect(screen.getByText('create_wallet.skip_button')).toBeVisible()
    expect(screen.getByText('create_wallet.back_button')).toBeVisible()
    expect(screen.getByText('create_wallet.confirmation_button_fund_wallet')).toBeDisabled()
  })
})
