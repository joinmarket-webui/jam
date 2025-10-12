import type { SVGAttributes } from 'react'
import { EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Currency } from '@/types/global'

type CurrencySymbolProps = {
  currency: Currency
  isPrivate?: boolean
  size?: 'sm' | 'lg'
}

export function CurrencySymbol({ currency, isPrivate, size = 'lg' }: CurrencySymbolProps) {
  if (isPrivate) {
    return <EyeOff size={size === 'sm' ? 14 : 24} className="text-muted-foreground mx-1 inline-block align-middle" />
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
    <SatSymbol
      width={size === 'sm' ? '18px' : '48px'}
      height={size === 'sm' ? '18px' : '48px'}
      style={{
        margin: size === 'sm' ? '0 -1px' : '0 -8px',
      }}
    />
  )
}

export const SatSymbol = (props: SVGAttributes<Element>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 30 30"
      fill="currentColor"
      {...props}
      style={{
        display: 'inline',
        verticalAlign: 'middle',
        ...props.style,
      }}
    >
      <path stroke="currentColor" stroke-width="2" d="M8 10H22" />
      <path stroke="currentColor" stroke-width="2" d="M15 7V4" />
      <path stroke="currentColor" stroke-width="2" d="M15 26V23" />
      <path stroke="currentColor" stroke-width="2" d="M8 15H22" />
      <path stroke="currentColor" stroke-width="2" d="M8 20H22" />
    </svg>
  )
}

export const BtcSymbol = (props: SVGAttributes<Element>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
      style={{
        display: 'inline',
        verticalAlign: 'middle',
        ...props.style,
      }}
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M13.425 6.432c1.983.19 3.538.778 3.71 2.528.117 1.276-.438 2.035-1.355 2.463 1.481.359 2.382 1.202 2.196 3.072-.227 2.343-2.035 2.952-4.62 3.08l.004 2.42-1.522.002-.004-2.42c-.166-.002-.34 0-.519.003-.238.003-.484.006-.731-.001l.004 2.42-1.52.001-.004-2.42-3.044-.058.256-1.768s1.15.024 1.129.012c.423-.002.549-.293.58-.485l-.008-3.878.012-2.76c-.046-.288-.248-.634-.87-.644.033-.03-1.115.001-1.115.001L6 6.38l3.12-.005-.004-2.37 1.571-.002.004 2.37c.304-.008.603-.005.906-.003l.3.002-.005-2.37L13.422 4l.003 2.432zm-2.92 4.46l.076.002c.926.04 3.67.155 3.673-1.457-.004-1.532-2.339-1.482-3.423-1.46-.129.003-.24.006-.327.005v2.91zm.129 4.75l-.134-.005v-2.91c.097.002.218 0 .359-.002 1.282-.015 4.145-.05 4.132 1.494.014 1.597-3.218 1.468-4.357 1.423z"
      />
    </svg>
  )
}
