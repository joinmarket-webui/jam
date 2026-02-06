import { useRef } from 'react'
import { cn } from '@/lib/utils'
import type { AmountSats } from '@/types/global'
import { CurrencySymbol } from './CurrencySymbol'
import { JarIcon } from './JarIcon'

interface SelectableJarProps {
  name: string
  color: string
  balance: AmountSats
  totalBalance: AmountSats
  isSelected: NonNullable<React.ComponentProps<'input'>['checked']>
  onClick: NonNullable<React.ComponentProps<'input'>['onChange']>
  disabled?: NonNullable<React.ComponentProps<'input'>['disabled']>
}

export const SelectableJar = ({
  name,
  color,
  balance,
  totalBalance,
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
          amount={balance || 0}
          isSelected={isSelected}
          totalBalance={totalBalance}
          className={`${disabled ? 'grayscale' : ''}`}
        />

        <span className="text-xs">{name}</span>
        <div className="flex items-center font-mono text-[10px] text-gray-500">
          <CurrencySymbol currency="sats" size="sm" />
          <span>{balance.toLocaleString()}</span>
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
