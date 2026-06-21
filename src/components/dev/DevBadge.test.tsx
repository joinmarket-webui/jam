import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DevBadge } from './DevBadge'

describe('DevBadge', () => {
  it('renders correctly', () => {
    render(<DevBadge />)
    expect(screen.getByText('dev')).toBeInTheDocument()
  })
})
