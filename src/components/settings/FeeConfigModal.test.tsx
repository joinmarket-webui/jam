import { render, screen, act } from '../../testUtils'
import FeeConfigModal from './FeeConfigModal'
import * as apiMock from '../../libs/JmWalletApi'
import * as FeesHook from '../../hooks/Fees'

jest.mock('../../libs/JmWalletApi', () => ({
  ...jest.requireActual('../../libs/JmWalletApi'),
  getGetinfo: jest.fn(),
  getSession: jest.fn(),
  postConfigGet: jest.fn(),
  postConfigSet: jest.fn(),
}))

const defaultProps = {
  show: true,
  onHide: jest.fn(),
  onSuccess: jest.fn(),
  onCancel: jest.fn(),
}

const neverResolves = new Promise(() => {})

describe('<FeeConfigModal />', () => {
  beforeEach(() => {
    ;(apiMock.getGetinfo as jest.Mock).mockReturnValue(neverResolves)
    ;(apiMock.getSession as jest.Mock).mockReturnValue(neverResolves)
    ;(apiMock.postConfigGet as jest.Mock).mockReturnValue(neverResolves)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders when show=true', async () => {
    await act(async () => {
      render(<FeeConfigModal {...defaultProps} />)
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not render when show=false', async () => {
    await act(async () => {
      render(<FeeConfigModal {...defaultProps} show={false} />)
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows tx fee section by default', async () => {
    const loadFeeConfigValues = jest.fn().mockResolvedValue({
      tx_fees: { value: 10000, unit: 'sats/kilo-vbyte' },
      tx_fees_factor: 0.2,
      max_cj_fee_abs: 1000,
      max_cj_fee_rel: 0.001,
      max_sweep_fee_change: 0.8,
    })
    jest.spyOn(FeesHook, 'useLoadFeeConfigValues').mockReturnValue(loadFeeConfigValues)

    await act(async () => {
      render(<FeeConfigModal {...defaultProps} defaultActiveSectionKey="tx_fee" />)
    })
    expect(screen.getByText('settings.fees.title_general_fee_settings')).toBeInTheDocument()
  })
})
