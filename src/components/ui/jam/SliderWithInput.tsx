import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'
import { Input } from '../input'
import { Slider } from '../slider'

type SliderWithInputProps = React.ComponentProps<typeof SliderPrimitive.Root> & {
  /** Optional class name applied to the companion input. */
  inputClassName?: string
}

const parseValue = (rawText: string) => {
  if (rawText.trim() === '') return undefined
  const parsed = Number(rawText)
  return Number.isNaN(parsed) ? undefined : parsed
}

/**
 * A single-thumb {@link Slider} paired with a companion numeric input, so users
 * can type an exact value instead of dragging. Keeps the base `ui/slider`
 * component a clean Radix wrapper; the typing behaviour lives here.
 *
 * Only meaningful for single-thumb sliders (a single `value`/`defaultValue`).
 */
function SliderWithInput({
  className,
  inputClassName,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step,
  ...props
}: SliderWithInputProps) {
  const _values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]),
    [value, defaultValue, min, max],
  )

  const currentValue = _values[0]
  const disabled = props.disabled

  const [draft, setDraft] = React.useState<string | null>(null)

  const clamp = (raw: number) => {
    let next = Math.min(max, Math.max(min, raw))
    if (typeof step === 'number' && step > 0) {
      // Snap to the nearest step relative to `min`, then re-clamp to `max`.
      next = min + Math.round((next - min) / step) * step
      next = Math.min(max, Math.max(min, next))
    }
    return next
  }

  const onInputChange = (rawText: string) => {
    setDraft(rawText)
    const parsed = parseValue(rawText)
    if (parsed !== undefined && clamp(parsed) === parsed) {
      props.onValueChange?.([parsed])
    }
  }

  const commitDraft = () => {
    if (draft === null) return
    const parsed = parseValue(draft)
    if (parsed !== undefined) {
      props.onValueChange?.([clamp(parsed)])
    }
    setDraft(null)
  }

  return (
    <div data-slot="slider-with-input" className="flex w-full items-center gap-3">
      <Input
        data-slot="slider-input"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={draft ?? currentValue ?? ''}
        disabled={disabled}
        aria-label={props['aria-label']}
        onChange={(event) => onInputChange(event.target.value)}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commitDraft()
        }}
        className={cn('h-8 w-20 shrink-0 text-center', inputClassName)}
      />
      <Slider
        className={className}
        defaultValue={defaultValue}
        value={value}
        min={min}
        max={max}
        step={step}
        {...props}
      />
    </div>
  )
}

export { SliderWithInput }
export type { SliderWithInputProps }
