import { EyeOff } from 'lucide-react'
import type { Currency } from '@/hooks/useDisplaySettings'

type DisplayLogoProps = {
  currency: Currency
  isPrivate?: boolean
  size?: 'sm' | 'lg'
}

export function DisplayLogo({ currency, isPrivate, size = 'lg' }: DisplayLogoProps) {
  if (isPrivate) {
    return <EyeOff size={size === 'sm' ? 16 : 24} className="inline-block align-middle" />
  }

  if (currency === 'btc') {
    return <span className={`px-1 ${size === 'sm' ? 'text-md' : 'text-4xl'}`}>₿</span>
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size === 'sm' ? '16px' : '30px'}
      height={size === 'sm' ? '18px' : '40px'}
      viewBox="0 0 24 24"
      fill="none"
      style={{
        display: 'inline',
        verticalAlign: 'middle',
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
