import { ArrowUpDown } from 'lucide-react'
import type { Currency } from '@/hooks/useDisplaySettings'
import { DisplayLogo } from '../DisplayLogo'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

interface BitcoinAmountInputProps extends Omit<React.ComponentProps<'input'>, 'type'> {
  currency: Currency
  isPrivate: boolean
  toggleCurrencyUnit: () => void
  label?: string
  placeholder?: string
}

export const BitcoinAmountInput = ({
  currency,
  isPrivate,
  onChange,
  value,
  toggleCurrencyUnit,
  disabled,
  label,
  placeholder,
  ...inputProps
}: BitcoinAmountInputProps) => {
  return (
    <>
      {label && <p className="mb-2 text-sm">{label}</p>}
      <div className="flex w-full items-center gap-2">
        <div className="relative flex-1">
          <div onClick={toggleCurrencyUnit} className="absolute inset-y-0 left-0 flex items-center px-1">
            <span className="px-1 text-gray-500">
              <DisplayLogo currency={currency} isPrivate={isPrivate} size="sm" />
            </span>
          </div>
          <Input
            type="number"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="pl-8"
            step={currency === 'btc' ? '0.00000001' : '1'}
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label={`Amount in ${currency}`}
            autoComplete="off"
            autoFocus={true}
            disabled={disabled}
            {...inputProps}
          />
        </div>
        <Button variant="outline" size="sm" className="py-4 whitespace-nowrap" onClick={toggleCurrencyUnit}>
          {currency === 'sats' ? 'BTC' : 'Sats'}
          <ArrowUpDown />
        </Button>
      </div>
    </>
  )
}
