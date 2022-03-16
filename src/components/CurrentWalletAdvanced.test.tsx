import React from 'react'
// @ts-ignore
import { render, screen } from '../testUtils'
import { act } from 'react-dom/test-utils'

import CurrentWalletAdvanced from './CurrentWalletAdvanced'

describe('<CurrentWalletAdvanced />', () => {
  const setup = () => {
    render(<CurrentWalletAdvanced />)
  }

  it('should display error if component is rendered without active wallet', () => {
    act(setup)

    expect(screen.getByText('current_wallet.error_loading_failed')).toBeInTheDocument()
  })
})
