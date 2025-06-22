import { DisplayLogo } from '../DisplayLogo'
import { JarIcon } from '../ui/JarIcon'

interface JarProps {
  name: string
  amount: number
  color: '#e2b86a' | '#3b5ba9' | '#c94f7c' | '#a67c52' | '#7c3fa6'
  displayMode: 'sats' | 'btc'
  totalBalance?: number
}

function formatAmount(amount: number, displayMode: 'sats' | 'btc') {
  if (displayMode === 'btc') {
    return (amount / 100_000_000).toLocaleString(undefined, {
      maximumFractionDigits: 8,
    })
  }
  return amount.toLocaleString()
}

export function Jar({ name, amount, color, displayMode, totalBalance = 0 }: JarProps) {
  return (
    <div className="flex cursor-pointer flex-col items-center transition-all duration-300 hover:scale-105">
      <div className="mb-2">
        <JarIcon amount={amount} totalBalance={totalBalance} color={color} />
      </div>
      <p className="text-center text-sm">{name}</p>
      <p className="min-w-[110px] text-center text-xs tabular-nums">
        {formatAmount(amount, displayMode)} <DisplayLogo displayMode={displayMode} size="sm" />
      </p>
    </div>
  )
}
