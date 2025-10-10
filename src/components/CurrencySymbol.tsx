import { EyeOff } from 'lucide-react'
import type { Currency } from '@/hooks/useDisplaySettings'
import { cn } from '@/lib/utils'

type CurrencySymbolProps = {
  currency: Currency
  isPrivate?: boolean
  size?: 'sm' | 'lg'
}

export function CurrencySymbol({ currency, isPrivate, size = 'lg' }: CurrencySymbolProps) {
  if (isPrivate) {
    return <EyeOff size={size === 'sm' ? 14 : 24} className="mx-1 inline-block align-middle" />
  }

  if (currency === 'btc') {
    return (
      <span
        className={cn('mx-1', {
          'text-md': size === 'sm',
          'text-4xl': size === 'lg',
        })}
      >
        ₿
      </span>
    )
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size === 'sm' ? '16px' : '48px'}
      height={size === 'sm' ? '16px' : '48px'}
      viewBox="0 0 24 24"
      fill="none"
      style={{
        display: 'inline',
        verticalAlign: 'middle',
        margin: size === 'sm' ? '0 -1px' : '0 -8px',
      }}
    >
      <path d="M7 7.90906H17" stroke="currentColor" />
      <path d="M12 5.45454V3" stroke="currentColor" />
      <path d="M12 20.9999V18.5454" stroke="currentColor" />
      <path d="M7 12H17" stroke="currentColor" />
      <path d="M7 16.0909H17" stroke="currentColor" />
    </svg>
  )
}
