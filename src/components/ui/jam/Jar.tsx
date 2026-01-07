import type { JarColor } from '@/context/JamWalletInfoContext'
import { cn } from '@/lib/utils'
import type { AmountSats } from '@/types/global'
import { JarIcon } from './JarIcon'

interface JarProps {
  name: string
  amount: AmountSats
  color: JarColor
  formatAmount: (amount: number) => string
  currencySymbol: (size: 'sm' | 'lg') => React.ReactNode
  totalBalance?: AmountSats
}

export function Jar({ name, amount, color, currencySymbol, formatAmount, totalBalance = 0 }: JarProps) {
  return (
    <div className="group/jar flex flex-row items-center gap-2 transition-all duration-300 hover:scale-105 sm:flex-col">
      <JarIcon amount={amount} totalBalance={totalBalance} color={color} />
      <div className="flex flex-col items-center text-sm">
        <p className={cn('text-muted-foreground group-hover/jar:font-bold', `group-hover/jar:text-[${color}]`)}>
          {name}
        </p>
        <div className="flex min-w-[110px] items-center justify-center">
          <span className="tabular-nums">{formatAmount(amount)}</span>
          {currencySymbol('sm')}
        </div>
      </div>
    </div>
  )
}
