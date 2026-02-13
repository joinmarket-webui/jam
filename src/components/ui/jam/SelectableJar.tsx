import { useRef, type ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { Balance } from './Balance'
import type { Jar } from './Jar'
import { JarIcon } from './JarIcon'

interface SelectableJarProps extends ComponentProps<typeof Jar> {
  isSelected: NonNullable<React.ComponentProps<'input'>['checked']>
  onClick: NonNullable<React.ComponentProps<'input'>['onChange']>
}

export const SelectableJar = ({
  name,
  color,
  totalBalance,
  totalWalletBalance,
  isSelected,
  disabled = false,
  onClick,
}: SelectableJarProps) => {
  const radioRef = useRef<HTMLInputElement>(null)
  return (
    <button
      type="button"
      className={cn('flex flex-col items-center gap-4', {
        'cursor-pointer': !disabled,
        'cursor-not-allowed': disabled,
      })}
      onClick={() => {
        if (radioRef.current !== null) {
          radioRef.current.click()
        }
      }}
      tabIndex={-1}
    >
      <div className="flex flex-col items-center">
        <JarIcon
          color={color}
          totalBalance={totalBalance}
          isSelected={isSelected}
          totalWalletBalance={totalWalletBalance}
          className={`${disabled ? 'grayscale' : ''}`}
        />
        <span className="text-xs">{name}</span>
        <div className="flex items-center text-sm">
          <Balance valueString={String(totalBalance)} />
        </div>
      </div>
      <div className="flex items-center">
        <input
          ref={radioRef}
          type="radio"
          checked={isSelected}
          onChange={(event) => !disabled && onClick(event)}
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
