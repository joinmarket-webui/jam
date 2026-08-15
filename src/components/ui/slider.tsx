import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'
import { Input } from './input'

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root> & {
  /**
   * When `true`, renders a companion numeric input next to the slider so users can
   * type a value instead of dragging. Only rendered for single-thumb sliders.
   */
  withInput?: boolean
  /** Optional class name applied to the companion input wrapper. */
  inputClassName?: string
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step,
  withInput = false,
  inputClassName,
  ...props
}: SliderProps) {
  const _values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]),
    [value, defaultValue, min, max],
  )

  // The companion input is only meaningful for single-thumb sliders.
  const showInput = withInput && _values.length === 1

  const slider = (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      step={step}
      className={cn(
        'relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          'bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5',
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn('bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full')}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="border-primary ring-ring/50 block size-4 shrink-0 rounded-full border bg-white shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  )

  if (!showInput) {
    return slider
  }

  const currentValue = _values[0]
  const onValueChange = props.onValueChange
  const disabled = props.disabled

  const clamp = (raw: number) => {
    let next = Math.min(max, Math.max(min, raw))
    if (typeof step === 'number' && step > 0) {
      // Snap to the nearest step relative to `min`, then re-clamp to `max`.
      next = min + Math.round((next - min) / step) * step
      next = Math.min(max, Math.max(min, next))
    }
    return next
  }

  const commitValue = (rawText: string) => {
    if (rawText.trim() === '') return
    const parsed = Number(rawText)
    if (Number.isNaN(parsed)) return
    onValueChange?.([clamp(parsed)])
  }

  return (
    <div data-slot="slider-with-input" className="flex w-full items-center gap-3">
      {slider}
      <Input
        data-slot="slider-input"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={currentValue ?? ''}
        disabled={disabled}
        aria-label={props['aria-label']}
        onChange={(event) => commitValue(event.target.value)}
        className={cn('h-8 w-20 shrink-0 text-center', inputClassName)}
      />
    </div>
  )
}

export { Slider }
export type { SliderProps }
