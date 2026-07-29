import { useRef, type ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { Jar } from './Jar'

interface SelectableJarProps extends ComponentProps<typeof Jar> {
  isSelected: NonNullable<React.ComponentProps<'input'>['checked']>
  onClick?: NonNullable<React.ComponentProps<'input'>['onClick']>
  onSelect: NonNullable<React.ComponentProps<'input'>['onChange']>
}

export const SelectableJar = ({
  name,
  color,
  totalBalance,
  availableBalance,
  frozenOrLockedBalance,
  totalWalletBalance,
  isSelected,
  disabled = false,
  onSelect,
  onClick,
}: SelectableJarProps) => {
  const radioRef = useRef<HTMLInputElement>(null)
  return (
    <button
      type="button"
      className={cn('flex flex-col items-center gap-1.5', {
        'cursor-pointer': !disabled,
        'cursor-not-allowed': disabled,
      })}
      onClick={() => {
        radioRef.current?.click()
      }}
      tabIndex={-1}
    >
      <Jar
        className="flex-col"
        name={name}
        color={color}
        totalBalance={totalBalance}
        availableBalance={availableBalance}
        frozenOrLockedBalance={frozenOrLockedBalance}
        totalWalletBalance={totalWalletBalance}
        isSelected={isSelected}
        disabled={disabled}
      />
      <div className="flex items-center">
        <input
          ref={radioRef}
          type="radio"
          checked={isSelected}
          onClick={onClick}
          onChange={(event) => !disabled && onSelect(event)}
          className={cn(
            'light:border-black/50 inline-block h-[1.5rem] w-[1.5rem] appearance-none rounded-full border-1 border-white/50',
            {
              invisible: disabled,
              'cursor-pointer': !disabled,
              'bg-foreground visible': isSelected,
            },
          )}
          disabled={disabled}
        />
      </div>
    </button>
  )
}
