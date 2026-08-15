import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Slider } from './slider'

// Radix Slider relies on ResizeObserver, which jsdom does not implement.
vi.stubGlobal(
  'ResizeObserver',
  class ResizeObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)

describe('Slider companion input', () => {
  it('does not render a companion input by default', () => {
    render(<Slider value={[5]} min={0} max={10} />)
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('renders a companion input reflecting the current value when withInput is set', () => {
    render(<Slider withInput value={[5]} min={0} max={10} />)
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.value).toBe('5')
  })

  it('calls onValueChange with the typed value', () => {
    const onValueChange = vi.fn()
    render(<Slider withInput value={[5]} min={0} max={10} onValueChange={onValueChange} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '7' } })
    expect(onValueChange).toHaveBeenCalledWith([7])
  })

  it('clamps values above max down to max', () => {
    const onValueChange = vi.fn()
    render(<Slider withInput value={[5]} min={0} max={10} onValueChange={onValueChange} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '99' } })
    expect(onValueChange).toHaveBeenCalledWith([10])
  })

  it('clamps values below min up to min', () => {
    const onValueChange = vi.fn()
    render(<Slider withInput value={[5]} min={2} max={10} onValueChange={onValueChange} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '-3' } })
    expect(onValueChange).toHaveBeenCalledWith([2])
  })

  it('snaps typed values to the nearest step', () => {
    const onValueChange = vi.fn()
    render(<Slider withInput value={[0]} min={0} max={100} step={5} onValueChange={onValueChange} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '13' } })
    expect(onValueChange).toHaveBeenCalledWith([15])
  })

  it('ignores empty or non-numeric input', () => {
    const onValueChange = vi.fn()
    render(<Slider withInput value={[5]} min={0} max={10} onValueChange={onValueChange} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '' } })
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('disables the companion input when the slider is disabled', () => {
    render(<Slider withInput value={[5]} min={0} max={10} disabled />)
    expect(screen.getByRole('spinbutton')).toBeDisabled()
  })

  it('does not render a companion input for multi-thumb sliders', () => {
    render(<Slider withInput value={[3, 7]} min={0} max={10} />)
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })
})
