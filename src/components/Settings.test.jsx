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

    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.queryByText(/(Show|Hide) balance/)).toBeInTheDocument()
    expect(screen.queryByText(/Display amounts in (sats|BTC)/)).toBeInTheDocument()
    expect(screen.queryByText(/Switch to (dark|light) theme/)).toBeInTheDocument()
    expect(screen.queryByText(/Use (advanced|magic) wallet mode/)).toBeInTheDocument()
  })
})
