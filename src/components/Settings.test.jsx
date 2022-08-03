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

    expect(screen.getByText('settings.title')).toBeVisible()
    expect(screen.queryByText(/settings.(show|hide)_balance/)).toBeVisible()
    expect(screen.queryByText(/settings.use_(sats|bitcoin)/)).toBeVisible()
    expect(screen.queryByText(/settings.use_(dark|light)_theme/)).toBeVisible()
    expect(screen.queryByText(/English/)).toBeVisible()

    expect(screen.getByText('settings.section_title_wallet')).toBeVisible()
    expect(screen.queryByText(/settings.(show|hide)_seed/)).toBeVisible()
    expect(screen.queryByText(/settings.button_switch_wallet/)).toBeVisible()

    expect(screen.getByText('settings.section_title_community')).toBeVisible()
    expect(screen.queryByText(/settings.github/)).toBeVisible()
    expect(screen.queryByText(/settings.telegram/)).toBeVisible()
    expect(screen.queryByText(/settings.jm_twitter/)).toBeVisible()
  })
})
