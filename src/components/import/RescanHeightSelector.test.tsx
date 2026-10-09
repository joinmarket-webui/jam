import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RescanHeightSelector } from './RescanHeightSelector'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => key + (options ? ' ' + JSON.stringify(options) : ''),
  }),
}))

vi.stubGlobal(
  'ResizeObserver',
  class ResizeObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)

describe('RescanHeightSelector', () => {
  it('renders tab triggers and controls', () => {
    render(<RescanHeightSelector value={481_824} onChange={vi.fn()} />)

    expect(screen.getByText('import_wallet.import_details.tab_rescan_by_date')).toBeInTheDocument()
    expect(screen.getByText('import_wallet.import_details.tab_rescan_by_block')).toBeInTheDocument()
    expect(screen.getByText('import_wallet.import_details.label_start_at_genesis')).toBeInTheDocument()
  })

  it('calls onChange(0) when start at genesis is toggled on', () => {
    const onChange = vi.fn()
    render(<RescanHeightSelector value={481_824} onChange={onChange} />)

    const genesisSwitch = document.querySelector('#blockheight-switch-genesis')!
    fireEvent.click(genesisSwitch)

    expect(onChange).toHaveBeenCalledWith(0)
    expect(screen.getByText('import_wallet.import_details.hint_genesis_block')).toBeInTheDocument()
  })

  it('updates blockheight when typing in the exact block tab', () => {
    const onChange = vi.fn()
    render(<RescanHeightSelector value={481_824} onChange={onChange} />)

    const blockInput = screen.getByPlaceholderText('import_wallet.import_details.placeholder_blockheight')
    fireEvent.change(blockInput, { target: { value: '750000' } })

    expect(onChange).toHaveBeenCalledWith(750000)
  })

  it('displays field error when provided', () => {
    render(<RescanHeightSelector value={481_824} onChange={vi.fn()} error="Invalid blockheight" />)
    expect(screen.getByText('Invalid blockheight')).toBeInTheDocument()
  })
})
