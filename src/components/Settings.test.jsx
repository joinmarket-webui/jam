import React from 'react'
import { render, screen } from '../testUtils'
import { act } from 'react-dom/test-utils'

import Settings from './Settings'

describe('<Settings />', () => {
  const setup = () => {
    render(<Settings />)
  }

  it('should render settings without errors', () => {
    act(setup)

    expect(screen.getByText('settings.title')).toBeInTheDocument()
    expect(screen.queryByText(/settings.(show|hide)_balance/)).toBeInTheDocument()
    expect(screen.queryByText(/settings.(show|hide)_seed/)).toBeInTheDocument()
    expect(screen.queryByText(/settings.use_(sats|bitcoin)/)).toBeInTheDocument()
    expect(screen.queryByText(/settings.use_(dark|light)_theme/)).toBeInTheDocument()
    expect(screen.queryByText(/settings.use_(normal|dev)_mode/)).toBeInTheDocument()
    expect(screen.queryByText(/English/)).toBeInTheDocument()
    expect(screen.queryByText(/settings.github/)).toBeInTheDocument()
    expect(screen.queryByText(/settings.telegram/)).toBeInTheDocument()
  })
})
