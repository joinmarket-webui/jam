import { BrowserRouter } from 'react-router-dom'
import { render, screen, fireEvent, waitFor } from '../../testUtils'
import { SendForm } from './SendForm'
import type { WalletInfo } from '../../context/WalletContext'
import type { SendFormValues } from './SendForm'
import type { CurrentWallet } from '../../context/WalletContext'
import * as Api from '../../libs/JmWalletApi'

jest.mock('../../libs/JmWalletApi', () => ({
  ...jest.requireActual('../../libs/JmWalletApi'),
  getAddressNew: jest.fn(),
}))

const mockWalletInfo: Partial<WalletInfo> = {
  balanceSummary: {
    calculatedTotalBalanceInSats: 0,
    calculatedAvailableBalanceInSats: 0,
    calculatedFrozenOrLockedBalanceInSats: 0,
    accountBalances: {},
  },
  addressSummary: {},
  fidelityBondSummary: { fbOutputs: [] },
  utxosByJar: { 0: [] },
  data: {
    utxos: { utxos: [] },
    display: { walletinfo: { accounts: [], total_balance: '0.00000000' } },
  } as any,
}

const initialValues: SendFormValues = {
  sourceJarIndex: 0,
  destination: { value: null, fromJar: null },
  amount: { value: null, isSweep: false },
  isCoinJoin: true,
  numCollaborators: 3,
  txFee: undefined,
}

const makeWallet = (): CurrentWallet => ({
  walletFileName: 'test.jmdat' as Api.WalletFileName,
  token: 'mock-token' as Api.ApiToken,
  displayName: 'test',
})

const defaultProps = {
  wallet: makeWallet(),
  walletInfo: mockWalletInfo as WalletInfo,
  initialValues,
  onSubmit: jest.fn().mockResolvedValue(undefined),
  isLoading: false,
  minNumCollaborators: 3,
  loadNewWalletAddress: jest.fn().mockResolvedValue('bc1qtest'),
  reloadFeeConfigValues: jest.fn(),
}

const setup = (overrides = {}) =>
  render(
    <BrowserRouter>
      <SendForm {...defaultProps} {...overrides} />
    </BrowserRouter>,
  )

describe('<SendForm />', () => {
  it('renders destination address field', () => {
    setup()
    expect(screen.getByRole('textbox', { name: /recipient/i })).toBeInTheDocument()
  })

  it('renders amount field', () => {
    setup()
    // BitcoinAmountInput initially renders as type="text" (switches to number on focus)
    expect(screen.getByRole('textbox', { name: /amount/i })).toBeInTheDocument()
  })

  it('renders coinjoin toggle', () => {
    setup()
    const buttons = screen.getAllByRole('button')
    const sendingOptionsBtn = buttons.find((b) => /sending/i.test(b.textContent || ''))
    expect(sendingOptionsBtn).toBeTruthy()
    fireEvent.click(sendingOptionsBtn!)
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('renders collaborators field when coinjoin is on', () => {
    setup()
    // Open the accordion by clicking the sending options button
    const buttons = screen.getAllByRole('button')
    const sendingOptionsBtn = buttons.find((b) => /sending/i.test(b.textContent || ''))
    expect(sendingOptionsBtn).toBeTruthy()
    fireEvent.click(sendingOptionsBtn!)
    // CollaboratorsSelector renders a custom number input; i18n in tests returns keys directly
    expect(screen.getByPlaceholderText(/num_collaborators_placeholder/i)).toBeInTheDocument()
  })

  it('calls onSubmit when form has valid direct-send values', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined)
    setup({
      onSubmit,
      initialValues: {
        sourceJarIndex: 0,
        destination: { value: 'bc1qtest', fromJar: null },
        amount: { value: 100_000, isSweep: false },
        isCoinJoin: false,
        numCollaborators: 3,
        txFee: { value: 1, unit: 'blocks' },
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /send.button_send/i }))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          isCoinJoin: false,
          destination: expect.objectContaining({ value: 'bc1qtest' }),
        }),
        expect.anything(),
      )
    })
  })

  it('does not call onSubmit when collaborator count is below minimum', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined)
    setup({
      onSubmit,
      initialValues: {
        sourceJarIndex: 0,
        destination: { value: 'bc1qtest', fromJar: null },
        amount: { value: 100_000, isSweep: false },
        isCoinJoin: true,
        numCollaborators: 1,
        txFee: undefined,
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /send.button_send/i }))
    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })
})
