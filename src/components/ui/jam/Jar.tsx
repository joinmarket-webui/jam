import type { JarColor } from '@/context/JamWalletInfoContext'
import { cn } from '@/lib/utils'
import type { AmountSats } from '@/types/global'
import { Balance } from './Balance'
import { JarIcon } from './JarIcon'

interface JarProps {
  className?: string
  name: string
  color: JarColor
  totalBalance: AmountSats
  availableBalance: AmountSats
  frozenOrLockedBalance: AmountSats
  totalWalletBalance: AmountSats
  disabled?: boolean
}

export function Jar({
  className,
  name,
  color,
  totalBalance,
  availableBalance,
  frozenOrLockedBalance,
  totalWalletBalance,
  disabled = false,
}: JarProps) {
  return (
    <div
      className={cn('group/jar flex flex-row items-center gap-2 transition-all duration-300 sm:flex-col', className)}
    >
      <JarIcon
        className={`${disabled ? 'grayscale' : ''}`}
        color={color}
        totalBalance={totalBalance}
        totalWalletBalance={totalWalletBalance}
      />
      <div className="flex flex-col items-center text-sm">
        <p
          className={cn(
            'text-muted-foreground',
            disabled ? [] : ['group-hover/jar:font-bold', `group-hover/jar:text-[${color}]`],
          )}
        >
          {name}
        </p>
        <div className="flex min-w-[110px] items-center justify-center">
          <Balance valueString={String(availableBalance)} />
        </div>
        <div
          className={cn('light:text-blue-500/80 flex min-w-[110px] items-center justify-center gap-1 text-xs', {
            hidden: frozenOrLockedBalance <= 0,
          })}
        >
          <Balance valueString={String(frozenOrLockedBalance)} frozen={true} />
        </div>
      </div>
    </div>
  )
}
