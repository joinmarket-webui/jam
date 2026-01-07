import type { AmountSats } from '@/types/global'
import type { JarColor } from '../../layout/display-mode-context'
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
    <div className="flex cursor-pointer flex-col items-center transition-all duration-300 hover:scale-105">
      <div className="mb-2">
        <JarIcon amount={amount} totalBalance={totalBalance} color={color} />
      </div>
      <p className="text-center text-sm">{name}</p>
      <div className="flex min-w-[110px] items-center justify-center text-sm">
        <span className="tabular-nums">{formatAmount(amount)}</span>
        {currencySymbol('sm')}
      </div>
    </div>
  )
}
