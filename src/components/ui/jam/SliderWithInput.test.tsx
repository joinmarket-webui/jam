import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Slider } from '../slider'
import { SliderWithInput } from './SliderWithInput'

// Radix Slider relies on ResizeObserver, which jsdom does not implement.
vi.stubGlobal(
  'ResizeObserver',
  class ResizeObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)

describe('SliderWithInput', () => {
  it('leaves the base Slider without a companion input', () => {
    render(<Slider value={[5]} min={0} max={10} />)
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('renders a companion input reflecting the current value', () => {
    render(<SliderWithInput value={[5]} min={0} max={10} />)
    const input = screen.getByRole('spinbutton')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue(5)
  })

  it('calls onValueChange with the typed value', () => {
    const onValueChange = vi.fn()
    render(<SliderWithInput value={[5]} min={0} max={10} onValueChange={onValueChange} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '7' } })
    expect(onValueChange).toHaveBeenCalledWith([7])
  })

  it('clamps values above max down to max once done typing', () => {
    const onValueChange = vi.fn()
    render(<SliderWithInput value={[5]} min={0} max={10} onValueChange={onValueChange} />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '99' } })
    expect(onValueChange).not.toHaveBeenCalled()
    fireEvent.blur(input)
    expect(onValueChange).toHaveBeenCalledWith([10])
  })

  it('clamps values below min up to min once done typing', () => {
    const onValueChange = vi.fn()
    render(<SliderWithInput value={[5]} min={2} max={10} onValueChange={onValueChange} />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '-3' } })
    expect(onValueChange).not.toHaveBeenCalled()
    fireEvent.blur(input)
    expect(onValueChange).toHaveBeenCalledWith([2])
  })

  it('snaps typed values to the nearest step once done typing', () => {
    const onValueChange = vi.fn()
    render(<SliderWithInput value={[0]} min={0} max={100} step={5} onValueChange={onValueChange} />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '13' } })
    expect(onValueChange).not.toHaveBeenCalled()
    fireEvent.blur(input)
    expect(onValueChange).toHaveBeenCalledWith([15])
  })

  it('commits a clamped value on Enter', () => {
    const onValueChange = vi.fn()
    render(<SliderWithInput value={[5]} min={0} max={10} onValueChange={onValueChange} />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '99' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onValueChange).toHaveBeenCalledWith([10])
  })

  it('ignores empty or non-numeric input', () => {
    const onValueChange = vi.fn()
    render(<SliderWithInput value={[5]} min={0} max={10} onValueChange={onValueChange} />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(onValueChange).not.toHaveBeenCalled()
  })

  describe('typing', () => {
    const ControlledSliderWithInput = ({
      initialValue,
      min,
      max,
    }: {
      initialValue: number
      min: number
      max: number
    }) => {
      const [value, setValue] = useState(initialValue)
      return <SliderWithInput value={[value]} min={min} max={max} onValueChange={(values) => setValue(values[0])} />
    }

    it('allows typing a multi-digit value whose first digit is below min', async () => {
      const user = userEvent.setup()
      render(<ControlledSliderWithInput initialValue={9} min={4} max={20} />)
      const input = screen.getByRole('spinbutton')

      await user.tripleClick(input)
      await user.keyboard('12')
      expect(input).toHaveValue(12)

      await user.tab()
      expect(input).toHaveValue(12)
    })

    it('allows clearing the input before typing a new value', async () => {
      const user = userEvent.setup()
      render(<ControlledSliderWithInput initialValue={9} min={4} max={20} />)
      const input = screen.getByRole('spinbutton')

      await user.clear(input)
      expect(input).toHaveValue(null)

      await user.keyboard('15')
      expect(input).toHaveValue(15)
    })

    it('restores the committed value when left empty', async () => {
      const user = userEvent.setup()
      render(<ControlledSliderWithInput initialValue={9} min={4} max={20} />)
      const input = screen.getByRole('spinbutton')

      await user.clear(input)
      await user.tab()
      expect(input).toHaveValue(9)
    })

    it('clamps an out-of-range value when leaving the input', async () => {
      const user = userEvent.setup()
      render(<ControlledSliderWithInput initialValue={9} min={4} max={20} />)
      const input = screen.getByRole('spinbutton')

      await user.tripleClick(input)
      await user.keyboard('1')
      expect(input).toHaveValue(1)

      await user.tab()
      expect(input).toHaveValue(4)
    })
  })

  it('disables the companion input when the slider is disabled', () => {
    render(<SliderWithInput value={[5]} min={0} max={10} disabled />)
    expect(screen.getByRole('spinbutton')).toBeDisabled()
  })
})
